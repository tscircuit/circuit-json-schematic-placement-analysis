import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  ParallelDiodeResistorNotAligned,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Axis = "horizontal" | "vertical"
interface Member {
  diode: boolean
  box: SchematicBoxPlacement
  // Both members are ordered by the same electrical net IDs, not pin names.
  pins?: [SchematicPort, SchematicPort]
  axis?: Axis
}

/** Draw an unambiguous local parallel pair as two paths with matching ends. */
export class ParallelDiodeResistorPlacementSolver extends BaseSolver {
  private readonly banks: Member[][] = []
  private bankIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const index = new PlacementNetworkIndex(params.ctx)
    const byNets = new Map<string, Member[][]>()
    for (const component of index.components.values()) {
      const diode =
        component.ftype === "simple_diode" || component.ftype === "simple_led"
      if (!diode && component.ftype !== "simple_resistor") continue
      const id = component.source_component_id
      const box = index.placement(id)
      const nets = index.twoTerminalNets(id)?.sort()
      const ports = index.portsByComponent.get(id)
      if (!box || !nets || !ports) continue
      const pins = nets.map((net) => {
        const port = ports.find(
          (p) => index.connected(p.source_port_id) === net,
        )
        return port && index.port(port)
      })
      const [first, second] = pins
      // Count electrically parallel members even when their drawing is unsupported:
      // dropping one must not make an ambiguous bank look like a unique pair.
      const member: Member = { diode, box }
      if (
        first &&
        second &&
        !ports.some((port) => port.do_not_connect) &&
        pins.every((pin) => pin?.schematic_sheet_id === box.schematicSheetId)
      ) {
        member.pins = [first, second]
        member.axis = pinAxis(first, second)
      }
      const key = JSON.stringify(nets)
      const scopes = byNets.get(key) ?? []
      const bank = scopes.find((items) =>
        index.sameLocalScope(items[0]!.box, box),
      )
      if (bank) bank.push(member)
      else {
        const items = [member]
        scopes.push(items)
        this.banks.push(items)
      }
      byNets.set(key, scopes)
    }
    this.solved = this.banks.length === 0
  }

  override _step(): void {
    const bank = this.banks[this.bankIndex++]!
    this.solved = this.bankIndex >= this.banks.length
    // Several diodes/resistors across the same nets do not identify one pair.
    if (bank.length !== 2) return
    const diode = bank.find((member) => member.diode)
    const resistor = bank.find((member) => !member.diode)
    if (!diode?.pins || !diode.axis || !resistor?.pins || !resistor.axis) return
    const a = diode.box
    const b = resistor.box
    // Body collisions already have a dedicated diagnostic.
    if (
      Math.abs(a.schX - b.schX) < (a.width + b.width) / 2 &&
      Math.abs(a.schY - b.schY) < (a.height + b.height) / 2
    )
      return

    let reason: ParallelDiodeResistorNotAligned["reason"]
    if (diode.axis !== resistor.axis) reason = "different_axes"
    else {
      const coordinate = diode.axis === "horizontal" ? "x" : "y"
      const d = diode.pins.map((pin) => pin.center[coordinate])
      const r = resistor.pins.map((pin) => pin.center[coordinate])
      // The same nets must appear at corresponding ends of the two paths.
      if ((d[1]! - d[0]!) * (r[1]! - r[0]!) < 0) reason = "crossed_connections"
      else {
        const overlap =
          Math.min(Math.max(...d), Math.max(...r)) -
          Math.max(Math.min(...d), Math.min(...r))
        // Intersecting pin spans allow unequal symbols and small offsets.
        // Disjoint spans mean the pair is drawn end-to-end or badly staggered.
        if (overlap > 0.01) return
        reason = "staggered"
      }
    }
    this.params.issues.push({
      lineItemType: "ParallelDiodeResistorNotAligned",
      diodeSchematicBox: a,
      resistorSchematicBox: b,
      reason,
      message: `Draw ${a.sourceComponentName || "the diode"} and ${b.sourceComponentName || "the resistor"} as adjacent parallel rows or columns with their shared nets at matching ends. Preserve every pin connection and diode polarity, leave room for labels, and reroute the affected wires.`,
    })
  }

  static issueToString(issue: ParallelDiodeResistorNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "diodeComponentName",
      issue.diodeSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "resistorComponentName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "reason", issue.reason)
    addAttr(attrs, "message", issue.message)
    return `<ParallelDiodeResistorNotAligned ${attrs.join(" ")} />`
  }
}

function pinAxis(
  first: SchematicPort,
  second: SchematicPort,
): Axis | undefined {
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
