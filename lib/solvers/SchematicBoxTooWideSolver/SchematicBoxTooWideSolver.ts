import { BaseSolver } from "@tscircuit/solver-utils"
import type { CircuitJson, SchematicPort, SourcePort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxTooWideIssue,
  SchematicPlacementIssue,
} from "../../types"
import type { SolverContext } from "../SolverContext"
import { addAttr } from "../../utils/format"

type HorizontalSide = "left" | "right"

interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

interface SourceComponentWithFtype {
  type: "source_component"
  source_component_id: string
  ftype?: string
}

interface LabelColumn {
  side: HorizontalSide
  labelCount: number
  maxLabelWidth: number
}

export class SchematicBoxTooWideSolver extends BaseSolver {
  private readonly SCHEMATIC_BOX_TOO_WIDE_MESSAGE = "Shrink schematic box width"
  private readonly PIN_HEADER_MAX_ALLOWED_GAP = 0.1
  private readonly GENERIC_MAX_ALLOWED_GAP = 1
  private readonly PIN_LABEL_EDGE_PADDING = 0.1
  private readonly PIN_NAME_CHARACTER_WIDTH = 0.095
  private readonly FALLBACK_CHARACTER_WIDTH = 0.13
  private readonly GAP_COMPARISON_EPSILON = 1e-9

  private readonly entries: Array<[string, SchematicPort[]]>
  private readonly placementById: Map<string, SchematicBoxPlacement>
  private readonly sourcePortById: Map<string, SourcePort>
  private readonly sourceComponentById: Map<string, SourceComponentWithFtype>
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      out: SchematicPlacementIssue[]
    },
  ) {
    super()
    const { circuitJson, componentPlacements } = params.ctx
    this.placementById =
      this.getPlacementBySchematicComponentId(componentPlacements)
    this.sourcePortById = this.getSourcePortById(circuitJson)
    this.sourceComponentById = this.getSourceComponentById(circuitJson)
    this.entries = Array.from(this.getPortsBySchematicComponentId(circuitJson))
    this.solved = this.entries.length === 0
  }

  override _step(): void {
    const entry = this.entries[this.currentIndex++]
    if (!entry) {
      this.solved = true
      return
    }
    this.solved = this.currentIndex >= this.entries.length

    const [schematicComponentId, ports] = entry
    const schematicBox = this.placementById.get(schematicComponentId)
    if (!schematicBox) return

    const bounds = this.getCenteredRectBounds(schematicBox)
    const leftCol = this.getLabelColumn("left", ports, this.sourcePortById)
    const rightCol = this.getLabelColumn("right", ports, this.sourcePortById)
    const ftype = this.getSourceComponentFtype(
      schematicBox,
      this.sourceComponentById,
    )

    let measuredSpace: number | undefined
    if (leftCol && rightCol) {
      measuredSpace =
        this.getInnerLabelEdge(bounds, rightCol) -
        this.getInnerLabelEdge(bounds, leftCol)
    } else if (leftCol && leftCol.labelCount >= 4) {
      measuredSpace = bounds.right - this.getInnerLabelEdge(bounds, leftCol)
    } else if (rightCol && rightCol.labelCount >= 4) {
      measuredSpace = this.getInnerLabelEdge(bounds, rightCol) - bounds.left
    }
    if (measuredSpace === undefined) return

    const maxAllowed =
      ftype === "simple_pin_header"
        ? this.PIN_HEADER_MAX_ALLOWED_GAP
        : this.GENERIC_MAX_ALLOWED_GAP

    if (!this.exceedsMaxAllowedGap(measuredSpace, maxAllowed)) return

    const suggestedSchWidth = this.getSuggestedWidth({
      measuredInnerLabelHorizontalEmptySpace: measuredSpace,
      maxAllowedInnerLabelHorizontalEmptySpace: maxAllowed,
      currentWidth: schematicBox.width,
    })

    if (ftype === "simple_pin_header") {
      this.params.out.push({
        lineItemType: "PinHeaderSchematicBoxTooWide",
        schematicBox,
        measuredInnerLabelHorizontalEmptySpace: measuredSpace,
        maxAllowedInnerLabelHorizontalEmptySpace: maxAllowed,
        suggestedSchWidth,
        message: this.SCHEMATIC_BOX_TOO_WIDE_MESSAGE,
      })
    } else {
      this.params.out.push({
        lineItemType: "GenericSchematicBoxTooWide",
        schematicBox,
        measuredInnerLabelHorizontalEmptySpace: measuredSpace,
        maxAllowedInnerLabelHorizontalEmptySpace: maxAllowed,
        suggestedSchWidth,
        message: this.SCHEMATIC_BOX_TOO_WIDE_MESSAGE,
      })
    }
  }

  static issueToString(issue: SchematicBoxTooWideIssue): string {
    const attrs: string[] = []
    addAttr(attrs, "message", issue.message, { escape: false })
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "currentSchWidth", issue.schematicBox.width)
    addAttr(
      attrs,
      "measuredInnerLabelHorizontalEmptySpace",
      issue.measuredInnerLabelHorizontalEmptySpace,
    )
    addAttr(
      attrs,
      "maxAllowedInnerLabelHorizontalEmptySpace",
      issue.maxAllowedInnerLabelHorizontalEmptySpace,
    )
    addAttr(attrs, "suggestedSchWidth", issue.suggestedSchWidth)
    return `<${issue.lineItemType} ${attrs.join(" ")} />`
  }

  private isSchematicPort(el: CircuitJson[number]): el is SchematicPort {
    return el.type === "schematic_port"
  }

  private isSourcePort(el: CircuitJson[number]): el is SourcePort {
    return el.type === "source_port"
  }

  private isHorizontalSide(
    side: SchematicPort["side_of_component"],
  ): side is HorizontalSide {
    return side === "left" || side === "right"
  }

  private getSourceComponentWithFtype(
    el: CircuitJson[number],
  ): SourceComponentWithFtype | null {
    if (
      el.type !== "source_component" ||
      !("source_component_id" in el) ||
      typeof el.source_component_id !== "string"
    )
      return null
    return {
      type: "source_component",
      source_component_id: el.source_component_id,
      ftype:
        "ftype" in el && typeof el.ftype === "string" ? el.ftype : undefined,
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
    return (
      Array.from(label).length *
      (this.isPinNameLabel(label, sourcePort)
        ? this.PIN_NAME_CHARACTER_WIDTH
        : this.FALLBACK_CHARACTER_WIDTH)
    )
  }

  private exceedsMaxAllowedGap(measured: number, maxAllowed: number): boolean {
    return measured - maxAllowed > this.GAP_COMPARISON_EPSILON
  }

  private getCenteredRectBounds(box: SchematicBoxPlacement): RectBounds {
    return {
      left: box.schX - box.width / 2,
      right: box.schX + box.width / 2,
      top: box.schY + box.height / 2,
      bottom: box.schY - box.height / 2,
    }
  }

  private getSourcePortById(circuitJson: CircuitJson): Map<string, SourcePort> {
    return new Map(
      circuitJson
        .filter((el) => this.isSourcePort(el))
        .map((sp) => [sp.source_port_id, sp]),
    )
  }

  private getSourceComponentById(
    circuitJson: CircuitJson,
  ): Map<string, SourceComponentWithFtype> {
    return new Map(
      circuitJson
        .flatMap((el) => {
          const sc = this.getSourceComponentWithFtype(el)
          return sc ? [sc] : []
        })
        .map((sc) => [sc.source_component_id, sc]),
    )
  }

  private getPlacementBySchematicComponentId(
    componentPlacements: SchematicBoxPlacement[],
  ): Map<string, SchematicBoxPlacement> {
    return new Map(
      componentPlacements
        .filter((p) => p.schematicComponentId)
        .map((p) => [p.schematicComponentId!, p]),
    )
  }

  private getPortsBySchematicComponentId(
    circuitJson: CircuitJson,
  ): Map<string, SchematicPort[]> {
    const map = new Map<string, SchematicPort[]>()
    for (const port of circuitJson.filter((el) => this.isSchematicPort(el))) {
      if (!port.schematic_component_id) continue
      if (!this.isHorizontalSide(port.side_of_component)) continue
      const ports = map.get(port.schematic_component_id)
      if (ports) ports.push(port)
      else map.set(port.schematic_component_id, [port])
    }
    return map
  }

  private getSourceComponentFtype(
    schematicBox: SchematicBoxPlacement,
    sourceComponentById: Map<string, SourceComponentWithFtype>,
  ): string | undefined {
    return schematicBox.sourceComponentId
      ? sourceComponentById.get(schematicBox.sourceComponentId)?.ftype
      : undefined
  }

  private getLabelColumn(
    side: HorizontalSide,
    ports: SchematicPort[],
    sourcePortById: Map<string, SourcePort>,
  ): LabelColumn | null {
    const widths = ports
      .filter((p) => p.side_of_component === side)
      .flatMap((p) =>
        p.display_pin_label
          ? [
              this.estimateLabelWidth(
                p.display_pin_label,
                sourcePortById.get(p.source_port_id),
              ),
            ]
          : [],
      )
    if (widths.length === 0) return null
    return {
      side,
      labelCount: widths.length,
      maxLabelWidth: Math.max(...widths),
    }
  }

  private getInnerLabelEdge(bounds: RectBounds, col: LabelColumn): number {
    return col.side === "left"
      ? bounds.left + this.PIN_LABEL_EDGE_PADDING + col.maxLabelWidth
      : bounds.right - this.PIN_LABEL_EDGE_PADDING - col.maxLabelWidth
  }

  private getSuggestedWidth(input: {
    measuredInnerLabelHorizontalEmptySpace: number
    maxAllowedInnerLabelHorizontalEmptySpace: number
    currentWidth: number
  }): number {
    return (
      input.currentWidth -
      input.measuredInnerLabelHorizontalEmptySpace +
      input.maxAllowedInnerLabelHorizontalEmptySpace
    )
  }
}
