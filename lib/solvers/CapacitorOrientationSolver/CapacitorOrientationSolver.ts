import type { CircuitJson, SchematicComponent } from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import type { SolverContext } from "../SolverContext"
import type {
  CapacitorSymbolHorizontal,
  SchematicPlacementIssue,
} from "../../types"
import { BaseSolver } from "@tscircuit/solver-utils"
import {
  highlightPlacement,
  mergeGraphicsObjects,
  visualizeCircuitJson,
} from "../../utils/graphics"
import { addAttr } from "../../utils/format"

export interface Capacitor {
  schX: number
  schY: number
  width: number
  height: number
  sourceComponentId?: string
  sourceComponentName?: string
  schematicComponentId?: string
}

interface SourceComponentWithFtype {
  type: "source_component"
  source_component_id: string
  ftype?: string
}

export class CapacitorOrientationSolver extends BaseSolver {
  private readonly ctx: SolverContext
  private readonly out: SchematicPlacementIssue[]
  private readonly schematicComponentById: Map<string, SchematicComponent>
  private readonly sourceComponentById: Map<string, SourceComponentWithFtype>
  private readonly capacitorPlacements: Capacitor[]
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

    return {
      lineItemType: "CapacitorSymbolHorizontal",
      schematicBox: this.createIssuePlacement(placement),
    }
  }

  static issueToString(issue: CapacitorSymbolHorizontal): string {
    const attrs: string[] = []
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "schX", issue.schematicBox.schX)
    addAttr(attrs, "schY", issue.schematicBox.schY)
    addAttr(attrs, "width", issue.schematicBox.width)
    addAttr(attrs, "height", issue.schematicBox.height)
    return `<CapacitorSymbolHorizontal ${attrs.join(" ")} />`
  }
}
