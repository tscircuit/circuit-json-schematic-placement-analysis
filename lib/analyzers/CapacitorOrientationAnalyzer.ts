import { cju } from "@tscircuit/circuit-json-util"
import type { CircuitJson, SchematicComponent } from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import type { AnalyzerContext } from "./AnalyzerContext"
import type {
  CapacitorSymbolHorizontal,
  SchematicPlacementIssue,
} from "../utils/types"
import { BaseAnalyzer } from "./BaseAnalyzer"
import {
  highlightPlacement,
  mergeGraphicsObjects,
  visualizeCircuitJson,
} from "../utils/graphics"

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

export class CapacitorOrientationAnalyzer extends BaseAnalyzer {
  private readonly schematicComponentById: Map<string, SchematicComponent>
  private readonly sourceComponentById: Map<string, SourceComponentWithFtype>
  private readonly capacitorPlacements: Capacitor[]
  private currentPlacementIndex = 0
  override isComplete: boolean
  private readonly horizontalSymbolNames = new Set([
    "capacitor_left",
    "capacitor_right",
  ])

  constructor(
    protected readonly ctx: AnalyzerContext,
    private readonly out: SchematicPlacementIssue[],
  ) {
    super()
    this.schematicComponentById = this.buildSchematicComponentById(
      ctx.circuitJson,
    )
    this.sourceComponentById = this.buildSourceComponentById(ctx.circuitJson)
    this.capacitorPlacements = this.getCapacitorPlacements()
    this.isComplete = this.capacitorPlacements.length === 0
  }

  private getCapacitorPlacements(): Capacitor[] {
    const circuitJson = this.ctx.circuitJson
    const schematicBoxes = circuitJson.filter((el) => this.isSchematicBox(el))
    const schematicComponentIds = new Set(
      circuitJson
        .filter((el) => this.isSchematicComponent(el))
        .map((sc) => sc.schematic_component_id),
    )

    return [
      ...circuitJson
        .filter((el) => this.isSchematicComponent(el))
        .map((sc) =>
          this.schematicComponentToPlacement({
            schematicComponent: sc,
            circuitJson,
            schematicBox: schematicBoxes.find(
              (sb) => sb.schematic_component_id === sc.schematic_component_id,
            ),
          }),
        ),
      ...schematicBoxes
        .filter(
          (sb) =>
            !sb.schematic_component_id ||
            !schematicComponentIds.has(sb.schematic_component_id),
        )
        .map((sb) => this.schematicBoxToPlacement(sb, circuitJson)),
    ].filter(
      (placement) =>
        placement.sourceComponentId !== undefined &&
        this.sourceComponentById.get(placement.sourceComponentId)?.ftype ===
          "simple_capacitor",
    )
  }

  protected override _step(): void {
    const currentPlacement =
      this.capacitorPlacements[this.currentPlacementIndex]
    if (!currentPlacement) {
      this.isComplete = true
      return
    }
    this.currentPlacementIndex += 1
    this.isComplete =
      this.currentPlacementIndex >= this.capacitorPlacements.length

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
          ) {
            return []
          }
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

  private isSchematicBox(
    el: CircuitJson[number],
  ): el is Extract<CircuitJson[number], { type: "schematic_box" }> {
    return el.type === "schematic_box"
  }

  private isSchematicComponent(
    el: CircuitJson[number],
  ): el is SchematicComponent {
    return el.type === "schematic_component"
  }

  private getSourceComponentName(
    circuitJson: CircuitJson,
    sourceComponentId: string | undefined,
  ): string | undefined {
    if (!sourceComponentId) return undefined
    return cju(circuitJson).source_component.get(sourceComponentId)?.name
  }

  private schematicComponentToPlacement(input: {
    schematicComponent: SchematicComponent
    circuitJson: CircuitJson
    schematicBox?: Extract<CircuitJson[number], { type: "schematic_box" }>
  }): Capacitor {
    const { schematicComponent, circuitJson, schematicBox } = input
    return {
      schX: schematicComponent.center.x,
      schY: schematicComponent.center.y,
      width: schematicBox?.width ?? schematicComponent.size.width,
      height: schematicBox?.height ?? schematicComponent.size.height,
      sourceComponentId: schematicComponent.source_component_id,
      sourceComponentName: this.getSourceComponentName(
        circuitJson,
        schematicComponent.source_component_id,
      ),
      schematicComponentId: schematicComponent.schematic_component_id,
    }
  }

  private schematicBoxToPlacement(
    schematicBox: Extract<CircuitJson[number], { type: "schematic_box" }>,
    circuitJson: CircuitJson,
  ): Capacitor {
    let sourceComponentId: string | undefined
    let sourceComponentName: string | undefined

    if (schematicBox.schematic_component_id) {
      const circuitJsonUtil = cju(circuitJson)
      const sc = circuitJsonUtil.schematic_component.get(
        schematicBox.schematic_component_id,
      )
      if (sc?.source_component_id) {
        sourceComponentId = sc.source_component_id
        sourceComponentName = circuitJsonUtil.source_component.get(
          sc.source_component_id,
        )?.name
      }
    }

    return {
      schX: schematicBox.x,
      schY: schematicBox.y,
      width: schematicBox.width,
      height: schematicBox.height,
      sourceComponentId,
      sourceComponentName,
      schematicComponentId: schematicBox.schematic_component_id,
    }
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

    if (!this.horizontalSymbolNames.has(schematicComponent.symbol_name ?? "")) {
      return
    }

    return {
      lineItemType: "CapacitorSymbolHorizontal",
      schematicBox: this.createIssuePlacement(placement),
    }
  }

  static override toString(issue: CapacitorSymbolHorizontal): string {
    const attrs: string[] = []
    CapacitorOrientationAnalyzer.addAttr({
      attrs,
      key: "componentName",
      value: issue.schematicBox.sourceComponentName,
    })
    CapacitorOrientationAnalyzer.addAttr({
      attrs,
      key: "schX",
      value: issue.schematicBox.schX,
    })
    CapacitorOrientationAnalyzer.addAttr({
      attrs,
      key: "schY",
      value: issue.schematicBox.schY,
    })
    CapacitorOrientationAnalyzer.addAttr({
      attrs,
      key: "width",
      value: issue.schematicBox.width,
    })
    CapacitorOrientationAnalyzer.addAttr({
      attrs,
      key: "height",
      value: issue.schematicBox.height,
    })
    return `<CapacitorSymbolHorizontal ${attrs.join(" ")} />`
  }

  private static addAttr(input: {
    attrs: string[]
    key: string
    value: string | number | undefined
  }): void {
    const { attrs, key, value } = input
    if (value === undefined) return
    const stringValue =
      typeof value === "number"
        ? CapacitorOrientationAnalyzer.fmtNumber(value)
        : CapacitorOrientationAnalyzer.escapeAttr(value)
    attrs.push(`${key}="${stringValue}"`)
  }

  private static fmtNumber(value: number): string {
    if (Number.isInteger(value)) return String(value)
    return value
      .toFixed(3)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1")
  }

  private static escapeAttr(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
  }
}
