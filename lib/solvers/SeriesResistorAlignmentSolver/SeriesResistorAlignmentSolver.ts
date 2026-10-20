import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  SeriesResistorsNotAligned,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"
const directions = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, 1],
  down: [0, -1],
} as const

/** Two resistors with a private, non-rail junction should read end-to-end. */
export class SeriesResistorAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly nets: string[]
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
    this.nets = [...this.index.portsByNet.keys()]
    this.solved = this.nets.length === 0
  }
  override _step(): void {
    const net = this.nets[this.currentIndex++]!
    this.solved = this.currentIndex >= this.nets.length
    const index = this.index,
      ports = index.portsByNet.get(net)!
    if (index.isRail(net) || ports.length !== 2) return
    const [a, b] = ports as [(typeof ports)[number], (typeof ports)[number]]
    if (a.source_component_id === b.source_component_id) return
    const first = this.resistor(a.source_component_id),
      second = this.resistor(b.source_component_id)
    if (!first || !second || !index.sameLocalScope(first.box, second.box))
      return
    // Parallel resistors and shorted components do not establish a series path.
    if (first.nets.filter((n) => second.nets.includes(n)).length !== 1) return
    const x = first.box,
      y = second.box
    if (
      Math.abs(x.schX - y.schX) < (x.width + y.width) / 2 &&
      Math.abs(x.schY - y.schY) < (x.height + y.height) / 2
    )
      return
    const pa = index.port(a)!,
      pb = index.port(b)!,
      av = pa.facing_direction && directions[pa.facing_direction],
      bv = pb.facing_direction && directions[pb.facing_direction]
    if (!av || !bv) return
    const dx = pb.center.x - pa.center.x,
      dy = pb.center.y - pa.center.y
    // A compact bend can already read clearly (for example a gate-resistor excerpt).
    // Only diagnose visibly separated pairs, not every departure from a straight line.
    const compactDistance = Math.max(
      2,
      2 * Math.max(x.width, x.height, y.width, y.height),
    )
    if (Math.hypot(dx, dy) <= compactDistance) return
    const axisOffset = Math.abs(dx * av[1] - dy * av[0])
    // Allow either axis and small symbol-origin offsets. No required absolute position.
    if (
      av[0] * bv[0] + av[1] * bv[1] === -1 &&
      dx * av[0] + dy * av[1] > 0 &&
      axisOffset <= 0.15
    )
      return
    this.params.issues.push({
      lineItemType: "SeriesResistorsNotAligned",
      firstResistorSchematicBox: x,
      secondResistorSchematicBox: y,
      firstSourcePortId: a.source_port_id,
      secondSourcePortId: b.source_port_id,
      message: `Align ${x.sourceComponentName || "the first resistor"} and ${y.sourceComponentName || "the second resistor"} so their private connection reads end-to-end. Preserve pin connections, leave room for labels and neighboring parts, and reroute the trace.`,
    })
  }
  private resistor(id: string) {
    const index = this.index,
      c = index.components.get(id),
      box = index.placement(id),
      nets = index.twoTerminalNets(id)
    if (
      c?.ftype !== "simple_resistor" ||
      !Number.isFinite(c.resistance) ||
      c.resistance <= 0 ||
      this.unpopulated.has(id) ||
      !box ||
      !nets
    )
      return
    if (
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      return
    if (
      index.portsByComponent
        .get(id)!
        .some((p) => !this.validPort(p, box.schematicSheetId))
    )
      return
    return { box, nets }
  }
  private validPort(
    p: SourcePort & { source_component_id: string },
    sheetId?: string,
  ) {
    const pin = this.index.port(p)
    return (
      !p.do_not_connect &&
      pin &&
      pin.schematic_sheet_id === sheetId &&
      [pin.center.x, pin.center.y].every(Number.isFinite)
    )
  }
  static issueToString(issue: SeriesResistorsNotAligned): string {
    const attrs: string[] = []
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
    addAttr(attrs, "message", issue.message)
    return `<SeriesResistorsNotAligned ${attrs.join(" ")} />`
  }
}
