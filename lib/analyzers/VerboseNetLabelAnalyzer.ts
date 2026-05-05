import type { SchematicNetLabel, SourcePort } from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import type {
  SchematicPlacementIssue,
  VerboseSchematicNetLabel,
} from "../utils/types"
import type { AnalyzerContext } from "./AnalyzerContext"
import { BaseAnalyzer } from "./BaseAnalyzer"
import {
  highlightPoint,
  mergeGraphicsObjects,
  visualizeCircuitJson,
} from "../utils/graphics"

export const VERBOSE_NET_LABEL_MESSAGE = "Create trace with schDisplayLabel"
export interface NetLabel {
  schematicNetLabelId?: string
  sourceNetId?: string
  text: string
  schX: number
  schY: number
  involvedPins: string[]
}

interface SourceComponentWithName {
  type: "source_component"
  source_component_id: string
  name: string
}

export class VerboseNetLabelAnalyzer extends BaseAnalyzer {
  private readonly tokenToInvolvedPin: Map<string, string>
  private readonly seenTexts = new Set<string>()
  private readonly netLabelsToCheck: NetLabel[]
  private currentNetLabelIndex = 0
  override isComplete: boolean

  constructor(
    protected readonly ctx: AnalyzerContext,
    private readonly out: SchematicPlacementIssue[],
  ) {
    super()
    this.tokenToInvolvedPin = this.buildTokenToInvolvedPinMap(this.ctx)
    this.netLabelsToCheck = this.getNetLabelsToCheck()
    this.isComplete = this.netLabelsToCheck.length === 0
  }

  private getNetLabelsToCheck(): NetLabel[] {
    return this.ctx.circuitJson
      .filter(
        (element): element is SchematicNetLabel =>
          element.type === "schematic_net_label",
      )
      .map((netLabel) => ({
        schematicNetLabelId: netLabel.schematic_net_label_id,
        sourceNetId: netLabel.source_net_id,
        text: netLabel.text,
        involvedPins: this.getInvolvedPins(netLabel.text),
        schX: netLabel.center.x,
        schY: netLabel.center.y,
      }))
  }

  protected override _step(): void {
    const currentPlacement = this.netLabelsToCheck[this.currentNetLabelIndex]
    if (!currentPlacement) {
      this.isComplete = true
      return
    }
    this.currentNetLabelIndex += 1
    this.isComplete = this.currentNetLabelIndex >= this.netLabelsToCheck.length

    const issue = this.getIssueForNetLabel(currentPlacement, this.seenTexts)
    if (issue) {
      this.seenTexts.add(currentPlacement.text)
      this.out.push(issue)
    }
  }

  override visualize(): GraphicsObject {
    const focusedNetLabel = this.getFocusedNetLabel()

    return mergeGraphicsObjects([
      visualizeCircuitJson(this.ctx.circuitJson),
      focusedNetLabel
        ? highlightPoint({
            x: focusedNetLabel.schX,
            y: focusedNetLabel.schY,
            color: "hsl(285, 100%, 45%, 0.95)",
            label: focusedNetLabel.text,
            radius: 0.28,
          })
        : undefined,
    ])
  }

  private getFocusedNetLabel(): NetLabel | undefined {
    if (this.netLabelsToCheck.length === 0) return undefined
    const index =
      this.iterations === 0
        ? this.currentNetLabelIndex
        : Math.max(0, this.currentNetLabelIndex - 1)
    return this.netLabelsToCheck[index]
  }

  private buildTokenToInvolvedPinMap(
    ctx: AnalyzerContext,
  ): Map<string, string> {
    const sourceComponentById = new Map(
      ctx.circuitJson
        .flatMap((el) => {
          const sc = this.getSourceComponentWithName(
            el as { type: string; [key: string]: unknown },
          )
          return sc ? [sc] : []
        })
        .map((sc) => [sc.source_component_id, sc]),
    )

    const tokenToInvolvedPin = new Map<string, string>()

    for (const element of ctx.circuitJson) {
      if (element.type !== "source_port") continue
      const sourcePort = element as SourcePort
      if (!sourcePort.source_component_id) continue

      const sc = sourceComponentById.get(sourcePort.source_component_id)
      if (!sc?.name) continue

      const involvedPin = `${sc.name}.${this.getBestSourcePortName(sourcePort)}`
      for (const name of this.getSourcePortNameCandidates(sourcePort)) {
        tokenToInvolvedPin.set(`${sc.name}_${name}`, involvedPin)
      }
    }

    return tokenToInvolvedPin
  }

  private getInvolvedPins(text: string): string[] {
    const pins = new Set<string>()
    for (const token of text.split("/")) {
      const pin = this.tokenToInvolvedPin.get(token)
      if (pin) pins.add(pin)
    }
    return Array.from(pins)
  }

  private getSourceComponentWithName(element: {
    type: string
    [key: string]: unknown
  }): SourceComponentWithName | null {
    if (
      element.type !== "source_component" ||
      typeof element.source_component_id !== "string" ||
      typeof element.name !== "string"
    ) {
      return null
    }
    return {
      type: "source_component",
      source_component_id: element.source_component_id,
      name: element.name,
    }
  }

  private getSourcePortNameCandidates(sourcePort: SourcePort): string[] {
    return [
      sourcePort.most_frequently_referenced_by_name,
      sourcePort.name,
      ...(sourcePort.port_hints ?? []),
      sourcePort.pin_number === undefined
        ? undefined
        : String(sourcePort.pin_number),
    ].filter((name): name is string => Boolean(name))
  }

  private getBestSourcePortName(sourcePort: SourcePort): string {
    return (
      sourcePort.most_frequently_referenced_by_name ??
      sourcePort.name ??
      (sourcePort.pin_number === undefined ? "" : `pin${sourcePort.pin_number}`)
    )
  }

  private getIssueForNetLabel(
    netLabel: NetLabel,
    seenTexts: Set<string>,
  ): VerboseSchematicNetLabel | undefined {
    if (!netLabel.text.includes("/")) return
    if (seenTexts.has(netLabel.text)) return
    if (netLabel.involvedPins.length === 0) return

    return {
      lineItemType: "VerboseSchematicNetLabel",
      schematicNetLabelId: netLabel.schematicNetLabelId,
      sourceNetId: netLabel.sourceNetId,
      text: netLabel.text,
      involvedPins: netLabel.involvedPins,
      schX: netLabel.schX,
      schY: netLabel.schY,
      message: VERBOSE_NET_LABEL_MESSAGE,
    }
  }

  static override toString(issue: VerboseSchematicNetLabel): string {
    const attrs: string[] = []
    VerboseNetLabelAnalyzer.addAttr({
      attrs,
      key: "message",
      value: issue.message,
      options: { escape: false },
    })
    VerboseNetLabelAnalyzer.addAttr({ attrs, key: "text", value: issue.text })
    VerboseNetLabelAnalyzer.addAttr({
      attrs,
      key: "involvedPins",
      value: issue.involvedPins.join(","),
    })
    VerboseNetLabelAnalyzer.addAttr({ attrs, key: "schX", value: issue.schX })
    VerboseNetLabelAnalyzer.addAttr({ attrs, key: "schY", value: issue.schY })
    return `<VerboseSchematicNetLabel ${attrs.join(" ")} />`
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
        ? VerboseNetLabelAnalyzer.fmtNumber(value)
        : options?.escape === false
          ? value
          : VerboseNetLabelAnalyzer.escapeAttr(value)
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
