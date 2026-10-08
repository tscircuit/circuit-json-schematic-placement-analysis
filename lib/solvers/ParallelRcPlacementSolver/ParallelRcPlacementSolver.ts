import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  ParallelRcNotAligned,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Axis = "horizontal" | "vertical"

/** Readability of a unique resistor/capacitor pair between one chip pin and ground. */
export class ParallelRcPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly resistorIds: string[]
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
    for (const element of params.ctx.circuitJson) {
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
      if (element.type === "source_port") {
        const net = this.index.connected(element.source_port_id)
        if (element.requires_ground || element.provides_ground)
          this.index.groundNets.add(net)
        if (
          element.requires_power ||
          element.provides_power ||
          element.requires_voltage !== undefined ||
          element.provides_voltage !== undefined
        )
          this.index.powerNets.add(net)
      }
    }
    this.resistorIds = [...this.index.components.values()]
      .filter((c) => c.ftype === "simple_resistor")
      .map((c) => c.source_component_id)
    this.solved = this.resistorIds.length === 0
  }

  override _step(): void {
    const resistorId = this.resistorIds[this.currentIndex++]!
    this.solved = this.currentIndex >= this.resistorIds.length
    const index = this.index
    const resistor = index.components.get(resistorId)
    const nets = index.twoTerminalNets(resistorId)
    if (
      resistor?.ftype !== "simple_resistor" ||
      !Number.isFinite(resistor.resistance) ||
      resistor.resistance <= 0 ||
      !nets
    )
      return
    const grounds = nets.filter(
      (net) => index.groundNets.has(net) && !index.powerNets.has(net),
    )
    if (grounds.length !== 1) return
    const ground = grounds[0]!
    const signal = nets.find((net) => net !== ground)!
    if (index.isRail(signal)) return

    // Exactly R, C and one chip pin: banks, buses and unrelated branches are ambiguous.
    const members = index.portsByNet.get(signal) ?? []
    if (members.length !== 3 || members.some((p) => p.do_not_connect)) return
    const capPort = members.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_capacitor",
    )
    const chipPort = members.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype === "simple_chip",
    )
    if (!capPort || !chipPort) return
    const capacitorId = capPort.source_component_id
    const capacitor = index.components.get(capacitorId)
    if (
      capacitor?.ftype !== "simple_capacitor" ||
      !Number.isFinite(capacitor.capacitance) ||
      capacitor.capacitance <= 0 ||
      !index.twoTerminalNets(capacitorId)?.includes(ground)
    )
      return
    const hostId = chipPort.source_component_id
    if ((index.portsByComponent.get(hostId)?.length ?? 0) < 3) return
    const r = index.placement(resistorId),
      c = index.placement(capacitorId),
      host = index.placement(hostId)
    if (
      !r ||
      !c ||
      !host ||
      [resistorId, capacitorId, hostId].some((id) => this.unpopulated.has(id))
    )
      return
    // PCB fanouts can create separate drawing groups without changing this private net.
    // Sheet and subcircuit boundaries still prevent a cross-sheet placement suggestion.
    if (
      [r, c].some(
        (box) =>
          box.schematicSheetId !== host.schematicSheetId ||
          box.subcircuitId !== host.subcircuitId,
      )
    )
      return
    if (
      [r, c, host].some(
        (box) =>
          ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
          box.width <= 0 ||
          box.height <= 0,
      )
    )
      return
    const chipPin = index.port(chipPort)
    if (!chipPin || chipPin.schematic_sheet_id !== host.schematicSheetId) return
    const resistorPins = this.pins(resistorId, signal, ground, r)
    const capacitorPins = this.pins(capacitorId, signal, ground, c)
    if (!resistorPins || !capacitorPins) return
    const rAxis = pinAxis(...resistorPins),
      cAxis = pinAxis(...capacitorPins)
    if (!rAxis || !cAxis) return
    // Body collisions have a dedicated analyzer.
    if (
      Math.abs(r.schX - c.schX) < (r.width + c.width) / 2 &&
      Math.abs(r.schY - c.schY) < (r.height + c.height) / 2
    )
      return

    let reason: ParallelRcNotAligned["reason"]
    if (rAxis !== cAxis) reason = "different_axes"
    else {
      const axis = rAxis === "horizontal" ? "x" : "y"
      const a = resistorPins.map((p) => p.center[axis]),
        b = capacitorPins.map((p) => p.center[axis])
      if ((a[1]! - a[0]!) * (b[1]! - b[0]!) < 0) reason = "crossed_connections"
      else {
        const overlap =
          Math.min(Math.max(...a), Math.max(...b)) -
          Math.max(Math.min(...a), Math.min(...b))
        // Overlapping pin spans permit unequal symbols and ordinary placement offsets.
        if (overlap > 0.01) return
        reason = "staggered"
      }
    }
    this.params.issues.push({
      lineItemType: "ParallelRcNotAligned",
      resistorSchematicBox: r,
      capacitorSchematicBox: c,
      chipSourcePortId: chipPort.source_port_id,
      reason,
      message: `Draw ${r.sourceComponentName || "the resistor"} and ${c.sourceComponentName || "the capacitor"} as adjacent parallel branches with their shared nets at matching ends. Preserve all pin connections and capacitor polarity, leave room for labels, and reroute affected wires.`,
    })
  }

  private pins(
    id: string,
    signal: string,
    ground: string,
    box: SchematicBoxPlacement,
  ): [SchematicPort, SchematicPort] | undefined {
    const ports = this.index.portsByComponent.get(id) ?? []
    if (ports.length !== 2 || ports.some((p) => p.do_not_connect)) return
    const pins = [signal, ground].map((net) => {
      const source = ports.find(
        (p) => this.index.connected(p.source_port_id) === net,
      )
      return source && this.index.port(source)
    })
    const [first, second] = pins
    if (
      !first ||
      !second ||
      pins.some(
        (p) =>
          p!.schematic_sheet_id !== box.schematicSheetId ||
          !Number.isFinite(p!.center.x) ||
          !Number.isFinite(p!.center.y),
      )
    )
      return
    return [first, second]
  }

  static issueToString(issue: ParallelRcNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "resistorComponentName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "capacitorComponentName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "reason", issue.reason)
    addAttr(attrs, "message", issue.message)
    return `<ParallelRcNotAligned ${attrs.join(" ")} />`
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
    return "horizontal"
  if (
    directions.has("up") &&
    directions.has("down") &&
    Math.abs(a.center.x - b.center.x) < 0.01 &&
    Math.abs(a.center.y - b.center.y) > 0.01
  )
    return "vertical"
}
