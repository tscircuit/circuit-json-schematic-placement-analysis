import { cju } from "@tscircuit/circuit-json-util"
import type {
  CircuitJson,
  SchematicComponent,
  SchematicPort,
  SourcePort,
} from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import type {
  SchematicPinPaddingToEdgeTooLarge,
  SchematicPlacementIssue,
  SchematicSide,
} from "../utils/types"
import type { AnalyzerContext } from "./AnalyzerContext"
import { BaseAnalyzer } from "./BaseAnalyzer"
import {
  highlightPlacement,
  highlightPoint,
  mergeGraphicsObjects,
  visualizeCircuitJson,
} from "../utils/graphics"

export interface PinEdgePadding {
  schematicBox: PinPaddingToEdgeAnalyzerIssuePlacement
  pinSide: SchematicSide
  edgeSide: SchematicSide
  pinName?: string
  measuredPadding: number
  maxAllowedPadding: number
}

export interface PinPaddingToEdgeAnalyzerIssuePlacement {
  schX: number
  schY: number
  width: number
  height: number
  sourceComponentName?: string
  schematicComponentId?: string
}

type PinEdgePaddingCandidate = PinEdgePadding & {
  portCenter: {
    x: number
    y: number
  }
}

interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

type MaxLabelLengthBySide = Record<SchematicSide, number>

export class PinPaddingToEdgeAnalyzer extends BaseAnalyzer {
  private readonly schematicComponentById: Map<
    string,
    Extract<
      AnalyzerContext["circuitJson"][number],
      { type: "schematic_component" }
    >
  >
  private readonly portsBySchematicComponentId: Map<string, SchematicPort[]>
  private readonly sourcePortById: Map<string, SourcePort>
  private readonly pinEdgePaddings: PinEdgePaddingCandidate[]
  private currentPaddingIndex = 0
  override isComplete: boolean
  private readonly message =
    "Move schematic pins closer to the box edge or change the schematic box"
  private readonly pinNameCharacterWidth = 0.095
  private readonly fallbackCharacterWidth = 0.13

  constructor(
    protected readonly ctx: AnalyzerContext,
    private readonly out: SchematicPlacementIssue[],
  ) {
    super()
    this.schematicComponentById = this.buildSchematicComponentById(
      ctx.circuitJson,
    )
    this.portsBySchematicComponentId = this.buildPortsBySchematicComponentId(
      ctx.circuitJson,
    )
    this.sourcePortById = this.buildSourcePortById(ctx.circuitJson)
    this.pinEdgePaddings = this.getPinEdgePaddings()
    this.isComplete = this.pinEdgePaddings.length === 0
  }

  private getPinEdgePaddings(): PinEdgePaddingCandidate[] {
    const pinEdgePaddings: PinEdgePaddingCandidate[] = []

    for (const placement of this.getPlacements()) {
      if (!placement.schematicComponentId) continue

      const schematicComponent = this.schematicComponentById.get(
        placement.schematicComponentId,
      )
      if (!schematicComponent) continue

      const pinSpacing =
        typeof schematicComponent.pin_spacing === "number"
          ? schematicComponent.pin_spacing
          : null
      if (pinSpacing === null) continue

      const ports = this.portsBySchematicComponentId.get(
        placement.schematicComponentId,
      )
      if (!ports) continue

      const maxLabelLengthBySide = this.getMaxLabelLengthBySide(
        ports,
        this.sourcePortById,
      )

      const portsBySide = new Map<SchematicSide, SchematicPort[]>()
      for (const port of ports) {
        if (!this.isSchematicSide(port.side_of_component)) continue
        const sidePorts = portsBySide.get(port.side_of_component) ?? []
        sidePorts.push(port)
        portsBySide.set(port.side_of_component, sidePorts)
      }

      const useLabelAwareMaxPadding = this.hasPinsOnAllSides(portsBySide)

      for (const [pinSide, sidePorts] of portsBySide) {
        for (const edgeSide of this.getBoxEdgeSidesForPinSide(pinSide)) {
          const outerPin = this.getOuterPinBySide(edgeSide, sidePorts)
          if (!outerPin) continue

          const measuredPadding = this.getPinPaddingToEdge({
            schematicBox: placement,
            port: outerPin,
            edgeSide,
          })
          const maxAllowedPadding = useLabelAwareMaxPadding
            ? this.getMaxAllowedPinPadding({
                spacing: pinSpacing,
                edgeSide,
                maxLabelLengthBySide,
              })
            : pinSpacing

          pinEdgePaddings.push({
            schematicBox: placement,
            pinSide,
            edgeSide,
            pinName: this.getPinName(outerPin, this.sourcePortById),
            measuredPadding,
            maxAllowedPadding,
            portCenter: {
              x: outerPin.center.x,
              y: outerPin.center.y,
            },
          })
        }
      }
    }

    return pinEdgePaddings
  }

  protected override _step(): void {
    const currentPlacement = this.pinEdgePaddings[this.currentPaddingIndex]
    if (!currentPlacement) {
      this.isComplete = true
      return
    }
    this.currentPaddingIndex += 1
    this.isComplete = this.currentPaddingIndex >= this.pinEdgePaddings.length

    const issue = this.getIssueForPinEdgePadding(currentPlacement)
    if (issue) this.out.push(issue)
  }

  override visualize(): GraphicsObject {
    const focusedPadding = this.getFocusedPadding()

    return mergeGraphicsObjects([
      visualizeCircuitJson(this.ctx.circuitJson),
      focusedPadding
        ? highlightPlacement(
            focusedPadding.schematicBox,
            "hsl(200, 100%, 45%, 0.95)",
            "pinPaddingToEdge",
          )
        : undefined,
      focusedPadding
        ? highlightPoint({
            x: focusedPadding.portCenter.x,
            y: focusedPadding.portCenter.y,
            color: "hsl(200, 100%, 45%, 0.95)",
            label: focusedPadding.pinName,
            radius: 0.24,
          })
        : undefined,
    ])
  }

  private getFocusedPadding(): PinEdgePaddingCandidate | undefined {
    if (this.pinEdgePaddings.length === 0) return undefined
    const index =
      this.iterations === 0
        ? this.currentPaddingIndex
        : Math.max(0, this.currentPaddingIndex - 1)
    return this.pinEdgePaddings[index]
  }

  private getPlacements(): PinPaddingToEdgeAnalyzerIssuePlacement[] {
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

  private getMaxLabelLengthBySide(
    ports: SchematicPort[],
    sourcePortById: Map<string, SourcePort>,
  ): MaxLabelLengthBySide {
    const lengths: MaxLabelLengthBySide = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }

    for (const port of ports) {
      if (!this.isSchematicSide(port.side_of_component)) continue
      if (!port.display_pin_label) continue
      lengths[port.side_of_component] = Math.max(
        lengths[port.side_of_component],
        this.estimateLabelWidth(
          port.display_pin_label,
          sourcePortById.get(port.source_port_id),
        ),
      )
    }

    return lengths
  }

  private hasPinsOnAllSides(
    portsBySide: Map<SchematicSide, SchematicPort[]>,
  ): boolean {
    return (
      portsBySide.has("left") &&
      portsBySide.has("right") &&
      portsBySide.has("top") &&
      portsBySide.has("bottom")
    )
  }

  private getMaxAllowedPinPadding(input: {
    spacing: number
    edgeSide: SchematicSide
    maxLabelLengthBySide: MaxLabelLengthBySide
  }): number {
    const { spacing, edgeSide, maxLabelLengthBySide } = input
    const [sideA, sideB]: [SchematicSide, SchematicSide] =
      this.isHorizontalSide(edgeSide) ? ["left", "right"] : ["top", "bottom"]

    return (
      (maxLabelLengthBySide[sideA] + maxLabelLengthBySide[sideB] + spacing) / 2
    )
  }

  private createIssue(input: {
    schematicBox: PinPaddingToEdgeAnalyzerIssuePlacement
    pinSide: SchematicSide
    edgeSide: SchematicSide
    pinName: string | undefined
    measuredPadding: number
    maxAllowedPadding: number
  }): SchematicPinPaddingToEdgeTooLarge {
    const {
      schematicBox,
      pinSide,
      edgeSide,
      pinName,
      measuredPadding,
      maxAllowedPadding,
    } = input
    const suffix = this.isHorizontalSide(pinSide) ? "height" : "width"
    return {
      lineItemType: "SchematicPinPaddingToEdgeTooLarge",
      pinSide,
      edgeSide,
      pinName,
      schematicBox: this.createIssuePlacement(schematicBox),
      measuredPadding,
      maxAllowedPadding,
      message: `${this.message} ${suffix}`,
    }
  }

  private getIssueForPinEdgePadding(
    pinEdgePadding: PinEdgePadding,
  ): SchematicPinPaddingToEdgeTooLarge | undefined {
    if (
      !this.exceedsMaxAllowedGap(
        pinEdgePadding.measuredPadding,
        pinEdgePadding.maxAllowedPadding,
      )
    ) {
      return
    }

    return this.createIssue({
      schematicBox: pinEdgePadding.schematicBox,
      pinSide: pinEdgePadding.pinSide,
      edgeSide: pinEdgePadding.edgeSide,
      pinName: pinEdgePadding.pinName,
      measuredPadding: pinEdgePadding.measuredPadding,
      maxAllowedPadding: pinEdgePadding.maxAllowedPadding,
    })
  }

  private isHorizontalSide(side: SchematicSide): boolean {
    return side === "left" || side === "right"
  }

  private isSchematicSide(
    side: SchematicPort["side_of_component"],
  ): side is SchematicSide {
    return (
      side === "left" || side === "right" || side === "top" || side === "bottom"
    )
  }

  private getBoxEdgeSidesForPinSide(
    pinSide: SchematicSide,
  ): [SchematicSide, SchematicSide] {
    return this.isHorizontalSide(pinSide)
      ? ["top", "bottom"]
      : ["left", "right"]
  }

  private getOuterPinBySide(
    edgeSide: SchematicSide,
    ports: SchematicPort[],
  ): SchematicPort | null {
    if (ports.length === 0) return null

    switch (edgeSide) {
      case "top":
        return ports.reduce((a, b) => (b.center.y > a.center.y ? b : a))
      case "bottom":
        return ports.reduce((a, b) => (b.center.y < a.center.y ? b : a))
      case "left":
        return ports.reduce((a, b) => (b.center.x < a.center.x ? b : a))
      case "right":
        return ports.reduce((a, b) => (b.center.x > a.center.x ? b : a))
    }
  }

  private getPinPaddingToEdge(input: {
    schematicBox: PinPaddingToEdgeAnalyzerIssuePlacement
    port: SchematicPort
    edgeSide: SchematicSide
  }): number {
    const { schematicBox, port, edgeSide } = input
    const bounds: RectBounds = {
      left: schematicBox.schX - schematicBox.width / 2,
      right: schematicBox.schX + schematicBox.width / 2,
      top: schematicBox.schY + schematicBox.height / 2,
      bottom: schematicBox.schY - schematicBox.height / 2,
    }

    switch (edgeSide) {
      case "top":
        return Math.max(0, bounds.top - port.center.y)
      case "bottom":
        return Math.max(0, port.center.y - bounds.bottom)
      case "left":
        return Math.max(0, port.center.x - bounds.left)
      case "right":
        return Math.max(0, bounds.right - port.center.x)
    }
  }

  private getPinName(
    port: SchematicPort,
    sourcePortById: Map<string, SourcePort>,
  ): string | undefined {
    const sourcePort = sourcePortById.get(port.source_port_id)
    if (sourcePort?.name) return sourcePort.name
    if (port.display_pin_label) return port.display_pin_label
    if (sourcePort?.pin_number !== undefined)
      return String(sourcePort.pin_number)
    return undefined
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

  private buildSchematicComponentById(
    circuitJson: AnalyzerContext["circuitJson"],
  ): Map<
    string,
    Extract<
      AnalyzerContext["circuitJson"][number],
      { type: "schematic_component" }
    >
  > {
    return new Map(
      circuitJson
        .filter(
          (
            el,
          ): el is Extract<
            AnalyzerContext["circuitJson"][number],
            { type: "schematic_component" }
          > => el.type === "schematic_component",
        )
        .map((sc) => [sc.schematic_component_id, sc]),
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

  private isPlacementSchematicBox(
    el: CircuitJson[number],
  ): el is Extract<CircuitJson[number], { type: "schematic_box" }> {
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
    schematicBox?: Extract<CircuitJson[number], { type: "schematic_box" }>
  }): PinPaddingToEdgeAnalyzerIssuePlacement {
    const { schematicComponent, circuitJson, schematicBox } = input
    return {
      schX: schematicComponent.center.x,
      schY: schematicComponent.center.y,
      width: schematicBox?.width ?? schematicComponent.size.width,
      height: schematicBox?.height ?? schematicComponent.size.height,
      sourceComponentName: this.getPlacementSourceComponentName(
        circuitJson,
        schematicComponent.source_component_id,
      ),
      schematicComponentId: schematicComponent.schematic_component_id,
    }
  }

  private schematicBoxToPlacement(
    schematicBox: Extract<CircuitJson[number], { type: "schematic_box" }>,
    circuitJson: CircuitJson,
  ): PinPaddingToEdgeAnalyzerIssuePlacement {
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
      schematicComponentId: schematicBox.schematic_component_id,
    }
  }

  private createIssuePlacement(
    placement: PinPaddingToEdgeAnalyzerIssuePlacement,
  ) {
    return {
      positionAnchor: "center" as const,
      schX: placement.schX,
      schY: placement.schY,
      width: placement.width,
      height: placement.height,
      sourceComponentName: placement.sourceComponentName,
      schematicComponentId: placement.schematicComponentId,
    }
  }

  static override toString(issue: SchematicPinPaddingToEdgeTooLarge): string {
    const attrs: string[] = []
    PinPaddingToEdgeAnalyzer.addAttr({
      attrs,
      key: "message",
      value: issue.message,
      options: { escape: false },
    })
    PinPaddingToEdgeAnalyzer.addAttr({
      attrs,
      key: "componentName",
      value: issue.schematicBox.sourceComponentName,
    })
    PinPaddingToEdgeAnalyzer.addAttr({
      attrs,
      key: "pinSide",
      value: issue.pinSide,
    })
    PinPaddingToEdgeAnalyzer.addAttr({
      attrs,
      key: "edgeSide",
      value: issue.edgeSide,
    })
    PinPaddingToEdgeAnalyzer.addAttr({
      attrs,
      key: "pinName",
      value: issue.pinName,
    })
    PinPaddingToEdgeAnalyzer.addAttr({
      attrs,
      key: "measuredPadding",
      value: issue.measuredPadding,
    })
    PinPaddingToEdgeAnalyzer.addAttr({
      attrs,
      key: "maxAllowedPadding",
      value: issue.maxAllowedPadding,
    })
    return `<SchematicPinPaddingToEdgeTooLarge ${attrs.join(" ")} />`
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
        ? PinPaddingToEdgeAnalyzer.fmtNumber(value)
        : options?.escape === false
          ? value
          : PinPaddingToEdgeAnalyzer.escapeAttr(value)
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
