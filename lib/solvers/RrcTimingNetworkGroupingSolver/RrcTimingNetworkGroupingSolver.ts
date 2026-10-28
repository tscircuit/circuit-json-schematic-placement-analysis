import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  RrcTimingNetworkNotGrouped,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** A rail–R–R–C–ground chain with both intermediate nodes connected to one chip. */
export class RrcTimingNetworkGroupingSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly capacitorIds: string[]
  private readonly unpopulated = new Set<string>()
  private currentIndex = 0
  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    for (const e of params.ctx.circuitJson) {
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
      if (e.type === "source_port") {
        const net = this.index.connected(e.source_port_id)
        if (e.requires_ground || e.provides_ground)
          this.index.groundNets.add(net)
        if (
          e.requires_power ||
          e.provides_power ||
          e.requires_voltage !== undefined ||
          e.provides_voltage !== undefined
        )
          this.index.powerNets.add(net)
      }
    }
    this.capacitorIds = [...this.index.components.values()]
      .filter((c) => c.ftype === "simple_capacitor")
      .map((c) => c.source_component_id)
    this.solved = this.capacitorIds.length === 0
  }
  override _step(): void {
    const cid = this.capacitorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.capacitorIds.length
    if (!cid) return
    const ix = this.index,
      c = ix.components.get(cid),
      cap = this.localPart(cid),
      cn = ix.twoTerminalNets(cid)
    if (
      c?.ftype !== "simple_capacitor" ||
      !Number.isFinite(c.capacitance) ||
      c.capacitance <= 0 ||
      !cap ||
      !cn
    )
      return
    const ground = cn.find((n) => ix.groundNets.has(n) && !ix.powerNets.has(n)),
      timing = cn.find((n) => !ix.isRail(n))
    if (!ground || !timing) return
    // The lower junction joins the capacitor, one resistor and two pins of the same chip.
    const peers = ix.portsByNet.get(timing) ?? [],
      hosts = peers.filter(
        (p) =>
          ix.components.get(p.source_component_id)?.ftype === "simple_chip",
      ),
      resistors = peers.filter(
        (p) =>
          ix.components.get(p.source_component_id)?.ftype === "simple_resistor",
      )
    if (
      peers.length !== 4 ||
      hosts.length !== 2 ||
      resistors.length !== 1 ||
      hosts[0]!.source_component_id !== hosts[1]!.source_component_id ||
      peers.some((p) => p.do_not_connect || hasSupplyRole(p))
    )
      return
    const hostId = hosts[0]!.source_component_id,
      host = ix.placement(hostId),
      r2id = resistors[0]!.source_component_id,
      r2 = ix.components.get(r2id),
      second = this.localPart(r2id),
      r2nets = ix.twoTerminalNets(r2id)
    if (
      !host ||
      this.unpopulated.has(hostId) ||
      r2?.ftype !== "simple_resistor" ||
      !Number.isFinite(r2.resistance) ||
      r2.resistance <= 0 ||
      !second ||
      !r2nets
    )
      return
    const junction = r2nets.find((n) => n !== timing)
    if (!junction || ix.isRail(junction)) return
    // The upper junction joins the two resistors and exactly one more pin of that chip.
    const upper = ix.portsByNet.get(junction) ?? [],
      hostPorts = upper.filter((p) => p.source_component_id === hostId),
      firstPorts = upper.filter(
        (p) =>
          p.source_component_id !== r2id &&
          ix.components.get(p.source_component_id)?.ftype === "simple_resistor",
      )
    if (
      upper.length !== 3 ||
      hostPorts.length !== 1 ||
      firstPorts.length !== 1 ||
      upper.some((p) => p.do_not_connect || hasSupplyRole(p))
    )
      return
    const r1id = firstPorts[0]!.source_component_id,
      r1 = ix.components.get(r1id),
      first = this.localPart(r1id),
      r1nets = ix.twoTerminalNets(r1id),
      power = r1nets?.find((n) => n !== junction)
    if (
      r1?.ftype !== "simple_resistor" ||
      !Number.isFinite(r1.resistance) ||
      r1.resistance <= 0 ||
      !first ||
      !power ||
      !ix.powerNets.has(power) ||
      ix.groundNets.has(power)
    )
      return
    if (
      ![power, ground].every((n) =>
        (ix.portsByNet.get(n) ?? []).some(
          (p) => p.source_component_id === hostId,
        ),
      )
    )
      return
    const parts = [first, second, cap]
    if (
      parts.some((b) => !ix.sameLocalScope(b, host)) ||
      ![host.schX, host.schY, host.width, host.height].every(Number.isFinite) ||
      host.width <= 0 ||
      host.height <= 0
    )
      return
    if (
      [...hosts, ...hostPorts].some((p) => {
        const pin = ix.port(p)
        return (
          !pin ||
          pin.schematic_sheet_id !== host.schematicSheetId ||
          ![pin.center.x, pin.center.y].every(Number.isFinite)
        )
      })
    )
      return
    const distance = (net: string, ids: string[]) => {
      const pins = (ix.portsByNet.get(net) ?? [])
        .filter((p) => ids.includes(p.source_component_id))
        .map((p) => ix.port(p)!)
      return Math.hypot(
        pins[0]!.center.x - pins[1]!.center.x,
        pins[0]!.center.y - pins[1]!.center.y,
      )
    }
    const maxPinDistance = Math.max(
      distance(junction, [r1id, r2id]),
      distance(timing, [r2id, cid]),
    )
    // Only excessive separation: accept horizontal, vertical, mirrored and offset compact chains.
    const maxRecommendedPinDistance = Math.max(
      4,
      ...parts.map((b) => 3 * Math.max(b.width, b.height)),
    )
    if (maxPinDistance <= maxRecommendedPinDistance) return
    this.params.issues.push({
      lineItemType: "RrcTimingNetworkNotGrouped",
      hostSchematicBox: host,
      firstResistorSchematicBox: first,
      secondResistorSchematicBox: second,
      capacitorSchematicBox: cap,
      maxPinDistance,
      maxRecommendedPinDistance,
      message: `Group ${first.sourceComponentName || "first resistor"}, ${second.sourceComponentName || "second resistor"} and ${cap.sourceComponentName || "capacitor"} into a compact connected chain beside ${host.sourceComponentName || "chip"}. Keep the intermediate chip connections visible, preserve pin connections, leave room for labels, and reroute affected wires; exact alignment is not required.`,
    })
  }
  private localPart(id: string) {
    const ix = this.index,
      b = ix.placement(id),
      ps = ix.portsByComponent.get(id) ?? []
    if (
      !b ||
      this.unpopulated.has(id) ||
      ps.length !== 2 ||
      ![b.schX, b.schY, b.width, b.height].every(Number.isFinite) ||
      b.width <= 0 ||
      b.height <= 0
    )
      return
    if (
      ps.some((p) => {
        const pin = ix.port(p)
        return (
          p.do_not_connect ||
          !pin ||
          pin.schematic_sheet_id !== b.schematicSheetId ||
          ![pin.center.x, pin.center.y].every(Number.isFinite)
        )
      })
    )
      return
    return b
  }
  static issueToString(issue: RrcTimingNetworkNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "firstResistorName",
      issue.firstResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondResistorName",
      issue.secondResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "maxPinDistance", issue.maxPinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<RrcTimingNetworkNotGrouped ${attrs.join(" ")} />`
  }
}
function hasSupplyRole(p: SourcePort): boolean {
  return Boolean(
    p.requires_power ||
      p.provides_power ||
      p.requires_ground ||
      p.provides_ground ||
      p.requires_voltage !== undefined ||
      p.provides_voltage !== undefined,
  )
}
