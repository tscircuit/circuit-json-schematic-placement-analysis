import { BaseSolver } from "@tscircuit/solver-utils"
import type { CircuitJson, SchematicNetLabel, SourcePort } from "circuit-json"
import type {
  SchematicPlacementIssue,
  VerboseSchematicNetLabel,
} from "../../types"
import type { SolverContext } from "../SolverContext"
import { addAttr } from "../../utils/format"
import { getSchematicSheetNameByIdMap } from "../../utils/schematic-sheets"

interface SourceComponentWithName {
  source_component_id: string
  name: string
}

export class VerboseNetLabelSolver extends BaseSolver {
  readonly VERBOSE_NET_LABEL_MESSAGE = "Create trace with schDisplayLabel"

  private readonly netLabels: SchematicNetLabel[]
  private readonly tokenToInvolvedPin: Map<string, string>
  private readonly schematicSheetNameById: Map<string, string>
  private currentIndex = 0
  private readonly seen = new Set<string>()

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const { circuitJson } = params.ctx
    this.netLabels = circuitJson.filter((el) => this.isSchematicNetLabel(el))
    this.tokenToInvolvedPin = this.buildTokenToInvolvedPinMap(circuitJson)
    this.schematicSheetNameById = getSchematicSheetNameByIdMap(circuitJson)
    this.solved = this.netLabels.length === 0
  }

  override _step(): void {
    const label = this.netLabels[this.currentIndex++]
    if (!label) {
      this.solved = true
      return
    }

    this.solved = this.currentIndex >= this.netLabels.length

    const seenKey = `${label.schematic_sheet_id ?? ""}:${label.text}`
    if (!label.text.includes("/") || this.seen.has(seenKey)) return
    this.seen.add(seenKey)

    const issue: VerboseSchematicNetLabel = {
      lineItemType: "VerboseSchematicNetLabel",
      schematicNetLabelId: label.schematic_net_label_id,
      sourceNetId: label.source_net_id,
      schematicSheetId: label.schematic_sheet_id,
      schematicSheetName: label.schematic_sheet_id
        ? this.schematicSheetNameById.get(label.schematic_sheet_id)
        : undefined,
      text: label.text,
      involvedPins: this.getInvolvedPins(label.text, this.tokenToInvolvedPin),
      schX: label.center.x,
      schY: label.center.y,
      message: this.VERBOSE_NET_LABEL_MESSAGE,
    }
    this.params.issues.push(issue)
  }

  static issueToString(issue: VerboseSchematicNetLabel): string {
    const attrs: string[] = []
    addAttr(attrs, "message", issue.message, { escape: false })
    addAttr(attrs, "text", issue.text)
    addAttr(attrs, "involvedPins", issue.involvedPins.join(","))
    addAttr(attrs, "schSheetName", issue.schematicSheetName)
    addAttr(attrs, "schX", issue.schX)
    addAttr(attrs, "schY", issue.schY)
    return `<VerboseSchematicNetLabel ${attrs.join(" ")} />`
  }

  private isSchematicNetLabel(
    el: CircuitJson[number],
  ): el is SchematicNetLabel {
    return el.type === "schematic_net_label"
  }

  private isSourcePort(el: CircuitJson[number]): el is SourcePort {
    return el.type === "source_port"
  }

  private getSourceComponentWithName(
    el: CircuitJson[number],
  ): SourceComponentWithName | null {
    if (
      el.type !== "source_component" ||
      !("source_component_id" in el) ||
      !("name" in el) ||
      typeof el.source_component_id !== "string" ||
      typeof el.name !== "string"
    )
      return null
    return { source_component_id: el.source_component_id, name: el.name }
  }

  private getSourcePortNameCandidates(port: SourcePort): string[] {
    return [
      port.most_frequently_referenced_by_name,
      port.name,
      ...(port.port_hints ?? []),
      port.pin_number === undefined ? undefined : String(port.pin_number),
    ].filter((n): n is string => Boolean(n))
  }

  private getBestSourcePortName(port: SourcePort): string {
    return (
      port.most_frequently_referenced_by_name ??
      port.name ??
      (port.pin_number === undefined ? "" : `pin${port.pin_number}`)
    )
  }

  private buildTokenToInvolvedPinMap(
    circuitJson: CircuitJson,
  ): Map<string, string> {
    const sourceComponentById = new Map(
      circuitJson
        .flatMap((el) => {
          const sc = this.getSourceComponentWithName(el)
          return sc ? [sc] : []
        })
        .map((sc) => [sc.source_component_id, sc]),
    )
    const map = new Map<string, string>()

    for (const port of circuitJson.filter((el) => this.isSourcePort(el))) {
      if (!port.source_component_id) continue
      const sc = sourceComponentById.get(port.source_component_id)
      if (!sc?.name) continue
      const involvedPin = `${sc.name}.${this.getBestSourcePortName(port)}`
      for (const name of this.getSourcePortNameCandidates(port)) {
        map.set(`${sc.name}_${name}`, involvedPin)
      }
    }

    return map
  }

  private getInvolvedPins(
    text: string,
    tokenToInvolvedPin: Map<string, string>,
  ): string[] {
    const pins = new Set<string>()
    for (const token of text.split("/")) {
      const pin = tokenToInvolvedPin.get(token)
      if (pin) pins.add(pin)
    }
    return Array.from(pins)
  }
}
