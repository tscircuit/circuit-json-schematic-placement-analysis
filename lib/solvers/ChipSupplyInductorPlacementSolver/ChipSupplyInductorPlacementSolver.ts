import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  InductorSeparatedFromChipPin,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** A private chip-to-inductor branch returning to the same chip through a declared power net. */
export class ChipSupplyInductorPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly inductorIds: string[]
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
        if (element.requires_power || element.provides_power)
          this.index.powerNets.add(net)
        if (element.requires_ground || element.provides_ground)
          this.index.groundNets.add(net)
      }
    }
    this.inductorIds = [...this.index.components.values()]
      .filter((component) => component.ftype === "simple_inductor")
      .map((component) => component.source_component_id)
    this.solved = this.inductorIds.length === 0
  }

  override _step(): void {
    const inductorId = this.inductorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.inductorIds.length
    if (!inductorId || this.unpopulated.has(inductorId)) return
    const index = this.index
    const component = index.components.get(inductorId)
    const inductor = index.placement(inductorId)
    const nets = index.twoTerminalNets(inductorId)
    const inductorPorts = index.portsByComponent.get(inductorId) ?? []
    if (
      component?.ftype !== "simple_inductor" ||
      !inductor ||
      !nets ||
      inductorPorts.some((p) => p.do_not_connect)
    )
      return
    const powers = nets.filter((net) => index.powerNets.has(net))
    if (powers.length !== 1 || nets.some((net) => index.groundNets.has(net)))
      return
    const power = powers[0]!
    const signal = nets.find((net) => net !== power)!
    const members = index.portsByNet.get(signal) ?? []
    if (members.length !== 2) return
    const chipPort = members.find((p) => p.source_component_id !== inductorId)
    const inductorPort = members.find(
      (p) => p.source_component_id === inductorId,
    )
    if (!chipPort || !inductorPort || chipPort.do_not_connect) return
    const hostId = chipPort.source_component_id
    const host = index.placement(hostId)
    if (
      index.components.get(hostId)?.ftype !== "simple_chip" ||
      (index.portsByComponent.get(hostId)?.length ?? 0) < 3 ||
      this.unpopulated.has(hostId) ||
      !host ||
      !index.sameLocalScope(host, inductor)
    )
      return
    // Requiring a return to the same chip excludes ordinary supply filters whose
    // two ends merely happen to reach different ICs. This does not infer converter function.
    const returns = (index.portsByNet.get(power) ?? []).filter(
      (p) => p.source_component_id === hostId,
    )
    if (returns.length === 0 || returns.some((p) => p.do_not_connect)) return
    const chipPin = index.port(chipPort)
    const inductorPin = index.port(inductorPort)
    if (
      !chipPin ||
      !inductorPin ||
      [host, inductor].some(
        (box) =>
          ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
          box.width <= 0 ||
          box.height <= 0,
      ) ||
      [chipPin, inductorPin].some(
        (pin) =>
          pin.schematic_sheet_id !== host.schematicSheetId ||
          !Number.isFinite(pin.center.x) ||
          !Number.isFinite(pin.center.y),
      )
    )
      return
    const pinDistance = Math.hypot(
      chipPin.center.x - inductorPin.center.x,
      chipPin.center.y - inductorPin.center.y,
    )
    // Leave room for symbols and labels; this is a schematic readability threshold,
    // not a PCB spacing requirement taken from the reference design.
    const maxRecommendedPinDistance = Math.max(
      6,
      3 * Math.max(inductor.width, inductor.height),
    )
    if (pinDistance <= maxRecommendedPinDistance) return
    this.params.issues.push({
      lineItemType: "InductorSeparatedFromChipPin",
      hostSchematicBox: host,
      inductorSchematicBox: inductor,
      chipSourcePortId: chipPort.source_port_id,
      inductorSourcePortId: inductorPort.source_port_id,
      powerSourcePortIds: returns.map((p) => p.source_port_id),
      pinDistance,
      maxRecommendedPinDistance,
      message: `Place ${inductor.sourceComponentName || "inductor"} near its directly connected pin on ${host.sourceComponentName || "chip"} so the inductor and its supply return to the chip can be read together. Preserve pin connections, leave room for labels, and reroute affected traces; exact alignment is not required.`,
    })
  }

  static issueToString(issue: InductorSeparatedFromChipPin): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "inductorName",
      issue.inductorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "pinDistance", issue.pinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<InductorSeparatedFromChipPin ${attrs.join(" ")} />`
  }
}
