import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  I2cPullupPairNotGrouped,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type ConnectedNetId = string
type BusPrefix = string

type BusRole = "sda" | "scl"
type Side = "above" | "below" | "left" | "right"

interface SignalPair {
  sda: Set<string>
  scl: Set<string>
}

interface Pullup {
  id: string
  powerNet: string
  placement: SchematicBoxPlacement
}

/** Advisory for a clearly split SDA/SCL pull-up pair on one local I2C bus. */
export class I2cPullupPairPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly powerNets: Set<string>
  private readonly pairs: Array<{ sda: string; scl: string }>
  private readonly netNames = new Map<ConnectedNetId, string>()
  private pairIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.powerNets = new Set(this.index.powerNets)
    for (const ports of this.index.portsByComponent.values()) {
      for (const port of ports) {
        if (port.provides_power || port.requires_power)
          this.powerNets.add(this.index.connected(port.source_port_id))
      }
    }
    const signals = new Map<BusPrefix, SignalPair>()
    for (const element of params.ctx.circuitJson) {
      if (element.type !== "source_net") continue
      const net = this.index.connected(element.source_net_id)
      if (!this.netNames.has(net)) this.netNames.set(net, element.name)
      const match = /^(.*?)(?:^|[_-])(SDA|SCL)$/i.exec(element.name)
      if (!match || this.index.isRail(net)) continue
      const prefix = match[1]!.toUpperCase()
      const role = match[2]!.toLowerCase() as BusRole
      const pair = signals.get(prefix) ?? { sda: new Set(), scl: new Set() }
      pair[role].add(net)
      signals.set(prefix, pair)
    }
    const sclNetsBySdaNet = new Map<ConnectedNetId, Set<ConnectedNetId>>()
    this.pairs = []
    for (const pair of signals.values()) {
      if (pair.sda.size !== 1 || pair.scl.size !== 1) continue
      const sda = [...pair.sda][0]!
      const scl = [...pair.scl][0]!
      const sclNets = sclNetsBySdaNet.get(sda) ?? new Set<ConnectedNetId>()
      // Net aliases can name the same electrical bus more than once.
      if (sclNets.has(scl)) continue
      sclNets.add(scl)
      sclNetsBySdaNet.set(sda, sclNets)
      this.pairs.push({ sda, scl })
    }
    this.solved = this.pairs.length === 0
  }

  override _step(): void {
    const pair = this.pairs[this.pairIndex++]!
    this.solved = this.pairIndex >= this.pairs.length
    if (pair.sda === pair.scl) return
    const sdaCandidates = this.pullups(pair.sda)
    const sclCandidates = this.pullups(pair.scl)
    // Duplicate pull-ups or mixed supplies make the intended pair ambiguous.
    if (sdaCandidates.length !== 1 || sclCandidates.length !== 1) return
    const sda = sdaCandidates[0]!
    const scl = sclCandidates[0]!
    if (
      sda.id === scl.id ||
      sda.powerNet !== scl.powerNet ||
      !this.index.sameLocalScope(sda.placement, scl.placement)
    )
      return

    const hosts = this.sharedLocalHosts({
      sdaNet: pair.sda,
      sclNet: pair.scl,
      sda,
      scl,
    })
    if (hosts.length !== 1) return
    const host = hosts[0]!
    const sdaSide = sideOf(sda.placement, host)
    const sclSide = sideOf(scl.placement, host)
    if (!sdaSide || !sclSide || sdaSide === sclSide) return
    const bodyGap = bodyDistance(sda.placement, scl.placement)
    const maxHostBodyGap = Math.max(
      bodyDistance(sda.placement, host),
      bodyDistance(scl.placement, host),
    )
    // A compact pair can straddle a corner. Warn only when each resistor
    // is closer to the chip than to its partner, regardless of drawing scale.
    if (bodyGap <= maxHostBodyGap) return

    const sdaName = sda.placement.sourceComponentName ?? sda.id
    const sclName = scl.placement.sourceComponentName ?? scl.id
    this.params.issues.push({
      lineItemType: "I2cPullupPairNotGrouped",
      sdaResistorSchematicBox: sda.placement,
      sclResistorSchematicBox: scl.placement,
      hostSchematicBox: host,
      railName: this.netNames.get(sda.powerNet) ?? sda.powerNet,
      bodyGap,
      maxHostBodyGap,
      message: `Consider grouping ${sdaName} (SDA) and ${sclName} (SCL) on the same side of ${host.sourceComponentName ?? "their shared host"} so the I2C pull-ups read as a pair. Preserve their net connections.`,
    })
  }

  private pullups(signalNet: string): Pullup[] {
    const index = this.index
    const ids = new Set(
      (index.portsByNet.get(signalNet) ?? [])
        .filter(
          (port) =>
            index.components.get(port.source_component_id)?.ftype ===
            "simple_resistor",
        )
        .map((port) => port.source_component_id),
    )
    return [...ids].flatMap((id) => {
      const component = index.components.get(id)
      const nets = index.twoTerminalNets(id)
      const placement = index.placement(id)
      const powerNet = nets?.find(
        (net) =>
          net !== signalNet &&
          this.powerNets.has(net) &&
          !index.groundNets.has(net),
      )
      return component?.ftype === "simple_resistor" &&
        component.resistance > 0 &&
        placement &&
        powerNet
        ? [{ id, placement, powerNet }]
        : []
    })
  }

  private sharedLocalHosts({
    sdaNet,
    sclNet,
    sda,
    scl,
  }: {
    sdaNet: ConnectedNetId
    sclNet: ConnectedNetId
    sda: Pullup
    scl: Pullup
  }): SchematicBoxPlacement[] {
    const index = this.index
    const sclIds = new Set(
      (index.portsByNet.get(sclNet) ?? []).map(
        (port) => port.source_component_id,
      ),
    )
    const hosts = new Set<SchematicBoxPlacement>()
    for (const port of index.portsByNet.get(sdaNet) ?? []) {
      const id = port.source_component_id
      if (
        !sclIds.has(id) ||
        index.components.get(id)?.ftype !== "simple_chip" ||
        (index.portsByComponent.get(id)?.length ?? 0) <= 2
      )
        continue
      const host = index.placement(id)
      if (
        host &&
        index.sameLocalScope(host, sda.placement) &&
        index.sameLocalScope(host, scl.placement)
      )
        hosts.add(host)
    }
    return [...hosts]
  }

  static issueToString(issue: I2cPullupPairNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "sdaResistorName",
      issue.sdaResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "sclResistorName",
      issue.sclResistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "hostName", issue.hostSchematicBox.sourceComponentName)
    addAttr(attrs, "rail", issue.railName)
    addAttr(attrs, "bodyGap", issue.bodyGap)
    addAttr(attrs, "maxHostBodyGap", issue.maxHostBodyGap)
    addAttr(attrs, "message", issue.message)
    return `<I2cPullupPairNotGrouped ${attrs.join(" ")} />`
  }
}

function sideOf(
  resistor: SchematicBoxPlacement,
  host: SchematicBoxPlacement,
): Side | undefined {
  const dx = resistor.schX - host.schX
  const dy = resistor.schY - host.schY
  const gapX = Math.abs(dx) - (resistor.width + host.width) / 2
  const gapY = Math.abs(dy) - (resistor.height + host.height) / 2
  // Overlapping bodies and exact corner ties have no unambiguous side.
  if ((gapX <= 0 && gapY <= 0) || gapX === gapY) return
  if (gapX > gapY) return dx > 0 ? "right" : "left"
  return dy > 0 ? "above" : "below"
}

function bodyDistance(
  first: SchematicBoxPlacement,
  second: SchematicBoxPlacement,
): number {
  return Math.hypot(
    Math.max(
      0,
      Math.abs(first.schX - second.schX) - (first.width + second.width) / 2,
    ),
    Math.max(
      0,
      Math.abs(first.schY - second.schY) - (first.height + second.height) / 2,
    ),
  )
}
