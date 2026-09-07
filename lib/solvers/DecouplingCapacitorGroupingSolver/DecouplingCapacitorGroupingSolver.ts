import { BaseSolver } from "@tscircuit/solver-utils"
import type { CircuitJson, SourceNet, SourcePort } from "circuit-json"
import {
  ConnectivityMap,
  findConnectedNetworks,
  getSourcePortConnectivityMapFromCircuitJson,
} from "circuit-json-to-connectivity-map"
import type {
  DecouplingCapacitorsNotCloseTogether,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr, fmtNumber } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

interface CapacitorGroup {
  rail: SourceNet
  placements: SchematicBoxPlacement[]
}

const GROUND_NAME = /^(?:[ADP]?GND|VSS)(?:[_\d].*)?$/i
const POWER_NAME =
  /^(?:[AD]?V(?:CC|DD)[A-Z\d_]*|VBAT|VBUS|VIN|[PN]\d+V\d*|[+-]?\d+(?:[._]\d+)?V\d*)$/i

export class DecouplingCapacitorGroupingSolver extends BaseSolver {
  // Center-to-center distance in schematic units, not PCB millimeters.
  static readonly MAX_DISTANCE = 5

  private readonly groups: CapacitorGroup[]
  private readonly out: SchematicPlacementIssue[]
  private currentIndex = 0

  constructor({
    ctx,
    issues,
  }: {
    ctx: SolverContext
    issues: SchematicPlacementIssue[]
  }) {
    super()
    this.out = issues
    this.groups = this.getGroups(ctx)
    this.solved = this.groups.length === 0
  }

  private getGroups(ctx: SolverContext): CapacitorGroup[] {
    const connectivity = this.getConnectivity(ctx.circuitJson)
    const netsByConnection = new Map<string, SourceNet[]>()
    const portsByComponent = new Map<string, SourcePort[]>()
    const capacitorIds = new Set<string>()

    for (const element of ctx.circuitJson) {
      if (element.type === "source_net") {
        const connection = connectivity.getNetConnectedToId(
          element.source_net_id,
        )
        if (!connection) continue
        const nets = netsByConnection.get(connection) ?? []
        nets.push(element)
        netsByConnection.set(connection, nets)
      } else if (element.type === "source_port") {
        if (!element.source_component_id) continue
        const ports = portsByComponent.get(element.source_component_id) ?? []
        ports.push(element)
        portsByComponent.set(element.source_component_id, ports)
      } else if (
        element.type === "source_component" &&
        element.ftype === "simple_capacitor"
      ) {
        capacitorIds.add(element.source_component_id)
      }
    }

    const isGround = (net: SourceNet): boolean =>
      net.is_ground === true || GROUND_NAME.test(net.name)
    const isPower = (net: SourceNet): boolean =>
      !isGround(net) &&
      !net.is_analog_signal &&
      !net.is_digital_signal &&
      (net.is_power === true ||
        net.is_positive_voltage_source === true ||
        POWER_NAME.test(net.name))

    const groups = new Map<string, CapacitorGroup>()
    for (const placement of ctx.componentPlacements) {
      if (
        !placement.sourceComponentId ||
        !capacitorIds.has(placement.sourceComponentId)
      )
        continue
      const ports = portsByComponent.get(placement.sourceComponentId) ?? []
      if (ports.length !== 2) continue
      const connections = ports.map((port) =>
        connectivity.getNetConnectedToId(port.source_port_id),
      )
      const [first, second] = connections
      if (!first || !second || first === second) continue
      const ground = [first, second].find((connection) =>
        (netsByConnection.get(connection) ?? []).some(isGround),
      )
      if (!ground) continue
      const power = first === ground ? second : first
      const powerNets = netsByConnection.get(power) ?? []
      if (powerNets.some(isGround)) continue
      const rail = powerNets.find(isPower)
      if (!rail) continue

      // Connectivity IDs keep similarly named but isolated rails separate.
      const key = JSON.stringify([placement.schematicSheetId, power, ground])
      const group = groups.get(key) ?? { rail, placements: [] }
      group.placements.push(placement)
      groups.set(key, group)
    }
    return [...groups.values()].filter((group) => group.placements.length > 1)
  }

  private getConnectivity(circuitJson: CircuitJson): ConnectivityMap {
    const sourceConnectivity =
      getSourcePortConnectivityMapFromCircuitJson(circuitJson)
    const idsByKey = new Map<string, string[]>()
    for (const element of circuitJson) {
      if (
        element.type !== "source_port" &&
        element.type !== "source_net" &&
        element.type !== "source_trace"
      )
        continue
      if (!element.subcircuit_connectivity_map_key) continue
      const key = JSON.stringify([
        element.subcircuit_id,
        element.subcircuit_connectivity_map_key,
      ])
      const ids = idsByKey.get(key) ?? []
      if (element.type === "source_port") ids.push(element.source_port_id)
      else if (element.type === "source_net") ids.push(element.source_net_id)
      else
        ids.push(
          ...element.connected_source_port_ids,
          ...element.connected_source_net_ids,
        )
      idsByKey.set(key, ids)
    }
    return new ConnectivityMap(
      findConnectedNetworks([
        ...Object.values(sourceConnectivity.netMap),
        ...idsByKey.values(),
      ]),
    )
  }

  override _step(): void {
    const group = this.groups[this.currentIndex++]
    this.solved = this.currentIndex >= this.groups.length
    if (!group) return

    // A minimum spanning tree finds gaps between clusters without flagging the
    // distant endpoints of an otherwise tightly spaced row of capacitors.
    const remaining = new Set(group.placements.slice(1))
    const nearest = new Map<
      SchematicBoxPlacement,
      {
        placement: SchematicBoxPlacement
        distance: number
      }
    >()
    let current = group.placements[0]!
    while (remaining.size > 0) {
      let next: SchematicBoxPlacement | undefined
      let shortestDistance = Infinity
      for (const candidate of remaining) {
        const distance = Math.hypot(
          candidate.schX - current.schX,
          candidate.schY - current.schY,
        )
        if (distance < (nearest.get(candidate)?.distance ?? Infinity)) {
          nearest.set(candidate, { placement: current, distance })
        }
        const bestDistance = nearest.get(candidate)!.distance
        if (bestDistance < shortestDistance) {
          shortestDistance = bestDistance
          next = candidate
        }
      }
      if (!next) break
      const first = nearest.get(next)!.placement
      if (shortestDistance > DecouplingCapacitorGroupingSolver.MAX_DISTANCE) {
        this.out.push(
          this.createIssue(group.rail, first, next, shortestDistance),
        )
      }
      remaining.delete(next)
      current = next
    }
  }

  private createIssue(
    rail: SourceNet,
    first: SchematicBoxPlacement,
    second: SchematicBoxPlacement,
    distance: number,
  ): DecouplingCapacitorsNotCloseTogether {
    const maxAllowedDistance = DecouplingCapacitorGroupingSolver.MAX_DISTANCE
    const firstName = first.sourceComponentName ?? first.sourceComponentId
    const secondName = second.sourceComponentName ?? second.sourceComponentId
    return {
      lineItemType: "DecouplingCapacitorsNotCloseTogether",
      railName: rail.name,
      sourceNetId: rail.source_net_id,
      firstCapacitorSchematicBox: first,
      secondCapacitorSchematicBox: second,
      distance,
      maxAllowedDistance,
      message: `group ${firstName} and ${secondName} closer together on rail ${rail.name}; their spacing is ${fmtNumber(distance)} schematic units (maximum ${maxAllowedDistance})`,
    }
  }

  static issueToString(issue: DecouplingCapacitorsNotCloseTogether): string {
    const attrs: string[] = []
    addAttr(attrs, "rail", issue.railName)
    addAttr(
      attrs,
      "firstCapacitorName",
      issue.firstCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondCapacitorName",
      issue.secondCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "distance", issue.distance)
    addAttr(attrs, "maxAllowedDistance", issue.maxAllowedDistance)
    addAttr(attrs, "message", issue.message)
    return `<DecouplingCapacitorsNotCloseTogether ${attrs.join(" ")} />`
  }
}
