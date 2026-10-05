import {
  getSchematicBoxLabelRects,
  schematicLabelRectsOverlap,
  type LabelRect,
} from "../../utils/schematic-box-labels"
import { getSchematicBoxComponentIds } from "../../utils/schematic-box-components"
import { BaseSolver } from "@tscircuit/solver-utils"
import type { CircuitJson, SchematicPort, SourcePort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxInnerLabelCollision,
  SchematicPlacementIssue,
  SchematicSide,
} from "../../types"
import { addAttr } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

interface CollisionSummary {
  overlappingSides: SchematicSide[]
}

export class SchematicBoxInnerLabelCollisionSolver extends BaseSolver {
  private readonly MESSAGE =
    "Inner labels are colliding. Increase the schWidth or schHeight."
  private readonly PIN_NAME_CHARACTER_WIDTH = 0.095
  private readonly FALLBACK_CHARACTER_WIDTH = 0.13

  private entries: Array<[string, SchematicPort[]]>
  private readonly placementById: Map<string, SchematicBoxPlacement>
  private readonly sourcePortById: Map<string, SourcePort>
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const { circuitJson, componentPlacements } = params.ctx
    this.placementById =
      this.getPlacementBySchematicComponentId(componentPlacements)
    this.sourcePortById = this.getSourcePortById(circuitJson)
    const boxIds = getSchematicBoxComponentIds(circuitJson)
    this.entries = Array.from(
      this.getPortsBySchematicComponentId(circuitJson),
    ).filter(([id]) => boxIds.has(id))
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

    const labelRects = getSchematicBoxLabelRects(schematicBox, ports, (port) =>
      this.estimateLabelLength(
        port.display_pin_label!,
        this.sourcePortById.get(port.source_port_id),
      ),
    )
    if (labelRects.length === 0) return

    const collisionSummary = this.getCollisionSummary(labelRects)
    if (collisionSummary.overlappingSides.length === 0) return

    this.params.issues.push({
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox,
      overlappingSides: collisionSummary.overlappingSides,
      message: this.MESSAGE,
    })
  }

  static issueToString(issue: SchematicBoxInnerLabelCollision): string {
    const attrs: string[] = []
    addAttr(attrs, "message", issue.message)
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "currentSchWidth", issue.schematicBox.width)
    addAttr(attrs, "currentSchHeight", issue.schematicBox.height)
    addAttr(attrs, "overlappingSides", issue.overlappingSides.join(","))
    return `<SchematicBoxInnerLabelCollision ${attrs.join(" ")} />`
  }

  private isSchematicPort(el: CircuitJson[number]): el is SchematicPort {
    return el.type === "schematic_port"
  }

  private isSourcePort(el: CircuitJson[number]): el is SourcePort {
    return el.type === "source_port"
  }

  private isSchematicSide(
    side: SchematicPort["side_of_component"],
  ): side is SchematicSide {
    return (
      side === "left" || side === "right" || side === "top" || side === "bottom"
    )
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

  private estimateLabelLength(
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

  private getSourcePortById(circuitJson: CircuitJson): Map<string, SourcePort> {
    return new Map(
      circuitJson
        .filter((el) => this.isSourcePort(el))
        .map((sp) => [sp.source_port_id, sp]),
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

  private getCollisionSummary(rects: LabelRect[]): CollisionSummary {
    const overlappingSides = new Set<SchematicSide>()

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!
        const b = rects[j]!
        if (a.side === b.side) continue

        if (!schematicLabelRectsOverlap(a, b)) continue

        overlappingSides.add(a.side)
        overlappingSides.add(b.side)
      }
    }

    return {
      overlappingSides: this.sortSides(Array.from(overlappingSides)),
    }
  }

  private sortSides(sides: SchematicSide[]): SchematicSide[] {
    const order: Record<SchematicSide, number> = {
      left: 0,
      right: 1,
      top: 2,
      bottom: 3,
    }
    return sides.sort((a, b) => order[a] - order[b])
  }
}
