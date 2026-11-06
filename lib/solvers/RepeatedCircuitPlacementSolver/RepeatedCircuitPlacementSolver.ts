import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  RepeatedCircuitLayoutInconsistent,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

interface RcChannel {
  resistorId: string
  capacitorId: string
  resistorBox: SchematicBoxPlacement
  capacitorBox: SchematicBoxPlacement
  resistance: number
  capacitance: number
  offset: { x: number; y: number }
}

/** Detect an inconsistent relative placement among three or more equivalent RC channels. */
export class RepeatedCircuitPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly unpopulated = new Set<string>()
  private readonly groups: RcChannel[][] = []
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    for (const element of params.ctx.circuitJson) {
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
      if (element.type === "source_port") {
        const net = this.index.connected(element.source_port_id)
        if (element.requires_ground || element.provides_ground)
          this.index.groundNets.add(net)
        if (
          element.requires_power ||
          element.provides_power ||
          element.requires_voltage !== undefined ||
          element.provides_voltage !== undefined
        )
          this.index.powerNets.add(net)
      }
    }
    this.groups = this.collectChannelGroups()
    this.solved = this.groups.length === 0
  }

  override _step(): void {
    const channels = this.groups[this.currentIndex++]
    this.solved = this.currentIndex >= this.groups.length
    if (!channels || channels.length < 3) return

    for (let i = 0; i < channels.length; i++) {
      const candidate = channels[i]!
      const matchingPeers = channels.filter(
        (other, j) =>
          j !== i &&
          Math.hypot(
            other.offset.x - candidate.offset.x,
            other.offset.y - candidate.offset.y,
          ) <= 0.25,
      )
      if (matchingPeers.length < 1) continue
      const referenceOffsets = [candidate, ...matchingPeers]
      if (referenceOffsets.length < 2) continue
      const expectedOffset = {
        x:
          referenceOffsets.reduce((sum, ch) => sum + ch.offset.x, 0) /
          referenceOffsets.length,
        y:
          referenceOffsets.reduce((sum, ch) => sum + ch.offset.y, 0) /
          referenceOffsets.length,
      }
      const outliers = channels.filter(
        (ch) =>
          Math.hypot(
            ch.offset.x - expectedOffset.x,
            ch.offset.y - expectedOffset.y,
          ) > 2.5,
      )
      if (
        outliers.length !== 1 ||
        referenceOffsets.length !== channels.length - 1
      )
        continue
      const outlier = outliers[0]!
      const offsetDeviation = Math.hypot(
        outlier.offset.x - expectedOffset.x,
        outlier.offset.y - expectedOffset.y,
      )
      this.params.issues.push({
        lineItemType: "RepeatedCircuitLayoutInconsistent",
        outlierResistorSchematicBox: outlier.resistorBox,
        outlierCapacitorSchematicBox: outlier.capacitorBox,
        channelSchematicBoxes: channels.flatMap((ch) => [
          ch.resistorBox,
          ch.capacitorBox,
        ]),
        expectedOffset,
        actualOffset: outlier.offset,
        offsetDeviation,
        message: `Place ${outlier.capacitorBox.sourceComponentName || "the capacitor"} and ${outlier.resistorBox.sourceComponentName || "the resistor"} with the same relative offset as the matching RC channels so the repeated stages read consistently. Preserve all pin connections and reroute affected traces.`,
      })
      return
    }
  }

  private collectChannelGroups(): RcChannel[][] {
    const index = this.index
    const channels: RcChannel[] = []
    const usedIds = new Set<string>()

    for (const [id, component] of index.components) {
      if (
        component.ftype !== "simple_resistor" ||
        !Number.isFinite(component.resistance) ||
        component.resistance <= 0
      )
        continue
      const resistorBox = this.validBox(id)
      const nets = index.twoTerminalNets(id)
      if (!resistorBox || !nets || nets.some((n) => index.isRail(n))) continue

      const junctionCandidates = nets.flatMap((net) => {
        const ports = index.portsByNet.get(net) ?? []
        if (ports.length !== 2 || ports.some((p) => p.do_not_connect)) return []
        const peer = ports.find((p) => p.source_component_id !== id)
        if (!peer) return []
        const cap = index.components.get(peer.source_component_id)
        if (
          cap?.ftype !== "simple_capacitor" ||
          !Number.isFinite(cap.capacitance) ||
          cap.capacitance <= 0
        )
          return []
        const capBox = this.validBox(peer.source_component_id)
        const capNets = index.twoTerminalNets(peer.source_component_id)
        const groundNet = capNets?.find((n) => n !== net)
        if (
          !capBox ||
          !groundNet ||
          !index.groundNets.has(groundNet) ||
          index.powerNets.has(groundNet) ||
          !index.sameLocalScope(resistorBox, capBox)
        )
          return []
        const otherResistorNet = nets.find((n) => n !== net)!
        const otherPorts = index.portsByNet.get(otherResistorNet) ?? []
        if (otherPorts.length !== 1) return []
        return [
          {
            capacitorId: peer.source_component_id,
            capacitorBox: capBox,
            capacitance: cap.capacitance,
          },
        ]
      })

      if (junctionCandidates.length !== 1) continue
      const match = junctionCandidates[0]!
      if (usedIds.has(id) || usedIds.has(match.capacitorId)) continue
      usedIds.add(id)
      usedIds.add(match.capacitorId)
      channels.push({
        resistorId: id,
        capacitorId: match.capacitorId,
        resistorBox,
        capacitorBox: match.capacitorBox,
        resistance: component.resistance,
        capacitance: match.capacitance,
        offset: {
          x: match.capacitorBox.schX - resistorBox.schX,
          y: match.capacitorBox.schY - resistorBox.schY,
        },
      })
    }

    const groups: RcChannel[][] = []
    for (const channel of channels) {
      const existing = groups.find(
        (group) =>
          group[0]!.resistance === channel.resistance &&
          group[0]!.capacitance === channel.capacitance &&
          index.sameLocalScope(group[0]!.resistorBox, channel.resistorBox),
      )
      if (existing) existing.push(channel)
      else groups.push([channel])
    }
    return groups.filter((group) => group.length >= 3)
  }

  private validBox(id: string): SchematicBoxPlacement | undefined {
    const box = this.index.placement(id)
    const ports = this.index.portsByComponent.get(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      ports?.length !== 2 ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0 ||
      ports.some((p) => !this.validPort(p, box.schematicSheetId))
    )
      return
    return box
  }

  private validPort(
    p: SourcePort & { source_component_id: string },
    sheetId?: string,
  ): boolean {
    const pin = this.index.port(p)
    return Boolean(
      !p.do_not_connect &&
        pin &&
        pin.schematic_sheet_id === sheetId &&
        Number.isFinite(pin.center.x) &&
        Number.isFinite(pin.center.y),
    )
  }

  static issueToString(issue: RepeatedCircuitLayoutInconsistent): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "outlierResistorName",
      issue.outlierResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "outlierCapacitorName",
      issue.outlierCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "offsetDeviation", issue.offsetDeviation)
    addAttr(attrs, "message", issue.message)
    return `<RepeatedCircuitLayoutInconsistent ${attrs.join(" ")} />`
  }
}
