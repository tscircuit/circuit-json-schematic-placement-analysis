import { getTraceName } from "../../utils/trace-name"
import { getNetLabelBounds } from "../../utils/net-label-bounds"
import { calculateElbow, type ElbowPoint } from "calculate-elbow/lib"
import {
  getSchematicTextPolygons,
  rectPolygon,
  segmentCrossesPolygon,
  traceSegmentPolygon,
  polygonsOverlap,
} from "../../utils/schematic-text-geometry"
import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort, SchematicTrace } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  TraceCanBeSimplifiedByMovingComponent,
} from "../../types"
import { addAttr, fmtNumber } from "../../utils/format"
import { centeredRect, rectOverlap } from "../../utils/geometry"
import type { SolverContext } from "../SolverContext"

type Point = { x: number; y: number }
type Axis = "horizontal" | "vertical"

interface MoveCandidate {
  target: SchematicBoxPlacement
  deltaSchX: number
  deltaSchY: number
  currentTurnCount: number
  suggestedTurnCount: number
  suggestedTraces?: { schematicTraceId: string; points: Point[] }[]
}

export class TraceSimplificationSolver extends BaseSolver {
  private static readonly EPSILON = 0.01

  private readonly ctx: SolverContext
  private readonly out: SchematicPlacementIssue[]

  constructor({
    ctx,
    issues,
  }: {
    ctx: SolverContext
    issues: SchematicPlacementIssue[]
  }) {
    super()
    this.ctx = ctx
    this.out = issues
  }

  override _step(): void {
    const ports = this.ctx.circuitJson.filter(
      (element): element is SchematicPort => element.type === "schematic_port",
    )
    const portsById = new Map(
      ports.map((port) => [port.schematic_port_id, port]),
    )
    const placementsByComponentId = new Map(
      this.ctx.componentPlacements.flatMap((placement) =>
        placement.schematicComponentId
          ? [[placement.schematicComponentId, placement] as const]
          : [],
      ),
    )
    const emittedMoves = new Set<string>()

    for (const trace of this.ctx.circuitJson.filter(
      (element): element is SchematicTrace =>
        element.type === "schematic_trace",
    )) {
      const points = this.getTracePoints(trace)
      const currentTurnCount = this.countTurns(points)
      if (currentTurnCount !== 3) continue

      const candidates = [
        this.getCandidate({
          trace,
          points,
          atStart: true,
          currentTurnCount,
          ports,
          portsById,
          placementsByComponentId,
        }),
        this.getCandidate({
          trace,
          points,
          atStart: false,
          currentTurnCount,
          ports,
          portsById,
          placementsByComponentId,
        }),
      ].filter((candidate): candidate is MoveCandidate => Boolean(candidate))

      // The same relative pin displacement can be achieved by moving the
      // opposite endpoint instead. Try that when it lets a passive move in
      // place of an IC, then validate its own obstacles and attached routes.
      for (const candidate of [...candidates]) {
        if (!candidate.target.sourceComponentName?.startsWith("U")) continue
        for (const point of [points[0]!, points.at(-1)!]) {
          const port = this.findPortAtPoint(
            ports,
            point,
            trace.schematic_sheet_id,
          )
          const target = port?.schematic_component_id
            ? placementsByComponentId.get(port.schematic_component_id)
            : undefined
          if (!target || !/^[CR]/.test(target.sourceComponentName ?? ""))
            continue
          candidates.push({
            target,
            deltaSchX: -candidate.deltaSchX,
            deltaSchY: -candidate.deltaSchY,
            currentTurnCount,
            suggestedTurnCount: candidate.suggestedTurnCount,
          })
        }
      }
      const priority = (candidate: MoveCandidate) =>
        /^[CR]/.test(candidate.target.sourceComponentName ?? "")
          ? 0
          : candidate.target.sourceComponentName?.startsWith("U")
            ? 2
            : 1
      candidates.sort((a, b) => priority(a) - priority(b))

      for (const candidate of candidates) {
        if (this.wouldOverlapAnotherComponent(candidate)) continue
        if (!this.validateMove(trace, candidate, ports)) continue

        const moveKey = [
          candidate.target.schematicComponentId,
          candidate.deltaSchX.toFixed(3),
          candidate.deltaSchY.toFixed(3),
        ].join("\0")
        if (emittedMoves.has(moveKey)) break
        emittedMoves.add(moveKey)
        this.out.push(this.makeIssue(trace, candidate))
        break
      }
    }

    this.solved = true
  }

  private getCandidate({
    trace,
    points,
    atStart,
    currentTurnCount,
    ports,
    portsById,
    placementsByComponentId,
  }: {
    trace: SchematicTrace
    points: Point[]
    atStart: boolean
    currentTurnCount: number
    ports: SchematicPort[]
    portsById: Map<string, SchematicPort>
    placementsByComponentId: Map<string, SchematicBoxPlacement>
  }): MoveCandidate | undefined {
    if (points.length < 4) return
    const terminalIndex = atStart ? 0 : points.length - 1
    const leadIndex = atStart ? 1 : points.length - 2
    const acrossIndex = atStart ? 2 : points.length - 3
    const retainedIndex = atStart ? 3 : points.length - 4
    const terminalPoint = points[terminalIndex]!
    const leadPoint = points[leadIndex]!
    const acrossPoint = points[acrossIndex]!
    const retainedPoint = points[retainedIndex]!
    const terminalEdge = atStart ? trace.edges[0] : trace.edges.at(-1)
    if (!terminalEdge) return

    const portId = atStart
      ? terminalEdge.from_schematic_port_id
      : terminalEdge.to_schematic_port_id
    const port = portId
      ? portsById.get(portId)
      : this.findPortAtPoint(ports, terminalPoint, trace.schematic_sheet_id)
    if (!port?.schematic_component_id || !port.facing_direction) return

    const leadAxis = this.getAxis(terminalPoint, leadPoint)
    const shiftAxis = this.getAxis(leadPoint, acrossPoint)
    const retainedAxis = this.getAxis(acrossPoint, retainedPoint)
    const portAxis =
      port.facing_direction === "left" || port.facing_direction === "right"
        ? "horizontal"
        : "vertical"
    if (!leadAxis || !shiftAxis || !retainedAxis) return
    if (
      leadAxis !== portAxis ||
      shiftAxis === portAxis ||
      retainedAxis !== portAxis
    ) {
      return
    }
    if (
      !this.isPointInFacingDirection(
        terminalPoint,
        leadPoint,
        port.facing_direction,
      ) ||
      !this.isPointInFacingDirection(
        acrossPoint,
        retainedPoint,
        port.facing_direction,
      )
    ) {
      return
    }

    const target = placementsByComponentId.get(port.schematic_component_id)
    if (!target) return
    const deltaSchX = acrossPoint.x - leadPoint.x
    const deltaSchY = acrossPoint.y - leadPoint.y
    if (
      Math.abs(deltaSchX) <= TraceSimplificationSolver.EPSILON &&
      Math.abs(deltaSchY) <= TraceSimplificationSolver.EPSILON
    ) {
      return
    }

    const movedTerminalPoint = {
      x: terminalPoint.x + deltaSchX,
      y: terminalPoint.y + deltaSchY,
    }
    const suggestedPoints = atStart
      ? [movedTerminalPoint, ...points.slice(2)]
      : [...points.slice(0, -2), movedTerminalPoint]
    const suggestedTurnCount = this.countTurns(suggestedPoints)
    if (
      suggestedTurnCount === undefined ||
      suggestedTurnCount !== 1 ||
      suggestedTurnCount >= currentTurnCount
    ) {
      return
    }

    return {
      target,
      deltaSchX,
      deltaSchY,
      currentTurnCount,
      suggestedTurnCount,
    }
  }

  /** calculate-elbow proposes geometry, not obstacle avoidance. Only report a
   * move when every attached route can be preserved or improved and the exact
   * proposed geometry is clear. Unsupported junctions are deliberately skipped. */
  private validateMove(
    targetTrace: SchematicTrace,
    candidate: MoveCandidate,
    ports: SchematicPort[],
  ): boolean {
    const componentId = candidate.target.schematicComponentId
    const sheetId = candidate.target.schematicSheetId
    const sheetPorts = ports.filter((p) => p.schematic_sheet_id === sheetId)
    const movingPorts = sheetPorts.filter(
      (p) => p.schematic_component_id === componentId,
    )
    const traces = this.ctx.circuitJson.filter(
      (e): e is SchematicTrace =>
        e.type === "schematic_trace" && e.schematic_sheet_id === sheetId,
    )
    const touchesPort = (trace: SchematicTrace, port: SchematicPort) =>
      trace.edges.some(
        (edge) =>
          edge.from_schematic_port_id === port.schematic_port_id ||
          edge.to_schematic_port_id === port.schematic_port_id ||
          this.pointsEqual(edge.from, port.center) ||
          this.pointsEqual(edge.to, port.center),
      )
    const affected = traces.filter((trace) =>
      movingPorts.some((port) => touchesPort(trace, port)),
    )
    if (!affected.includes(targetTrace)) return false
    // A label directly attached to a moving port needs its own placement validation.
    if (
      this.ctx.circuitJson.some(
        (e) =>
          e.type === "schematic_net_label" &&
          e.schematic_sheet_id === sheetId &&
          movingPorts.some((p) =>
            this.pointsEqual(e.anchor_position ?? e.center, p.center),
          ),
      )
    )
      return false
    const shift = (point: Point): Point => ({
      x: point.x + candidate.deltaSchX,
      y: point.y + candidate.deltaSchY,
    })
    const directions = {
      left: "x-",
      right: "x+",
      up: "y+",
      down: "y-",
    } as const
    const endpoint = (port: SchematicPort, moved: boolean): ElbowPoint => ({
      ...(moved && port.schematic_component_id === componentId
        ? shift(port.center)
        : port.center),
      facingDirection: directions[port.facing_direction!],
    })
    const length = (points: Point[]) =>
      points
        .slice(1)
        .reduce(
          (sum, p, i) =>
            sum + Math.abs(p.x - points[i]!.x) + Math.abs(p.y - points[i]!.y),
          0,
        )
    const segments = (points: Point[]) =>
      points.slice(1).map((to, i) => ({ from: points[i]!, to }))
    const movedBounds = centeredRect(
      candidate.target.schX + candidate.deltaSchX,
      candidate.target.schY + candidate.deltaSchY,
      candidate.target.width,
      candidate.target.height,
    )
    const unaffected = traces.filter((trace) => !affected.includes(trace))
    if (
      unaffected.some((trace) =>
        trace.edges.some((edge) =>
          segmentCrossesPolygon(edge.from, edge.to, rectPolygon(movedBounds)),
        ),
      )
    )
      return false
    const textPolygons = this.ctx.circuitJson.flatMap((e) => {
      if (e.type === "schematic_net_label" && e.schematic_sheet_id === sheetId)
        return [rectPolygon(getNetLabelBounds(e))]
      if (e.type !== "schematic_text" || e.schematic_sheet_id !== sheetId)
        return []
      return getSchematicTextPolygons(
        e.schematic_component_id === componentId
          ? { ...e, position: shift(e.position) }
          : e,
      )
    })
    if (
      textPolygons.some((polygon) =>
        polygonsOverlap(polygon, rectPolygon(movedBounds)),
      )
    )
      return false
    const proposed: NonNullable<MoveCandidate["suggestedTraces"]> = []
    for (const trace of affected) {
      const oldPoints = this.getTracePoints(trace)
      if (oldPoints.length < 2 || trace.junctions?.length) return false
      const resolve = (point: Point, id?: string) => {
        const matches = sheetPorts.filter((p) =>
          id ? p.schematic_port_id === id : this.pointsEqual(p.center, point),
        )
        return matches.length === 1 &&
          this.pointsEqual(matches[0]!.center, point)
          ? matches[0]
          : undefined
      }
      const start = resolve(
        oldPoints[0]!,
        trace.edges[0]!.from_schematic_port_id,
      )
      const end = resolve(
        oldPoints.at(-1)!,
        trace.edges.at(-1)!.to_schematic_port_id,
      )
      if (!start?.facing_direction || !end?.facing_direction) return false
      if (
        movingPorts.some(
          (p) => touchesPort(trace, p) && p !== start && p !== end,
        )
      )
        return false
      // Preserve wire junctions and labels anchored anywhere on the old route.
      const isInteriorConnection = (point: Point) =>
        !this.pointsEqual(point, start.center) &&
        !this.pointsEqual(point, end.center) &&
        segments(oldPoints).some(
          ({ from, to }) =>
            Math.abs(
              Math.hypot(point.x - from.x, point.y - from.y) +
                Math.hypot(point.x - to.x, point.y - to.y) -
                Math.hypot(to.x - from.x, to.y - from.y),
            ) < 1e-6,
        )
      if (
        traces.some(
          (other) =>
            other !== trace &&
            other.edges.some(
              (edge) =>
                isInteriorConnection(edge.from) ||
                isInteriorConnection(edge.to),
            ),
        )
      )
        return false
      if (
        this.ctx.circuitJson.some(
          (e) =>
            e.type === "schematic_net_label" &&
            e.schematic_sheet_id === sheetId &&
            isInteriorConnection(e.anchor_position ?? e.center),
        )
      )
        return false
      const points = calculateElbow(
        endpoint(start, true),
        endpoint(end, true),
      ).filter(
        (point, i, all) => i === 0 || !this.pointsEqual(point, all[i - 1]!),
      )
      const turns = this.countTurns(points)
      const oldTurns = this.countTurns(oldPoints)
      if (
        points.length < 2 ||
        turns === undefined ||
        oldTurns === undefined ||
        turns > oldTurns ||
        length(points) > length(oldPoints) + 1e-6
      )
        return false
      if (
        !this.isPointInFacingDirection(
          points[0]!,
          points[1]!,
          start.facing_direction,
        ) ||
        !this.isPointInFacingDirection(
          points.at(-1)!,
          points.at(-2)!,
          end.facing_direction,
        )
      )
        return false
      if (trace === targetTrace) {
        const baselineTurns = this.countTurns(
          calculateElbow(endpoint(start, false), endpoint(end, false)),
        )
        if (
          turns >= oldTurns ||
          baselineTurns === undefined ||
          turns >= baselineTurns
        )
          return false
        candidate.suggestedTurnCount = turns
      }
      for (const segment of segments(points)) {
        if (
          textPolygons.some((polygon) =>
            segmentCrossesPolygon(segment.from, segment.to, polygon),
          )
        )
          return false
        if (
          this.ctx.componentPlacements.some((p) => {
            if (p.schematicSheetId !== sheetId) return false
            const bounds =
              p.schematicComponentId === componentId
                ? movedBounds
                : centeredRect(p.schX, p.schY, p.width, p.height)
            return segmentCrossesPolygon(
              segment.from,
              segment.to,
              rectPolygon(bounds),
            )
          })
        )
          return false
        const polygon = traceSegmentPolygon(segment.from, segment.to)
        if (!polygon) continue
        // Reject new crossings/overlaps, including ambiguous same-net joins.
        const otherSegments = [
          ...unaffected.flatMap((t) => t.edges),
          ...proposed.flatMap((t) => segments(t.points)),
        ]
        if (
          otherSegments.some((edge) => {
            if (
              [start, end].some(
                (port) =>
                  port.schematic_component_id !== componentId &&
                  [segment.from, segment.to].some((p) =>
                    this.pointsEqual(p, port.center),
                  ) &&
                  [edge.from, edge.to].some((p) =>
                    this.pointsEqual(p, port.center),
                  ),
              ) &&
              this.getAxis(segment.from, segment.to) !==
                this.getAxis(edge.from, edge.to)
            )
              return false
            const other = traceSegmentPolygon(edge.from, edge.to)
            return other && polygonsOverlap(polygon, other)
          })
        )
          return false
      }
      proposed.push({ schematicTraceId: trace.schematic_trace_id, points })
    }
    candidate.suggestedTraces = proposed
    return true
  }

  private getTracePoints(trace: SchematicTrace): Point[] {
    const firstEdge = trace.edges[0]
    if (!firstEdge) return []
    const points = [firstEdge.from]
    for (const edge of trace.edges) {
      const previousPoint = points.at(-1)!
      if (!this.pointsEqual(previousPoint, edge.from)) return []
      points.push(edge.to)
    }
    return points
  }

  private countTurns(points: Point[]): number | undefined {
    const axes: Axis[] = []
    for (const [index, point] of points.slice(1).entries()) {
      const previousPoint = points[index]!
      if (this.pointsEqual(previousPoint, point)) continue
      const axis = this.getAxis(previousPoint, point)
      if (!axis) return
      axes.push(axis)
    }
    return axes.slice(1).filter((axis, index) => axis !== axes[index]).length
  }

  private pointsEqual(a: Point, b: Point): boolean {
    const { EPSILON } = TraceSimplificationSolver
    return Math.abs(a.x - b.x) <= EPSILON && Math.abs(a.y - b.y) <= EPSILON
  }

  private getAxis(a: Point, b: Point): Axis | undefined {
    const dx = Math.abs(b.x - a.x)
    const dy = Math.abs(b.y - a.y)
    const { EPSILON } = TraceSimplificationSolver
    if (dx <= EPSILON && dy > EPSILON) return "vertical"
    if (dy <= EPSILON && dx > EPSILON) return "horizontal"
    return undefined
  }

  private isPointInFacingDirection(
    origin: Point,
    point: Point,
    facingDirection: NonNullable<SchematicPort["facing_direction"]>,
  ): boolean {
    const { EPSILON } = TraceSimplificationSolver
    switch (facingDirection) {
      case "left":
        return point.x < origin.x - EPSILON
      case "right":
        return point.x > origin.x + EPSILON
      case "up":
        return point.y > origin.y + EPSILON
      case "down":
        return point.y < origin.y - EPSILON
    }
  }

  private findPortAtPoint(
    ports: SchematicPort[],
    point: Point,
    schematicSheetId?: string,
  ): SchematicPort | undefined {
    const { EPSILON } = TraceSimplificationSolver
    return ports.find(
      (port) =>
        port.schematic_sheet_id === schematicSheetId &&
        Math.abs(port.center.x - point.x) <= EPSILON &&
        Math.abs(port.center.y - point.y) <= EPSILON,
    )
  }

  private wouldOverlapAnotherComponent(candidate: MoveCandidate): boolean {
    const movedBounds = centeredRect(
      candidate.target.schX + candidate.deltaSchX,
      candidate.target.schY + candidate.deltaSchY,
      candidate.target.width,
      candidate.target.height,
    )

    return this.ctx.componentPlacements.some((placement) => {
      if (placement === candidate.target) return false
      if (placement.schematicSheetId !== candidate.target.schematicSheetId) {
        return false
      }
      return Boolean(
        rectOverlap(
          movedBounds,
          centeredRect(
            placement.schX,
            placement.schY,
            placement.width,
            placement.height,
          ),
        ),
      )
    })
  }

  private makeIssue(
    trace: SchematicTrace,
    candidate: MoveCandidate,
  ): TraceCanBeSimplifiedByMovingComponent {
    const targetName =
      candidate.target.sourceComponentName ??
      candidate.target.schematicComponentId ??
      "component"
    const direction = this.getMoveDirection(
      candidate.deltaSchX,
      candidate.deltaSchY,
    )
    const distance = Math.abs(candidate.deltaSchX || candidate.deltaSchY)
    const newSchX = candidate.target.schX + candidate.deltaSchX
    const newSchY = candidate.target.schY + candidate.deltaSchY

    return {
      lineItemType: "TraceCanBeSimplifiedByMovingComponent",
      schematicTraceId: trace.schematic_trace_id,
      traceName: getTraceName(this.ctx.circuitJson, trace),
      targetComponent: candidate.target,
      deltaSchX: candidate.deltaSchX,
      deltaSchY: candidate.deltaSchY,
      newSchX,
      newSchY,
      currentTurnCount: candidate.currentTurnCount,
      suggestedTurnCount: candidate.suggestedTurnCount,
      suggestedTraces: candidate.suggestedTraces,
      message: `move ${targetName} ${direction} by ${fmtNumber(distance)} (to schX=${fmtNumber(newSchX)}, schY=${fmtNumber(newSchY)}) to reduce this trace from ${candidate.currentTurnCount} turns to ${candidate.suggestedTurnCount}`,
    }
  }

  private getMoveDirection(deltaSchX: number, deltaSchY: number): string {
    if (Math.abs(deltaSchX) > TraceSimplificationSolver.EPSILON) {
      return deltaSchX > 0 ? "right" : "left"
    }
    return deltaSchY > 0 ? "up" : "down"
  }

  static issueToString(issue: TraceCanBeSimplifiedByMovingComponent): string {
    const attrs: string[] = []
    addAttr(attrs, "traceName", issue.traceName)
    addAttr(
      attrs,
      "targetComponentName",
      issue.targetComponent.sourceComponentName,
    )
    addAttr(attrs, "deltaSchX", issue.deltaSchX, { formatDelta: true })
    addAttr(attrs, "deltaSchY", issue.deltaSchY, { formatDelta: true })
    addAttr(attrs, "newSchX", issue.newSchX)
    addAttr(attrs, "newSchY", issue.newSchY)
    addAttr(attrs, "currentTurnCount", issue.currentTurnCount)
    addAttr(attrs, "suggestedTurnCount", issue.suggestedTurnCount)
    addAttr(attrs, "message", issue.message)
    return `<TraceCanBeSimplifiedByMovingComponent ${attrs.join(" ")} />`
  }
}
