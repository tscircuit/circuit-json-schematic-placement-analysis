import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  SharedNodeDiodesInline,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Two local branches drawn inline despite their shared, equally-facing power terminals. */
export class SharedNodeDiodePlacementSolver extends BaseSolver {
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
        if (e.requires_power || e.provides_power) this.index.powerNets.add(net)
        if (e.requires_ground || e.provides_ground)
          this.index.groundNets.add(net)
      }
    }
    this.nets = [...this.index.powerNets]
    this.solved = this.nets.length === 0
  }

  override _step(): void {
    const net = this.nets[this.currentIndex++]
    this.solved = this.currentIndex >= this.nets.length
    if (!net || this.index.groundNets.has(net)) return
    const index = this.index
    const ports = (index.portsByNet.get(net) ?? []).filter(
      (p) =>
        index.components.get(p.source_component_id)?.ftype === "simple_diode",
    )
    // More branches, parallel diodes, and ground clamps require different policies.
    if (
      ports.length !== 2 ||
      ports[0]!.source_component_id === ports[1]!.source_component_id
    )
      return
    const a = this.diode(ports[0]!.source_component_id)
    const b = this.diode(ports[1]!.source_component_id)
    if (!a || !b) return
    const otherA = a.nets.find((n) => n !== net)
    const otherB = b.nets.find((n) => n !== net)
    if (
      !otherA ||
      !otherB ||
      otherA === otherB ||
      index.groundNets.has(otherA) ||
      index.groundNets.has(otherB)
    )
      return
    if (
      a.box.schematicSheetId !== b.box.schematicSheetId ||
      a.box.subcircuitId !== b.box.subcircuitId
    )
      return
    // Without a confirmed sheet, require the same local group rather than assuming locality.
    if (!a.box.schematicSheetId && !index.sameLocalScope(a.box, b.box)) return
    const p = index.port(ports[0]!)
    const q = index.port(ports[1]!)
    if (
      !p ||
      !q ||
      p.schematic_sheet_id !== a.box.schematicSheetId ||
      q.schematic_sheet_id !== b.box.schematicSheetId
    )
      return
    const facing = p.facing_direction
    if (
      !facing ||
      facing !== q.facing_direction ||
      !["up", "down", "left", "right"].includes(facing)
    )
      return
    const vertical = facing === "up" || facing === "down"
    const along = Math.abs(
      vertical ? p.center.y - q.center.y : p.center.x - q.center.x,
    )
    const across = Math.abs(
      vertical ? p.center.x - q.center.x : p.center.y - q.center.y,
    )
    const length = Math.max(
      vertical ? a.box.height : a.box.width,
      vertical ? b.box.height : b.box.width,
    )
    const width = Math.max(
      vertical ? a.box.width : a.box.height,
      vertical ? b.box.width : b.box.height,
    )
    // Allow nearby/staggered branches. Limit this advisory to a local pair; remote
    // power entries on a large sheet need additional section metadata before grouping.
    if (along <= Math.max(2, 2 * length) || along > 12 || across >= width)
      return
    const names = [a.box, b.box].map(
      (box) => box.sourceComponentName || "diode",
    )
    this.params.issues.push({
      lineItemType: "SharedNodeDiodesInline",
      diodeSchematicBoxes: [a.box, b.box],
      sharedSourcePortIds: [p.source_port_id!, q.source_port_id!],
      inlinePinSeparation: along,
      message: `Place ${names.join(" and ")} in adjacent ${vertical ? "columns" : "rows"} so their shared power connection reads as two branches. Preserve orientations and pin connections, leave room for labels, and reroute affected traces; exact alignment is not required.`,
    })
  }

  private diode(id: string) {
    if (this.unpopulated.has(id)) return
    const index = this.index
    const box = index.placement(id)
    const nets = index.twoTerminalNets(id)
    const ports = index.portsByComponent.get(id)
    if (!box || !nets || !ports || ports.some((p) => p.do_not_connect)) return
    if (
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      return
    const pins = ports.map((p) => index.port(p))
    if (
      pins.some(
        (p) =>
          !p || !Number.isFinite(p.center.x) || !Number.isFinite(p.center.y),
      )
    )
      return
    return { box, nets }
  }

  static issueToString(issue: SharedNodeDiodesInline): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "diodeNames",
      issue.diodeSchematicBoxes.map((p) => p.sourceComponentName).join(","),
    )
    addAttr(attrs, "inlinePinSeparation", issue.inlinePinSeparation)
    addAttr(attrs, "message", issue.message)
    return `<SharedNodeDiodesInline ${attrs.join(" ")} />`
  }
}
