import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  ParallelCapacitorsDrawnInline,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Axis = "x" | "y"
interface Member {
  box?: SchematicBoxPlacement
  pins?: [SchematicPort, SchematicPort]
  axis?: Axis
}

/** Nearby capacitors drawn end-to-end hide their parallel electrical branches. */
export class ParallelCapacitorAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly banks: Member[][]
  private bankIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const index = (this.index = new PlacementNetworkIndex(params.ctx))
    const excluded = new Set(
      params.ctx.circuitJson.flatMap((e) =>
        e.type === "pcb_component" && e.do_not_place
          ? [e.source_component_id]
          : [],
      ),
    )
    const banks = new Map<string, Member[]>()
    for (const component of index.components.values()) {
      if (component.ftype !== "simple_capacitor") continue
      const id = component.source_component_id
      const nets = index.twoTerminalNets(id)?.sort()
      if (!nets) continue
      const key = JSON.stringify(nets)
      const bank = banks.get(key) ?? []
      // Keep all members in the electrical bank; validate each local pair below.
      const member: Member = { box: index.placement(id) }
      bank.push(member)
      banks.set(key, bank)
      if (
        !member.box ||
        excluded.has(id) ||
        !Number.isFinite(component.capacitance) ||
        component.capacitance <= 0
      )
        continue
      const ports = index.portsByComponent.get(id)!
      if (ports.some((port) => port.do_not_connect)) continue
      const [a, b] = ports.map((port) => index.port(port))
      if (
        !a ||
        !b ||
        [a, b].some(
          (pin) => pin.schematic_sheet_id !== member.box!.schematicSheetId,
        )
      )
        continue
      member.pins = [a, b]
      member.axis = pinAxis(a, b)
    }
    this.banks = [...banks.values()]
    this.solved = this.banks.length === 0
  }

  override _step(): void {
    const members = this.banks[this.bankIndex++]!
    this.solved = this.bankIndex >= this.banks.length
    for (let a = 0; a < members.length; a++)
      for (let b = a + 1; b < members.length; b++)
        this.checkPair(members[a]!, members[b]!)
  }

  private checkPair(first: Member, second: Member): void {
    if (
      !first?.box ||
      !second?.box ||
      !first.pins ||
      !second.pins ||
      !first.axis ||
      first.axis !== second.axis
    )
      return
    const a = first.box
    const b = second.box
    if (!this.index.sameLocalScope(a, b)) return
    if (
      [a.width, a.height, b.width, b.height].some(
        (size) => !Number.isFinite(size) || size <= 0,
      )
    )
      return

    // Shared supply rails can span unrelated circuit blocks. Only consider a
    // nearby pair; this is a readability tolerance, not a physical design limit.
    const span = Math.max(a.width, a.height, b.width, b.height)
    if (!Number.isFinite(span) || span <= 0) return
    const axis = first.axis
    const along = Math.abs(axis === "x" ? a.schX - b.schX : a.schY - b.schY)
    const across = Math.abs(axis === "x" ? a.schY - b.schY : a.schX - b.schX)
    if (!Number.isFinite(along) || !Number.isFinite(across)) return
    if (along < span || along > 3 * span || across > span / 4) return

    // Report end-to-end bodies in the same row/column, not ordinary staggered
    // parallel branches or component collisions (which have their own rule).
    const perpendicularOverlap =
      axis === "x"
        ? (a.height + b.height) / 2 - Math.abs(a.schY - b.schY)
        : (a.width + b.width) / 2 - Math.abs(a.schX - b.schX)
    if (perpendicularOverlap <= 0.01) return
    const bodyOverlap =
      axis === "x"
        ? (a.width + b.width) / 2 - Math.abs(a.schX - b.schX)
        : (a.height + b.height) / 2 - Math.abs(a.schY - b.schY)
    if (bodyOverlap > 0) return
    const p = first.pins.map((pin) => pin.center[axis])
    const q = second.pins.map((pin) => pin.center[axis])
    const spanOverlap =
      Math.min(Math.max(...p), Math.max(...q)) -
      Math.max(Math.min(...p), Math.min(...q))
    if (spanOverlap > 0.01) return

    this.params.issues.push({
      lineItemType: "ParallelCapacitorsDrawnInline",
      firstCapacitorSchematicBox: a,
      secondCapacitorSchematicBox: b,
      message: `Draw ${a.sourceComponentName || "the first capacitor"} and ${b.sourceComponentName || "the second capacitor"} beside each other as two parallel branches between their shared nets. Preserve both capacitors' connections, leave room for labels, and reroute the affected wires.`,
    })
  }

  static issueToString(issue: ParallelCapacitorsDrawnInline): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "firstCapacitorName",
      issue.firstCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondCapacitorName",
      issue.secondCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<ParallelCapacitorsDrawnInline ${attrs.join(" ")} />`
  }
}

function pinAxis(a: SchematicPort, b: SchematicPort): Axis | undefined {
  if (![a.center.x, a.center.y, b.center.x, b.center.y].every(Number.isFinite))
    return
  const directions = new Set([a.facing_direction, b.facing_direction])
  if (
    directions.has("left") &&
    directions.has("right") &&
    Math.abs(a.center.y - b.center.y) < 0.01 &&
    Math.abs(a.center.x - b.center.x) > 0.01
  )
    return "x"
  if (
    directions.has("up") &&
    directions.has("down") &&
    Math.abs(a.center.x - b.center.x) < 0.01 &&
    Math.abs(a.center.y - b.center.y) > 0.01
  )
    return "y"
}
