import { cju } from "@tscircuit/circuit-json-util"
import type {
  CircuitJson,
  SchematicBox,
  SchematicComponent,
  SchematicPort,
  SourcePort,
} from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import type {
  GenericSchematicBoxTooWide,
  PinHeaderSchematicBoxTooWide,
  SchematicBoxTooWideIssue,
  SchematicPlacementIssue,
} from "../utils/types"
import type { AnalyzerContext } from "./AnalyzerContext"
import { BaseAnalyzer } from "./BaseAnalyzer"
import {
  highlightPlacement,
  mergeGraphicsObjects,
  visualizeCircuitJson,
} from "../utils/graphics"

export interface WidthCheckedSchematicBox {
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

type HorizontalSide = "left" | "right"

interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

interface LabelColumn {
  side: HorizontalSide
  labelCount: number
  maxLabelWidth: number
}

export class SchematicBoxTooWideAnalyzer extends BaseAnalyzer {
  private readonly portsBySchematicComponentId: Map<string, SchematicPort[]>
  private readonly sourcePortById: Map<string, SourcePort>
  private readonly sourceComponentById: Map<string, SourceComponentWithFtype>
  private readonly widthCheckedSchematicBoxes: WidthCheckedSchematicBox[]
  private currentSchematicBoxIndex = 0
  override isComplete: boolean
  private readonly schematicBoxTooWideMessage = "Shrink schematic box width"
  private readonly pinHeaderMaxAllowedGap = 0.1
  private readonly genericMaxAllowedGap = 1
  private readonly pinLabelEdgePadding = 0.1
  private readonly pinNameCharacterWidth = 0.095
  private readonly fallbackCharacterWidth = 0.13

  constructor(
    protected readonly ctx: AnalyzerContext,
    private readonly out: SchematicPlacementIssue[],
  ) {
    super()
    this.portsBySchematicComponentId = this.buildPortsBySchematicComponentId(
      ctx.circuitJson,
    )
    this.sourcePortById = this.buildSourcePortById(ctx.circuitJson)
    this.sourceComponentById = this.buildSourceComponentById(ctx.circuitJson)
    this.widthCheckedSchematicBoxes = this.getWidthCheckedSchematicBoxes()
    this.isComplete = this.widthCheckedSchematicBoxes.length === 0
  }

  private getWidthCheckedSchematicBoxes(): WidthCheckedSchematicBox[] {
    const circuitJson = this.ctx.circuitJson
    const schematicBoxes = circuitJson.filter((el) =>
      this.isPlacementSchematicBox(el),
    )
    const schematicComponentIds = new Set(
      circuitJson
        .filter((el) => this.isPlacementSchematicComponent(el))
        .map((sc) => sc.schematic_component_id),
    )

    return [
      ...circuitJson
        .filter((el) => this.isPlacementSchematicComponent(el))
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

  protected override _step(): void {
    const currentPlacement =
      this.widthCheckedSchematicBoxes[this.currentSchematicBoxIndex]
    if (!currentPlacement) {
      this.isComplete = true
      return
    }
    this.currentSchematicBoxIndex += 1
    this.isComplete =
      this.currentSchematicBoxIndex >= this.widthCheckedSchematicBoxes.length

    const issue = this.getIssueForSchematicBox(currentPlacement)
    if (issue) this.out.push(issue)
  }

  override visualize(): GraphicsObject {
    const focusedSchematicBox = this.getFocusedSchematicBox()

    return mergeGraphicsObjects([
      visualizeCircuitJson(this.ctx.circuitJson),
      focusedSchematicBox
        ? highlightPlacement(
            focusedSchematicBox,
            "hsl(120, 100%, 35%, 0.95)",
            "schematicBoxTooWide",
          )
        : undefined,
    ])
  }

  private getFocusedSchematicBox(): WidthCheckedSchematicBox | undefined {
    if (this.widthCheckedSchematicBoxes.length === 0) return undefined
    const index =
      this.iterations === 0
        ? this.currentSchematicBoxIndex
        : Math.max(0, this.currentSchematicBoxIndex - 1)
    return this.widthCheckedSchematicBoxes[index]
  }

  private getLabelColumn(input: {
    side: HorizontalSide
    ports: SchematicPort[]
    sourcePortById: Map<string, SourcePort>
  }): LabelColumn | null {
    const { side, ports, sourcePortById } = input
    const labelWidths = ports
      .filter((port) => port.side_of_component === side)
      .flatMap((port) =>
        port.display_pin_label
          ? [
              this.estimateLabelWidth(
                port.display_pin_label,
                sourcePortById.get(port.source_port_id),
              ),
            ]
          : [],
      )

    if (labelWidths.length === 0) return null

    return {
      side,
      labelCount: labelWidths.length,
      maxLabelWidth: Math.max(...labelWidths),
    }
  }

  private getInnerLabelEdge(bounds: RectBounds, col: LabelColumn): number {
    return col.side === "left"
      ? bounds.left + this.pinLabelEdgePadding + col.maxLabelWidth
      : bounds.right - this.pinLabelEdgePadding - col.maxLabelWidth
  }

  private createPinHeaderIssue(
    schematicBox: WidthCheckedSchematicBox,
    measured: number,
  ): PinHeaderSchematicBoxTooWide {
    const maxAllowed = this.pinHeaderMaxAllowedGap
    return {
      lineItemType: "PinHeaderSchematicBoxTooWide",
      schematicBox: this.createIssuePlacement(schematicBox),
      measuredInnerLabelHorizontalEmptySpace: measured,
      maxAllowedInnerLabelHorizontalEmptySpace: maxAllowed,
      suggestedSchWidth: schematicBox.width - measured + maxAllowed,
      message: this.schematicBoxTooWideMessage,
    }
  }

  private createGenericIssue(
    schematicBox: WidthCheckedSchematicBox,
    measured: number,
  ): GenericSchematicBoxTooWide {
    const maxAllowed = this.genericMaxAllowedGap
    return {
      lineItemType: "GenericSchematicBoxTooWide",
      schematicBox: this.createIssuePlacement(schematicBox),
      measuredInnerLabelHorizontalEmptySpace: measured,
      maxAllowedInnerLabelHorizontalEmptySpace: maxAllowed,
      suggestedSchWidth: schematicBox.width - measured + maxAllowed,
      message: this.schematicBoxTooWideMessage,
    }
  }

  private getIssueForSchematicBox(
    schematicBox: WidthCheckedSchematicBox,
  ): SchematicBoxTooWideIssue | undefined {
    if (!schematicBox.schematicComponentId) return

    const allPorts = this.portsBySchematicComponentId.get(
      schematicBox.schematicComponentId,
    )
    if (!allPorts) return

    const ports = allPorts.filter((p) =>
      this.isHorizontalSide(p.side_of_component),
    )
    if (ports.length === 0) return

    const bounds = this.getCenteredRectBounds(schematicBox)
    const leftCol = this.getLabelColumn({
      side: "left",
      ports,
      sourcePortById: this.sourcePortById,
    })
    const rightCol = this.getLabelColumn({
      side: "right",
      ports,
      sourcePortById: this.sourcePortById,
    })
    const ftype = schematicBox.sourceComponentId
      ? this.sourceComponentById.get(schematicBox.sourceComponentId)?.ftype
      : undefined

    let measured: number | null = null

    if (leftCol && rightCol) {
      measured =
        this.getInnerLabelEdge(bounds, rightCol) -
        this.getInnerLabelEdge(bounds, leftCol)
    } else if (leftCol && leftCol.labelCount >= 4) {
      measured = bounds.right - this.getInnerLabelEdge(bounds, leftCol)
    } else if (rightCol && rightCol.labelCount >= 4) {
      measured = this.getInnerLabelEdge(bounds, rightCol) - bounds.left
    }

    if (measured === null) return

    if (ftype === "simple_pin_header") {
      if (!this.exceedsMaxAllowedGap(measured, this.pinHeaderMaxAllowedGap)) {
        return
      }
      return this.createPinHeaderIssue(schematicBox, measured)
    }

    if (!this.exceedsMaxAllowedGap(measured, this.genericMaxAllowedGap)) return
    return this.createGenericIssue(schematicBox, measured)
  }

  private isHorizontalSide(
    side: SchematicPort["side_of_component"],
  ): side is HorizontalSide {
    return side === "left" || side === "right"
  }

  private getCenteredRectBounds(box: WidthCheckedSchematicBox): RectBounds {
    return {
      left: box.schX - box.width / 2,
      right: box.schX + box.width / 2,
      top: box.schY + box.height / 2,
      bottom: box.schY - box.height / 2,
    }
  }

  private isPinNameLabel(
    label: string,
    sourcePort: SourcePort | undefined,
  ): boolean {
    if (!sourcePort) return false
    return (
      label === sourcePort.name ||
      label === String(sourcePort.pin_number) ||
      (sourcePort.port_hints ?? []).includes(label)
    )
  }

  private estimateLabelWidth(
    label: string,
    sourcePort: SourcePort | undefined,
  ): number {
    const characterWidth = this.isPinNameLabel(label, sourcePort)
      ? this.pinNameCharacterWidth
      : this.fallbackCharacterWidth
    return Array.from(label).length * characterWidth
  }

  private exceedsMaxAllowedGap(measured: number, maxAllowed: number): boolean {
    return measured - maxAllowed > 1e-9
  }

  private buildSourcePortById(
    circuitJson: AnalyzerContext["circuitJson"],
  ): Map<string, SourcePort> {
    return new Map(
      circuitJson
        .filter((el): el is SourcePort => el.type === "source_port")
        .map((sp) => [sp.source_port_id, sp]),
    )
  }

  private buildSourceComponentById(
    circuitJson: AnalyzerContext["circuitJson"],
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

  private buildPortsBySchematicComponentId(
    circuitJson: AnalyzerContext["circuitJson"],
  ): Map<string, SchematicPort[]> {
    const map = new Map<string, SchematicPort[]>()
    for (const el of circuitJson) {
      if (el.type !== "schematic_port") continue
      if (!el.schematic_component_id) continue
      const side = el.side_of_component
      if (
        side !== "left" &&
        side !== "right" &&
        side !== "top" &&
        side !== "bottom"
      )
        continue
      const ports = map.get(el.schematic_component_id)
      if (ports) {
        ports.push(el)
      } else {
        map.set(el.schematic_component_id, [el])
      }
    }
    return map
  }

  private isPlacementSchematicBox(el: CircuitJson[number]): el is SchematicBox {
    return el.type === "schematic_box"
  }

  private isPlacementSchematicComponent(
    el: CircuitJson[number],
  ): el is SchematicComponent {
    return el.type === "schematic_component"
  }

  private getPlacementSourceComponentName(
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
  }): WidthCheckedSchematicBox {
    const { schematicComponent, circuitJson, schematicBox } = input
    return {
      schX: schematicComponent.center.x,
      schY: schematicComponent.center.y,
      width: schematicBox?.width ?? schematicComponent.size.width,
      height: schematicBox?.height ?? schematicComponent.size.height,
      sourceComponentId: schematicComponent.source_component_id,
      sourceComponentName: this.getPlacementSourceComponentName(
        circuitJson,
        schematicComponent.source_component_id,
      ),
      schematicComponentId: schematicComponent.schematic_component_id,
    }
  }

  private schematicBoxToPlacement(
    schematicBox: SchematicBox,
    circuitJson: CircuitJson,
  ): WidthCheckedSchematicBox {
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

  private createIssuePlacement(placement: WidthCheckedSchematicBox) {
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

  static override toString(issue: SchematicBoxTooWideIssue): string {
    const attrs: string[] = []
    SchematicBoxTooWideAnalyzer.addAttr({
      attrs,
      key: "message",
      value: issue.message,
      options: { escape: false },
    })
    SchematicBoxTooWideAnalyzer.addAttr({
      attrs,
      key: "componentName",
      value: issue.schematicBox.sourceComponentName,
    })
    SchematicBoxTooWideAnalyzer.addAttr({
      attrs,
      key: "currentSchWidth",
      value: issue.schematicBox.width,
    })
    SchematicBoxTooWideAnalyzer.addAttr({
      attrs,
      key: "measuredInnerLabelHorizontalEmptySpace",
      value: issue.measuredInnerLabelHorizontalEmptySpace,
    })
    SchematicBoxTooWideAnalyzer.addAttr({
      attrs,
      key: "maxAllowedInnerLabelHorizontalEmptySpace",
      value: issue.maxAllowedInnerLabelHorizontalEmptySpace,
    })
    SchematicBoxTooWideAnalyzer.addAttr({
      attrs,
      key: "suggestedSchWidth",
      value: issue.suggestedSchWidth,
    })
    return `<${issue.lineItemType} ${attrs.join(" ")} />`
  }

  private static addAttr(input: {
    attrs: string[]
    key: string
    value: string | number | undefined
    options?: { escape?: boolean }
  }): void {
    const { attrs, key, value, options } = input
    if (value === undefined) return
    const stringValue =
      typeof value === "number"
        ? SchematicBoxTooWideAnalyzer.fmtNumber(value)
        : options?.escape === false
          ? value
          : SchematicBoxTooWideAnalyzer.escapeAttr(value)
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
