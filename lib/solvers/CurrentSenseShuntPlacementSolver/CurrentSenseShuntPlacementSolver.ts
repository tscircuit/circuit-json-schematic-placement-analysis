import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort, SchematicTrace, SourcePort } from "circuit-json"
import type {
  CurrentSenseShuntSeparatedFromInputs,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type InputRole = "positive" | "negative"
type Point = { x: number; y: number }
const EPSILON = 0.01

/** A displaced local shunt whose sense pair is split between a wire and labels. */
export class CurrentSenseShuntPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly hostIds: string[]
  private readonly traces: SchematicTrace[]
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
    this.traces = params.ctx.circuitJson.filter(
      (element): element is SchematicTrace =>
        element.type === "schematic_trace",
    )
    this.solved = this.hostIds.length === 0
  }

  override _step(): void {
    const hostId = this.hostIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.hostIds.length
    if (!hostId) return
    const index = this.index
    const host = index.placement(hostId)
    const ports = index.portsByComponent.get(hostId) ?? []
    const positive = ports.filter((port) => inputRole(port) === "positive")
    const negative = ports.filter((port) => inputRole(port) === "negative")
    const outputs = ports.filter((port) =>
      hasHint(port, /^(?:OUT|VOUT|OUTPUT)$/),
    )
    if (
      !host ||
      positive.length !== 1 ||
      negative.length !== 1 ||
      outputs.length !== 1 ||
      !ports.some((port) => hasHint(port, /^(?:VS|VCC|VDD)$/)) ||
      !ports.some((port) => hasHint(port, /^(?:GND|GROUND|VSS)$/))
    )
      return
    const inputs = [positive[0]!, negative[0]!]
    const nets = inputs.map((port) => index.connected(port.source_port_id))
    if (
      inputs.some((port) => port.do_not_connect) ||
      nets[0] === nets[1] ||
      nets.includes(index.connected(outputs[0]!.source_port_id))
    )
      return
    const pins = inputs.map((port) => index.port(port))
    const [positivePin, negativePin] = pins
    if (
      !positivePin ||
      !negativePin ||
      !positivePin.facing_direction ||
      positivePin.facing_direction !== negativePin.facing_direction ||
      pins.some((pin) => pin!.schematic_sheet_id !== host.schematicSheetId)
    )
      return

    const resistorIds = new Set(
      (index.portsByNet.get(nets[0]!) ?? [])
        .filter(
          (port) =>
            index.components.get(port.source_component_id)?.ftype ===
            "simple_resistor",
        )
        .map((port) => port.source_component_id)
        .filter((id) => index.twoTerminalNets(id)?.includes(nets[1]!)),
    )
    // Parallel shunts and shared sensing amplifiers need a different arrangement.
    if (resistorIds.size !== 1) return
    const shuntId = [...resistorIds][0]!
    const component = index.components.get(shuntId)
    if (
      component?.ftype !== "simple_resistor" ||
      !Number.isFinite(component.resistance) ||
      component.resistance <= 0 ||
      component.resistance > 1
    )
      return
    if (
      nets.some((net) =>
        (index.portsByNet.get(net!) ?? []).some(
          (port) =>
            port.source_component_id !== hostId &&
            inputRole(port) !== undefined &&
            index.components.get(port.source_component_id)?.ftype ===
              "simple_chip",
        ),
      )
    )
      return
    const shunt = index.placement(shuntId)
    if (!shunt || !index.sameLocalScope(host, shunt)) return
    const shuntPorts = index.portsByComponent.get(shuntId)!
    if (shuntPorts.some((port) => port.do_not_connect)) return
    const shuntPins = nets.map((net) =>
      index.port(
        shuntPorts.find(
          (port) => index.connected(port.source_port_id) === net,
        )!,
      ),
    )
    if (
      shuntPins.some(
        (pin) => !pin || pin.schematic_sheet_id !== host.schematicSheetId,
      )
    )
      return

    const horizontalInputs =
      positivePin.facing_direction === "left" ||
      positivePin.facing_direction === "right"
    const across = (point: Point) => (horizontalInputs ? point.y : point.x)
    const first = across(positivePin.center),
      second = across(negativePin.center)
    const span = Math.abs(first - second)
    if (span < EPSILON) return
    const shuntAcross = horizontalInputs ? shunt.schY : shunt.schX
    const halfSize = (horizontalInputs ? shunt.height : shunt.width) / 2
    const inputBandGap = Math.max(
      Math.min(first, second) - (shuntAcross + halfSize),
      shuntAcross - halfSize - Math.max(first, second),
    )
    // Ignore minor offsets and deliberately remote sensing blocks. This rule
    // concerns a local shunt wholly outside the band occupied by the two inputs.
    if (
      inputBandGap <= Math.max(1.5, 2 * span) ||
      Math.hypot(shunt.schX - host.schX, shunt.schY - host.schY) >
        Math.max(8, 4 * Math.max(host.width, host.height))
    )
      return

    const visible = pins.map((pin, i) =>
      this.hasVisibleConnection(shuntPins[i]!, pin!, nets[i]!),
    )
    // Two visible branches already explain a horizontal shunt (as in TI's motor
    // application). Two labeled branches can intentionally represent a remote
    // shunt. Restrict the advisory to the mixed, displaced local arrangement.
    if (visible[0] === visible[1]) return
    const labeledIndex = visible[0] ? 1 : 0
    const labeledNet = nets[labeledIndex]!
    if (
      !this.params.ctx.circuitJson.some((element) => {
        if (
          element.type !== "schematic_net_label" ||
          element.schematic_sheet_id !== host.schematicSheetId
        )
          return false
        if (
          element.source_net_id &&
          (index.connected(element.source_net_id) === labeledNet ||
            index.connected(`connectivity:${element.source_net_id}`) ===
              labeledNet)
        )
          return true
        const pin = shuntPins[labeledIndex]!.center
        if (
          element.anchor_position &&
          Math.hypot(
            element.anchor_position.x - pin.x,
            element.anchor_position.y - pin.y,
          ) < EPSILON
        )
          return true
        return (
          element.source_trace_id !== undefined &&
          this.sourceTraceTouchesNet(element.source_trace_id, labeledNet)
        )
      })
    )
      return
    this.params.issues.push({
      lineItemType: "CurrentSenseShuntSeparatedFromInputs",
      amplifierSchematicBox: host,
      shuntSchematicBox: shunt,
      positiveInputSourcePortId: inputs[0]!.source_port_id,
      negativeInputSourcePortId: inputs[1]!.source_port_id,
      inputBandGap,
      message: `Place ${shunt.sourceComponentName ?? shuntId} near ${host.sourceComponentName ?? hostId}.${inputs[0]!.name}/${inputs[1]!.name}, so both sense connections can be read together. Move or rotate the shunt as needed; preserve all pin connections and leave room for labels.`,
    })
  }

  private hasVisibleConnection(
    from: SchematicPort,
    to: SchematicPort,
    net: string,
  ): boolean {
    const edges = this.traces
      .filter((trace) => {
        if (trace.schematic_sheet_id !== from.schematic_sheet_id) return false
        if (trace.subcircuit_connectivity_map_key)
          return (
            this.index.connected(
              `connectivity:${trace.subcircuit_connectivity_map_key}`,
            ) === net
          )
        if (this.sourceTraceTouchesNet(trace.source_trace_id, net)) return true
        // Some exports use generated endpoint names as source_trace_id. Without
        // cached keys, infer membership only from unambiguous electrical pins.
        const endpoints = [trace.edges[0]?.from, trace.edges.at(-1)?.to]
        const endpointNets = new Set(
          this.params.ctx.circuitJson.flatMap((element) =>
            element.type === "schematic_port" &&
            element.source_port_id &&
            element.schematic_sheet_id === trace.schematic_sheet_id &&
            endpoints.some(
              (point) =>
                point &&
                Math.hypot(
                  point.x - element.center.x,
                  point.y - element.center.y,
                ) < EPSILON,
            )
              ? [this.index.connected(element.source_port_id)]
              : [],
          ),
        )
        return endpointNets.size === 1 && endpointNets.has(net)
      })
      .flatMap((trace) => trace.edges)
    const reached = edges.filter((edge) =>
      onSegment(from.center, edge.from, edge.to),
    )
    const visited = new Set<number>()
    for (let i = 0; i < reached.length; i++) {
      const current = reached[i]!
      if (onSegment(to.center, current.from, current.to)) return true
      for (const [edgeIndex, edge] of edges.entries()) {
        if (
          visited.has(edgeIndex) ||
          (![current.from, current.to].some((point) =>
            onSegment(point, edge.from, edge.to),
          ) &&
            ![edge.from, edge.to].some((point) =>
              onSegment(point, current.from, current.to),
            ))
        )
          continue
        visited.add(edgeIndex)
        reached.push(edge)
      }
    }
    return false
  }

  private sourceTraceTouchesNet(
    traceId: string | undefined,
    net: string,
  ): boolean {
    if (!traceId) return false
    const source = this.params.ctx.circuitJson.find(
      (element) =>
        element.type === "source_trace" && element.source_trace_id === traceId,
    )
    return (
      source?.type === "source_trace" &&
      source.connected_source_port_ids.some(
        (id) => this.index.connected(id) === net,
      )
    )
  }

  static issueToString(issue: CurrentSenseShuntSeparatedFromInputs): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "amplifierName",
      issue.amplifierSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "shuntName", issue.shuntSchematicBox.sourceComponentName)
    addAttr(attrs, "inputBandGap", issue.inputBandGap)
    addAttr(attrs, "message", issue.message)
    return `<CurrentSenseShuntSeparatedFromInputs ${attrs.join(" ")} />`
  }
}

function hasHint(port: SourcePort, pattern: RegExp): boolean {
  return [port.name, ...(port.port_hints ?? [])].some((hint) =>
    pattern.test(hint.toUpperCase().replace(/[\s_]/g, "")),
  )
}

function inputRole(port: SourcePort): InputRole | undefined {
  const positive = hasHint(port, /^(?:IN\+|VIN\+|INPOS|VINPOS)$/)
  const negative = hasHint(port, /^(?:IN-|VIN-|INNEG|VINNEG)$/)
  return positive === negative ? undefined : positive ? "positive" : "negative"
}

function onSegment(point: Point, from: Point, to: Point): boolean {
  const dx = to.x - from.x,
    dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length < EPSILON)
    return Math.hypot(point.x - from.x, point.y - from.y) < EPSILON
  const projection =
    ((point.x - from.x) * dx + (point.y - from.y) * dy) / length
  return (
    projection >= -EPSILON &&
    projection <= length + EPSILON &&
    Math.abs((point.x - from.x) * dy - (point.y - from.y) * dx) / length <
      EPSILON
  )
}
