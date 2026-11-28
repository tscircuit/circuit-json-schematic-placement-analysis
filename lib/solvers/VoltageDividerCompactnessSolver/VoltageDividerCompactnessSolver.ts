import { BaseSolver } from "@tscircuit/solver-utils"
import { cju } from "@tscircuit/circuit-json-util"
import type { SourcePort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  VoltageDividerNotCompact,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type ComponentPort = SourcePort & { source_component_id: string }

/** A local supply-to-ground voltage divider whose two resistors are scattered apart. */
export class VoltageDividerCompactnessSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly taps: string[]
  private readonly unpopulated = new Set<string>()
  private currentIndex = 0

  constructor(
    private readonly solverInput: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(solverInput.ctx)
    const db = cju(solverInput.ctx.circuitJson)
    for (const pcbComponent of db.pcb_component.list()) {
      if (pcbComponent.do_not_place) {
        this.unpopulated.add(pcbComponent.source_component_id)
      }
    }
    for (const port of db.source_port.list()) {
      const net = this.index.connected(port.source_port_id)
      if (port.requires_ground || port.provides_ground) {
        this.index.groundNets.add(net)
      }
      if (
        port.requires_power ||
        port.provides_power ||
        port.requires_voltage !== undefined ||
        port.provides_voltage !== undefined
      ) {
        this.index.powerNets.add(net)
      }
    }
    this.taps = [...this.index.portsByNet.keys()]
    this.solved = this.taps.length === 0
  }

  override _step(): void {
    const tap = this.taps[this.currentIndex++]
    this.solved = this.currentIndex >= this.taps.length
    if (!tap || this.index.isRail(tap)) return

    const index = this.index
    const members = index.portsByNet.get(tap) ?? []
    if (members.some((port) => port.do_not_connect)) return

    const resistorPorts = members.filter(
      (port) =>
        index.components.get(port.source_component_id)?.ftype ===
        "simple_resistor",
    )
    const resistorIds = new Set(
      resistorPorts.map((port) => port.source_component_id),
    )
    if (resistorPorts.length !== 2 || resistorIds.size !== 2) return

    const tapLoadPorts = members.filter(
      (port) => !resistorIds.has(port.source_component_id),
    )
    if (tapLoadPorts.length === 0) return

    const first = this.resolveResistorBranch(resistorPorts[0]!, tap)
    const second = this.resolveResistorBranch(resistorPorts[1]!, tap)
    if (
      !first ||
      !second ||
      first.outerNet === second.outerNet ||
      !index.sameLocalScope(first.box, second.box)
    ) {
      return
    }

    const supply =
      this.isSupplyOnly(first.outerNet) && this.isGroundOnly(second.outerNet)
        ? first
        : this.isSupplyOnly(second.outerNet) &&
            this.isGroundOnly(first.outerNet)
          ? second
          : undefined
    if (!supply) return
    const ground = supply === first ? second : first

    // Filtered dividers with a shunt capacitor to ground are covered by VoltageDividerNetworkNotGrouped.
    if (
      tapLoadPorts.some((port) => {
        const component = index.components.get(port.source_component_id)
        if (component?.ftype !== "simple_capacitor") return false
        const capNets = index.twoTerminalNets(port.source_component_id)
        return Boolean(
          Number.isFinite(component.capacitance) &&
            component.capacitance > 0 &&
            capNets?.includes(ground.outerNet),
        )
      })
    ) {
      return
    }

    if (
      Math.abs(supply.box.schX - ground.box.schX) <
        (supply.box.width + ground.box.width) / 2 &&
      Math.abs(supply.box.schY - ground.box.schY) <
        (supply.box.height + ground.box.height) / 2
    ) {
      return
    }

    const tapLoadBoxes: SchematicBoxPlacement[] = []
    const seenLoads = new Set<string>()
    for (const loadPort of tapLoadPorts) {
      const loadId = loadPort.source_component_id
      if (seenLoads.has(loadId)) continue
      seenLoads.add(loadId)
      const loadBox = this.validPlacement(loadId)
      if (
        loadBox &&
        index.sameLocalScope(supply.box, loadBox) &&
        this.validPort(loadPort, loadBox.schematicSheetId)
      ) {
        tapLoadBoxes.push(loadBox)
      }
    }

    const resistorTapDistance = Math.hypot(
      supply.pin.center.x - ground.pin.center.x,
      supply.pin.center.y - ground.pin.center.y,
    )
    // Allow readable vertical/L-shaped spacing up to 6 schematic units or 4x symbol span.
    const maxRecommendedTapDistance = Math.max(
      6,
      4 *
        Math.max(
          supply.box.width,
          supply.box.height,
          ground.box.width,
          ground.box.height,
        ),
    )
    if (resistorTapDistance <= maxRecommendedTapDistance) return

    const loadLabel =
      tapLoadBoxes.length === 1 && tapLoadBoxes[0]?.sourceComponentName
        ? ` near ${tapLoadBoxes[0].sourceComponentName}`
        : ""
    this.solverInput.issues.push({
      lineItemType: "VoltageDividerNotCompact",
      supplyResistorSchematicBox: supply.box,
      groundResistorSchematicBox: ground.box,
      tapLoadSchematicBoxes: tapLoadBoxes,
      supplyTapSourcePortId: supply.port.source_port_id,
      groundTapSourcePortId: ground.port.source_port_id,
      resistorTapDistance,
      maxRecommendedTapDistance,
      message: `Group ${supply.box.sourceComponentName || "the supply resistor"} and ${ground.box.sourceComponentName || "the ground resistor"} around their shared voltage-divider tap${loadLabel}, keeping the supply resistor above the ground resistor. Preserve all pin connections, leave room for labels, and reroute affected traces.`,
    })
  }

  private isSupplyOnly(net: string): boolean {
    return this.index.powerNets.has(net) && !this.index.groundNets.has(net)
  }

  private isGroundOnly(net: string): boolean {
    return this.index.groundNets.has(net) && !this.index.powerNets.has(net)
  }

  private resolveResistorBranch(port: ComponentPort, tapNet: string) {
    const id = port.source_component_id
    const component = this.index.components.get(id)
    const nets = this.index.twoTerminalNets(id)
    const box = this.validPlacement(id)
    if (
      component?.ftype !== "simple_resistor" ||
      !Number.isFinite(component.resistance) ||
      component.resistance <= 0 ||
      !nets ||
      !box
    ) {
      return undefined
    }
    const allPorts = this.index.portsByComponent.get(id) ?? []
    if (
      allPorts.some(
        (candidate) => !this.validPort(candidate, box.schematicSheetId),
      )
    ) {
      return undefined
    }
    const pin = this.index.port(port)
    const outerNet = nets.find((net) => net !== tapNet)
    if (!pin || !outerNet) return undefined
    return { box, port, pin, outerNet }
  }

  private validPlacement(id: string) {
    const box = this.index.placement(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    ) {
      return undefined
    }
    return box
  }

  private validPort(port: ComponentPort, sheetId?: string) {
    const pin = this.index.port(port)
    return Boolean(
      !port.do_not_connect &&
        pin &&
        pin.schematic_sheet_id === sheetId &&
        Number.isFinite(pin.center.x) &&
        Number.isFinite(pin.center.y),
    )
  }

  static issueToString(issue: VoltageDividerNotCompact): string {
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
    addAttr(attrs, "resistorTapDistance", issue.resistorTapDistance)
    addAttr(attrs, "maxRecommendedTapDistance", issue.maxRecommendedTapDistance)
    addAttr(attrs, "message", issue.message)
    return `<VoltageDividerNotCompact ${attrs.join(" ")} />`
  }
}
