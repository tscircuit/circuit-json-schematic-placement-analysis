import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  ParallelResistorsDrawnInline,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Axis = "x" | "y"
interface Member {
  id: string
  box?: SchematicBoxPlacement
  pins?: [SchematicPort, SchematicPort]
  axis?: Axis
}

/** A local parallel pair drawn end-to-end hides the two electrical branches. */
export class ParallelResistorPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly banks: { nets: string[]; members: Member[] }[]
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
    const banks = new Map<string, { nets: string[]; members: Member[] }>()
    for (const component of index.components.values()) {
      if (component.ftype !== "simple_resistor") continue
      const id = component.source_component_id
      const nets = index.twoTerminalNets(id)?.sort()
      if (!nets) continue
      const key = JSON.stringify(nets)
      const bank = banks.get(key) ?? { nets, members: [] }
      // Count unsupported/unplaced members too; never manufacture a unique pair.
      const member: Member = { id, box: index.placement(id) }
      bank.members.push(member)
      banks.set(key, bank)
      if (
        !member.box ||
        excluded.has(id) ||
        !Number.isFinite(component.resistance) ||
        component.resistance <= 0
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
    const { nets, members } = this.banks[this.bankIndex++]!
    this.solved = this.bankIndex >= this.banks.length
    if (members.length !== 2) return
    const [first, second] = members
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

    // One shared non-rail node must be private to the pair and at most one
    // local terminal. Common supply nets alone do not establish a local pair.
    const localNode = nets.some((net) => {
      if (this.index.isRail(net)) return false
      const others = (this.index.portsByNet.get(net) ?? []).filter(
        (port) =>
          port.source_component_id !== first.id &&
          port.source_component_id !== second.id,
      )
      return (
        others.length <= 1 &&
        others.every((port) => {
          const box = this.index.placement(port.source_component_id)
          return box && this.index.sameLocalScope(a, box)
        })
      )
    })
    if (!localNode) return

    // Report end-to-end bodies in the same row/column, not ordinary staggered
    // parallel branches or component collisions (which have their own rule).
    const axis = first.axis
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
      lineItemType: "ParallelResistorsDrawnInline",
      firstResistorSchematicBox: a,
      secondResistorSchematicBox: b,
      message: `Draw ${a.sourceComponentName || "the first resistor"} and ${b.sourceComponentName || "the second resistor"} beside each other as two parallel branches between their shared nets. Preserve both resistors' connections, leave room for labels, and reroute the affected wires.`,
    })
  }

  static issueToString(issue: ParallelResistorsDrawnInline): string {
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
    return `<ParallelResistorsDrawnInline ${attrs.join(" ")} />`
  }
}

function pinAxis(a: SchematicPort, b: SchematicPort): Axis | undefined {
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
