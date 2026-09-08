import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  TwoPinComponentShouldBeVertical,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Prefer vertical two-pin components with power above and ground below. */
export class TwoPinComponentRailOrientationSolver extends BaseSolver {
  private static readonly EPSILON = 0.01
  private readonly index: PlacementNetworkIndex
  private readonly powerNets: Set<string>
  private readonly groundNets: Set<string>
  private readonly componentIds: string[]
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
    this.componentIds = [...this.index.components.keys()].filter(
      (id) => this.index.portsByComponent.get(id)?.length === 2,
    )
    this.solved = this.componentIds.length === 0
  }

  override _step(): void {
    const id = this.componentIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.componentIds.length
    if (!id) return
    const index = this.index
    const component = index.placement(id)
    const nets = index.twoTerminalNets(id)
    if (!component || !nets) return
    // A net declared as both power and ground has no reliable direction.
    if (nets.some((net) => this.powerNets.has(net) && this.groundNets.has(net)))
      return
    const railTypes = nets.map((net) =>
      this.powerNets.has(net)
        ? ("power" as const)
        : this.groundNets.has(net)
          ? ("ground" as const)
          : undefined,
    )
    if (railTypes.every((type) => type === undefined)) return
    const railType = railTypes.includes("power") ? "power" : "ground"
    const candidates = nets.flatMap((net, i) =>
      railTypes[i] === railType ? [{ net, index: i }] : [],
    )
    // Series supply parts are also vertical. Prefer the supplying/declared rail
    // over a load's requires_power/ground pin when choosing which end faces it.
    const railIndex = (
      candidates.find(({ net }) =>
        index.portsByNet
          .get(net)
          ?.some((port) =>
            railType === "power" ? port.provides_power : port.provides_ground,
          ),
      ) ??
      candidates.find(({ net }) =>
        (railType === "power" ? index.powerNets : index.groundNets).has(net),
      ) ??
      candidates[0]!
    ).index
    const rail = nets[railIndex]!
    const sourcePorts = index.portsByComponent.get(id)!
    const railSourcePort = sourcePorts.find(
      (port) => index.connected(port.source_port_id) === rail,
    )!
    const otherSourcePort = sourcePorts.find((port) => port !== railSourcePort)!
    const railPort = index.port(railSourcePort)
    const otherPort = index.port(otherSourcePort)
    if (!railPort || !otherPort) return

    const horizontal =
      Math.abs(railPort.center.y - otherPort.center.y) <=
        TwoPinComponentRailOrientationSolver.EPSILON &&
      Math.abs(railPort.center.x - otherPort.center.x) >
        TwoPinComponentRailOrientationSolver.EPSILON &&
      ((railPort.facing_direction === "left" &&
        otherPort.facing_direction === "right") ||
        (railPort.facing_direction === "right" &&
          otherPort.facing_direction === "left"))
    if (!horizontal) return
    const suggestedRailFacingDirection = railType === "power" ? "up" : "down"
    const deltaSchRotation =
      (railPort.facing_direction === "left") === (railType === "power")
        ? -90
        : 90
    this.issues.push({
      lineItemType: "TwoPinComponentShouldBeVertical",
      schematicBox: component,
      railSourcePortId: railSourcePort.source_port_id,
      railPinName: railSourcePort.name,
      railType,
      deltaSchRotation,
      suggestedRailFacingDirection,
      message: `rotate ${component.sourceComponentName ?? id} by ${deltaSchRotation}° so its ${railType}-connected pin faces ${suggestedRailFacingDirection} and the component is vertical`,
    })
  }

  static issueToString(issue: TwoPinComponentShouldBeVertical): string {
    const attrs: string[] = []
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "railPin", issue.railPinName)
    addAttr(attrs, "railType", issue.railType)
    addAttr(attrs, "deltaSchRotation", issue.deltaSchRotation)
    addAttr(
      attrs,
      "suggestedRailFacingDirection",
      issue.suggestedRailFacingDirection,
    )
    addAttr(attrs, "message", issue.message)
    return `<TwoPinComponentShouldBeVertical ${attrs.join(" ")} />`
  }
}
