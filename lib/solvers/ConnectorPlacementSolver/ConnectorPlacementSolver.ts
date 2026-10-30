import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  SchematicNetLabel,
  SchematicPort,
  SchematicTrace,
} from "circuit-json"
import type {
  ConnectorPositionCausesTraceDetours,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { centeredRect, rectOverlap } from "../../utils/geometry"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Point = { x: number; y: number }
type Connection = {
  pin: SchematicPort
  peer: SchematicPort
  currentEndpoint?: Point
  component: SchematicBoxPlacement
}
const EPSILON = 0.01
const directions = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
}
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y
const distance = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const near = (a: Point, b: Point) => distance(a, b) <= EPSILON
const round = (value: number) => Math.round(value * 100) / 100

/** Translate a one-sided connector when signal routes double back behind their hosts. */
export class ConnectorPlacementSolver extends BaseSolver {
  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
  }

  override _step(): void {
    const { ctx, issues } = this.params
    const index = new PlacementNetworkIndex(ctx)
    for (const ports of index.portsByComponent.values()) {
      for (const port of ports) {
        const net = index.connected(port.source_port_id)
        if (port.requires_ground || port.provides_ground)
          index.groundNets.add(net)
        if (port.requires_power || port.provides_power) index.powerNets.add(net)
      }
    }
    const allTraces = ctx.circuitJson.filter(
      (e): e is SchematicTrace => e.type === "schematic_trace",
    )
    for (const [id, source] of index.components) {
      if (
        source.ftype !== "simple_pin_header" &&
        source.ftype !== "simple_connector"
      )
        continue
      const connector = index.placement(id)
      const sourcePorts = index.portsByComponent.get(id) ?? []
      if (!connector || sourcePorts.length < 2) continue
      const pins = sourcePorts.map((p) => index.port(p))
      const facing = pins[0]?.facing_direction
      if (!facing || pins.some((p) => !p || p.facing_direction !== facing))
        continue
      const along = directions[facing]
      const across = { x: -along.y, y: along.x }
      const traces = allTraces.filter(
        (t) => t.schematic_sheet_id === connector.schematicSheetId,
      )
      const railLabels = ctx.circuitJson.filter(
        (e): e is SchematicNetLabel =>
          e.type === "schematic_net_label" &&
          e.schematic_sheet_id === connector.schematicSheetId,
      )
      const connections: Connection[] = []
      const groundConnections: Connection[] = []
      const wiredGrounds: {
        pin: SchematicPort
        net: string
        trace: SchematicTrace
        currentPeer: SchematicPort
      }[] = []
      let groundPinCount = 0
      let ambiguous = false
      for (const sourcePort of sourcePorts) {
        const pin = index.port(sourcePort)!
        const net = index.connected(sourcePort.source_port_id)
        const peers = (index.portsByNet.get(net) ?? []).filter(
          (p) => p.source_port_id !== sourcePort.source_port_id,
        )
        const incidentTraces = traces.filter((t) =>
          t.edges.some(
            (edge) => near(edge.from, pin.center) || near(edge.to, pin.center),
          ),
        )
        if (index.isRail(net)) {
          // A labeled rail can follow the connector. A single wired ground
          // leaf may reconnect to the host's same ground net after translation.
          if (index.groundNets.has(net) && !index.powerNets.has(net))
            groundPinCount++
          const wired = incidentTraces.filter(
            (t) =>
              !railLabels.some(
                (label) =>
                  label.anchor_position &&
                  joins(t, pin.center, label.anchor_position),
              ),
          )
          if (wired.length) {
            const trace = wired[0]!
            const endpoints = peers.flatMap((p) => {
              const port = index.port(p)
              return port && joins(trace, pin.center, port.center) ? [port] : []
            })
            if (
              sourcePorts.length !== 2 ||
              !index.groundNets.has(net) ||
              index.powerNets.has(net) ||
              wired.length !== 1 ||
              endpoints.length !== 1
            )
              ambiguous = true
            else
              wiredGrounds.push({ pin, net, trace, currentPeer: endpoints[0]! })
          }
          continue
        }
        if (peers.length === 0) {
          if (incidentTraces.length > 0) ambiguous = true
          continue
        }
        const peer = peers.length === 1 ? index.port(peers[0]!) : undefined
        const component =
          peers.length === 1
            ? index.placement(peers[0]!.source_component_id)
            : undefined
        if (
          !peer?.facing_direction ||
          !component ||
          !index.sameLocalScope(connector, component) ||
          dot(directions[peer.facing_direction], along) !== -1
        ) {
          ambiguous = true
          break
        }
        connections.push({ pin, peer, component })
      }
      const singleSignal =
        connections.length === 1 &&
        sourcePorts.length === 2 &&
        groundPinCount === 1
      if (ambiguous || (connections.length < 2 && !singleSignal)) continue
      if (singleSignal && sourcePorts.some((p) => p.do_not_connect)) continue
      for (const ground of wiredGrounds) {
        const host = connections[0]!.component
        const candidates = (index.portsByNet.get(ground.net) ?? []).filter(
          (p) => p.source_component_id === host.sourceComponentId,
        )
        const peer =
          candidates.length === 1 ? index.port(candidates[0]!) : undefined
        const currentSource = index.portsByNet
          .get(ground.net)
          ?.find((p) => p.source_port_id === ground.currentPeer.source_port_id)
        const currentComponent = currentSource
          ? index.placement(currentSource.source_component_id)
          : undefined
        if (
          !singleSignal ||
          !peer?.facing_direction ||
          !currentComponent ||
          !index.sameLocalScope(connector, currentComponent) ||
          dot(directions[peer.facing_direction], along) !== -1
        ) {
          ambiguous = true
          break
        }
        // Keep the shared ground tree: only its connector leaf is rerouted.
        // Compare against even the nearest existing junction, not a farther pin.
        const currentEndpoint = [
          ground.currentPeer.center,
          ...ground.trace.junctions,
        ].sort(
          (a, b) =>
            distance(ground.pin.center, a) - distance(ground.pin.center, b),
        )[0]!
        groundConnections.push({
          pin: ground.pin,
          peer,
          component: host,
          currentEndpoint,
        })
      }
      if (ambiguous) continue
      const constrainedConnections = [...connections, ...groundConnections]
      // Every signal currently points away from its peer. Label-only separation
      // is intentional in many designs; require actual multi-bend wire detours.
      if (
        connections.some(
          (c) => dot(c.peer.center, along) >= dot(c.pin.center, along) - 2,
        )
      )
        continue
      const detouredConnections = connections
        .map((c) =>
          traces.filter(
            (t) => joins(t, c.pin.center, c.peer.center) && bendCount(t) >= 3,
          ),
        )
        .filter((t) => t.length > 0)
      if (detouredConnections.length < (singleSignal ? 1 : 2)) continue
      const detours = detouredConnections.flat()
      const ordered = [...connections].sort(
        (a, b) => dot(a.pin.center, across) - dot(b.pin.center, across),
      )
      if (
        ordered.some(
          (c, i) =>
            i > 0 &&
            dot(c.peer.center, across) <=
              dot(ordered[i - 1]!.peer.center, across) + EPSILON,
        )
      )
        continue

      const center = { x: connector.schX, y: connector.schY }
      const pinOffset = Math.max(
        ...connections.map(
          (c) => dot(c.pin.center, along) - dot(center, along),
        ),
      )
      const targetAlong =
        Math.min(...connections.map((c) => dot(c.peer.center, along))) -
        2 -
        pinOffset
      const offsets = connections
        .map(
          (c) =>
            dot(c.peer.center, across) -
            dot(c.pin.center, across) +
            dot(center, across),
        )
        .sort((a, b) => a - b)
      const targetAcross = offsets[Math.floor(offsets.length / 2)]!
      const target = {
        x: round(along.x * targetAlong + across.x * targetAcross),
        y: round(along.y * targetAlong + across.y * targetAcross),
      }
      const delta = { x: target.x - center.x, y: target.y - center.y }
      const movedPin = (pin: SchematicPort) => ({
        x: pin.center.x + delta.x,
        y: pin.center.y + delta.y,
      })
      if (
        constrainedConnections.some(
          (c) =>
            distance(movedPin(c.pin), c.peer.center) >
            distance(c.pin.center, c.currentEndpoint ?? c.peer.center) +
              EPSILON,
        )
      )
        continue
      const before = connections.reduce(
        (sum, c) => sum + distance(c.pin.center, c.peer.center),
        0,
      )
      const after = connections.reduce(
        (sum, c) => sum + distance(movedPin(c.pin), c.peer.center),
        0,
      )
      if (before - after < 4 || after > before * 0.75) continue
      const obstacles = ctx.componentPlacements.filter(
        (p) =>
          p.schematicSheetId === connector.schematicSheetId &&
          p.schematicComponentId !== connector.schematicComponentId,
      )
      const targetBounds = centeredRect(
        target.x,
        target.y,
        connector.width + 0.4,
        connector.height + 0.4,
      )
      if (
        obstacles.some((p) =>
          rectOverlap(
            targetBounds,
            centeredRect(p.schX, p.schY, p.width, p.height),
          ),
        )
      )
        continue
      // Require a clear orthogonal corridor for each signal and wired return.
      if (
        constrainedConnections.some((c) => {
          const start = movedPin(c.pin)
          const end = c.peer.center
          const middleAlong = (dot(start, along) + dot(end, along)) / 2
          const points = [
            start,
            {
              x: along.x * middleAlong + across.x * dot(start, across),
              y: along.y * middleAlong + across.y * dot(start, across),
            },
            {
              x: along.x * middleAlong + across.x * dot(end, across),
              y: along.y * middleAlong + across.y * dot(end, across),
            },
            end,
          ]
          return obstacles.some(
            (p) =>
              p.schematicComponentId !== c.component.schematicComponentId &&
              points
                .slice(1)
                .some((point, i) => segmentCrossesBox(points[i]!, point, p)),
          )
        })
      )
        continue
      const connectedComponents = [
        ...new Map(
          connections.map((c) => [
            c.component.schematicComponentId,
            c.component,
          ]),
        ).values(),
      ]
      const name = connector.sourceComponentName || "component"
      issues.push({
        lineItemType: "ConnectorPositionCausesTraceDetours",
        connectorSchematicBox: connector,
        connectedComponents,
        schematicTraceIds: [
          ...new Set(detours.map((t) => t.schematic_trace_id)),
        ],
        evaluatedSignalCount: connections.length,
        newSchX: target.x,
        newSchY: target.y,
        deltaSchX: round(delta.x),
        deltaSchY: round(delta.y),
        currentTotalSignalDistance: round(before),
        suggestedTotalSignalDistance: round(after),
        message: `Move ${name} to schX=${target.x}, schY=${target.y} so its signal pins face ${connectedComponents.map((p) => p.sourceComponentName || "component").join(", ")}. Preserve rotation and pin assignments; reroute the connections and attached rail labels.${groundConnections.length ? " Reroute only the connector ground leaf to the same ground net at the signal host; retain the remaining ground tree." : ""}`,
      })
    }
    this.solved = true
  }

  static issueToString(issue: ConnectorPositionCausesTraceDetours): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "connectorComponentName",
      issue.connectorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "connectedComponents",
      issue.connectedComponents
        .map((p) => p.sourceComponentName || "component")
        .join(","),
    )
    for (const key of [
      "evaluatedSignalCount",
      "newSchX",
      "newSchY",
      "deltaSchX",
      "deltaSchY",
      "currentTotalSignalDistance",
      "suggestedTotalSignalDistance",
    ] as const)
      addAttr(attrs, key, issue[key])
    addAttr(attrs, "message", issue.message)
    return `<ConnectorPositionCausesTraceDetours ${attrs.join(" ")} />`
  }
}

function joins(trace: SchematicTrace, a: Point, b: Point): boolean {
  const first = trace.edges[0]?.from
  const last = trace.edges.at(-1)?.to
  return (
    !!first &&
    !!last &&
    ((near(first, a) && near(last, b)) || (near(first, b) && near(last, a)))
  )
}

function bendCount(trace: SchematicTrace): number {
  let previousAxis: string | undefined
  let bends = 0
  for (let i = 0; i < trace.edges.length; i++) {
    const edge = trace.edges[i]!
    if (i > 0 && !near(trace.edges[i - 1]!.to, edge.from)) return 0
    if (near(edge.from, edge.to)) continue
    const axis =
      Math.abs(edge.from.y - edge.to.y) < EPSILON
        ? "x"
        : Math.abs(edge.from.x - edge.to.x) < EPSILON
          ? "y"
          : undefined
    if (!axis) return 0
    if (previousAxis && previousAxis !== axis) bends++
    previousAxis = axis
  }
  return bends
}

function segmentCrossesBox(
  a: Point,
  b: Point,
  box: SchematicBoxPlacement,
): boolean {
  const bounds = centeredRect(
    box.schX,
    box.schY,
    box.width + 0.2,
    box.height + 0.2,
  )
  return (
    Math.max(a.x, b.x) > bounds.left &&
    Math.min(a.x, b.x) < bounds.right &&
    Math.max(a.y, b.y) > bounds.bottom &&
    Math.min(a.y, b.y) < bounds.top
  )
}
