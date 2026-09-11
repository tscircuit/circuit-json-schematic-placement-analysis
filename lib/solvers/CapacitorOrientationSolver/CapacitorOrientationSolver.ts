import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  CircuitJson,
  SchematicComponent,
  SchematicPort,
  SchematicTrace,
} from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import type {
  CapacitorSymbolHorizontal,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import {
  highlightPlacement,
  mergeGraphicsObjects,
  visualizeCircuitJson,
} from "../../utils/graphics"
import type { SolverContext } from "../SolverContext"

export interface Capacitor {
  schX: number
  schY: number
  width: number
  height: number
  sourceComponentId?: string
  sourceComponentName?: string
  schematicComponentId?: string
  schematicSheetId?: string
  schematicSheetName?: string
}

interface SourceComponentWithFtype {
  type: "source_component"
  source_component_id: string
  ftype?: string
}

export class CapacitorOrientationSolver extends BaseSolver {
  private static readonly EPSILON = 0.01
  private static readonly ORIENTATION_MESSAGE =
    'Use schOrientation="vertical" on this capacitor to fix the symbol orientation'

  private readonly ctx: SolverContext
  private readonly out: SchematicPlacementIssue[]
  private readonly schematicComponentById: Map<string, SchematicComponent>
  private readonly sourceComponentById: Map<string, SourceComponentWithFtype>
  private readonly capacitorPlacements: Capacitor[]
  private readonly feedbackCapacitorIds: Set<string>
  private currentPlacementIndex = 0
  private readonly horizontalSymbolNames = new Set([
    "capacitor_left",
    "capacitor_right",
  ])

  private readonly verticalSymbolNames = new Set([
    "capacitor_top",
    "capacitor_bottom",
    "capacitor_up",
    "capacitor_down",
  ])

  constructor({
    ctx,
    issues: out,
  }: {
    ctx: SolverContext
    issues: SchematicPlacementIssue[]
  }) {
    super()
    this.ctx = ctx
    this.out = out
    this.schematicComponentById = this.buildSchematicComponentById(
      ctx.circuitJson,
    )
    this.sourceComponentById = this.buildSourceComponentById(ctx.circuitJson)
    this.capacitorPlacements = this.getCapacitorPlacements()
    const networks = new PlacementNetworkIndex(ctx)
    this.feedbackCapacitorIds = new Set(
      this.capacitorPlacements.flatMap((capacitor) =>
        capacitor.sourceComponentId &&
        networks.isDirectOpAmpFeedback(capacitor.sourceComponentId)
          ? [capacitor.sourceComponentId]
          : [],
      ),
    )
    this.solved = this.capacitorPlacements.length === 0
  }

  private getCapacitorPlacements(): Capacitor[] {
    return this.ctx.componentPlacements
      .filter(
        (p) =>
          p.sourceComponentId !== undefined &&
          this.sourceComponentById.get(p.sourceComponentId)?.ftype ===
            "simple_capacitor",
      )
      .map((p) => ({
        schX: p.schX,
        schY: p.schY,
        width: p.width,
        height: p.height,
        sourceComponentId: p.sourceComponentId,
        sourceComponentName: p.sourceComponentName,
        schematicComponentId: p.schematicComponentId,
        schematicSheetId: p.schematicSheetId,
        schematicSheetName: p.schematicSheetName,
      }))
  }

  override _step(): void {
    const currentPlacement =
      this.capacitorPlacements[this.currentPlacementIndex]
    if (!currentPlacement) {
      this.solved = true
      return
    }
    this.currentPlacementIndex += 1
    this.solved = this.currentPlacementIndex >= this.capacitorPlacements.length

    const issue = this.getIssueForPlacement(currentPlacement)
    if (issue) this.out.push(issue)
  }

  override visualize(): GraphicsObject {
    const focusedPlacement = this.getFocusedPlacement()

    return mergeGraphicsObjects([
      visualizeCircuitJson(this.ctx.circuitJson),
      focusedPlacement
        ? highlightPlacement(
            focusedPlacement,
            "hsl(210, 100%, 50%, 0.95)",
            "capacitorOrientation",
          )
        : undefined,
    ])
  }

  private getFocusedPlacement(): Capacitor | undefined {
    if (this.capacitorPlacements.length === 0) return undefined
    const index =
      this.iterations === 0
        ? this.currentPlacementIndex
        : Math.max(0, this.currentPlacementIndex - 1)
    return this.capacitorPlacements[index]
  }

  private buildSchematicComponentById(
    circuitJson: CircuitJson,
  ): Map<string, SchematicComponent> {
    return new Map(
      circuitJson
        .filter(
          (el): el is SchematicComponent => el.type === "schematic_component",
        )
        .map((sc) => [sc.schematic_component_id, sc]),
    )
  }

  private buildSourceComponentById(
    circuitJson: CircuitJson,
  ): Map<string, SourceComponentWithFtype> {
    return new Map(
      circuitJson
        .flatMap((el) => {
          if (
            el.type !== "source_component" ||
            !("source_component_id" in el) ||
            typeof el.source_component_id !== "string"
          )
            return []
          return [
            {
              type: "source_component" as const,
              source_component_id: el.source_component_id,
              ftype:
                "ftype" in el && typeof el.ftype === "string"
                  ? el.ftype
                  : undefined,
            },
          ]
        })
        .map((sc) => [sc.source_component_id, sc]),
    )
  }

  private createIssuePlacement(placement: Capacitor) {
    return {
      positionAnchor: "center" as const,
      schX: placement.schX,
      schY: placement.schY,
      width: placement.width,
      height: placement.height,
      sourceComponentId: placement.sourceComponentId,
      sourceComponentName: placement.sourceComponentName,
      schematicComponentId: placement.schematicComponentId,
      schematicSheetId: placement.schematicSheetId,
      schematicSheetName: placement.schematicSheetName,
    }
  }

  private getIssueForPlacement(
    placement: Capacitor,
  ): CapacitorSymbolHorizontal | undefined {
    if (!placement.schematicComponentId || !placement.sourceComponentId) return

    const schematicComponent = this.schematicComponentById.get(
      placement.schematicComponentId,
    )
    if (!schematicComponent) return

    // Explicitly vertical symbols → no horizontal-flag needed
    if (this.verticalSymbolNames.has(schematicComponent.symbol_name ?? ""))
      return

    // Orientation fallback — a capacitor whose schematic box is taller than
    // wide is drawn vertically and should not be flagged.
    if (placement.height > placement.width) return

    if (!this.horizontalSymbolNames.has(schematicComponent.symbol_name ?? ""))
      return

    // Horizontal feedback capacitors make the output-to-input return path readable.
    // Their distance from the amplifier is assessed by the feedback placement solver.
    if (this.feedbackCapacitorIds.has(placement.sourceComponentId)) return

    // Keep capacitors inline when both traces leave outward and at least one
    // side continues as a straight horizontal run.
    if (this.isInlineWithHorizontalTraces(placement.schematicComponentId))
      return

    return {
      lineItemType: "CapacitorSymbolHorizontal",
      schematicBox: this.createIssuePlacement(placement),
      message: CapacitorOrientationSolver.ORIENTATION_MESSAGE,
    }
  }

  private isInlineWithHorizontalTraces(schematicComponentId: string): boolean {
    const ports = this.ctx.circuitJson.filter(
      (element): element is SchematicPort =>
        element.type === "schematic_port" &&
        element.schematic_component_id === schematicComponentId,
    )
    if (ports.length !== 2) return false

    const traces = ports.map((port) => this.getOutwardHorizontalTrace(port))
    return (
      traces.every((trace) => trace !== undefined) &&
      traces.some(
        (trace) =>
          trace !== undefined &&
          trace.edges.every(
            (edge) =>
              Math.abs(edge.from.y - edge.to.y) <=
              CapacitorOrientationSolver.EPSILON,
          ),
      )
    )
  }

  private getOutwardHorizontalTrace(
    port: SchematicPort,
  ): SchematicTrace | undefined {
    if (port.facing_direction !== "left" && port.facing_direction !== "right")
      return

    return this.ctx.circuitJson.find(
      (element): element is SchematicTrace =>
        element.type === "schematic_trace" &&
        element.schematic_sheet_id === port.schematic_sheet_id &&
        element.edges.some((edge) => {
          const other = this.pointsEqual(edge.from, port.center)
            ? edge.to
            : this.pointsEqual(edge.to, port.center)
              ? edge.from
              : undefined
          return (
            other !== undefined &&
            Math.abs(other.y - port.center.y) <=
              CapacitorOrientationSolver.EPSILON &&
            (port.facing_direction === "left"
              ? other.x < port.center.x - CapacitorOrientationSolver.EPSILON
              : other.x > port.center.x + CapacitorOrientationSolver.EPSILON)
          )
        }),
    )
  }

  private pointsEqual(
    first: { x: number; y: number },
    second: { x: number; y: number },
  ): boolean {
    return (
      Math.abs(first.x - second.x) <= CapacitorOrientationSolver.EPSILON &&
      Math.abs(first.y - second.y) <= CapacitorOrientationSolver.EPSILON
    )
  }

  static issueToString(issue: CapacitorSymbolHorizontal): string {
    const attrs: string[] = []
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "schX", issue.schematicBox.schX)
    addAttr(attrs, "schY", issue.schematicBox.schY)
    addAttr(attrs, "width", issue.schematicBox.width)
    addAttr(attrs, "height", issue.schematicBox.height)
    addAttr(attrs, "message", issue.message)
    return `<CapacitorSymbolHorizontal ${attrs.join(" ")} />`
  }
}
