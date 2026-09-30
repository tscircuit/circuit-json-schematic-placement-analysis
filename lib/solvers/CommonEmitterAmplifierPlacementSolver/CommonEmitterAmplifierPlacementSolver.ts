import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  CommonEmitterAmplifierNotArrangedVertically,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Readability of an AC-coupled NPN stage with collector and emitter resistors. */
export class CommonEmitterAmplifierPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly positiveNets = new Set<string>()
  private readonly transistorIds: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    for (const element of params.ctx.circuitJson)
      if (element.type === "source_net" && element.is_positive_voltage_source)
        this.positiveNets.add(this.index.connected(element.source_net_id))
    this.transistorIds = [...this.index.components.values()]
      .filter(
        (c) => c.ftype === "simple_transistor" && c.transistor_type === "npn",
      )
      .map((c) => c.source_component_id)
    this.solved = this.transistorIds.length === 0
  }

  override _step(): void {
    const id = this.transistorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.transistorIds.length
    if (!id) return
    const index = this.index
    const transistor = index.placement(id)
    const base = index.namedPort(id, "base")
    const collector = index.namedPort(id, "collector")
    const emitter = index.namedPort(id, "emitter")
    if (
      !transistor ||
      !base ||
      !collector ||
      !emitter ||
      new Set([base, collector, emitter]).size !== 3 ||
      index.portsByComponent.get(id)?.length !== 3 ||
      !this.isLocal(id, transistor)
    )
      return
    const baseNet = index.connected(base.source_port_id)
    const collectorNet = index.connected(collector.source_port_id)
    const emitterNet = index.connected(emitter.source_port_id)
    const signalNets = [baseNet, collectorNet, emitterNet]
    if (
      new Set(signalNets).size !== 3 ||
      signalNets.some((net) => index.isRail(net))
    )
      return
    const peers = (net: string) =>
      (index.portsByNet.get(net) ?? [])
        .filter((p) => p.source_component_id !== id)
        .map((p) => p.source_component_id)

    // Deliberately exclude switches, followers, shared/cascode stages, and
    // emitter bypass networks. Require a single, identifiable AC signal path.
    const emitterPeers = peers(emitterNet)
    if (emitterPeers.length !== 1) return
    const emitterResistorId = emitterPeers[0]!
    const emitterReturn = this.otherPassiveNet(
      emitterResistorId,
      emitterNet,
      "simple_resistor",
      transistor,
    )
    if (
      !emitterReturn ||
      !index.groundNets.has(emitterReturn) ||
      index.powerNets.has(emitterReturn)
    )
      return

    const collectorPeers = peers(collectorNet)
    if (collectorPeers.length !== 2) return
    const collectorResistors = collectorPeers.filter((peer) => {
      const supply = this.otherPassiveNet(
        peer,
        collectorNet,
        "simple_resistor",
        transistor,
      )
      return (
        supply && this.positiveNets.has(supply) && !index.groundNets.has(supply)
      )
    })
    if (collectorResistors.length !== 1) return
    const collectorResistorId = collectorResistors[0]!
    const outputCapacitorId = collectorPeers.find(
      (peer) => peer !== collectorResistorId,
    )!
    const outputNet = this.otherPassiveNet(
      outputCapacitorId,
      collectorNet,
      "simple_capacitor",
      transistor,
    )
    if (!outputNet || index.isRail(outputNet) || signalNets.includes(outputNet))
      return

    const basePeers = peers(baseNet)
    const inputCapacitors = basePeers.filter((peer) => {
      const inputNet = this.otherPassiveNet(
        peer,
        baseNet,
        "simple_capacitor",
        transistor,
      )
      return (
        inputNet &&
        !index.isRail(inputNet) &&
        !signalNets.includes(inputNet) &&
        inputNet !== outputNet
      )
    })
    if (
      inputCapacitors.length !== 1 ||
      inputCapacitors[0] === outputCapacitorId
    )
      return
    const biasResistors = basePeers.filter(
      (peer) => peer !== inputCapacitors[0],
    )
    if (biasResistors.length < 1 || biasResistors.length > 2) return
    const supplyNet = this.otherPassiveNet(
      collectorResistorId,
      collectorNet,
      "simple_resistor",
      transistor,
    )!
    const biasNets = biasResistors.map((peer) =>
      this.otherPassiveNet(peer, baseNet, "simple_resistor", transistor),
    )
    // Accept fixed bias or a supply/ground divider, never arbitrary feedback.
    if (
      !biasNets.includes(supplyNet) ||
      new Set(biasNets).size !== biasNets.length ||
      biasNets.some(
        (net) =>
          !net ||
          (net !== supplyNet &&
            (!index.groundNets.has(net) || index.powerNets.has(net))),
      )
    )
      return

    const collectorPin = index.port(collector)!
    const emitterPin = index.port(emitter)!
    if (!collectorPin.facing_direction || !emitterPin.facing_direction) return
    const collectorResistor = index.placement(collectorResistorId)!
    const emitterResistor = index.placement(emitterResistorId)!
    const placementProblems: CommonEmitterAmplifierNotArrangedVertically["placementProblems"] =
      []
    if (collectorPin.facing_direction !== "up")
      placementProblems.push("collector_not_up")
    if (emitterPin.facing_direction !== "down")
      placementProblems.push("emitter_not_down")
    // Order the stage; do not demand exact X alignment or prescribe wire routes.
    if (collectorResistor.schY <= transistor.schY)
      placementProblems.push("collector_resistor_not_above")
    if (emitterResistor.schY >= transistor.schY)
      placementProblems.push("emitter_resistor_not_below")
    if (!placementProblems.length) return
    const name = transistor.sourceComponentName ?? id
    const collectorName =
      collectorResistor.sourceComponentName ?? collectorResistorId
    const emitterName = emitterResistor.sourceComponentName ?? emitterResistorId
    this.params.issues.push({
      lineItemType: "CommonEmitterAmplifierNotArrangedVertically",
      transistorSchematicBox: transistor,
      collectorResistorSchematicBox: collectorResistor,
      emitterResistorSchematicBox: emitterResistor,
      placementProblems,
      message: `Arrange ${collectorName} above ${name}'s collector and ${emitterName} below its emitter, with the collector facing up and emitter down, so the supply-to-ground path is easy to follow. Preserve all pin connections, leave room for labels, and reroute affected traces.`,
    })
  }

  private isLocal(id: string, host: SchematicBoxPlacement): boolean {
    const placement = this.index.placement(id)
    const ports = this.index.portsByComponent.get(id)
    return (
      !!placement &&
      this.index.sameLocalScope(host, placement) &&
      !!ports?.length &&
      ports.every((p) => {
        const pin = this.index.port(p)
        return (
          !p.do_not_connect &&
          !!pin &&
          pin.schematic_sheet_id === host.schematicSheetId
        )
      })
    )
  }

  private otherPassiveNet(
    id: string,
    net: string,
    type: "simple_resistor" | "simple_capacitor",
    host: SchematicBoxPlacement,
  ): string | undefined {
    const component = this.index.components.get(id)
    const nets = this.index.twoTerminalNets(id)
    if (
      component?.ftype !== type ||
      !nets?.includes(net) ||
      !this.isLocal(id, host)
    )
      return
    const value =
      component.ftype === "simple_resistor"
        ? component.resistance
        : component.capacitance
    if (!Number.isFinite(value) || value <= 0) return
    return nets.find((n) => n !== net)
  }

  static issueToString(
    issue: CommonEmitterAmplifierNotArrangedVertically,
  ): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "transistorName",
      issue.transistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "collectorResistorName",
      issue.collectorResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "emitterResistorName",
      issue.emitterResistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "placementProblems", issue.placementProblems.join(", "))
    addAttr(attrs, "message", issue.message)
    return `<CommonEmitterAmplifierNotArrangedVertically ${attrs.join(" ")} />`
  }
}
