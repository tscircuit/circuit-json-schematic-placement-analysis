import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  RepeatedCircuitLayoutInconsistent,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { hasVisibleSchematicConnection } from "../../utils/has-visible-schematic-connection"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"
import {
  type ComponentPort,
  findOutlierRcChannels,
  type RcChannelCandidate,
} from "./findOutlierRcChannels"

/** Detect a placement outlier among 3+ equivalent local RC channels. */
export class RepeatedCircuitConsistencySolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly unpopulated = new Set<string>()
  private readonly schematicGroupByCompId: ReadonlyMap<string, string>

  constructor(
    private readonly solverInput: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(solverInput.ctx)
    const groupPairs: Array<[string, string]> = []
    for (const element of solverInput.ctx.circuitJson) {
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
      if (element.type === "schematic_component") {
        groupPairs.push([
          element.schematic_component_id,
          element.schematic_group_id ?? "",
        ])
      }
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
    for (const element of solverInput.ctx.circuitJson) {
      if (element.type === "pcb_component" && !element.do_not_place)
        this.unpopulated.delete(element.source_component_id)
    }
    this.schematicGroupByCompId = new Map(groupPairs)
  }

  override _step(): void {
    this.solved = true
    const candidates: RcChannelCandidate[] = []
    for (const component of this.index.components.values()) {
      if (component.ftype !== "simple_resistor") continue
      const candidate = this.extractRcChannel(component.source_component_id)
      if (candidate) candidates.push(candidate)
    }
    if (candidates.length < 3) return

    for (const {
      outlier,
      consensusCluster,
      offsetDeviation,
    } of findOutlierRcChannels(candidates)) {
      const allChannels = [outlier, ...consensusCluster]
      if (
        !allChannels.every((ch) =>
          hasVisibleSchematicConnection(
            this.solverInput.ctx.circuitJson,
            this.index,
            ch.resistorSignalPort,
            ch.capacitorSignalPort,
          ),
        )
      )
        continue

      const outlierNames = [
        outlier.resistorBox.sourceComponentName || "resistor",
        outlier.capacitorBox.sourceComponentName || "capacitor",
      ].join(" / ")
      const refNames = consensusCluster
        .map(
          (ch) =>
            `${ch.resistorBox.sourceComponentName || "R"}/${ch.capacitorBox.sourceComponentName || "C"}`,
        )
        .join(", ")
      this.solverInput.issues.push({
        lineItemType: "RepeatedCircuitLayoutInconsistent",
        outlierSchematicBoxes: [outlier.resistorBox, outlier.capacitorBox],
        referenceChannelSchematicBoxes: consensusCluster.map((ch) => [
          ch.resistorBox,
          ch.capacitorBox,
        ]),
        offsetDeviation,
        message: `Place ${outlierNames} with the same relative arrangement used by equivalent channels (${refNames}) so repeated RC stages read consistently. Preserve pin connections, leave room for labels, and reroute affected traces.`,
      })
    }
  }

  private extractRcChannel(resistorId: string): RcChannelCandidate | undefined {
    const resistorComp = this.index.components.get(resistorId)
    const resistorPart = this.validTwoPinPart(resistorId)
    const resistorNets = this.index.twoTerminalNets(resistorId)
    if (
      resistorComp?.ftype !== "simple_resistor" ||
      !Number.isFinite(resistorComp.resistance) ||
      resistorComp.resistance <= 0 ||
      this.index.isDirectOpAmpFeedback(resistorId) ||
      !resistorPart ||
      !resistorNets ||
      resistorNets.some((net) => this.index.isRail(net))
    )
      return

    for (const signalNet of resistorNets) {
      const signalPeers = this.index.portsByNet.get(signalNet) ?? []
      if (signalPeers.length !== 2) continue
      const capPort = signalPeers.find(
        (port) => port.source_component_id !== resistorId,
      )
      if (!capPort) continue
      const capId = capPort.source_component_id
      const capComp = this.index.components.get(capId)
      const capPart = this.validTwoPinPart(capId)
      const capNets = this.index.twoTerminalNets(capId)
      const groundNet = capNets?.find((net) => net !== signalNet)
      if (
        capComp?.ftype !== "simple_capacitor" ||
        !Number.isFinite(capComp.capacitance) ||
        capComp.capacitance <= 0 ||
        this.index.isLocalFloatingChipCapacitor(capId) ||
        this.index.isDirectOpAmpFeedback(capId) ||
        !capPart ||
        !groundNet ||
        !this.index.groundNets.has(groundNet) ||
        this.index.powerNets.has(groundNet) ||
        !this.index.sameLocalScope(resistorPart.box, capPart.box)
      )
        continue

      const inputNet = resistorNets.find((net) => net !== signalNet)!
      const inputPeers = this.index.portsByNet.get(inputNet) ?? []
      if (
        inputPeers.length > 2 ||
        inputPeers.some(
          (peer) =>
            peer.source_component_id !== resistorId &&
            !this.isAllowedDriver(peer.source_component_id),
        )
      )
        continue

      const rBox = resistorPart.box
      const cBox = capPart.box
      if (
        Math.abs(rBox.schX - cBox.schX) < (rBox.width + cBox.width) / 2 &&
        Math.abs(rBox.schY - cBox.schY) < (rBox.height + cBox.height) / 2
      )
        continue

      const resistorSignalPort = resistorPart.ports.find(
        (port) => this.index.connected(port.source_port_id) === signalNet,
      )!
      const resistorSignalPin = this.index.port(resistorSignalPort)!
      const capacitorSignalPin = this.index.port(capPort)!
      const schGroup =
        this.schematicGroupByCompId.get(rBox.schematicComponentId ?? "") ?? ""
      const scopeKey = [
        rBox.schematicSheetId ?? "",
        rBox.subcircuitId ?? "",
        schGroup,
        resistorComp.source_group_id ?? "",
      ].join("|")
      const signatureKey = [
        resistorComp.resistance,
        capComp.capacitance,
        resistorSignalPin.facing_direction ?? "",
        capacitorSignalPin.facing_direction ?? "",
      ].join("|")

      return {
        scopeKey,
        signatureKey,
        inputNet,
        signalNet,
        resistorBox: rBox,
        capacitorBox: cBox,
        resistorSignalPort,
        capacitorSignalPort: capPort,
        resistorSignalPin,
        dx: cBox.schX - rBox.schX,
        dy: cBox.schY - rBox.schY,
      }
    }
    return
  }

  private isAllowedDriver(componentId: string): boolean {
    const ftype = this.index.components.get(componentId)?.ftype
    return (
      ftype === "simple_chip" ||
      ftype === "simple_op_amp" ||
      ftype === "simple_pin_header"
    )
  }

  private validTwoPinPart(id: string) {
    const box = this.index.placement(id)
    const ports = this.index.portsByComponent.get(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      ports?.length !== 2 ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0 ||
      ports.some((port) => !this.validPort(port, box.schematicSheetId))
    )
      return
    return { box, ports }
  }

  private validPort(port: ComponentPort, sheetId?: string): boolean {
    const pin = this.index.port(port)
    return Boolean(
      !port.do_not_connect &&
        pin &&
        pin.schematic_sheet_id === sheetId &&
        Number.isFinite(pin.center.x) &&
        Number.isFinite(pin.center.y) &&
        pin.facing_direction,
    )
  }

  static issueToString(issue: RepeatedCircuitLayoutInconsistent): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "outlierComponents",
      issue.outlierSchematicBoxes
        .map((box) => box.sourceComponentName)
        .filter(Boolean)
        .join(","),
    )
    addAttr(attrs, "offsetDeviation", issue.offsetDeviation)
    addAttr(attrs, "message", issue.message)
    return `<RepeatedCircuitLayoutInconsistent ${attrs.join(" ")} />`
  }
}
