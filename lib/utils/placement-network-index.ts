import type {
  CircuitJson,
  SchematicComponent,
  SchematicPort,
  SimulationOpAmp,
  SourcePort,
} from "circuit-json"
import type { SolverContext } from "../solvers/SolverContext"
import type { SchematicBoxPlacement } from "../types"
import { getSourceConnectivity } from "./source-connectivity"

type ComponentPort = SourcePort & { source_component_id: string }

/** Electrical identity and unambiguous placements for local support networks. */
export class PlacementNetworkIndex {
  readonly connected: (id: string) => string
  readonly components = new Map<
    string,
    Extract<CircuitJson[number], { type: "source_component" }>
  >()
  readonly portsByComponent = new Map<string, ComponentPort[]>()
  readonly portsByNet = new Map<string, ComponentPort[]>()
  readonly powerNets = new Set<string>()
  readonly groundNets = new Set<string>()
  private readonly placements = new Map<string, SchematicBoxPlacement[]>()
  private readonly schematicComponents = new Map<string, SchematicComponent>()
  private readonly schematicPorts = new Map<string, SchematicPort[]>()
  private readonly opAmpModels: SimulationOpAmp[] = []

  constructor(ctx: SolverContext) {
    this.connected = getSourceConnectivity(ctx.circuitJson)
    for (const placement of ctx.componentPlacements) {
      if (placement.sourceComponentId)
        append(this.placements, placement.sourceComponentId, placement)
    }
    for (const element of ctx.circuitJson) {
      if (element.type === "source_component")
        this.components.set(element.source_component_id, element)
      if (element.type === "source_port" && element.source_component_id) {
        append(
          this.portsByComponent,
          element.source_component_id,
          element as ComponentPort,
        )
        append(
          this.portsByNet,
          this.connected(element.source_port_id),
          element as ComponentPort,
        )
      }
      if (element.type === "source_net") {
        const net = this.connected(element.source_net_id)
        if (element.is_power || element.is_positive_voltage_source)
          this.powerNets.add(net)
        if (element.is_ground) this.groundNets.add(net)
      }
      if (element.type === "schematic_component")
        this.schematicComponents.set(element.schematic_component_id, element)
      if (element.type === "schematic_port" && element.source_port_id)
        append(this.schematicPorts, element.source_port_id, element)
      if (element.type === "simulation_op_amp") this.opAmpModels.push(element)
    }
  }

  placement(componentId: string): SchematicBoxPlacement | undefined {
    const placements = this.placements.get(componentId)
    return placements?.length === 1 ? placements[0] : undefined
  }

  port(sourcePort: ComponentPort): SchematicPort | undefined {
    const placement = this.placement(sourcePort.source_component_id)
    const ports = this.schematicPorts
      .get(sourcePort.source_port_id)
      ?.filter(
        (port) =>
          port.schematic_component_id === placement?.schematicComponentId,
      )
    return ports?.length === 1 ? ports[0] : undefined
  }

  namedPort(componentId: string, name: string): ComponentPort | undefined {
    const ports = this.portsByComponent
      .get(componentId)
      ?.filter((port) => port.name === name || port.port_hints?.includes(name))
    return ports?.length === 1 ? ports[0] : undefined
  }

  opAmpPorts(componentId: string) {
    const ports = this.portsByComponent.get(componentId) ?? []
    const models = this.opAmpModels.filter(
      (model) =>
        model.source_component_id === componentId ||
        (!model.source_component_id &&
          ports.some(
            (port) => port.source_port_id === model.output_source_port_id,
          )),
    )
    if (models.length !== 1) return
    const model = models[0]!
    const ids = [
      model.inverting_input_source_port_id,
      model.non_inverting_input_source_port_id,
      model.output_source_port_id,
      model.positive_supply_source_port_id,
      model.negative_supply_source_port_id,
    ]
    if (new Set(ids).size !== ids.length) return
    const terminals = ids.map((id) => {
      const matches = ports.filter((port) => port.source_port_id === id)
      return matches.length === 1 && !matches[0]!.do_not_connect
        ? matches[0]
        : undefined
    })
    if (terminals.some((port) => !port)) return
    return {
      invertingInput: terminals[0]!,
      nonInvertingInput: terminals[1]!,
      output: terminals[2]!,
    }
  }

  twoTerminalNets(componentId: string): [string, string] | undefined {
    const ports = this.portsByComponent.get(componentId)
    if (ports?.length !== 2) return
    const first = this.connected(ports[0]!.source_port_id)
    const second = this.connected(ports[1]!.source_port_id)
    if (first !== second) return [first, second]
  }

  isRail(net: string): boolean {
    return this.powerNets.has(net) || this.groundNets.has(net)
  }

  /** Undefined means a connection across op-amp pins lacks unambiguous role metadata. */
  isDirectOpAmpFeedback(componentId: string): boolean | undefined {
    const nets = this.twoTerminalNets(componentId)
    if (!nets || nets.some((net) => this.isRail(net))) return false
    const hostIds = new Set(
      (this.portsByNet.get(nets[0]) ?? [])
        .filter(
          (port) =>
            this.components.get(port.source_component_id)?.ftype ===
            "simple_op_amp",
        )
        .map((port) => port.source_component_id),
    )
    let unknown = false
    for (const hostId of hostIds) {
      if (
        !(this.portsByNet.get(nets[1]) ?? []).some(
          (port) => port.source_component_id === hostId,
        )
      )
        continue
      const roles = this.opAmpPorts(hostId)
      if (!roles) {
        unknown = true
        continue
      }
      const outputNet = this.connected(roles.output.source_port_id)
      if (
        nets.includes(outputNet) &&
        [roles.invertingInput, roles.nonInvertingInput].some((input) => {
          const inputNet = this.connected(input.source_port_id)
          return inputNet !== outputNet && nets.includes(inputNet)
        })
      )
        return true
    }
    return unknown ? undefined : false
  }

  sameLocalScope(
    first: SchematicBoxPlacement,
    second: SchematicBoxPlacement,
  ): boolean {
    if (
      first.schematicSheetId !== second.schematicSheetId ||
      first.subcircuitId !== second.subcircuitId
    )
      return false
    const a = this.schematicComponents.get(first.schematicComponentId ?? "")
    const b = this.schematicComponents.get(second.schematicComponentId ?? "")
    if (!a || !b || a.schematic_group_id !== b.schematic_group_id) return false
    const firstSource = this.components.get(first.sourceComponentId ?? "")
    const secondSource = this.components.get(second.sourceComponentId ?? "")
    return (
      firstSource?.source_group_id === secondSource?.source_group_id &&
      firstSource?.subcircuit_id === secondSource?.subcircuit_id
    )
  }
}

function append<T>(map: Map<string, T[]>, key: string, value: T): void {
  const values = map.get(key)
  if (values) values.push(value)
  else map.set(key, [value])
}
