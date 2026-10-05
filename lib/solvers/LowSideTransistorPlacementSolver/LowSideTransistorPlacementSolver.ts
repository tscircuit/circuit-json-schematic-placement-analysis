import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  LowSideTransistorNotAlignedWithLoad,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Advisory for an unambiguous grounded-emitter NPN driving a local load. */
export class LowSideTransistorPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly positiveNets = new Set<string>()
  private readonly transistorIds: string[]
  private readonly issues: SchematicPlacementIssue[]
  private currentIndex = 0

  constructor({
    ctx,
    issues,
  }: { ctx: SolverContext; issues: SchematicPlacementIssue[] }) {
    super()
    this.issues = issues
    this.index = new PlacementNetworkIndex(ctx)
    for (const element of ctx.circuitJson) {
      if (element.type === "source_net" && element.is_positive_voltage_source)
        this.positiveNets.add(this.index.connected(element.source_net_id))
    }
    this.transistorIds = [...this.index.components.values()]
      .filter(
        (component) =>
          component.ftype === "simple_transistor" &&
          component.transistor_type === "npn",
      )
      .map((component) => component.source_component_id)
    this.solved = this.transistorIds.length === 0
  }

  override _step(): void {
    const id = this.transistorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.transistorIds.length
    if (!id) return
    const index = this.index
    const transistor = index.placement(id)
    if (!transistor) return
    // Native transistor pin numbering is collector = 1, base = 2, emitter = 3.
    const terminals = this.nativeTerminalPorts(id, "simple_transistor")
    const collector = terminals?.get(1)
    const base = terminals?.get(2)
    const emitter = terminals?.get(3)
    if (!base || !collector || !emitter) return
    const baseNet = index.connected(base.source_port_id)
    const collectorNet = index.connected(collector.source_port_id)
    const emitterNet = index.connected(emitter.source_port_id)
    if (
      new Set([baseNet, collectorNet, emitterNet]).size !== 3 ||
      !index.groundNets.has(emitterNet) ||
      index.powerNets.has(emitterNet) ||
      index.isRail(baseNet) ||
      index.isRail(collectorNet)
    )
      return

    const basePeers = (index.portsByNet.get(baseNet) ?? []).filter(
      (port) => port.source_component_id !== id,
    )
    if (basePeers.length !== 1) return
    const resistorId = basePeers[0]!.source_component_id
    const resistor = index.components.get(resistorId)
    const baseResistor = index.placement(resistorId)
    const resistorNets = index.twoTerminalNets(resistorId)
    const inputNet = resistorNets?.find((net) => net !== baseNet)
    if (
      resistor?.ftype !== "simple_resistor" ||
      resistor.resistance <= 0 ||
      !baseResistor ||
      !index.sameLocalScope(transistor, baseResistor) ||
      !inputNet ||
      index.isRail(inputNet) ||
      inputNet === collectorNet
    )
      return

    const collectorPeers = (index.portsByNet.get(collectorNet) ?? []).filter(
      (port) => port.source_component_id !== id,
    )
    const loadPeers = collectorPeers.filter((port) => {
      const type = index.components.get(port.source_component_id)?.ftype
      // Resistive collector loads can be analog gain stages. Require a
      // two-terminal load with a correctly connected parallel clamp instead.
      return type === "simple_chip"
    })
    if (loadPeers.length !== 1) return
    const loadId = loadPeers[0]!.source_component_id
    const load = index.placement(loadId)
    const loadNets = index.twoTerminalNets(loadId)
    const supplyNet = loadNets?.find((net) => net !== collectorNet)
    if (
      !load ||
      !index.sameLocalScope(transistor, load) ||
      !supplyNet ||
      !this.positiveNets.has(supplyNet) ||
      index.groundNets.has(supplyNet)
    )
      return

    const clampPeers = collectorPeers.filter(
      (port) => port.source_component_id !== loadId,
    )
    if (clampPeers.length !== 1) return
    const clampId = clampPeers[0]!.source_component_id
    const clamp = index.placement(clampId)
    // Native diode pin numbering is anode = 1, cathode = 2.
    const diodeTerminals = this.nativeTerminalPorts(clampId, "simple_diode")
    const anode = diodeTerminals?.get(1)
    const cathode = diodeTerminals?.get(2)
    if (
      index.components.get(clampId)?.ftype !== "simple_diode" ||
      !index.twoTerminalNets(clampId) ||
      !anode ||
      !cathode ||
      index.connected(anode.source_port_id) !== collectorNet ||
      index.connected(cathode.source_port_id) !== supplyNet ||
      !clamp ||
      !index.sameLocalScope(transistor, clamp)
    )
      return

    const collectorPin = index.port(collector)
    const emitterPin = index.port(emitter)
    const basePin = index.port(base)
    if (!collectorPin || !emitterPin || !basePin) return
    const collectorFacingDirection = collectorPin.facing_direction
    const emitterFacingDirection = emitterPin.facing_direction
    if (!collectorFacingDirection || !emitterFacingDirection) return
    const placementProblems: LowSideTransistorNotAlignedWithLoad["placementProblems"] =
      []
    // Leave body collisions to ComponentOverlap; this tests clear load ordering,
    // not an arbitrary minimum distance or perfect X-coordinate alignment.
    if (transistor.schY >= load.schY)
      placementProblems.push("transistor_not_below_load")
    if (collectorFacingDirection !== "up")
      placementProblems.push("collector_not_up")
    if (emitterFacingDirection !== "down")
      placementProblems.push("emitter_not_down")
    if (placementProblems.length === 0) return

    const name = transistor.sourceComponentName ?? id
    const loadName = load.sourceComponentName ?? loadId
    this.issues.push({
      lineItemType: "LowSideTransistorNotAlignedWithLoad",
      transistorSchematicBox: transistor,
      loadSchematicBox: load,
      baseResistorSchematicBox: baseResistor,
      clampDiodeSchematicBox: clamp,
      collectorSourcePortId: collector.source_port_id,
      emitterSourcePortId: emitter.source_port_id,
      collectorFacingDirection,
      emitterFacingDirection,
      placementProblems,
      message: `Arrange ${name} below ${loadName}, with its collector facing up toward the load and emitter facing down toward ground; place ${baseResistor.sourceComponentName ?? resistorId} beside the base. Preserve all pin connections and reroute affected traces.`,
    })
  }

  private nativeTerminalPorts(
    componentId: string,
    ftype: "simple_transistor" | "simple_diode",
  ) {
    const index = this.index
    if (index.components.get(componentId)?.ftype !== ftype) return
    const pinCount = ftype === "simple_transistor" ? 3 : 2
    const ports = index.portsByComponent.get(componentId) ?? []
    if (
      ports.length !== pinCount ||
      new Set(ports.map((port) => port.source_port_id)).size !== pinCount
    )
      return
    const numbered = new Map<number, (typeof ports)[number]>()
    for (const port of ports) {
      const pin = port.pin_number
      const schematicPort = index.port(port)
      if (
        pin === undefined ||
        !Number.isInteger(pin) ||
        pin < 1 ||
        pin > pinCount ||
        numbered.has(pin) ||
        port.do_not_connect ||
        !schematicPort ||
        schematicPort.pin_number !== pin
      )
        return
      numbered.set(pin, port)
    }
    return numbered
  }

  static issueToString(issue: LowSideTransistorNotAlignedWithLoad): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "transistorName",
      issue.transistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "loadName", issue.loadSchematicBox.sourceComponentName)
    addAttr(
      attrs,
      "baseResistorName",
      issue.baseResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "clampDiodeName",
      issue.clampDiodeSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "placementProblems", issue.placementProblems.join(","))
    addAttr(attrs, "collectorFacingDirection", issue.collectorFacingDirection)
    addAttr(attrs, "emitterFacingDirection", issue.emitterFacingDirection)
    addAttr(attrs, "message", issue.message)
    return `<LowSideTransistorNotAlignedWithLoad ${attrs.join(" ")} />`
  }
}
