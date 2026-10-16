import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  ParallelDiodeCapacitorNotAligned,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Axis = "horizontal" | "vertical"
interface Member {
  diode: boolean
  box?: SchematicBoxPlacement
  // Both members are ordered by the same electrical net IDs, not pin names.
  pins?: [SchematicPort, SchematicPort]
  axis?: Axis
}

/** Draw an unambiguous local parallel pair as two paths with matching ends. */
export class ParallelDiodeCapacitorAlignmentSolver extends BaseSolver {
  private readonly banks: Member[][] = []
  private bankIndex = 0
  private readonly index: PlacementNetworkIndex

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const index = (this.index = new PlacementNetworkIndex(params.ctx))
    for (const port of params.ctx.circuitJson) {
      if (port.type !== "source_port") continue
      const net = index.connected(port.source_port_id)
      if (port.requires_power || port.provides_power) index.powerNets.add(net)
      if (port.requires_ground || port.provides_ground)
        index.groundNets.add(net)
    }
    const excluded = new Set(
      params.ctx.circuitJson.flatMap((e) =>
        e.type === "pcb_component" && e.do_not_place
          ? [e.source_component_id]
          : [],
      ),
    )
    const byNets = new Map<string, Member[]>()
    for (const component of index.components.values()) {
      const diode = component.ftype === "simple_diode"
      if (!diode && component.ftype !== "simple_capacitor") continue
      const id = component.source_component_id
      const nets = index.twoTerminalNets(id)?.sort()
      if (!nets) continue
      // Parts connected only through shared supply/ground rails may support
      // different functional blocks; those rails do not establish a local pair.
      if (nets.every((net) => index.isRail(net))) continue
      const box = index.placement(id)
      const member: Member = { diode, box }
      const key = JSON.stringify(nets)
      const bank = byNets.get(key) ?? []
      // Count unsupported and unplaced members too; they still make a bank ambiguous.
      bank.push(member)
      byNets.set(key, bank)
      if (!box || excluded.has(id)) continue
      if (
        component.ftype === "simple_capacitor" &&
        (!Number.isFinite(component.capacitance) || component.capacitance <= 0)
      )
        continue
      const ports = index.portsByComponent.get(id)!
      if (ports.some((port) => port.do_not_connect)) continue
      // Electrical net identity determines matching ends, not terminal names or polarity guesses.
      const pins = nets.map((net) =>
        index.port(
          ports.find((p) => index.connected(p.source_port_id) === net)!,
        ),
      )
      const [first, second] = pins
      if (
        !first ||
        !second ||
        pins.some((pin) => pin?.schematic_sheet_id !== box.schematicSheetId)
      )
        continue
      member.pins = [first, second]
      member.axis = pinAxis(first, second)
    }
    this.banks.push(...byNets.values())
    this.solved = this.banks.length === 0
  }

  override _step(): void {
    const bank = this.banks[this.bankIndex++]!
    this.solved = this.bankIndex >= this.banks.length
    // Several diodes/capacitors across the same nets do not identify one pair.
    if (bank.length !== 2) return
    const diode = bank.find((member) => member.diode)
    const capacitor = bank.find((member) => !member.diode)
    if (
      !diode?.box ||
      !diode.pins ||
      !diode.axis ||
      !capacitor?.box ||
      !capacitor.pins ||
      !capacitor.axis
    )
      return
    const a = diode.box
    const b = capacitor.box
    if (!this.index.sameLocalScope(a, b)) return
    if (
      [a.width, a.height, b.width, b.height].some(
        (size) => !Number.isFinite(size) || size <= 0,
      )
    )
      return
    const distance = Math.hypot(a.schX - b.schX, a.schY - b.schY)
    // Shared rails alone must not join distant functional blocks. This is a local
    // drawing tolerance scaled to symbol size, not a physical design requirement.
    if (
      !Number.isFinite(distance) ||
      distance > 6 * Math.max(a.width, a.height, b.width, b.height)
    )
      return
    // Body collisions already have a dedicated diagnostic.
    if (
      Math.abs(a.schX - b.schX) < (a.width + b.width) / 2 &&
      Math.abs(a.schY - b.schY) < (a.height + b.height) / 2
    )
      return

    let reason: ParallelDiodeCapacitorNotAligned["reason"]
    if (diode.axis !== capacitor.axis) reason = "different_axes"
    else {
      const coordinate = diode.axis === "horizontal" ? "x" : "y"
      const d = diode.pins.map((pin) => pin.center[coordinate])
      const c = capacitor.pins.map((pin) => pin.center[coordinate])
      // The same nets must appear at corresponding ends of the two paths.
      if ((d[1]! - d[0]!) * (c[1]! - c[0]!) < 0) reason = "crossed_connections"
      else {
        const overlap =
          Math.min(Math.max(...d), Math.max(...c)) -
          Math.max(Math.min(...d), Math.min(...c))
        // Intersecting pin spans allow unequal symbols and small offsets.
        // Disjoint spans mean the pair is drawn end-to-end or badly staggered.
        if (overlap > 0.01) return
        reason = "staggered"
      }
    }
    this.params.issues.push({
      lineItemType: "ParallelDiodeCapacitorNotAligned",
      diodeSchematicBox: a,
      capacitorSchematicBox: b,
      reason,
      message: `Draw ${a.sourceComponentName || "the diode"} and ${b.sourceComponentName || "the capacitor"} as adjacent parallel rows or columns with their shared nets at matching ends. Preserve every pin connection and diode polarity, leave room for labels, and reroute the affected wires.`,
    })
  }

  static issueToString(issue: ParallelDiodeCapacitorNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "diodeComponentName",
      issue.diodeSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "capacitorComponentName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "reason", issue.reason)
    addAttr(attrs, "message", issue.message)
    return `<ParallelDiodeCapacitorNotAligned ${attrs.join(" ")} />`
  }
}

function pinAxis(
  first: SchematicPort,
  second: SchematicPort,
): Axis | undefined {
  if (
    ![first.center.x, first.center.y, second.center.x, second.center.y].every(
      Number.isFinite,
    )
  )
    return
  const directions = new Set([first.facing_direction, second.facing_direction])
  if (
    directions.has("left") &&
    directions.has("right") &&
    Math.abs(first.center.y - second.center.y) < 0.01 &&
    Math.abs(first.center.x - second.center.x) > 0.01
  )
    return "horizontal"
  if (
    directions.has("up") &&
    directions.has("down") &&
    Math.abs(first.center.x - second.center.x) < 0.01 &&
    Math.abs(first.center.y - second.center.y) > 0.01
  )
    return "vertical"
}
