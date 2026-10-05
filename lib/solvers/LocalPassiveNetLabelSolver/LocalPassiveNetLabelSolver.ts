import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  CircuitJson,
  SchematicNetLabel,
  SchematicPort,
  SchematicText,
  SchematicTrace,
  SourcePort,
} from "circuit-json"
import type {
  LocalPassiveConnectionShouldBeDirectWire,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { centeredRect } from "../../utils/geometry"
import { getNetLabelBounds } from "../../utils/net-label-bounds"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import {
  getSchematicTextPolygons,
  rectPolygon,
  segmentCrossesPolygon,
} from "../../utils/schematic-text-geometry"
import type { SolverContext } from "../SolverContext"

type Point = { x: number; y: number }
type Segment = { from: Point; to: Point }
type ComponentPort = SourcePort & { source_component_id: string }
type SourceTrace = Extract<CircuitJson[number], { type: "source_trace" }>
interface EndpointLabels {
  labels: SchematicNetLabel[]
  texts: SchematicText[]
  traces: SchematicTrace[]
}
const EPSILON = 1e-6
const PASSIVE_TYPES = new Set([
  "simple_resistor",
  "simple_capacitor",
  "simple_inductor",
])

/** Replace only a short, isolated, labeled two-pin signal connection whose
 * exact proposed wire is clear. This does not infer which pin owns a passive. */
export class LocalPassiveNetLabelSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly nets: string[]
  private readonly traces: SchematicTrace[]
  private readonly labels: SchematicNetLabel[]
  private readonly texts: SchematicText[]
  private readonly ports: SchematicPort[]
  private readonly sourceTraces = new Map<string, SourceTrace>()
  private readonly prohibitedNets = new Set<string>()
  private readonly multipleSheets: boolean
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.nets = [...this.index.portsByNet.keys()]
    this.traces = []
    this.labels = []
    this.texts = []
    this.ports = []
    const sheetIds = new Set<string>()
    for (const element of params.ctx.circuitJson) {
      if (
        "schematic_sheet_id" in element &&
        element.schematic_sheet_id !== undefined
      )
        sheetIds.add(element.schematic_sheet_id)
      if (
        element.type === "source_port" &&
        (hasSupplyRole(element) || element.do_not_connect)
      )
        this.prohibitedNets.add(this.index.connected(element.source_port_id))
      if (element.type === "source_trace")
        this.sourceTraces.set(element.source_trace_id, element)
      if (element.type === "schematic_trace") this.traces.push(element)
      if (element.type === "schematic_net_label") this.labels.push(element)
      if (element.type === "schematic_text") this.texts.push(element)
      if (element.type === "schematic_port") this.ports.push(element)
    }
    this.multipleSheets = sheetIds.size > 1
    this.solved = this.nets.length === 0
  }

  override _step(): void {
    const net = this.nets[this.currentIndex++]!
    this.solved = this.currentIndex >= this.nets.length
    const members = this.index.portsByNet.get(net) ?? []
    if (
      members.length !== 2 ||
      this.index.isRail(net) ||
      this.prohibitedNets.has(net) ||
      members.some(hasSupplyRole) ||
      members.some((port) => port.do_not_connect)
    )
      return
    const [first, second] = members as [ComponentPort, ComponentPort]
    if (first.source_component_id === second.source_component_id) return
    const passives = members.filter((port) =>
      PASSIVE_TYPES.has(
        this.index.components.get(port.source_component_id)?.ftype ?? "",
      ),
    )
    if (
      passives.length === 0 ||
      passives.some(
        (port) =>
          !this.index.twoTerminalNets(port.source_component_id) ||
          this.index.portsByComponent
            .get(port.source_component_id)
            ?.some((terminal) => terminal.do_not_connect),
      )
    )
      return
    const firstComponent = this.index.placement(first.source_component_id)
    const secondComponent = this.index.placement(second.source_component_id)
    const firstPin = this.index.port(first)
    const secondPin = this.index.port(second)
    if (
      !firstComponent ||
      !secondComponent ||
      (this.multipleSheets && firstComponent.schematicSheetId === undefined) ||
      !this.index.sameLocalScope(firstComponent, secondComponent) ||
      !firstPin?.facing_direction ||
      !secondPin?.facing_direction ||
      [firstPin, secondPin].some(
        (pin) =>
          pin.schematic_sheet_id !== firstComponent.schematicSheetId ||
          this.ports.filter(
            (other) => other.source_port_id === pin.source_port_id,
          ).length !== 1 ||
          !finitePoint(pin.center),
      ) ||
      [firstComponent, secondComponent].some((box) => {
        const component = this.params.ctx.circuitJson.find(
          (element) =>
            element.type === "schematic_component" &&
            element.schematic_component_id === box.schematicComponentId,
        )
        return (
          component?.type !== "schematic_component" ||
          component.schematic_sheet_id !== box.schematicSheetId
        )
      }) ||
      [firstComponent, secondComponent].some(
        (box) =>
          ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
          box.width <= 0 ||
          box.height <= 0,
      )
    )
      return
    if (
      !facesAwayFromBody(firstPin, firstComponent) ||
      !facesAwayFromBody(secondPin, secondComponent)
    )
      return
    const sheetId = firstComponent.schematicSheetId
    const traces = this.traces.filter(
      (trace) => trace.schematic_sheet_id === sheetId,
    )
    const netEdges = traces
      .filter((trace) => this.traceNet(trace) === net)
      .flatMap((trace) => trace.edges)
    if (visiblyConnected(firstPin.center, secondPin.center, netEdges)) return
    const firstLabels = this.endpointLabels(first, firstPin, net, traces)
    const secondLabels = this.endpointLabels(second, secondPin, net, traces)
    if (!firstLabels || !secondLabels) return
    const replaced = {
      labels: [...firstLabels.labels, ...secondLabels.labels],
      texts: [...firstLabels.texts, ...secondLabels.texts],
      traces: [...firstLabels.traces, ...secondLabels.traces],
    }
    const passiveSize = Math.max(
      ...passives.map((port) => {
        const box = this.index.placement(port.source_component_id)!
        return Math.max(box.width, box.height)
      }),
    )
    const maxLength = Math.max(6, 6 * passiveSize)
    const suggestedRoute = routes(firstPin, secondPin)
      .filter((route) => routeLength(route) <= maxLength + EPSILON)
      .sort((a, b) => routeLength(a) - routeLength(b))
      .find((route) =>
        this.routeIsClear(route, firstPin, secondPin, replaced, traces),
      )
    if (!suggestedRoute) return
    this.params.issues.push({
      lineItemType: "LocalPassiveConnectionShouldBeDirectWire",
      firstComponent,
      secondComponent,
      sourcePortIds: [first.source_port_id, second.source_port_id],
      schematicNetLabelIds: replaced.labels.map(
        (label) => label.schematic_net_label_id,
      ),
      schematicTextIds: replaced.texts.map((text) => text.schematic_text_id),
      replacedSchematicTraceIds: replaced.traces.map(
        (trace) => trace.schematic_trace_id,
      ),
      suggestedRoute,
      message: `Connect ${firstComponent.sourceComponentName ?? first.source_component_id}.${first.name} and ${secondComponent.sourceComponentName ?? second.source_component_id}.${second.name} with a short direct wire instead of their separate labels. Preserve the electrical connection; the suggested route is clear in the current schematic.`,
    })
  }

  private labelNet(label: SchematicNetLabel): string | undefined {
    if (!label.source_net_id) return
    const ordinary = this.index.connected(label.source_net_id)
    return this.index.portsByNet.has(ordinary)
      ? ordinary
      : this.index.connected(`connectivity:${label.source_net_id}`)
  }

  private traceNet(trace: SchematicTrace): string | undefined {
    const nets = new Set<string>()
    if (trace.subcircuit_connectivity_map_key)
      nets.add(
        this.index.connected(
          `connectivity:${trace.subcircuit_connectivity_map_key}`,
        ),
      )
    const source = trace.source_trace_id
      ? this.sourceTraces.get(trace.source_trace_id)
      : undefined
    if (source)
      for (const id of [
        ...source.connected_source_port_ids,
        ...source.connected_source_net_ids,
      ])
        nets.add(this.index.connected(id))
    for (const edge of trace.edges)
      for (const id of [
        edge.from_schematic_port_id,
        edge.to_schematic_port_id,
      ]) {
        const pin = this.ports.find((port) => port.schematic_port_id === id)
        if (pin?.source_port_id)
          nets.add(this.index.connected(pin.source_port_id))
      }
    return nets.size === 1 ? [...nets][0] : undefined
  }

  private endpointLabels(
    port: ComponentPort,
    pin: SchematicPort,
    net: string,
    traces: SchematicTrace[],
  ): EndpointLabels | undefined {
    const attached = traces.filter((trace) =>
      trace.edges.some((edge) => onSegment(pin.center, edge)),
    )
    const labels = this.labels.filter(
      (label) =>
        label.schematic_sheet_id === pin.schematic_sheet_id &&
        !label.symbol_name &&
        this.labelNet(label) === net &&
        pointEqual(label.anchor_position ?? label.center, pin.center),
    )
    if (attached.length === 0)
      return labels.length > 0 ? { labels, texts: [], traces: [] } : undefined
    // Only a single unbranched stub ending at this pin can be replaced safely.
    if (attached.length !== 1) return
    const stub = attached[0]!
    const points = tracePoints(stub)
    if (
      this.traceNet(stub) !== net ||
      stub.junctions?.length ||
      points.length < 2 ||
      ![points[0]!, points.at(-1)!].some((point) =>
        pointEqual(point, pin.center),
      )
    )
      return
    if (
      traces.some(
        (other) =>
          other !== stub &&
          other.edges.some((edge) =>
            stub.edges.some((segment) => segmentsTouch(segment, edge)),
          ),
      ) ||
      this.ports.some(
        (other) =>
          other.schematic_sheet_id === pin.schematic_sheet_id &&
          other.schematic_port_id !== pin.schematic_port_id &&
          stub.edges.some((edge) => onSegment(other.center, edge)),
      )
    )
      return
    labels.push(
      ...this.labels.filter(
        (label) =>
          !labels.includes(label) &&
          !label.symbol_name &&
          label.schematic_sheet_id === pin.schematic_sheet_id &&
          this.labelNet(label) === net &&
          stub.edges.some((edge) =>
            onSegment(label.anchor_position ?? label.center, edge),
          ),
      ),
    )
    const source = stub.source_trace_id
      ? this.sourceTraces.get(stub.source_trace_id)
      : undefined
    // Explicit port-to-net source traces render some labels as schematic_text.
    // The trace identity and isolated stub establish the association, not text.
    const texts =
      source?.connected_source_port_ids.length === 1 &&
      source.connected_source_port_ids[0] === port.source_port_id &&
      source.connected_source_net_ids.length > 0 &&
      source.connected_source_net_ids.every(
        (id) => this.index.connected(id) === net,
      )
        ? this.texts.filter(
            (text) =>
              text.schematic_sheet_id === pin.schematic_sheet_id &&
              !text.schematic_component_id &&
              textTraceId(text) === stub.source_trace_id,
          )
        : []
    return labels.length + texts.length > 0
      ? { labels, texts, traces: [stub] }
      : undefined
  }

  private routeIsClear(
    route: Point[],
    first: SchematicPort,
    second: SchematicPort,
    replaced: EndpointLabels,
    traces: SchematicTrace[],
  ): boolean {
    const sheetId = first.schematic_sheet_id
    // Do not claim a checked route when any potential obstacle has missing
    // geometry. Geometry helpers deliberately return no polygon for bad text.
    if (
      traces.some((trace) =>
        trace.edges.some(
          (edge) => !finitePoint(edge.from) || !finitePoint(edge.to),
        ),
      ) ||
      this.texts.some(
        (text) =>
          text.schematic_sheet_id === sheetId &&
          (!finitePoint(text.position) ||
            !Number.isFinite(text.rotation) ||
            !Number.isFinite(text.font_size) ||
            text.font_size <= 0),
      ) ||
      this.labels.some(
        (label) =>
          label.schematic_sheet_id === sheetId &&
          (!finitePoint(label.center) ||
            (label.anchor_position && !finitePoint(label.anchor_position))),
      ) ||
      this.ports.some(
        (port) =>
          port.schematic_sheet_id === sheetId && !finitePoint(port.center),
      )
    )
      return false
    const segments = route.slice(1).map((to, i) => ({ from: route[i]!, to }))
    const bodies = this.params.ctx.componentPlacements
      .filter((box) => box.schematicSheetId === sheetId)
      .map((box) => {
        if (
          ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
          box.width <= 0 ||
          box.height <= 0
        )
          return
        return rectPolygon(
          centeredRect(box.schX, box.schY, box.width, box.height),
        )
      })
    if (bodies.some((body) => !body)) return false
    const textPolygons = this.texts
      .filter(
        (text) =>
          text.schematic_sheet_id === sheetId && !replaced.texts.includes(text),
      )
      .flatMap(getSchematicTextPolygons)
    const labelPolygons = this.labels
      .filter(
        (label) =>
          label.schematic_sheet_id === sheetId &&
          !replaced.labels.includes(label),
      )
      .map((label) => rectPolygon(getNetLabelBounds(label)))
    return segments.every(
      (segment) =>
        ![...bodies, ...textPolygons, ...labelPolygons].some(
          (polygon) =>
            polygon && segmentCrossesPolygon(segment.from, segment.to, polygon),
        ) &&
        !traces.some(
          (trace) =>
            !replaced.traces.includes(trace) &&
            trace.edges.some((edge) => segmentsTouch(segment, edge)),
        ) &&
        !this.ports.some(
          (port) =>
            port.schematic_sheet_id === sheetId &&
            port !== first &&
            port !== second &&
            onSegment(port.center, segment),
        ),
    )
  }

  static issueToString(
    issue: LocalPassiveConnectionShouldBeDirectWire,
  ): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "firstComponentName",
      issue.firstComponent.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondComponentName",
      issue.secondComponent.sourceComponentName,
    )
    addAttr(attrs, "sourcePortIds", issue.sourcePortIds.join(", "))
    addAttr(
      attrs,
      "schematicNetLabelIds",
      issue.schematicNetLabelIds.join(", "),
    )
    addAttr(attrs, "schematicTextIds", issue.schematicTextIds?.join(", "))
    addAttr(
      attrs,
      "replacedSchematicTraceIds",
      issue.replacedSchematicTraceIds.join(", "),
    )
    addAttr(attrs, "message", issue.message)
    return `<LocalPassiveConnectionShouldBeDirectWire ${attrs.join(" ")} />`
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

// Older circuit-json versions do not type this field, but current exports use
// it for trace-owned label text. Treat only a runtime string as an association.
function textTraceId(text: SchematicText): string | undefined {
  return "source_trace_id" in text && typeof text.source_trace_id === "string"
    ? text.source_trace_id
    : undefined
}

function finitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

function pointEqual(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= EPSILON
}

function onSegment(point: Point, edge: Segment): boolean {
  if (![point, edge.from, edge.to].every(finitePoint)) return false
  const length = Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y)
  return (
    Math.abs(
      Math.hypot(point.x - edge.from.x, point.y - edge.from.y) +
        Math.hypot(point.x - edge.to.x, point.y - edge.to.y) -
        length,
    ) <= EPSILON
  )
}

function segmentsTouch(a: Segment, b: Segment): boolean {
  if (
    [a.from, a.to].some((point) => onSegment(point, b)) ||
    [b.from, b.to].some((point) => onSegment(point, a))
  )
    return true
  const cross = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  return (
    cross(a.from, a.to, b.from) * cross(a.from, a.to, b.to) < -EPSILON &&
    cross(b.from, b.to, a.from) * cross(b.from, b.to, a.to) < -EPSILON
  )
}

function visiblyConnected(from: Point, to: Point, edges: Segment[]): boolean {
  const reached = new Set(edges.filter((edge) => onSegment(from, edge)))
  for (const edge of reached) {
    if (onSegment(to, edge)) return true
    for (const other of edges)
      if (!reached.has(other) && segmentsTouch(edge, other)) reached.add(other)
  }
  return false
}

function tracePoints(trace: SchematicTrace): Point[] {
  if (!trace.edges.length) return []
  const points = [trace.edges[0]!.from]
  for (const edge of trace.edges) {
    if (
      !finitePoint(edge.to) ||
      !finitePoint(edge.from) ||
      !pointEqual(points.at(-1)!, edge.from)
    )
      return []
    points.push(edge.to)
  }
  return points
}

function routeLength(points: Point[]): number {
  return points
    .slice(1)
    .reduce(
      (length, point, i) =>
        length +
        Math.abs(point.x - points[i]!.x) +
        Math.abs(point.y - points[i]!.y),
      0,
    )
}

function faces(pin: SchematicPort, next: Point): boolean {
  const dx = next.x - pin.center.x
  const dy = next.y - pin.center.y
  switch (pin.facing_direction) {
    case "left":
      return dx < -EPSILON && Math.abs(dy) <= EPSILON
    case "right":
      return dx > EPSILON && Math.abs(dy) <= EPSILON
    case "up":
      return dy > EPSILON && Math.abs(dx) <= EPSILON
    case "down":
      return dy < -EPSILON && Math.abs(dx) <= EPSILON
    default:
      return false
  }
}

function facesAwayFromBody(
  pin: SchematicPort,
  box: SchematicBoxPlacement,
): boolean {
  // Pin geometry is sometimes rounded a few thousandths beyond symbol bounds.
  const tolerance = 0.01
  switch (pin.facing_direction) {
    case "left":
      return pin.center.x <= box.schX - box.width / 2 + tolerance
    case "right":
      return pin.center.x >= box.schX + box.width / 2 - tolerance
    case "up":
      return pin.center.y >= box.schY + box.height / 2 - tolerance
    case "down":
      return pin.center.y <= box.schY - box.height / 2 + tolerance
    default:
      return false
  }
}

function routes(first: SchematicPort, second: SchematicPort): Point[][] {
  const a = first.center,
    b = second.center
  const candidates = [
    [a, b],
    [a, { x: a.x, y: b.y }, b],
    [a, { x: b.x, y: a.y }, b],
  ]
  // Only minimum-length routes: a straight wire, one corner, or a midpoint
  // dogleg. Do not search outside the pin bounds for speculative detours.
  const x = (a.x + b.x) / 2
  const y = (a.y + b.y) / 2
  candidates.push([a, { x, y: a.y }, { x, y: b.y }, b])
  candidates.push([a, { x: a.x, y }, { x: b.x, y }, b])
  return candidates
    .map((points) =>
      points.filter(
        (point, i) => i === 0 || !pointEqual(point, points[i - 1]!),
      ),
    )
    .filter(
      (points) =>
        points.length >= 2 &&
        faces(first, points[1]!) &&
        faces(second, points.at(-2)!) &&
        points.slice(1).every((point, i) => {
          const previous = points[i]!
          return (
            Math.abs(point.x - previous.x) <= EPSILON ||
            Math.abs(point.y - previous.y) <= EPSILON
          )
        }) &&
        // Collinear reversals would retrace the same wire instead of forming
        // a simple route; nonadjacent segments must also remain disjoint.
        points.slice(2).every((point, i) => {
          const a = points[i]!,
            b = points[i + 1]!
          return (
            (b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y) >=
            -EPSILON
          )
        }) &&
        (points.length < 4 ||
          !segmentsTouch(
            { from: points[0]!, to: points[1]! },
            { from: points[2]!, to: points[3]! },
          )),
    )
}
