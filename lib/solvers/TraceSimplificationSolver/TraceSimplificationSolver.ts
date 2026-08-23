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
      if (currentTurnCount !== 2) continue

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

      for (const candidate of candidates) {
        if (this.wouldOverlapAnotherComponent(candidate)) continue

        const moveKey = [
          candidate.target.schematicComponentId,
          candidate.deltaSchX.toFixed(3),
          candidate.deltaSchY.toFixed(3),
        ].join("\0")
        if (emittedMoves.has(moveKey)) continue
        emittedMoves.add(moveKey)
        this.out.push(this.makeIssue(trace, candidate))
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
    const neighborIndex = atStart ? 1 : points.length - 2
    const nextNeighborIndex = atStart ? 2 : points.length - 3
    const terminalPoint = points[terminalIndex]!
    const neighborPoint = points[neighborIndex]!
    const nextNeighborPoint = points[nextNeighborIndex]!
    const terminalEdge = atStart ? trace.edges[0] : trace.edges.at(-1)
    if (!terminalEdge) return

    const portId = atStart
      ? terminalEdge.from_schematic_port_id
      : terminalEdge.to_schematic_port_id
    const port = portId
      ? portsById.get(portId)
      : this.findPortAtPoint(ports, terminalPoint, trace.schematic_sheet_id)
    if (!port?.schematic_component_id || !port.facing_direction) return

    const terminalAxis = this.getAxis(terminalPoint, neighborPoint)
    const retainedAxis = this.getAxis(neighborPoint, nextNeighborPoint)
    const portAxis =
      port.facing_direction === "left" || port.facing_direction === "right"
        ? "horizontal"
        : "vertical"
    if (!terminalAxis || !retainedAxis) return
    if (terminalAxis === portAxis || retainedAxis !== portAxis) return
    if (
      !this.isPointInFacingDirection(
        neighborPoint,
        nextNeighborPoint,
        port.facing_direction,
      )
    ) {
      return
    }

    const target = placementsByComponentId.get(port.schematic_component_id)
    if (!target) return
    const deltaSchX = neighborPoint.x - terminalPoint.x
    const deltaSchY = neighborPoint.y - terminalPoint.y
    if (
      Math.abs(deltaSchX) <= TraceSimplificationSolver.EPSILON &&
      Math.abs(deltaSchY) <= TraceSimplificationSolver.EPSILON
    ) {
      return
    }

    const suggestedPoints = points.map((point, index) =>
      index === terminalIndex ? neighborPoint : point,
    )
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
      targetComponent: candidate.target,
      deltaSchX: candidate.deltaSchX,
      deltaSchY: candidate.deltaSchY,
      newSchX,
      newSchY,
      currentTurnCount: candidate.currentTurnCount,
      suggestedTurnCount: candidate.suggestedTurnCount,
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
    addAttr(attrs, "schematicTraceId", issue.schematicTraceId)
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
