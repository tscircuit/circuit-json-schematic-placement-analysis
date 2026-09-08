import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  RailResistorShouldBeVertical,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Prefer vertical branches between a signal and a declared supply/ground rail. */
export class RailResistorOrientationSolver extends BaseSolver {
  private static readonly EPSILON = 0.01
  private readonly index: PlacementNetworkIndex
  private readonly powerNets: Set<string>
  private readonly groundNets: Set<string>
  private readonly resistorIds: string[]
  private readonly issues: SchematicPlacementIssue[]
  private currentIndex = 0

  constructor({
    ctx,
    issues,
  }: { ctx: SolverContext; issues: SchematicPlacementIssue[] }) {
    super()
    this.issues = issues
    this.index = new PlacementNetworkIndex(ctx)
    this.powerNets = new Set(this.index.powerNets)
    this.groundNets = new Set(this.index.groundNets)
    // Pin declarations also identify supply feeds even when the net has no power label.
    for (const element of ctx.circuitJson) {
      if (element.type !== "source_port") continue
      const net = this.index.connected(element.source_port_id)
      if (element.provides_power || element.requires_power)
        this.powerNets.add(net)
      if (element.provides_ground || element.requires_ground)
        this.groundNets.add(net)
    }
    this.resistorIds = [...this.index.components.values()]
      .filter(
        (component) =>
          component.ftype === "simple_resistor" && component.resistance > 0,
      )
      .map((component) => component.source_component_id)
    this.solved = this.resistorIds.length === 0
  }

  override _step(): void {
    const id = this.resistorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.resistorIds.length
    if (!id) return
    const index = this.index
    const resistor = index.placement(id)
    const nets = index.twoTerminalNets(id)
    if (!resistor || !nets) return
    const rails = nets.filter(
      (net) => this.powerNets.has(net) || this.groundNets.has(net),
    )
    // Two rail ends describe a supply feed or rail-to-rail network, not a signal branch.
    if (rails.length !== 1) return
    const rail = rails[0]!
    if (this.powerNets.has(rail) && this.groundNets.has(rail)) return
    const sourcePorts = index.portsByComponent.get(id)!
    const railSourcePort = sourcePorts.find(
      (port) => index.connected(port.source_port_id) === rail,
    )!
    const signalSourcePort = sourcePorts.find(
      (port) => port !== railSourcePort,
    )!
    const railPort = index.port(railSourcePort)
    const signalPort = index.port(signalSourcePort)
    if (!railPort || !signalPort) return

    const horizontal =
      Math.abs(railPort.center.y - signalPort.center.y) <=
        RailResistorOrientationSolver.EPSILON &&
      Math.abs(railPort.center.x - signalPort.center.x) >
        RailResistorOrientationSolver.EPSILON &&
      ((railPort.facing_direction === "left" &&
        signalPort.facing_direction === "right") ||
        (railPort.facing_direction === "right" &&
          signalPort.facing_direction === "left"))
    if (!horizontal) return
    const railType = this.groundNets.has(rail) ? "ground" : "power"
    const suggestedRailFacingDirection = railType === "power" ? "up" : "down"
    const deltaSchRotation =
      (railPort.facing_direction === "left") === (railType === "power")
        ? -90
        : 90
    this.issues.push({
      lineItemType: "RailResistorShouldBeVertical",
      resistorSchematicBox: resistor,
      railSourcePortId: railSourcePort.source_port_id,
      railPinName: railSourcePort.name,
      railType,
      deltaSchRotation,
      suggestedRailFacingDirection,
      message: `rotate ${resistor.sourceComponentName ?? id} by ${deltaSchRotation}° so its ${railType}-connected pin faces ${suggestedRailFacingDirection} and the resistor forms a vertical branch`,
    })
  }

  static issueToString(issue: RailResistorShouldBeVertical): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "railPin", issue.railPinName)
    addAttr(attrs, "railType", issue.railType)
    addAttr(attrs, "deltaSchRotation", issue.deltaSchRotation)
    addAttr(
      attrs,
      "suggestedRailFacingDirection",
      issue.suggestedRailFacingDirection,
    )
    addAttr(attrs, "message", issue.message)
    return `<RailResistorShouldBeVertical ${attrs.join(" ")} />`
  }
}
