import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort, SchematicTrace } from "circuit-json"
import type {
  ComponentPinsWouldAlignWithVerticalShift,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr, fmtDelta } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

interface ConnectedPinPair {
  firstPort: SchematicPort
  secondPort: SchematicPort
}

export class ComponentPinAlignmentSolver extends BaseSolver {
  private static readonly ALIGNMENT_EPSILON = 0.01

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
    const portsById = new Map(
      this.ctx.circuitJson
        .filter((el): el is SchematicPort => el.type === "schematic_port")
        .map((port) => [port.schematic_port_id, port]),
    )
    const placementBySchematicComponentId = new Map(
      this.ctx.componentPlacements.flatMap((placement) =>
        placement.schematicComponentId
          ? [[placement.schematicComponentId, placement] as const]
          : [],
      ),
    )
    const pinPairsByComponentPair = new Map<string, ConnectedPinPair[]>()

    for (const trace of this.ctx.circuitJson.filter(
      (el): el is SchematicTrace => el.type === "schematic_trace",
    )) {
      const pinPair = this.getTracePinPair(trace, portsById)
      if (!pinPair) continue

      const firstComponentId = pinPair.firstPort.schematic_component_id
      const secondComponentId = pinPair.secondPort.schematic_component_id
      if (
        !firstComponentId ||
        !secondComponentId ||
        firstComponentId === secondComponentId
      ) {
        continue
      }

      const orderedPair =
        firstComponentId < secondComponentId
          ? pinPair
          : {
              firstPort: pinPair.secondPort,
              secondPort: pinPair.firstPort,
            }
      const key = [firstComponentId, secondComponentId].sort().join("\0")
      const pairs = pinPairsByComponentPair.get(key) ?? []
      const isDuplicate = pairs.some(
        (pair) =>
          pair.firstPort.schematic_port_id ===
            orderedPair.firstPort.schematic_port_id &&
          pair.secondPort.schematic_port_id ===
            orderedPair.secondPort.schematic_port_id,
      )
      if (!isDuplicate) pairs.push(orderedPair)
      pinPairsByComponentPair.set(key, pairs)
    }

    for (const pinPairs of pinPairsByComponentPair.values()) {
      const issue = this.findVerticalShiftIssue(
        pinPairs,
        placementBySchematicComponentId,
      )
      if (issue) this.out.push(issue)
    }

    this.solved = true
  }

  private getTracePinPair(
    trace: SchematicTrace,
    portsById: Map<string, SchematicPort>,
  ): ConnectedPinPair | undefined {
    const firstEdge = trace.edges?.[0]
    const lastEdge = trace.edges?.at(-1)
    if (!firstEdge || !lastEdge) return

    const firstPortId =
      firstEdge.from_schematic_port_id ?? firstEdge.to_schematic_port_id
    const secondPortId =
      lastEdge.to_schematic_port_id ?? lastEdge.from_schematic_port_id
    const ports = [...portsById.values()]
    const firstPort = firstPortId
      ? portsById.get(firstPortId)
      : this.findPortAtPoint(ports, firstEdge.from, trace.schematic_sheet_id)
    const secondPort = secondPortId
      ? portsById.get(secondPortId)
      : this.findPortAtPoint(ports, lastEdge.to, trace.schematic_sheet_id)
    if (!firstPort || !secondPort) return
    if (firstPort.schematic_port_id === secondPort.schematic_port_id) return
    if (firstPort.schematic_sheet_id !== secondPort.schematic_sheet_id) return

    return { firstPort, secondPort }
  }

  private findPortAtPoint(
    ports: SchematicPort[],
    point: { x: number; y: number },
    schematicSheetId?: string,
  ): SchematicPort | undefined {
    const { ALIGNMENT_EPSILON } = ComponentPinAlignmentSolver
    return ports.find(
      (port) =>
        port.schematic_sheet_id === schematicSheetId &&
        Math.abs(port.center.x - point.x) <= ALIGNMENT_EPSILON &&
        Math.abs(port.center.y - point.y) <= ALIGNMENT_EPSILON,
    )
  }

  private findVerticalShiftIssue(
    pinPairs: ConnectedPinPair[],
    placementBySchematicComponentId: Map<string, SchematicBoxPlacement>,
  ): ComponentPinsWouldAlignWithVerticalShift | undefined {
    const firstPair = pinPairs[0]
    if (!firstPair) return

    const firstPlacement = placementBySchematicComponentId.get(
      firstPair.firstPort.schematic_component_id!,
    )
    const secondPlacement = placementBySchematicComponentId.get(
      firstPair.secondPort.schematic_component_id!,
    )
    if (!firstPlacement || !secondPlacement) return

    const [leftPlacement, rightPlacement] =
      firstPlacement.schX <= secondPlacement.schX
        ? [firstPlacement, secondPlacement]
        : [secondPlacement, firstPlacement]
    const horizontalPairs = pinPairs.flatMap((pair) => {
      const [leftPort, rightPort] =
        pair.firstPort.center.x <= pair.secondPort.center.x
          ? [pair.firstPort, pair.secondPort]
          : [pair.secondPort, pair.firstPort]
      return leftPort.facing_direction === "right" &&
        rightPort.facing_direction === "left"
        ? [{ leftPort, rightPort }]
        : []
    })
    if (horizontalPairs.length < 2) return

    const { ALIGNMENT_EPSILON } = ComponentPinAlignmentSolver
    const currentlyAlignedPinCount = horizontalPairs.filter(
      ({ leftPort, rightPort }) =>
        Math.abs(leftPort.center.y - rightPort.center.y) <= ALIGNMENT_EPSILON,
    ).length
    const candidateGroups: Array<{
      deltaSchY: number
      pairs: typeof horizontalPairs
    }> = []

    for (const pair of horizontalPairs) {
      const deltaSchY = pair.leftPort.center.y - pair.rightPort.center.y
      if (Math.abs(deltaSchY) <= ALIGNMENT_EPSILON) continue
      const group = candidateGroups.find(
        (candidate) =>
          Math.abs(candidate.deltaSchY - deltaSchY) <= ALIGNMENT_EPSILON,
      )
      if (group) group.pairs.push(pair)
      else candidateGroups.push({ deltaSchY, pairs: [pair] })
    }

    const bestCandidate = candidateGroups.sort(
      (a, b) =>
        b.pairs.length - a.pairs.length ||
        Math.abs(a.deltaSchY) - Math.abs(b.deltaSchY),
    )[0]
    if (
      !bestCandidate ||
      bestCandidate.pairs.length < 2 ||
      bestCandidate.pairs.length <= currentlyAlignedPinCount
    ) {
      return
    }

    const targetName =
      rightPlacement.sourceComponentName ??
      rightPlacement.schematicComponentId ??
      "component"
    const deltaSchY = bestCandidate.deltaSchY
    const newSchY = rightPlacement.schY + deltaSchY

    return {
      lineItemType: "ComponentPinsWouldAlignWithVerticalShift",
      firstComponent: leftPlacement,
      secondComponent: rightPlacement,
      targetComponent: rightPlacement,
      deltaSchY,
      newSchY,
      currentlyAlignedPinCount,
      alignedPinCount: bestCandidate.pairs.length,
      alignedPinPairs: bestCandidate.pairs.map(({ leftPort, rightPort }) => ({
        firstPin: this.getPinLabel(leftPort),
        secondPin: this.getPinLabel(rightPort),
      })),
      message: `shift ${targetName} vertically by ${fmtDelta(deltaSchY)} to align ${bestCandidate.pairs.length} connected pin pairs`,
    }
  }

  private getPinLabel(port: SchematicPort): string | undefined {
    return port.display_pin_label ?? port.pin_number?.toString()
  }

  static issueToString(
    issue: ComponentPinsWouldAlignWithVerticalShift,
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
    addAttr(
      attrs,
      "targetComponentName",
      issue.targetComponent.sourceComponentName,
    )
    addAttr(attrs, "deltaSchY", issue.deltaSchY)
    addAttr(attrs, "newSchY", issue.newSchY)
    addAttr(attrs, "currentlyAlignedPinCount", issue.currentlyAlignedPinCount)
    addAttr(attrs, "alignedPinCount", issue.alignedPinCount)
    addAttr(attrs, "message", issue.message)
    return `<ComponentPinsWouldAlignWithVerticalShift ${attrs.join(" ")} />`
  }
}
