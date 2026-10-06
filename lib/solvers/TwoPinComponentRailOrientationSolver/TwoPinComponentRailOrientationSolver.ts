import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  TwoPinComponentShouldBeVertical,
  TwoPinComponentHasInvertedRails,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import {
  getHorizontalPushbuttonComponentIds,
  getSwitchPullResistorPairs,
} from "../../utils/switch-pull-resistor-pairs"
import type { SolverContext } from "../SolverContext"

/** Prefer vertical two-pin components with power above and ground below. */
export class TwoPinComponentRailOrientationSolver extends BaseSolver {
  private static readonly EPSILON = 0.01
  private readonly index: PlacementNetworkIndex
  private readonly powerNets: Set<string>
  private readonly groundNets: Set<string>
  private readonly positiveVoltageNets = new Set<string>()
  private readonly componentIds: string[]
  private readonly horizontalPushbuttonComponentIds: Set<string>
  private readonly switchPullComponentIds: Set<string>
  private readonly issues: SchematicPlacementIssue[]
  private currentIndex = 0

  constructor({
    ctx,
    issues,
  }: { ctx: SolverContext; issues: SchematicPlacementIssue[] }) {
    super()
    this.issues = issues
    this.index = new PlacementNetworkIndex(ctx)
    this.horizontalPushbuttonComponentIds = getHorizontalPushbuttonComponentIds(
      this.index,
    )
    this.switchPullComponentIds = new Set(
      getSwitchPullResistorPairs(this.index).flatMap((pair) => [
        pair.resistor.sourceComponentId!,
        pair.switchBox.sourceComponentId!,
      ]),
    )
    this.powerNets = new Set(this.index.powerNets)
    this.groundNets = new Set(this.index.groundNets)
    // Pin declarations also identify supply feeds even when the net has no power label.
    for (const element of ctx.circuitJson) {
      if (element.type === "source_net" && element.is_positive_voltage_source)
        this.positiveVoltageNets.add(
          this.index.connected(element.source_net_id),
        )
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
    const sourceComponent = index.components.get(id)
    const nets = index.twoTerminalNets(id)
    if (!component || !nets) return
    // An inductor between two non-ground nodes is a series-path element;
    // touching an output supply does not make it a vertical shunt branch.
    if (
      sourceComponent?.ftype === "simple_inductor" &&
      !nets.some((net) => this.groundNets.has(net))
    )
      return
    // A diode between two power rails continues a series power path; either
    // orientation may match that path, so it is not a vertical shunt branch.
    if (
      sourceComponent?.ftype === "simple_diode" &&
      nets.every((net) => this.powerNets.has(net))
    )
      return
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
    // Prefer the supplying/declared rail over a load's requires_power/ground pin.
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

    const otherNet = index.connected(otherSourcePort.source_port_id)
    const otherIsGround = this.groundNets.has(otherNet)
    // A resistor from an explicitly positive supply to a non-rail signal also
    // reads toward power above. Keep capacitors and other series paths restricted
    // to positive-supply-to-ground, and never infer a rail from label text.
    const isSupplyToSignalResistor =
      sourceComponent?.ftype === "simple_resistor" &&
      !this.powerNets.has(otherNet) &&
      !otherIsGround
    const invertedRails =
      this.positiveVoltageNets.has(rail) &&
      (otherIsGround || isSupplyToSignalResistor) &&
      Math.abs(railPort.center.x - otherPort.center.x) <=
        TwoPinComponentRailOrientationSolver.EPSILON &&
      railPort.center.y <
        otherPort.center.y - TwoPinComponentRailOrientationSolver.EPSILON &&
      railPort.facing_direction === "down" &&
      otherPort.facing_direction === "up"
    if (invertedRails) {
      this.issues.push({
        lineItemType: "TwoPinComponentHasInvertedRails",
        schematicBox: component,
        railSourcePortId: railSourcePort.source_port_id,
        railPinName: railSourcePort.name,
        railType: "power",
        deltaSchRotation: 180,
        suggestedRailFacingDirection: "up",
        message: `rotate ${component.sourceComponentName || "component"} by 180° so its positive-supply pin faces up and its ${otherIsGround ? "ground" : "signal"} pin faces down; preserve pin connections and reroute attached traces`,
      })
      return
    }

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
    if (this.horizontalPushbuttonComponentIds.has(id)) return
    if (!this.isIdentifiedRailBranch(id, rail, otherNet, railType)) return
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
      message: `rotate ${component.sourceComponentName || "component"} by ${deltaSchRotation}° so its ${railType}-connected pin faces ${suggestedRailFacingDirection} and the component is vertical`,
    })
  }

  /** A rail connection alone does not distinguish a series feed from a shunt. */
  private isIdentifiedRailBranch(
    id: string,
    rail: string,
    otherNet: string,
    railType: "power" | "ground",
  ): boolean {
    const index = this.index
    const component = index.components.get(id)
    if (!component) return false
    if (index.portsByComponent.get(id)?.some((port) => port.do_not_connect))
      return false
    const type = component.ftype
    // A capacitor with a ground return is a shunt, including signal filtering.
    if (type === "simple_capacitor")
      return this.groundNets.has(rail) || this.groundNets.has(otherNet)
    // These two-terminal devices drawn across supply and ground form a shunt.
    if (
      railType === "power" &&
      this.groundNets.has(otherNet) &&
      (type === "simple_resistor" ||
        type === "simple_diode" ||
        type === "simple_led" ||
        type === "simple_inductor")
    )
      return true
    if (this.switchPullComponentIds.has(id)) return true
    if (
      type !== "simple_resistor" ||
      component.resistance <= 0 ||
      this.powerNets.has(otherNet) ||
      this.groundNets.has(otherNet)
    )
      return false

    const peers = index.portsByNet.get(otherNet) ?? []
    // Multiple resistor branches do not identify which one supplies the pull.
    if (
      peers.filter(
        (port) =>
          index.components.get(port.source_component_id)?.ftype ===
          "simple_resistor",
      ).length !== 1
    )
      return false
    const requirements = peers.filter(
      (port) => port.needs_external_pullup || port.needs_external_pulldown,
    )
    return (
      requirements.length > 0 &&
      requirements.every(
        (port) =>
          !port.do_not_connect &&
          (railType === "power"
            ? port.needs_external_pullup && !port.needs_external_pulldown
            : port.needs_external_pulldown && !port.needs_external_pullup),
      )
    )
  }

  static issueToString(
    issue: TwoPinComponentShouldBeVertical | TwoPinComponentHasInvertedRails,
  ): string {
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
    return `<${issue.lineItemType} ${attrs.join(" ")} />`
  }
}
