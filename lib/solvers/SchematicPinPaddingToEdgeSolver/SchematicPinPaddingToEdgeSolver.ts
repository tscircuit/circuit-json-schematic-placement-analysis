import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  CircuitJson,
  SchematicComponent,
  SchematicPort,
  SourcePort,
} from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPinPaddingToEdgeTooLarge,
  SchematicPlacementIssue,
  SchematicSide,
} from "../../types"
import type { SolverContext } from "../SolverContext"
import { addAttr } from "../../utils/format"

type HorizontalSide = "left" | "right"
type VerticalSide = "top" | "bottom"

interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

interface PinPaddingCandidate {
  schematicBox: SchematicBoxPlacement
  pinSide: SchematicSide
  edgeSide: SchematicSide
  pinName?: string
  measuredPadding: number
  maxAllowedPadding: number
}

type MaxLabelLengthBySide = Record<SchematicSide, number>

export class SchematicPinPaddingToEdgeSolver extends BaseSolver {
  private readonly MESSAGE =
    "Move schematic pins closer to the box edge or change the schematic box"
  private readonly PIN_NAME_CHARACTER_WIDTH = 0.095
  private readonly FALLBACK_CHARACTER_WIDTH = 0.13
  private readonly GAP_COMPARISON_EPSILON = 1e-9

  private readonly entries: Array<[string, SchematicPort[]]>
  private readonly placementById: Map<string, SchematicBoxPlacement>
  private readonly schematicComponentById: Map<string, SchematicComponent>
  private readonly sourcePortById: Map<string, SourcePort>
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
    this.schematicComponentById = this.getSchematicComponentById(circuitJson)
    this.sourcePortById = this.getSourcePortById(circuitJson)
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

    const pinSpacing = this.getPinSpacing(
      schematicBox,
      this.schematicComponentById,
    )
    if (pinSpacing === null) return

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

        const measuredPadding = this.getPinPaddingToEdge(
          schematicBox,
          outerPin,
          edgeSide,
        )
        const maxAllowedPadding = useLabelAwareMaxPadding
          ? this.getMaxAllowedPinPadding(
              pinSpacing,
              edgeSide,
              maxLabelLengthBySide,
            )
          : pinSpacing

        if (!this.exceedsMaxAllowedGap(measuredPadding, maxAllowedPadding))
          continue

        this.params.out.push(
          this.createIssue({
            schematicBox,
            pinSide,
            edgeSide,
            pinName: this.getPinName(outerPin, this.sourcePortById),
            measuredPadding,
            maxAllowedPadding,
          }),
        )
      }
    }
  }

  static issueToString(issue: SchematicPinPaddingToEdgeTooLarge): string {
    const attrs: string[] = []
    addAttr(attrs, "message", issue.message, { escape: false })
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "pinSide", issue.pinSide)
    addAttr(attrs, "edgeSide", issue.edgeSide)
    addAttr(attrs, "pinName", issue.pinName)
    addAttr(attrs, "measuredPadding", issue.measuredPadding)
    addAttr(attrs, "maxAllowedPadding", issue.maxAllowedPadding)
    addAttr(attrs, "excessPadding", issue.excessPadding)
    addAttr(attrs, "suggestedSchWidth", issue.suggestedSchWidth)
    addAttr(attrs, "suggestedSchHeight", issue.suggestedSchHeight)
    return `<SchematicPinPaddingToEdgeTooLarge ${attrs.join(" ")} />`
  }

  private isSchematicPort(el: CircuitJson[number]): el is SchematicPort {
    return el.type === "schematic_port"
  }

  private isSourcePort(el: CircuitJson[number]): el is SourcePort {
    return el.type === "source_port"
  }

  private isSchematicComponent(
    el: CircuitJson[number],
  ): el is SchematicComponent {
    return el.type === "schematic_component"
  }

  private isHorizontalSide(
    side: SchematicPort["side_of_component"],
  ): side is HorizontalSide {
    return side === "left" || side === "right"
  }

  private isVerticalSide(
    side: SchematicPort["side_of_component"],
  ): side is VerticalSide {
    return side === "top" || side === "bottom"
  }

  private isSchematicSide(
    side: SchematicPort["side_of_component"],
  ): side is SchematicSide {
    return this.isHorizontalSide(side) || this.isVerticalSide(side)
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

  private getSchematicComponentById(
    circuitJson: CircuitJson,
  ): Map<string, SchematicComponent> {
    return new Map(
      circuitJson
        .filter((el) => this.isSchematicComponent(el))
        .map((sc) => [sc.schematic_component_id, sc]),
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
      if (!this.isSchematicSide(port.side_of_component)) continue
      const ports = map.get(port.schematic_component_id)
      if (ports) ports.push(port)
      else map.set(port.schematic_component_id, [port])
    }
    return map
  }

  private getPinSpacing(
    schematicBox: SchematicBoxPlacement,
    schematicComponentById: Map<string, SchematicComponent>,
  ): number | null {
    if (!schematicBox.schematicComponentId) return null
    const sc = schematicComponentById.get(schematicBox.schematicComponentId)
    return typeof sc?.pin_spacing === "number" ? sc.pin_spacing : null
  }

  private getPinName(
    port: SchematicPort,
    sourcePortById: Map<string, SourcePort>,
  ): string | undefined {
    const sp = sourcePortById.get(port.source_port_id)
    if (sp?.name) return sp.name
    if (port.display_pin_label) return port.display_pin_label
    if (sp?.pin_number !== undefined) return String(sp.pin_number)
    return undefined
  }

  private getMaxLabelLengthBySide(
    ports: SchematicPort[],
    sourcePortById: Map<string, SourcePort>,
  ): MaxLabelLengthBySide {
    const result: MaxLabelLengthBySide = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }
    for (const port of ports) {
      if (!this.isSchematicSide(port.side_of_component)) continue
      if (!port.display_pin_label) continue
      result[port.side_of_component] = Math.max(
        result[port.side_of_component],
        this.estimateLabelWidth(
          port.display_pin_label,
          sourcePortById.get(port.source_port_id),
        ),
      )
    }
    return result
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

  private getPinPaddingToEdge(
    schematicBox: SchematicBoxPlacement,
    port: SchematicPort,
    edgeSide: SchematicSide,
  ): number {
    const bounds = this.getCenteredRectBounds(schematicBox)
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

  private getBoxEdgeSidesForPinSide(
    pinSide: SchematicSide,
  ): [SchematicSide, SchematicSide] {
    return this.isHorizontalSide(pinSide)
      ? ["top", "bottom"]
      : ["left", "right"]
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

  private getMaxAllowedPinPadding(
    spacing: number,
    edgeSide: SchematicSide,
    maxLabelLengthBySide: MaxLabelLengthBySide,
  ): number {
    const sides: [SchematicSide, SchematicSide] = this.isHorizontalSide(
      edgeSide,
    )
      ? ["left", "right"]
      : ["top", "bottom"]
    return (
      (maxLabelLengthBySide[sides[0]] +
        maxLabelLengthBySide[sides[1]] +
        spacing) /
      2
    )
  }

  private createIssue(
    candidate: PinPaddingCandidate,
  ): SchematicPinPaddingToEdgeTooLarge {
    const excessPadding = Math.max(
      0,
      candidate.measuredPadding - candidate.maxAllowedPadding,
    )
    const reduction = excessPadding * 2
    return {
      lineItemType: "SchematicPinPaddingToEdgeTooLarge",
      pinSide: candidate.pinSide,
      edgeSide: candidate.edgeSide,
      pinName: candidate.pinName,
      schematicBox: candidate.schematicBox,
      measuredPadding: candidate.measuredPadding,
      maxAllowedPadding: candidate.maxAllowedPadding,
      excessPadding,
      suggestedSchWidth: this.isHorizontalSide(candidate.pinSide)
        ? undefined
        : Math.max(0, candidate.schematicBox.width - reduction),
      suggestedSchHeight: this.isHorizontalSide(candidate.pinSide)
        ? Math.max(0, candidate.schematicBox.height - reduction)
        : undefined,
      message: this.isHorizontalSide(candidate.pinSide)
        ? `${this.MESSAGE} height`
        : `${this.MESSAGE} width`,
    }
  }
}
