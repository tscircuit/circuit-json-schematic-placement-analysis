import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  ParallelDiodesNotAligned,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Match electrical endpoints of a local two-diode bank, without inferring polarity. */
export class ParallelDiodeAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly banks: string[][]
  private readonly unpopulated = new Set<string>()
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const index = (this.index = new PlacementNetworkIndex(params.ctx))
    for (const e of params.ctx.circuitJson) {
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
      if (e.type !== "source_port") continue
      const net = index.connected(e.source_port_id)
      if (
        e.requires_power ||
        e.provides_power ||
        e.requires_voltage !== undefined ||
        e.provides_voltage !== undefined
      )
        index.powerNets.add(net)
      if (e.requires_ground || e.provides_ground) index.groundNets.add(net)
    }
    const banks = new Map<string, string[]>()
    for (const c of index.components.values()) {
      if (c.ftype !== "simple_diode") continue
      const nets = index.twoTerminalNets(c.source_component_id)?.sort()
      if (!nets || nets.every((net) => index.isRail(net))) continue
      const key = JSON.stringify(nets)
      const bank = banks.get(key) ?? []
      // Unplaced/unsupported members also make a larger bank ambiguous.
      bank.push(c.source_component_id)
      banks.set(key, bank)
    }
    this.banks = [...banks.values()]
    this.solved = this.banks.length === 0
  }

  override _step(): void {
    const ids = this.banks[this.currentIndex++]!
    this.solved = this.currentIndex >= this.banks.length
    if (ids.length !== 2) return
    const first = this.member(ids[0]!),
      second = this.member(ids[1]!)
    if (!first || !second || !this.index.sameLocalScope(first.box, second.box))
      return
    const a = first.box,
      b = second.box
    // Shared rails can connect different blocks; only advise on a local pair.
    if (
      Math.hypot(a.schX - b.schX, a.schY - b.schY) >
      6 * Math.max(a.width, a.height, b.width, b.height)
    )
      return
    if (
      Math.abs(a.schX - b.schX) < (a.width + b.width) / 2 &&
      Math.abs(a.schY - b.schY) < (a.height + b.height) / 2
    )
      return
    const axis = pinAxis(first.pins)
    if (!axis || axis !== pinAxis(second.pins)) return
    const coordinate = axis === "horizontal" ? "x" : "y"
    const [a0, a1] = first.pins,
      [b0, b1] = second.pins
    // Both pairs are sorted by the SAME net IDs. Negative product means that
    // those nets appear at opposite ends, forcing a wraparound connection.
    if (
      (a1.center[coordinate] - a0.center[coordinate]) *
        (b1.center[coordinate] - b0.center[coordinate]) >=
      0
    )
      return
    this.params.issues.push({
      lineItemType: "ParallelDiodesNotAligned",
      firstDiodeSchematicBox: a,
      secondDiodeSchematicBox: b,
      message: `Align ${a.sourceComponentName || "the first diode"} and ${b.sourceComponentName || "the second diode"} so their shared nets appear at matching ends. Rotate or move the symbols without changing pin connections or diode polarity, leave room for labels, and reroute the wires.`,
    })
  }

  private member(id: string) {
    const box = this.index.placement(id),
      ports = this.index.portsByComponent.get(id)
    if (
      !box ||
      ports?.length !== 2 ||
      this.unpopulated.has(id) ||
      ports.some((p) => p.do_not_connect) ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      return
    const nets = this.index.twoTerminalNets(id)!.sort()
    const pins = nets.map((net) =>
      this.index.port(
        ports.find((p) => this.index.connected(p.source_port_id) === net)!,
      ),
    )
    const [a, b] = pins
    if (
      !a ||
      !b ||
      pins.some((p) => p?.schematic_sheet_id !== box.schematicSheetId) ||
      ![a.center.x, a.center.y, b.center.x, b.center.y].every(Number.isFinite)
    )
      return
    return { box, pins: [a, b] as [SchematicPort, SchematicPort] }
  }

  static issueToString(issue: ParallelDiodesNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "firstDiodeName",
      issue.firstDiodeSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondDiodeName",
      issue.secondDiodeSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<ParallelDiodesNotAligned ${attrs.join(" ")} />`
  }
}

function pinAxis([a, b]: [SchematicPort, SchematicPort]) {
  const facing = new Set([a.facing_direction, b.facing_direction])
  if (
    facing.has("left") &&
    facing.has("right") &&
    Math.abs(a.center.y - b.center.y) < 0.01 &&
    Math.abs(a.center.x - b.center.x) > 0.01
  )
    return "horizontal"
  if (
    facing.has("up") &&
    facing.has("down") &&
    Math.abs(a.center.x - b.center.x) < 0.01 &&
    Math.abs(a.center.y - b.center.y) > 0.01
  )
    return "vertical"
}
