import { cju } from "@tscircuit/circuit-json-util"
import type {
  CircuitJson,
  SchematicBox,
  SchematicComponent,
} from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import type {
  ComponentOverlap,
  OverlapCorrectionSuggestion,
  SchematicPlacementIssue,
} from "../utils/types"
import type { AnalyzerContext } from "./AnalyzerContext"
import { BaseAnalyzer } from "./BaseAnalyzer"
import {
  highlightPlacement,
  mergeGraphicsObjects,
  visualizeCircuitJson,
} from "../utils/graphics"

export interface OverlappingComponentPair {
  firstComponent: ComponentOverlapAnalyzerPlacement
  secondComponent: ComponentOverlapAnalyzerPlacement
}

export interface ComponentOverlapAnalyzerPlacement {
  schX: number
  schY: number
  width: number
  height: number
  sourceComponentName?: string
}

interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export class ComponentOverlapAnalyzer extends BaseAnalyzer {
  private readonly overlappingComponentPairs: OverlappingComponentPair[]
  private currentPairIndex = 0
  override isComplete: boolean

  constructor(
    protected readonly ctx: AnalyzerContext,
    private readonly out: SchematicPlacementIssue[],
  ) {
    super()
    this.overlappingComponentPairs = this.getOverlappingComponentPairs()
    this.isComplete = this.overlappingComponentPairs.length === 0
  }

  private getOverlappingComponentPairs(): OverlappingComponentPair[] {
    const placements = this.getPlacements()
    const overlappingPairs: OverlappingComponentPair[] = []

    for (let i = 0; i < placements.length; i += 1) {
      for (let j = i + 1; j < placements.length; j += 1) {
        const firstComponent = placements[i]
        const secondComponent = placements[j]
        if (!firstComponent || !secondComponent) continue

        overlappingPairs.push({
          firstComponent,
          secondComponent,
        })
      }
    }

    return overlappingPairs
  }

  protected override _step(): void {
    const currentPlacement =
      this.overlappingComponentPairs[this.currentPairIndex]
    if (!currentPlacement) {
      this.isComplete = true
      return
    }
    this.currentPairIndex += 1
    this.isComplete =
      this.currentPairIndex >= this.overlappingComponentPairs.length

    const issue = this.getIssueForPair(currentPlacement)
    if (issue) this.out.push(issue)
  }

  override visualize(): GraphicsObject {
    const focusedPair = this.getFocusedPair()

    return mergeGraphicsObjects([
      visualizeCircuitJson(this.ctx.circuitJson),
      focusedPair
        ? highlightPlacement(
            focusedPair.firstComponent,
            "hsl(0, 100%, 50%, 0.95)",
            "componentOverlap:first",
          )
        : undefined,
      focusedPair
        ? highlightPlacement(
            focusedPair.secondComponent,
            "hsl(36, 100%, 50%, 0.95)",
            "componentOverlap:second",
          )
        : undefined,
    ])
  }

  private getFocusedPair(): OverlappingComponentPair | undefined {
    if (this.overlappingComponentPairs.length === 0) return undefined
    const index =
      this.iterations === 0
        ? this.currentPairIndex
        : Math.max(0, this.currentPairIndex - 1)
    return this.overlappingComponentPairs[index]
  }

  private getPlacements(): ComponentOverlapAnalyzerPlacement[] {
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
    ]
  }

  private getCenteredRectBounds(
    box: ComponentOverlapAnalyzerPlacement,
  ): RectBounds {
    return {
      left: box.schX - box.width / 2,
      right: box.schX + box.width / 2,
      top: box.schY - box.height / 2,
      bottom: box.schY + box.height / 2,
    }
  }

  private getOverlapCorrectionSuggestions(input: {
    firstComponent: ComponentOverlapAnalyzerPlacement
    secondComponent: ComponentOverlapAnalyzerPlacement
    overlapWidth: number
    overlapHeight: number
  }): OverlapCorrectionSuggestion[] {
    const { firstComponent, secondComponent, overlapWidth, overlapHeight } =
      input
    const target =
      firstComponent.width * firstComponent.height <=
      secondComponent.width * secondComponent.height
        ? firstComponent
        : secondComponent
    const other = target === firstComponent ? secondComponent : firstComponent
    const deltaSchX = target.schX <= other.schX ? -overlapWidth : overlapWidth
    const deltaSchY = target.schY <= other.schY ? -overlapHeight : overlapHeight

    return [
      {
        targetComponentName: target.sourceComponentName,
        deltaSchX,
        deltaSchY: 0,
        newSchX: target.schX + deltaSchX,
        newSchY: target.schY,
      },
      {
        targetComponentName: target.sourceComponentName,
        deltaSchX: 0,
        deltaSchY,
        newSchX: target.schX,
        newSchY: target.schY + deltaSchY,
      },
    ]
  }

  private getIssueForPair(
    overlappingPair: OverlappingComponentPair,
  ): ComponentOverlap | undefined {
    const overlap = this.getOverlapMeasurement(
      overlappingPair.firstComponent,
      overlappingPair.secondComponent,
    )
    if (!overlap) return

    return {
      lineItemType: "ComponentOverlap",
      firstComponent: this.createIssuePlacement(overlappingPair.firstComponent),
      secondComponent: this.createIssuePlacement(
        overlappingPair.secondComponent,
      ),
      overlapWidth: overlap.overlapWidth,
      overlapHeight: overlap.overlapHeight,
      correctionSuggestions: this.getOverlapCorrectionSuggestions({
        firstComponent: overlappingPair.firstComponent,
        secondComponent: overlappingPair.secondComponent,
        overlapWidth: overlap.overlapWidth,
        overlapHeight: overlap.overlapHeight,
      }),
    }
  }

  private getOverlapMeasurement(
    a: ComponentOverlapAnalyzerPlacement,
    b: ComponentOverlapAnalyzerPlacement,
  ): { overlapWidth: number; overlapHeight: number } | null {
    const ab = this.getCenteredRectBounds(a)
    const bb = this.getCenteredRectBounds(b)
    const overlapWidth =
      Math.min(ab.right, bb.right) - Math.max(ab.left, bb.left)
    const overlapHeight =
      Math.min(ab.bottom, bb.bottom) - Math.max(ab.top, bb.top)

    if (overlapWidth <= 0 || overlapHeight <= 0) return null

    return {
      overlapWidth,
      overlapHeight,
    }
  }

  private isSchematicBox(el: CircuitJson[number]): el is SchematicBox {
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
    schematicBox?: SchematicBox
  }): ComponentOverlapAnalyzerPlacement {
    const { schematicComponent, circuitJson, schematicBox } = input
    return {
      schX: schematicComponent.center.x,
      schY: schematicComponent.center.y,
      width: schematicBox?.width ?? schematicComponent.size.width,
      height: schematicBox?.height ?? schematicComponent.size.height,
      sourceComponentName: this.getSourceComponentName(
        circuitJson,
        schematicComponent.source_component_id,
      ),
    }
  }

  private schematicBoxToPlacement(
    schematicBox: SchematicBox,
    circuitJson: CircuitJson,
  ): ComponentOverlapAnalyzerPlacement {
    let sourceComponentName: string | undefined

    if (schematicBox.schematic_component_id) {
      const circuitJsonUtil = cju(circuitJson)
      const sc = circuitJsonUtil.schematic_component.get(
        schematicBox.schematic_component_id,
      )
      if (sc?.source_component_id) {
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
      sourceComponentName,
    }
  }

  private createIssuePlacement(placement: ComponentOverlapAnalyzerPlacement) {
    return {
      positionAnchor: "center" as const,
      schX: placement.schX,
      schY: placement.schY,
      width: placement.width,
      height: placement.height,
      sourceComponentName: placement.sourceComponentName,
    }
  }

  static override toString(issue: ComponentOverlap): string {
    const attrs: string[] = []
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "component1Name",
      value: issue.firstComponent.sourceComponentName,
    })
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "component2Name",
      value: issue.secondComponent.sourceComponentName,
    })
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "component1SchX",
      value: issue.firstComponent.schX,
    })
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "component1SchY",
      value: issue.firstComponent.schY,
    })
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "component2SchX",
      value: issue.secondComponent.schX,
    })
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "component2SchY",
      value: issue.secondComponent.schY,
    })
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "overlapWidth",
      value: issue.overlapWidth,
    })
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "overlapHeight",
      value: issue.overlapHeight,
    })
    return [
      `<ComponentOverlap ${attrs.join(" ")}>`,
      ...issue.correctionSuggestions.map(
        ComponentOverlapAnalyzer.correctionSuggestionToString,
      ),
      "</ComponentOverlap>",
    ].join("\n")
  }

  private static correctionSuggestionToString(
    suggestion: OverlapCorrectionSuggestion,
  ): string {
    const attrs: string[] = []
    ComponentOverlapAnalyzer.addAttr({
      attrs,
      key: "target",
      value: suggestion.targetComponentName,
    })
    if (suggestion.deltaSchX !== 0) {
      ComponentOverlapAnalyzer.addAttr({
        attrs,
        key: "newSchX",
        value: suggestion.newSchX,
      })
      ComponentOverlapAnalyzer.addAttr({
        attrs,
        key: "deltaSchX",
        value: suggestion.deltaSchX,
        options: { formatDelta: true },
      })
    }
    if (suggestion.deltaSchY !== 0) {
      ComponentOverlapAnalyzer.addAttr({
        attrs,
        key: "newSchY",
        value: suggestion.newSchY,
      })
      ComponentOverlapAnalyzer.addAttr({
        attrs,
        key: "deltaSchY",
        value: suggestion.deltaSchY,
        options: { formatDelta: true },
      })
    }
    return `<OverlapCorrectionSuggestion ${attrs.join(" ")} />`
  }

  private static addAttr(input: {
    attrs: string[]
    key: string
    value: string | number | undefined
    options?: { formatDelta?: boolean }
  }): void {
    const { attrs, key, value, options } = input
    if (value === undefined) return
    const stringValue =
      typeof value === "number"
        ? options?.formatDelta
          ? ComponentOverlapAnalyzer.fmtDelta(value)
          : ComponentOverlapAnalyzer.fmtNumber(value)
        : ComponentOverlapAnalyzer.escapeAttr(value)
    attrs.push(`${key}="${stringValue}"`)
  }

  private static fmtNumber(value: number): string {
    if (Number.isInteger(value)) return String(value)
    return value
      .toFixed(3)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1")
  }

  private static fmtDelta(value: number): string {
    const formatted = ComponentOverlapAnalyzer.fmtNumber(value)
    return value > 0 ? `+${formatted}` : formatted
  }

  private static escapeAttr(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
  }
}
