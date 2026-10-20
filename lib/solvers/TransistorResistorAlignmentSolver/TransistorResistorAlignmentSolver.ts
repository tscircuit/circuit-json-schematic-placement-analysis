import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  TransistorResistorNotAligned,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"
const vectors = {
  up: [0, 1],
  down: [0, -1],
  left: [-1, 0],
  right: [1, 0],
} as const

/** Align a separated resistor with its private non-rail transistor connection. */
export class TransistorResistorAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly unpopulated = new Set<string>()
  private readonly nets: string[]
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
    this.nets = [...this.index.portsByNet.keys()]
    this.solved = this.nets.length === 0
  }

  override _step(): void {
    const net = this.nets[this.currentIndex++]
    this.solved = this.currentIndex >= this.nets.length
    if (!net) return
    const index = this.index,
      ports = index.portsByNet.get(net)!
    if (index.isRail(net) || ports.length !== 2) return
    const rp = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_resistor",
    )
    const tp = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_transistor",
    )
    if (!rp || !tp) return
    const resistor = index.components.get(rp.source_component_id),
      transistor = index.components.get(tp.source_component_id)
    if (
      resistor?.ftype !== "simple_resistor" ||
      !Number.isFinite(resistor.resistance) ||
      resistor.resistance <= 0 ||
      transistor?.ftype !== "simple_transistor" ||
      !["npn", "pnp"].includes(transistor.transistor_type)
    )
      return
    const rb = this.validPlacement(rp.source_component_id, 2),
      tb = this.validPlacement(tp.source_component_id, 3),
      rn = index.twoTerminalNets(rp.source_component_id)
    if (
      !rb ||
      !tb ||
      !index.sameLocalScope(rb, tb) ||
      !rn ||
      rn.some((n) => index.isRail(n))
    )
      return
    const tn = index.portsByComponent
      .get(tp.source_component_id)!
      .map((p) => index.connected(p.source_port_id))
    // A resistor returning to another terminal of this transistor is feedback, not a series input path.
    if (new Set(tn).size !== 3 || tn.includes(rn.find((n) => n !== net)!))
      return
    // Overlapping bodies need collision correction before judging terminal alignment.
    if (
      Math.abs(rb.schX - tb.schX) < (rb.width + tb.width) / 2 &&
      Math.abs(rb.schY - tb.schY) < (rb.height + tb.height) / 2
    )
      return
    const r = index.port(rp)!,
      t = index.port(tp)!,
      rv = vectors[r.facing_direction!],
      tv = vectors[t.facing_direction!]
    const dx = t.center.x - r.center.x,
      dy = t.center.y - r.center.y
    // Small bends may already be readable. Do not demand exact placement for close parts.
    const compactDistance = Math.max(2, 2 * Math.max(rb.width, rb.height))
    if (Math.hypot(dx, dy) <= compactDistance) return
    const axisOffset = Math.abs(dx * rv[1] - dy * rv[0])
    if (
      rv[0] * tv[0] + rv[1] * tv[1] === -1 &&
      dx * rv[0] + dy * rv[1] > 0 &&
      axisOffset <= 0.15
    )
      return
    this.params.issues.push({
      lineItemType: "TransistorResistorNotAligned",
      transistorSchematicBox: tb,
      resistorSchematicBox: rb,
      transistorSourcePortId: tp.source_port_id,
      resistorSourcePortId: rp.source_port_id,
      message: `Align ${rb.sourceComponentName || "the resistor"} with its connected terminal on ${tb.sourceComponentName || "the transistor"} so the separated pair reads along a straight wire. Preserve all pin connections and transistor polarity, leave room for labels and neighboring parts, and reroute affected traces.`,
    })
  }

  private validPlacement(id: string, pinCount: number) {
    const box = this.index.placement(id),
      ports = this.index.portsByComponent.get(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      ports?.length !== pinCount ||
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
  ) {
    const geometry = this.index.port(p)
    return (
      !p.do_not_connect &&
      geometry &&
      geometry.schematic_sheet_id === sheetId &&
      [geometry.center.x, geometry.center.y].every(Number.isFinite) &&
      geometry.facing_direction &&
      geometry.facing_direction in vectors
    )
  }

  static issueToString(issue: TransistorResistorNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "transistorName",
      issue.transistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<TransistorResistorNotAligned ${attrs.join(" ")} />`
  }
}
