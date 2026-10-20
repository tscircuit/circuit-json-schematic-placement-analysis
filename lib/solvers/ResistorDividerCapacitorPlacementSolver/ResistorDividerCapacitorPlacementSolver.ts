import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  CapacitorSeparatedFromResistorDivider,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"
type Port = SourcePort & { source_component_id: string }

/** A non-rail capacitor leaving the tap of two resistors, exactly one grounded. */
export class ResistorDividerCapacitorPlacementSolver extends BaseSolver {
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
    const id = this.capacitorIds[this.currentIndex++]!
    this.solved = this.currentIndex >= this.capacitorIds.length
    const index = this.index,
      cap = this.part(id),
      c = index.components.get(id)
    if (
      c?.ftype !== "simple_capacitor" ||
      !Number.isFinite(c.capacitance) ||
      c.capacitance <= 0 ||
      !cap ||
      cap.nets.some((n) => index.isRail(n))
    )
      return
    const candidates = cap.ports.flatMap((p) => {
      const pair = this.dividerAt(p)
      return pair ? [{ ...pair, capPort: p }] : []
    })
    if (candidates.length !== 1) return
    const { resistors, resistorPorts, capPort, input } = candidates[0]!
    const other = cap.nets.find(
      (n) => n !== index.connected(capPort.source_port_id),
    )!
    // A capacitor across the input resistor, or returning to the same chip, may be feedback.
    if (other === input) return
    const inputHosts = new Set(
      (index.portsByNet.get(input) ?? [])
        .filter((p) =>
          ["simple_chip", "simple_op_amp"].includes(
            index.components.get(p.source_component_id)?.ftype ?? "",
          ),
        )
        .map((p) => p.source_component_id),
    )
    if (
      (index.portsByNet.get(other) ?? []).some((p) =>
        inputHosts.has(p.source_component_id),
      )
    )
      return
    const boxes = [cap.box, ...resistors.map((r) => r.box)]
    if (!boxes.every((b) => index.sameLocalScope(cap.box, b))) return
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++) {
        const x = boxes[a]!,
          y = boxes[b]!
        if (
          Math.abs(x.schX - y.schX) < (x.width + y.width) / 2 &&
          Math.abs(x.schY - y.schY) < (x.height + y.height) / 2
        )
          return
      }
    const cp = index.port(capPort)!,
      rp = resistorPorts.map((p) => index.port(p)!)
    const signalPinDistance = Math.min(
      ...rp.map((p) =>
        Math.hypot(cp.center.x - p.center.x, cp.center.y - p.center.y),
      ),
    )
    // Schematic readability allowance, not an electrical or PCB constraint.
    const maxRecommendedSignalPinDistance = Math.max(
      4,
      3 * Math.max(...boxes.flatMap((b) => [b.width, b.height])),
    )
    if (signalPinDistance <= maxRecommendedSignalPinDistance) return
    this.params.issues.push({
      lineItemType: "CapacitorSeparatedFromResistorDivider",
      capacitorSchematicBox: cap.box,
      resistorSchematicBoxes: resistors.map((r) => r.box),
      capacitorSourcePortId: capPort.source_port_id,
      resistorSourcePortIds: resistorPorts.map((p) => p.source_port_id),
      signalPinDistance,
      maxRecommendedSignalPinDistance,
      message: `Place ${cap.box.sourceComponentName || "the capacitor"} beside the shared junction of ${resistors.map((r) => r.box.sourceComponentName || "resistor").join(" and ")} so the divider and capacitor read together. Preserve all connections and leave space for labels and neighboring parts; exact alignment is not required.`,
    })
  }
  private dividerAt(port: Port) {
    const index = this.index,
      net = index.connected(port.source_port_id),
      members = index.portsByNet.get(net) ?? []
    if (
      members.length !== 3 ||
      index.isRail(net) ||
      members.some((p) => p.do_not_connect)
    )
      return
    const resistorPorts = members.filter(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_resistor",
    )
    if (
      resistorPorts.length !== 2 ||
      new Set(members.map((p) => p.source_component_id)).size !== 3
    )
      return
    const first = this.part(resistorPorts[0]!.source_component_id),
      second = this.part(resistorPorts[1]!.source_component_id)
    if (!first || !second) return
    for (const p of resistorPorts) {
      const c = index.components.get(p.source_component_id)
      if (
        c?.ftype !== "simple_resistor" ||
        !Number.isFinite(c.resistance) ||
        c.resistance <= 0
      )
        return
    }
    const outer = [first, second].map((r) => r.nets.find((n) => n !== net)!)
    if (
      outer.filter((n) => index.groundNets.has(n)).length !== 1 ||
      outer.some((n) => index.powerNets.has(n))
    )
      return
    return {
      resistors: [first, second],
      resistorPorts,
      input: outer.find((n) => !index.groundNets.has(n))!,
    }
  }
  private part(id: string) {
    const index = this.index,
      box = index.placement(id),
      nets = index.twoTerminalNets(id),
      ports = index.portsByComponent.get(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      !nets ||
      ports?.length !== 2 ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      return
    if (
      ports.some((p) => {
        const pin = index.port(p)
        return (
          p.do_not_connect ||
          !pin ||
          pin.schematic_sheet_id !== box.schematicSheetId ||
          ![pin.center.x, pin.center.y].every(Number.isFinite)
        )
      })
    )
      return
    return { box, nets, ports }
  }
  static issueToString(issue: CapacitorSeparatedFromResistorDivider): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "resistorNames",
      issue.resistorSchematicBoxes.map((b) => b.sourceComponentName).join(","),
    )
    addAttr(attrs, "signalPinDistance", issue.signalPinDistance)
    addAttr(
      attrs,
      "maxRecommendedSignalPinDistance",
      issue.maxRecommendedSignalPinDistance,
    )
    addAttr(attrs, "message", issue.message)
    return `<CapacitorSeparatedFromResistorDivider ${attrs.join(" ")} />`
  }
}
