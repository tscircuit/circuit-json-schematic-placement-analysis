import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  ResistorSeparatedFromChipPin,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** An isolated chip-to-ground resistor placed far beyond the chip's opposite edge. */
export class ChipPinResistorPlacementSolver extends BaseSolver {
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
    for (const element of params.ctx.circuitJson)
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
    this.resistorIds = [...this.index.components.values()]
      .filter((component) => component.ftype === "simple_resistor")
      .map((component) => component.source_component_id)
    this.solved = this.resistorIds.length === 0
  }

  override _step(): void {
    const resistorId = this.resistorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.resistorIds.length
    if (!resistorId || this.unpopulated.has(resistorId)) return
    const index = this.index
    const component = index.components.get(resistorId)
    const resistor = index.placement(resistorId)
    const nets = index.twoTerminalNets(resistorId)
    const resistorPorts = index.portsByComponent.get(resistorId) ?? []
    if (
      component?.ftype !== "simple_resistor" ||
      !Number.isFinite(component.resistance) ||
      component.resistance <= 0 ||
      !resistor ||
      !nets ||
      resistorPorts.some((p) => p.do_not_connect)
    )
      return

    // A declared ground return and a private two-port net establish a local branch.
    // A series resistor or a shared bus may belong beside another device instead.
    const grounds = nets.filter(
      (net) => index.groundNets.has(net) && !index.powerNets.has(net),
    )
    if (grounds.length !== 1) return
    const signal = nets.find((net) => net !== grounds[0])!
    if (index.isRail(signal)) return
    const members = index.portsByNet.get(signal) ?? []
    if (members.length !== 2) return
    const chipPort = members.find((p) => p.source_component_id !== resistorId)
    const resistorPort = members.find(
      (p) => p.source_component_id === resistorId,
    )
    if (
      !chipPort ||
      !resistorPort ||
      chipPort.do_not_connect ||
      hasSupplyRole(chipPort)
    )
      return
    const hostId = chipPort.source_component_id
    const host = index.placement(hostId)
    if (
      index.components.get(hostId)?.ftype !== "simple_chip" ||
      (index.portsByComponent.get(hostId)?.length ?? 0) < 3 ||
      this.unpopulated.has(hostId) ||
      !host ||
      !index.sameLocalScope(host, resistor)
    )
      return
    const chipPin = index.port(chipPort)
    const resistorPin = index.port(resistorPort)
    if (
      !chipPin ||
      !resistorPin ||
      [chipPin, resistorPin].some(
        (pin) =>
          pin.schematic_sheet_id !== host.schematicSheetId ||
          !Number.isFinite(pin.center.x) ||
          !Number.isFinite(pin.center.y),
      ) ||
      [host, resistor].some(
        (box) =>
          ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
          box.width <= 0 ||
          box.height <= 0,
      )
    )
      return

    const side = chipPin.facing_direction
    if (!side) return
    const horizontal = side === "left" || side === "right"
    const sign = side === "left" || side === "down" ? -1 : 1
    const oppositeDistance =
      -sign *
      (horizontal ? resistor.schX - host.schX : resistor.schY - host.schY)
    const halfBodies = horizontal
      ? (host.width + resistor.width) / 2
      : (host.height + resistor.height) / 2
    if (oppositeDistance <= halfBodies + 0.2) return
    const pinDistance = Math.hypot(
      chipPin.center.x - resistorPin.center.x,
      chipPin.center.y - resistorPin.center.y,
    )
    // Allow normal symbol/label spacing; this is a schematic readability threshold.
    const maxRecommendedPinDistance = Math.max(
      4,
      3 * Math.max(resistor.width, resistor.height),
    )
    if (pinDistance <= maxRecommendedPinDistance) return
    this.params.issues.push({
      lineItemType: "ResistorSeparatedFromChipPin",
      hostSchematicBox: host,
      resistorSchematicBox: resistor,
      chipSourcePortId: chipPort.source_port_id,
      resistorSourcePortId: resistorPort.source_port_id,
      pinDistance,
      maxRecommendedPinDistance,
      message: `Place ${resistor.sourceComponentName || "resistor"} beside its connected pin on the ${side} side of ${host.sourceComponentName || "chip"} so the resistor-to-ground branch can be read together. Preserve pin connections, leave room for labels, and reroute affected traces; exact alignment is not required.`,
    })
  }

  static issueToString(issue: ResistorSeparatedFromChipPin): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "pinDistance", issue.pinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<ResistorSeparatedFromChipPin ${attrs.join(" ")} />`
  }
}

function hasSupplyRole(port: SourcePort): boolean {
  return Boolean(
    port.requires_power ||
      port.provides_power ||
      port.requires_ground ||
      port.provides_ground ||
      port.requires_voltage !== undefined ||
      port.provides_voltage !== undefined,
  )
}
