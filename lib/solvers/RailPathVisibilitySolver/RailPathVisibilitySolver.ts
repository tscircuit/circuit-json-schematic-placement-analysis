import { BaseSolver } from "@tscircuit/solver-utils"
import type { CircuitJson } from "circuit-json"
import type { RailPathTooSpreadOut, SchematicPlacementIssue } from "../../types"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import { addAttr } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

type Point = { x: number; y: number }
type Link = {
  to: string
  length: number
  traceId?: string
  componentId?: string
}
type Node = {
  point: Point
  net: string
  sheet?: string
  links: Link[]
  terminal?: "power" | "ground"
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const EPS = 0.001

/** Advisory about visible drawing extent, not electrical impedance or PCB distance.
 * Only explicit rails, routed segments, and local two-terminal R/C/L bridges count.
 * Labels never teleport a route across the drawing or to another sheet.
 */
export class RailPathVisibilitySolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly nodes = new Map<string, Node>()
  private readonly starts: Array<{
    portId: string
    componentId: string
    nodeId: string
  }> = []
  private currentIndex = 0
  private readonly issues: SchematicPlacementIssue[]
  private readonly maxSpan: number
  private readonly maxLength: number

  constructor({
    ctx,
    issues,
    maxSpan = 8,
    maxLength = 16,
  }: {
    ctx: SolverContext
    issues: SchematicPlacementIssue[]
    maxSpan?: number
    maxLength?: number
  }) {
    super()
    this.index = new PlacementNetworkIndex(ctx)
    this.issues = issues
    if (
      !Number.isFinite(maxSpan) ||
      maxSpan < 0 ||
      !Number.isFinite(maxLength) ||
      maxLength < 0
    )
      throw new Error(
        "Rail visibility thresholds must be finite and nonnegative",
      )
    this.maxSpan = maxSpan
    this.maxLength = maxLength
    const index = this.index
    const node = (point: Point, net: string, sheet?: string) => {
      const id = JSON.stringify([
        sheet,
        net,
        Math.round(point.x / EPS),
        Math.round(point.y / EPS),
      ])
      if (!this.nodes.has(id))
        this.nodes.set(id, { point, net, sheet, links: [] })
      return id
    }
    const link = (a: string, b: string, extra: Omit<Link, "to" | "length">) => {
      const first = this.nodes.get(a)!,
        second = this.nodes.get(b)!
      const length = distance(first.point, second.point)
      first.links.push({ to: b, length, ...extra })
      second.links.push({ to: a, length, ...extra })
    }
    const portNodes = new Map<string, string>()
    for (const [componentId, ports] of index.portsByComponent) {
      for (const port of ports) {
        const placed = index.port(port)
        if (!placed) continue
        const id = node(
          placed.center,
          index.connected(port.source_port_id),
          placed.schematic_sheet_id,
        )
        portNodes.set(port.source_port_id, id)
        // A support path starts at a host pin, not at an arbitrary point on a passive.
        if (ports.length > 2)
          this.starts.push({
            portId: port.source_port_id,
            componentId,
            nodeId: id,
          })
      }
    }
    for (const element of ctx.circuitJson) {
      if (
        element.type !== "schematic_net_label" ||
        !element.source_net_id ||
        !element.anchor_position
      )
        continue
      const net = index.connected(element.source_net_id)
      if (
        !index.isRail(net) ||
        (index.powerNets.has(net) && index.groundNets.has(net))
      )
        continue
      const id = node(element.anchor_position, net, element.schematic_sheet_id)
      this.nodes.get(id)!.terminal = index.groundNets.has(net)
        ? "ground"
        : "power"
    }
    const segments: Array<{ from: string; to: string; traceId: string }> = []
    for (const element of ctx.circuitJson) {
      if (element.type !== "schematic_trace") continue
      const net = traceNet(element, ctx.circuitJson, index)
      if (!net) continue
      for (const edge of element.edges) {
        segments.push({
          from: node(edge.from, net, element.schematic_sheet_id),
          to: node(edge.to, net, element.schematic_sheet_id),
          traceId: element.schematic_trace_id,
        })
      }
    }
    // Split at actual endpoints, pins and label anchors on this electrical net.
    // A geometric crossing between different nets does not establish connectivity.
    for (const segment of segments) {
      const a = this.nodes.get(segment.from)!,
        b = this.nodes.get(segment.to)!
      const length = distance(a.point, b.point)
      if (length < EPS) continue
      const onSegment = [...this.nodes]
        .filter(
          ([, n]) =>
            n.net === a.net &&
            n.sheet === a.sheet &&
            pointOnSegment(n.point, a.point, b.point),
        )
        .sort(
          ([, p], [, q]) =>
            distance(a.point, p.point) - distance(a.point, q.point),
        )
      for (let i = 1; i < onSegment.length; i++)
        link(onSegment[i - 1]![0], onSegment[i]![0], {
          traceId: segment.traceId,
        })
    }
    for (const [id, component] of index.components) {
      if (
        !["simple_resistor", "simple_capacitor", "simple_inductor"].includes(
          component.ftype,
        )
      )
        continue
      const ports = index.portsByComponent.get(id)
      if (ports?.length !== 2 || !index.twoTerminalNets(id)) continue
      const a = portNodes.get(ports[0]!.source_port_id),
        b = portNodes.get(ports[1]!.source_port_id)
      if (a && b) link(a, b, { componentId: id })
    }
    this.solved = this.starts.length === 0
  }

  override _step(): void {
    const start = this.starts[this.currentIndex++]
    this.solved = this.currentIndex >= this.starts.length
    if (!start) return
    const sourcePort = this.index.portsByComponent
      .get(start.componentId)
      ?.find((port) => port.source_port_id === start.portId)
    const placedPort = sourcePort ? this.index.port(sourcePort) : undefined
    const sourcePortName =
      placedPort?.display_pin_label ||
      sourcePort?.name ||
      (placedPort?.pin_number !== undefined
        ? `pin${placedPort.pin_number}`
        : "connected pin")
    const host = this.index.placement(start.componentId)
    if (!host) return
    type State = {
      id: string
      length: number
      hops: number
      path: string[]
      links: Link[]
    }
    const queue: State[] = [
      { id: start.nodeId, length: 0, hops: 0, path: [start.nodeId], links: [] },
    ]
    const bestLengths = new Map<string, number>([[`${start.nodeId}:0`, 0]])
    while (queue.length) {
      queue.sort((a, b) => a.length - b.length)
      const state = queue.shift()!
      const key = `${state.id}:${state.hops}`
      if (state.length !== bestLengths.get(key)) continue
      const current = this.nodes.get(state.id)!
      if (current.terminal) {
        const points = state.path.map((id) => this.nodes.get(id)!.point)
        const xs = points.map((p) => p.x),
          ys = points.map((p) => p.y)
        const bounds = {
          left: Math.min(...xs),
          right: Math.max(...xs),
          bottom: Math.min(...ys),
          top: Math.max(...ys),
        }
        const span = Math.max(
          bounds.right - bounds.left,
          bounds.top - bounds.bottom,
        )
        if (span <= this.maxSpan && state.length <= this.maxLength) return
        const componentIds = [
          ...new Set(
            state.links.flatMap((l) => (l.componentId ? [l.componentId] : [])),
          ),
        ]
        this.issues.push({
          lineItemType: "RailPathTooSpreadOut",
          hostSchematicBox: host,
          sourcePortId: start.portId,
          sourcePortName,
          railType: current.terminal,
          supportSchematicBoxes: componentIds.flatMap((id) => {
            const placement = this.index.placement(id)
            return placement ? [placement] : []
          }),
          schematicTraceIds: [
            ...new Set(
              state.links.flatMap((l) => (l.traceId ? [l.traceId] : [])),
            ),
          ],
          pathPoints: points,
          pathBounds: bounds,
          pathLength: state.length,
          pathSpan: span,
          maxRecommendedSpan: this.maxSpan,
          maxRecommendedPathLength: this.maxLength,
          message: `Visible path from ${host.sourceComponentName || "component"}.${sourcePortName} to ${current.terminal} spans ${span.toFixed(2)} schematic units; move the connected support elements closer together near the pin and recompute their schematic traces.`,
        })
        return
      }
      for (const edge of current.links) {
        if (state.path.includes(edge.to)) continue
        if (edge.componentId) {
          const placement = this.index.placement(edge.componentId)
          if (
            state.hops >= 3 ||
            !placement ||
            !this.index.sameLocalScope(host, placement)
          )
            continue
        }
        const length = state.length + edge.length
        const hops = state.hops + (edge.componentId ? 1 : 0)
        const nextKey = `${edge.to}:${hops}`
        if (length >= (bestLengths.get(nextKey) ?? Infinity)) continue
        bestLengths.set(nextKey, length)
        queue.push({
          id: edge.to,
          length,
          hops,
          path: [...state.path, edge.to],
          links: [...state.links, edge],
        })
      }
    }
  }

  static issueToString(issue: RailPathTooSpreadOut): string {
    const attrs: string[] = []
    addAttr(attrs, "hostName", issue.hostSchematicBox.sourceComponentName)
    addAttr(attrs, "pinName", issue.sourcePortName)
    addAttr(attrs, "railType", issue.railType)
    addAttr(attrs, "pathSpan", issue.pathSpan)
    addAttr(attrs, "pathLength", issue.pathLength)
    addAttr(attrs, "message", issue.message)
    return `<RailPathTooSpreadOut ${attrs.join(" ")} />`
  }
}

function traceNet(
  trace: Extract<CircuitJson[number], { type: "schematic_trace" }>,
  circuitJson: CircuitJson,
  index: PlacementNetworkIndex,
): string | undefined {
  if (trace.subcircuit_connectivity_map_key)
    return index.connected(
      `connectivity:${trace.subcircuit_connectivity_map_key}`,
    )
  const source = circuitJson.find(
    (e) =>
      e.type === "source_trace" && e.source_trace_id === trace.source_trace_id,
  )
  if (source?.type !== "source_trace") return
  const ids = [
    ...source.connected_source_port_ids,
    ...source.connected_source_net_ids,
  ]
  return ids[0] ? index.connected(ids[0]) : undefined
}

function pointOnSegment(p: Point, a: Point, b: Point): boolean {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length = distance(a, b)
  if (length < EPS) return distance(a, p) < EPS
  const projection = ((p.x - a.x) * dx + (p.y - a.y) * dy) / length
  const perpendicular = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / length
  return perpendicular < EPS && projection >= -EPS && projection <= length + EPS
}
