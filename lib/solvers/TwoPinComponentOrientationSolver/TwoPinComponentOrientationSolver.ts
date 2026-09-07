import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort, SchematicTrace } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  SchematicPortFacingDirection,
  TwoPinComponentCouldBeFlipped,
} from "../../types"
import { addAttr } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

type Point = { x: number; y: number }
type Axis = "horizontal" | "vertical"

interface TraceEndpoint {
  port: SchematicPort
  pointsFromEndpoint: Point[]
}

interface FlipCandidate {
  trace: SchematicTrace
  targetPort: SchematicPort
  targetPlacement: SchematicBoxPlacement
  connectedPlacement: SchematicBoxPlacement
  suggestedFacingDirection: SchematicPortFacingDirection
  currentTurnCount: number
  suggestedTurnCount: number
  traceLength: number
}

export class TwoPinComponentOrientationSolver extends BaseSolver {
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
    const portsByComponentId = new Map<string, SchematicPort[]>()
    for (const port of ports) {
      if (!port.schematic_component_id) continue
      const componentPorts =
        portsByComponentId.get(port.schematic_component_id) ?? []
      componentPorts.push(port)
      portsByComponentId.set(port.schematic_component_id, componentPorts)
    }
    const placementsByComponentId = new Map(
      this.ctx.componentPlacements.flatMap((placement) =>
        placement.schematicComponentId
          ? [[placement.schematicComponentId, placement] as const]
          : [],
      ),
    )
    const bestCandidateByComponentId = new Map<string, FlipCandidate>()

    for (const trace of this.ctx.circuitJson.filter(
      (element): element is SchematicTrace =>
        element.type === "schematic_trace",
    )) {
      const points = this.getTracePoints(trace)
      const currentTurnCount = this.countTurns(points)
      if (currentTurnCount === undefined || currentTurnCount < 2) continue

      const endpoints = this.getTraceEndpoints(trace, points, ports, portsById)
      if (!endpoints) continue

      for (const [targetEndpoint, connectedEndpoint] of [
        endpoints,
        [endpoints[1], endpoints[0]] as const,
      ]) {
        const candidate = this.getFlipCandidate({
          trace,
          targetEndpoint,
          connectedEndpoint,
          currentTurnCount,
          portsByComponentId,
          placementsByComponentId,
        })
        if (!candidate) continue

        const componentId = candidate.targetPort.schematic_component_id!
        const existing = bestCandidateByComponentId.get(componentId)
        if (!existing || this.isBetterCandidate(candidate, existing)) {
          bestCandidateByComponentId.set(componentId, candidate)
        }
      }
    }

    for (const candidate of bestCandidateByComponentId.values()) {
      this.out.push(this.makeIssue(candidate))
    }
    this.solved = true
  }

  private getFlipCandidate({
    trace,
    targetEndpoint,
    connectedEndpoint,
    currentTurnCount,
    portsByComponentId,
    placementsByComponentId,
  }: {
    trace: SchematicTrace
    targetEndpoint: TraceEndpoint
    connectedEndpoint: TraceEndpoint
    currentTurnCount: number
    portsByComponentId: Map<string, SchematicPort[]>
    placementsByComponentId: Map<string, SchematicBoxPlacement>
  }): FlipCandidate | undefined {
    const targetPort = targetEndpoint.port
    const connectedPort = connectedEndpoint.port
    const targetComponentId = targetPort.schematic_component_id
    const connectedComponentId = connectedPort.schematic_component_id
    if (
      !targetComponentId ||
      !connectedComponentId ||
      targetComponentId === connectedComponentId ||
      targetPort.schematic_sheet_id !== connectedPort.schematic_sheet_id
    ) {
      return
    }

    const componentPorts = portsByComponentId.get(targetComponentId)
    if (componentPorts?.length !== 2) return
    const connectedComponentPorts =
      portsByComponentId.get(connectedComponentId) ?? []
    if (connectedComponentPorts.length <= 2) return
    const otherPort = componentPorts.find(
      (port) => port.schematic_port_id !== targetPort.schematic_port_id,
    )
    if (!otherPort || !this.areOppositePorts(targetPort, otherPort)) return

    const currentFacingDirection = targetPort.facing_direction
    const suggestedFacingDirection = otherPort.facing_direction
    if (!currentFacingDirection || !suggestedFacingDirection) return
    if (!this.traceLeavesPortInFacingDirection(targetEndpoint)) return

    const connectedPoint = connectedPort.center
    if (
      this.isPointInFacingDirection(
        targetPort.center,
        connectedPoint,
        currentFacingDirection,
      ) ||
      !this.isPointInFacingDirection(
        otherPort.center,
        connectedPoint,
        suggestedFacingDirection,
      ) ||
      !connectedPort.facing_direction ||
      !this.isPointInFacingDirection(
        connectedPoint,
        otherPort.center,
        connectedPort.facing_direction,
      )
    ) {
      return
    }

    const suggestedTurnCount = this.getMinimumTurnCount(
      otherPort.center,
      connectedPoint,
      suggestedFacingDirection,
    )
    if (suggestedTurnCount >= currentTurnCount) return

    const targetPlacement = placementsByComponentId.get(targetComponentId)
    const connectedPlacement = placementsByComponentId.get(connectedComponentId)
    if (!targetPlacement || !connectedPlacement) return

    return {
      trace,
      targetPort,
      targetPlacement,
      connectedPlacement,
      suggestedFacingDirection,
      currentTurnCount,
      suggestedTurnCount,
      traceLength: this.getTraceLength(targetEndpoint.pointsFromEndpoint),
    }
  }

  private getTraceEndpoints(
    trace: SchematicTrace,
    points: Point[],
    ports: SchematicPort[],
    portsById: Map<string, SchematicPort>,
  ): readonly [TraceEndpoint, TraceEndpoint] | undefined {
    const firstEdge = trace.edges[0]
    const lastEdge = trace.edges.at(-1)
    if (!firstEdge || !lastEdge || points.length < 2) return

    const startPort = firstEdge.from_schematic_port_id
      ? portsById.get(firstEdge.from_schematic_port_id)
      : this.findPortAtPoint(ports, points[0]!, trace.schematic_sheet_id)
    const endPort = lastEdge.to_schematic_port_id
      ? portsById.get(lastEdge.to_schematic_port_id)
      : this.findPortAtPoint(ports, points.at(-1)!, trace.schematic_sheet_id)
    if (!startPort || !endPort) return

    return [
      { port: startPort, pointsFromEndpoint: points },
      { port: endPort, pointsFromEndpoint: [...points].reverse() },
    ]
  }

  private getTracePoints(trace: SchematicTrace): Point[] {
    const firstEdge = trace.edges[0]
    if (!firstEdge) return []
    const points = [firstEdge.from]
    for (const edge of trace.edges) {
      if (!this.pointsEqual(points.at(-1)!, edge.from)) return []
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
      if (axes.at(-1) !== axis) axes.push(axis)
    }
    return Math.max(0, axes.length - 1)
  }

  private traceLeavesPortInFacingDirection(endpoint: TraceEndpoint): boolean {
    const nextPoint = endpoint.pointsFromEndpoint.find(
      (point) => !this.pointsEqual(point, endpoint.port.center),
    )
    return Boolean(
      nextPoint &&
        endpoint.port.facing_direction &&
        this.isPointInFacingDirection(
          endpoint.port.center,
          nextPoint,
          endpoint.port.facing_direction,
        ),
    )
  }

  private areOppositePorts(a: SchematicPort, b: SchematicPort): boolean {
    const horizontal =
      ((a.facing_direction === "left" && b.facing_direction === "right") ||
        (a.facing_direction === "right" && b.facing_direction === "left")) &&
      Math.abs(a.center.y - b.center.y) <=
        TwoPinComponentOrientationSolver.EPSILON
    const vertical =
      ((a.facing_direction === "up" && b.facing_direction === "down") ||
        (a.facing_direction === "down" && b.facing_direction === "up")) &&
      Math.abs(a.center.x - b.center.x) <=
        TwoPinComponentOrientationSolver.EPSILON
    return horizontal || vertical
  }

  private getMinimumTurnCount(
    from: Point,
    to: Point,
    facingDirection: SchematicPortFacingDirection,
  ): number {
    const alignedWithFacingAxis =
      facingDirection === "left" || facingDirection === "right"
        ? Math.abs(from.y - to.y) <= TwoPinComponentOrientationSolver.EPSILON
        : Math.abs(from.x - to.x) <= TwoPinComponentOrientationSolver.EPSILON
    return alignedWithFacingAxis ? 0 : 1
  }

  private isPointInFacingDirection(
    origin: Point,
    point: Point,
    facingDirection: SchematicPortFacingDirection,
  ): boolean {
    const { EPSILON } = TwoPinComponentOrientationSolver
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

  private getAxis(a: Point, b: Point): Axis | undefined {
    const dx = Math.abs(a.x - b.x)
    const dy = Math.abs(a.y - b.y)
    const { EPSILON } = TwoPinComponentOrientationSolver
    if (dx <= EPSILON && dy > EPSILON) return "vertical"
    if (dy <= EPSILON && dx > EPSILON) return "horizontal"
    return undefined
  }

  private pointsEqual(a: Point, b: Point): boolean {
    const { EPSILON } = TwoPinComponentOrientationSolver
    return Math.abs(a.x - b.x) <= EPSILON && Math.abs(a.y - b.y) <= EPSILON
  }

  private findPortAtPoint(
    ports: SchematicPort[],
    point: Point,
    schematicSheetId?: string,
  ): SchematicPort | undefined {
    return ports.find(
      (port) =>
        port.schematic_sheet_id === schematicSheetId &&
        this.pointsEqual(port.center, point),
    )
  }

  private getTraceLength(points: Point[]): number {
    return points.slice(1).reduce((length, point, index) => {
      const previousPoint = points[index]!
      return (
        length +
        Math.abs(point.x - previousPoint.x) +
        Math.abs(point.y - previousPoint.y)
      )
    }, 0)
  }

  private isBetterCandidate(
    candidate: FlipCandidate,
    existing: FlipCandidate,
  ): boolean {
    const improvement =
      candidate.currentTurnCount - candidate.suggestedTurnCount
    const existingImprovement =
      existing.currentTurnCount - existing.suggestedTurnCount
    return (
      improvement > existingImprovement ||
      (improvement === existingImprovement &&
        candidate.traceLength > existing.traceLength)
    )
  }

  private makeIssue(candidate: FlipCandidate): TwoPinComponentCouldBeFlipped {
    const targetName =
      candidate.targetPlacement.sourceComponentName ??
      candidate.targetPlacement.schematicComponentId ??
      "component"
    const connectedName =
      candidate.connectedPlacement.sourceComponentName ??
      candidate.connectedPlacement.schematicComponentId ??
      "connected component"
    const targetPin = candidate.targetPort.pin_number
      ? `pin${candidate.targetPort.pin_number}`
      : candidate.targetPort.display_pin_label

    return {
      lineItemType: "TwoPinComponentCouldBeFlipped",
      schematicTraceId: candidate.trace.schematic_trace_id,
      targetComponent: candidate.targetPlacement,
      connectedComponent: candidate.connectedPlacement,
      targetPin,
      currentFacingDirection: candidate.targetPort.facing_direction!,
      suggestedFacingDirection: candidate.suggestedFacingDirection,
      deltaSchRotation: 180,
      currentTurnCount: candidate.currentTurnCount,
      suggestedTurnCount: candidate.suggestedTurnCount,
      message: `rotate ${targetName} by 180° so ${targetPin ?? "its connected pin"} faces ${connectedName} and reduce this trace from ${candidate.currentTurnCount} turns to ${candidate.suggestedTurnCount}`,
    }
  }

  static issueToString(issue: TwoPinComponentCouldBeFlipped): string {
    const attrs: string[] = []
    addAttr(attrs, "schematicTraceId", issue.schematicTraceId)
    addAttr(
      attrs,
      "targetComponentName",
      issue.targetComponent.sourceComponentName,
    )
    addAttr(
      attrs,
      "connectedComponentName",
      issue.connectedComponent.sourceComponentName,
    )
    addAttr(attrs, "targetPin", issue.targetPin)
    addAttr(attrs, "currentFacingDirection", issue.currentFacingDirection)
    addAttr(attrs, "suggestedFacingDirection", issue.suggestedFacingDirection)
    addAttr(attrs, "deltaSchRotation", issue.deltaSchRotation)
    addAttr(attrs, "currentTurnCount", issue.currentTurnCount)
    addAttr(attrs, "suggestedTurnCount", issue.suggestedTurnCount)
    addAttr(attrs, "message", issue.message)
    return `<TwoPinComponentCouldBeFlipped ${attrs.join(" ")} />`
  }
}
