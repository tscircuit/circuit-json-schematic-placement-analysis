import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  RegulatorCapacitorsOnWrongSides,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type PortRole = "input" | "output" | "ground" | "control"

/** A local input/output capacitor pair placed across the regulator from its ports. */
export class RegulatorInputOutputCapacitorPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly hostIds: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.hostIds = [...this.index.components.values()]
      .filter((component) => component.ftype === "simple_chip")
      .map((component) => component.source_component_id)
    this.solved = this.hostIds.length === 0
  }

  override _step(): void {
    const hostId = this.hostIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.hostIds.length
    if (!hostId) return
    const index = this.index
    const host = index.placement(hostId)
    const ports = index.portsByComponent.get(hostId) ?? []
    // Avoid interpreting arbitrary signal-processing chips as regulators.
    if (!host || ports.some((port) => !portRole(port))) return
    const inputs = ports.filter((port) => portRole(port) === "input")
    const outputs = ports.filter((port) => portRole(port) === "output")
    const grounds = ports.filter((port) => portRole(port) === "ground")
    if (inputs.length !== 1 || outputs.length !== 1 || !grounds.length) return
    const input = inputs[0]!
    const output = outputs[0]!
    if ([input, output, ...grounds].some((port) => port.do_not_connect)) return
    const inputNet = index.connected(input.source_port_id)
    const outputNet = index.connected(output.source_port_id)
    const groundNets = new Set(
      grounds.map((port) => index.connected(port.source_port_id)),
    )
    if (groundNets.size !== 1) return
    const groundNet = [...groundNets][0]!
    if (
      new Set([inputNet, outputNet, groundNet]).size !== 3 ||
      !(
        index.groundNets.has(groundNet) ||
        grounds.some((port) => port.requires_ground || port.provides_ground)
      ) ||
      !(index.powerNets.has(inputNet) || input.requires_power) ||
      !(index.powerNets.has(outputNet) || output.provides_power)
    )
      return

    const inputPin = index.port(input)
    const outputPin = index.port(output)
    if (
      !inputPin ||
      !outputPin ||
      inputPin.schematic_sheet_id !== host.schematicSheetId ||
      outputPin.schematic_sheet_id !== host.schematicSheetId
    )
      return
    const horizontal =
      (inputPin.facing_direction === "left" &&
        outputPin.facing_direction === "right") ||
      (inputPin.facing_direction === "right" &&
        outputPin.facing_direction === "left")
    const vertical =
      (inputPin.facing_direction === "up" &&
        outputPin.facing_direction === "down") ||
      (inputPin.facing_direction === "down" &&
        outputPin.facing_direction === "up")
    if (!horizontal && !vertical) return
    const sign =
      outputPin.facing_direction === "right" ||
      outputPin.facing_direction === "up"
        ? 1
        : -1
    const pinSeparation =
      sign *
      (horizontal
        ? outputPin.center.x - inputPin.center.x
        : outputPin.center.y - inputPin.center.y)
    if (pinSeparation <= 0.01) return

    const inputCap = this.localCapacitor(host, inputNet, groundNet)
    const outputCap = this.localCapacitor(host, outputNet, groundNet)
    if (!inputCap || !outputCap) return
    const beyondOppositeSide = (cap: SchematicBoxPlacement, side: number) => {
      const distance =
        side * sign * (horizontal ? cap.schX - host.schX : cap.schY - host.schY)
      const halfBodies = horizontal
        ? (host.width + cap.width) / 2
        : (host.height + cap.height) / 2
      // Ignore small offsets and overlaps: require both bodies clearly beyond
      // the wrong side of the regulator, not exact row or column alignment.
      return distance > halfBodies + 0.2
    }
    if (!beyondOppositeSide(inputCap, 1) || !beyondOppositeSide(outputCap, -1))
      return

    const name = host.sourceComponentName ?? hostId
    this.params.issues.push({
      lineItemType: "RegulatorCapacitorsOnWrongSides",
      regulatorSchematicBox: host,
      inputCapacitorSchematicBox: inputCap,
      outputCapacitorSchematicBox: outputCap,
      inputSourcePortId: input.source_port_id,
      outputSourcePortId: output.source_port_id,
      message: `Place ${inputCap.sourceComponentName} near ${name}.${input.name} on the ${inputPin.facing_direction} side and ${outputCap.sourceComponentName} near ${name}.${output.name} on the ${outputPin.facing_direction} side. Preserve all connections and leave room for labels; exact alignment is not required.`,
    })
  }

  private localCapacitor(
    host: SchematicBoxPlacement,
    rail: string,
    ground: string,
  ): SchematicBoxPlacement | undefined {
    const index = this.index
    const candidates: SchematicBoxPlacement[] = []
    // Distant capacitor banks and other functional blocks are not local support.
    const maxDistance = Math.max(6, 4 * Math.max(host.width, host.height))
    const ids = new Set(
      (index.portsByNet.get(rail) ?? []).map(
        (port) => port.source_component_id,
      ),
    )
    for (const id of ids) {
      if (index.components.get(id)?.ftype !== "simple_capacitor") continue
      const nets = index.twoTerminalNets(id)
      const cap = index.placement(id)
      if (!nets?.includes(ground) || !cap || !index.sameLocalScope(host, cap))
        continue
      if (Math.hypot(cap.schX - host.schX, cap.schY - host.schY) > maxDistance)
        continue
      const ports = index.portsByComponent.get(id)!
      if (
        ports.some(
          (port) =>
            port.do_not_connect ||
            !index.port(port) ||
            index.port(port)!.schematic_sheet_id !== host.schematicSheetId,
        )
      )
        continue
      candidates.push(cap)
    }
    // Do not guess which member of a capacitor bank belongs to this regulator.
    return candidates.length === 1 ? candidates[0] : undefined
  }

  static issueToString(issue: RegulatorCapacitorsOnWrongSides): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "regulatorName",
      issue.regulatorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "inputCapacitorName",
      issue.inputCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "outputCapacitorName",
      issue.outputCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<RegulatorCapacitorsOnWrongSides ${attrs.join(" ")} />`
  }
}

function portRole(port: SourcePort): PortRole | undefined {
  const roles = new Set<PortRole>()
  for (const hint of [port.name, ...(port.port_hints ?? [])]) {
    const name = hint.toUpperCase().replace(/[ _-]/g, "")
    if (/^(?:VIN|IN|INPUT)$/.test(name)) roles.add("input")
    else if (/^(?:VOUT|OUT|OUTPUT)$/.test(name)) roles.add("output")
    else if (/^(?:GND\d*|VSS)$/.test(name)) roles.add("ground")
    else if (
      /^(?:EN|ENABLE|CE|SHDN|NC\d*|EP|PAD|ADJ|FB|BYP|BYPASS|NR|PG|PGOOD)$/.test(
        name,
      )
    )
      roles.add("control")
  }
  return roles.size === 1 ? [...roles][0] : undefined
}
