import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  CapacitorSeparatedFromChipPins,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** A capacitor connected across two chip pins, placed far across the chip from them. */
export class ChipPinPairCapacitorPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly capacitorIds: string[]
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
    this.capacitorIds = [...this.index.components.values()]
      .filter((component) => component.ftype === "simple_capacitor")
      .map((component) => component.source_component_id)
    this.solved = this.capacitorIds.length === 0
  }

  override _step(): void {
    const capacitorId = this.capacitorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.capacitorIds.length
    if (!capacitorId || this.unpopulated.has(capacitorId)) return
    const index = this.index
    const component = index.components.get(capacitorId)
    const capacitor = index.placement(capacitorId)
    const capacitorPorts = index.portsByComponent.get(capacitorId) ?? []
    const nets = index.twoTerminalNets(capacitorId)
    if (
      component?.ftype !== "simple_capacitor" ||
      !Number.isFinite(component.capacitance) ||
      component.capacitance <= 0 ||
      !capacitor ||
      !nets ||
      nets.some((net) => index.isRail(net)) ||
      capacitorPorts.some((port) => port.do_not_connect || hasSupplyRole(port))
    )
      return

    // Each capacitor terminal must connect to exactly one pin on the same chip.
    // Shared nets and connections to different chips do not define a local pair.
    const peers = nets.map((net) => {
      const members = index.portsByNet.get(net) ?? []
      if (members.length !== 2) return
      return members.find((port) => port.source_component_id !== capacitorId)
    })
    const [first, second] = peers
    if (
      !first ||
      !second ||
      first.source_component_id !== second.source_component_id ||
      first.do_not_connect ||
      second.do_not_connect ||
      hasSupplyRole(first) ||
      hasSupplyRole(second)
    )
      return
    const hostId = first.source_component_id
    const host = index.placement(hostId)
    if (
      index.components.get(hostId)?.ftype !== "simple_chip" ||
      this.unpopulated.has(hostId) ||
      !host ||
      !index.sameLocalScope(host, capacitor)
    )
      return
    const chipPorts = [first, second]
    const pins = chipPorts.map((port) => index.port(port))
    const capPins = capacitorPorts.map((port) => index.port(port))
    if (
      [...pins, ...capPins].some(
        (pin) =>
          !pin ||
          pin.schematic_sheet_id !== host.schematicSheetId ||
          !Number.isFinite(pin.center.x) ||
          !Number.isFinite(pin.center.y),
      ) ||
      [host, capacitor].some(
        (box) =>
          ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
          box.width <= 0 ||
          box.height <= 0,
      )
    )
      return
    const firstPin = pins[0]!,
      secondPin = pins[1]!
    const side = firstPin.facing_direction
    if (!side || side !== secondPin.facing_direction) return
    const horizontal = side === "left" || side === "right"
    const sign = side === "left" || side === "down" ? -1 : 1
    const pinSpan = Math.hypot(
      firstPin.center.x - secondPin.center.x,
      firstPin.center.y - secondPin.center.y,
    )
    if (pinSpan < 0.01) return
    const oppositeDistance =
      -sign *
      (horizontal ? capacitor.schX - host.schX : capacitor.schY - host.schY)
    const halfBodies = horizontal
      ? (host.width + capacitor.width) / 2
      : (host.height + capacitor.height) / 2
    // Require the entire capacitor body to be beyond the opposite host edge.
    // A small offset, an overlap, or a capacitor already on the pin side is not this issue.
    if (oppositeDistance <= halfBodies + 0.2) return
    const maxPinDistance = Math.max(
      ...pins.map((pin, i) =>
        Math.hypot(
          pin!.center.x - capPins[i]!.center.x,
          pin!.center.y - capPins[i]!.center.y,
        ),
      ),
    )
    // Schematic readability allowance for the symbol, labels and pin spacing;
    // this is not a PCB layout or electrical distance constraint.
    const maxRecommendedPinDistance = Math.max(
      4,
      3 * Math.max(capacitor.width, capacitor.height),
      2 * pinSpan,
    )
    if (maxPinDistance <= maxRecommendedPinDistance) return
    this.params.issues.push({
      lineItemType: "CapacitorSeparatedFromChipPins",
      hostSchematicBox: host,
      capacitorSchematicBox: capacitor,
      chipSourcePortIds: [
        chipPorts[0]!.source_port_id,
        chipPorts[1]!.source_port_id,
      ],
      maxPinDistance,
      maxRecommendedPinDistance,
      message: `Place ${capacitor.sourceComponentName ?? capacitorId} beside its two connected pins on the ${side} side of ${host.sourceComponentName ?? hostId} so their connections can be read together. Preserve pin connections, leave room for labels, and reroute affected traces; exact alignment is not required.`,
    })
  }

  static issueToString(issue: CapacitorSeparatedFromChipPins): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "maxPinDistance", issue.maxPinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<CapacitorSeparatedFromChipPins ${attrs.join(" ")} />`
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
