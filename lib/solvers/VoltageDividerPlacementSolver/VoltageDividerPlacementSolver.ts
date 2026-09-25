import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  SchematicPlacementIssue,
  VoltageDividerResistorsReversed,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Recognize divider topology, including taps joined through net labels. */
export class VoltageDividerPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly positiveNets = new Set<string>()
  private readonly resistorIds: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.resistorIds = [...this.index.components.values()]
      .filter((component) => component.ftype === "simple_resistor")
      .map((component) => component.source_component_id)
    for (const element of params.ctx.circuitJson) {
      if (element.type === "source_net" && element.is_positive_voltage_source)
        this.positiveNets.add(this.index.connected(element.source_net_id))
    }
    this.solved = this.resistorIds.length === 0
  }

  override _step(): void {
    const supplyId = this.resistorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.resistorIds.length
    if (!supplyId || !this.isResistor(supplyId)) return
    const index = this.index
    const nets = index.twoTerminalNets(supplyId)
    if (!nets) return
    const rails = nets.filter((net) => index.isRail(net))
    if (rails.length !== 1) return
    const supplyNet = rails[0]!
    if (!this.positiveNets.has(supplyNet) || index.groundNets.has(supplyNet))
      return
    const tap = nets.find((net) => net !== supplyNet)!
    const tapPorts = index.portsByNet.get(tap) ?? []
    const resistorIds = new Set(
      tapPorts
        .filter(
          (port) =>
            index.components.get(port.source_component_id)?.ftype ===
            "simple_resistor",
        )
        .map((port) => port.source_component_id),
    )
    // A resistor ladder or parallel bank does not identify a unique divider pair.
    if (resistorIds.size !== 2) return
    const groundId = [...resistorIds].find((id) => id !== supplyId)!
    if (!this.isResistor(groundId)) return
    const groundNets = index.twoTerminalNets(groundId)
    const groundNet = groundNets?.find((net) => net !== tap)
    if (
      !groundNets?.includes(tap) ||
      !groundNet ||
      !index.groundNets.has(groundNet) ||
      index.powerNets.has(groundNet) ||
      !tapPorts.some((port) => !resistorIds.has(port.source_component_id))
    )
      return

    const supply = index.placement(supplyId)
    const ground = index.placement(groundId)
    if (!supply || !ground || !index.sameLocalScope(supply, ground)) return
    // Leave horizontal/L-shaped dividers and individual rotation problems to
    // their own checks. Here both resistors already read toward ground.
    const supplyTap = this.getDownwardResistorPorts(supplyId, supplyNet, tap)
    const groundTap = this.getDownwardResistorPorts(groundId, tap, groundNet)
    if (!supplyTap || !groundTap) return
    const reversedBodyGap =
      ground.schY - ground.height / 2 - (supply.schY + supply.height / 2)
    // Ignore small offsets and overlapping bodies, rather than demand alignment.
    if (reversedBodyGap <= 1.5) return

    this.params.issues.push({
      lineItemType: "VoltageDividerResistorsReversed",
      supplyResistorSchematicBox: supply,
      groundResistorSchematicBox: ground,
      supplyTapSourcePortId: supplyTap.bottom.source_port_id,
      groundTapSourcePortId: groundTap.top.source_port_id,
      reversedBodyGap,
      message: `Place ${supply.sourceComponentName ?? supplyId} above ${ground.sourceComponentName ?? groundId}, close enough to read their shared divider tap. Preserve all connections and leave room for labels; exact alignment is not required.`,
    })
  }

  private isResistor(id: string): boolean {
    const component = this.index.components.get(id)
    return (
      component?.ftype === "simple_resistor" &&
      Number.isFinite(component.resistance) &&
      component.resistance > 0
    )
  }

  private getDownwardResistorPorts(
    id: string,
    topNet: string,
    bottomNet: string,
  ) {
    const index = this.index
    const placement = index.placement(id)!
    const ports = index.portsByComponent.get(id)!
    if (ports.some((port) => port.do_not_connect)) return
    const top = ports.find(
      (port) => index.connected(port.source_port_id) === topNet,
    )
    const bottom = ports.find(
      (port) => index.connected(port.source_port_id) === bottomNet,
    )
    if (!top || !bottom) return
    const topPin = index.port(top)
    const bottomPin = index.port(bottom)
    if (
      !topPin ||
      !bottomPin ||
      topPin.schematic_sheet_id !== placement.schematicSheetId ||
      bottomPin.schematic_sheet_id !== placement.schematicSheetId ||
      topPin.facing_direction !== "up" ||
      bottomPin.facing_direction !== "down" ||
      topPin.center.y <= bottomPin.center.y
    )
      return
    return { top, bottom }
  }

  static issueToString(issue: VoltageDividerResistorsReversed): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "supplyResistorName",
      issue.supplyResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "groundResistorName",
      issue.groundResistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "reversedBodyGap", issue.reversedBodyGap)
    addAttr(attrs, "message", issue.message)
    return `<VoltageDividerResistorsReversed ${attrs.join(" ")} />`
  }
}
