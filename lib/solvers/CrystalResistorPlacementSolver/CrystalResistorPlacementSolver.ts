import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  ResistorSeparatedFromCrystal,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Keep a crystal's series resistor in the same visible local branch. */
export class CrystalResistorPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly crystalIds: string[]
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
    this.crystalIds = [...this.index.components.values()]
      .filter((component) => component.ftype === "simple_crystal")
      .map((component) => component.source_component_id)
    this.solved = this.crystalIds.length === 0
  }

  override _step(): void {
    const crystalId = this.crystalIds[this.currentIndex++]!
    this.solved = this.currentIndex >= this.crystalIds.length
    const index = this.index
    const component = index.components.get(crystalId)
    const crystal = index.placement(crystalId)
    const ports = index.portsByComponent.get(crystalId) ?? []
    if (
      component?.ftype !== "simple_crystal" ||
      !Number.isFinite(component.frequency) ||
      component.frequency <= 0 ||
      this.unpopulated.has(crystalId) ||
      !crystal ||
      !validBox(crystal) ||
      ![2, 4].includes(ports.length) ||
      ports.some((port) => port.do_not_connect)
    )
      return

    // Four-pin crystals need explicit ground evidence for their other two pins.
    // A power terminal, or an unknown extra terminal, is not a signal pair.
    if (
      ports.some((port) =>
        index.powerNets.has(index.connected(port.source_port_id)),
      )
    )
      return
    const signals = ports.filter(
      (port) => !index.groundNets.has(index.connected(port.source_port_id)),
    )
    if (signals.length !== 2) return
    const nets = signals.map((port) => index.connected(port.source_port_id))
    if (nets[0] === nets[1]) return

    for (const [side, signal] of signals.entries()) {
      const net = nets[side]!
      const members = index.portsByNet.get(net) ?? []
      const resistors = members.filter(
        (port) =>
          index.components.get(port.source_component_id)?.ftype ===
          "simple_resistor",
      )
      if (resistors.length !== 1) continue
      const resistorPort = resistors[0]!
      const resistorId = resistorPort.source_component_id
      const resistorComponent = index.components.get(resistorId)
      const resistor = index.placement(resistorId)
      const resistorPorts = index.portsByComponent.get(resistorId) ?? []
      const resistorNets = index.twoTerminalNets(resistorId)
      if (
        resistorComponent?.ftype !== "simple_resistor" ||
        !Number.isFinite(resistorComponent.resistance) ||
        resistorComponent.resistance <= 0 ||
        this.unpopulated.has(resistorId) ||
        !resistor ||
        !validBox(resistor) ||
        !index.sameLocalScope(crystal, resistor) ||
        !resistorNets ||
        resistorPorts.some((port) => port.do_not_connect) ||
        resistorNets.some((n) => index.isRail(n))
      )
        continue

      const farNet = resistorNets.find((n) => n !== net)
      const oppositeNet = nets[1 - side]!
      if (!farNet || farNet === oppositeNet) continue
      const peers = (index.portsByNet.get(farNet) ?? []).filter(
        (port) => port.source_component_id !== resistorId,
      )
      if (peers.length !== 1) continue
      const chipPort = peers[0]!
      const chipId = chipPort.source_component_id
      if (
        chipPort.do_not_connect ||
        index.components.get(chipId)?.ftype !== "simple_chip" ||
        this.unpopulated.has(chipId)
      )
        continue
      const oppositeMembers = index.portsByNet.get(oppositeNet) ?? []
      if (
        oppositeMembers.filter((port) => port.source_component_id === chipId)
          .length !== 1
      )
        continue

      // No other signal branches: grounded load capacitors are the only allowed
      // peers besides the crystal, series resistor, and the same host chip.
      if (
        members.some(
          (port) =>
            port.do_not_connect ||
            (![crystalId, resistorId].includes(port.source_component_id) &&
              !this.isGroundedLoadCapacitor(port, net)),
        )
      )
        continue
      if (
        oppositeMembers.some(
          (port) =>
            port.do_not_connect ||
            (![crystalId, chipId].includes(port.source_component_id) &&
              !this.isGroundedLoadCapacitor(port, oppositeNet)),
        )
      )
        continue

      const crystalPin = index.port(signal)
      const resistorPin = index.port(resistorPort)
      if (
        !crystalPin ||
        !resistorPin ||
        [crystalPin, resistorPin].some(
          (pin) =>
            pin.schematic_sheet_id !== crystal.schematicSheetId ||
            !Number.isFinite(pin.center.x) ||
            !Number.isFinite(pin.center.y),
        )
      )
        continue
      const pinDistance = Math.hypot(
        crystalPin.center.x - resistorPin.center.x,
        crystalPin.center.y - resistorPin.center.y,
      )
      // A schematic readability allowance for symbols and labels, not a PCB
      // distance constraint or an exact alignment requirement.
      const maxRecommendedPinDistance = Math.max(
        4,
        3 *
          Math.max(
            crystal.width,
            crystal.height,
            resistor.width,
            resistor.height,
          ),
      )
      if (pinDistance <= maxRecommendedPinDistance) continue
      this.params.issues.push({
        lineItemType: "ResistorSeparatedFromCrystal",
        crystalSchematicBox: crystal,
        resistorSchematicBox: resistor,
        pinDistance,
        maxRecommendedPinDistance,
        message: `Place ${resistor.sourceComponentName || "the series resistor"} beside ${crystal.sourceComponentName || "the crystal"} so their shared signal branch is easy to follow. Preserve the original pin connections, leave room for labels and load capacitors, and reroute the affected wires.`,
      })
    }
  }

  private isGroundedLoadCapacitor(
    port: SourcePort,
    signalNet: string,
  ): boolean {
    if (
      !port.source_component_id ||
      this.unpopulated.has(port.source_component_id)
    )
      return false
    const component = this.index.components.get(port.source_component_id)
    const nets = this.index.twoTerminalNets(port.source_component_id)
    return (
      component?.ftype === "simple_capacitor" &&
      Number.isFinite(component.capacitance) &&
      component.capacitance > 0 &&
      !(this.index.portsByComponent.get(port.source_component_id) ?? []).some(
        (p) => p.do_not_connect,
      ) &&
      Boolean(
        nets?.some(
          (net) => net !== signalNet && this.index.groundNets.has(net),
        ),
      )
    )
  }

  static issueToString(issue: ResistorSeparatedFromCrystal): string {
    const attrs: string[] = []
    addAttr(attrs, "crystalName", issue.crystalSchematicBox.sourceComponentName)
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "pinDistance", issue.pinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<ResistorSeparatedFromCrystal ${attrs.join(" ")} />`
  }
}

function validBox(box: SchematicBoxPlacement): boolean {
  return (
    [box.schX, box.schY, box.width, box.height].every(Number.isFinite) &&
    box.width > 0 &&
    box.height > 0
  )
}
