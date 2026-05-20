import { BaseSolver } from "@tscircuit/solver-utils"
import type { CircuitJson, SchematicNetLabel } from "circuit-json"
import type {
  SchematicPlacementIssue,
  NetLabelOrientationUnreadable,
} from "../../types"
import type { SolverContext } from "../SolverContext"
import { addAttr } from "../../utils/format"

interface NetLabel {
  schematicNetLabelId: string
  text: string
  centerX: number
  centerY: number
  anchorX?: number
  anchorY?: number
  anchorSide: "top" | "bottom" | "left" | "right"
  angleDeg: number
}

export class NetLabelOrientationSolver extends BaseSolver {
  private readonly netLabels: NetLabel[]
  private currentIndex = 0
  private readonly out: SchematicPlacementIssue[]

  constructor({
    ctx,
    issues: out,
  }: {
    ctx: SolverContext
    issues: SchematicPlacementIssue[]
  }) {
    super()
    this.out = out
    this.netLabels = this.computeNetLabels(ctx.circuitJson)
    this.solved = this.netLabels.length === 0
  }

  override _step(): void {
    const label = this.netLabels[this.currentIndex++]
    if (!label) {
      this.solved = true
      return
    }
    this.solved = this.currentIndex >= this.netLabels.length

    if (this.isUpsideDown(label.angleDeg)) {
      this.out.push({
        lineItemType: "NetLabelOrientationUnreadable",
        schematicNetLabelId: label.schematicNetLabelId,
        text: label.text,
        anchorSide: label.anchorSide,
        currentAngleDeg: label.angleDeg,
        normalizedAngleDeg: this.normalizeAngle(label.angleDeg),
      })
    }
  }

  static issueToString(issue: NetLabelOrientationUnreadable): string {
    const attrs: string[] = []
    addAttr(attrs, "text", issue.text)
    addAttr(attrs, "anchorSide", issue.anchorSide)
    addAttr(attrs, "currentAngleDeg", issue.currentAngleDeg)
    addAttr(attrs, "normalizedAngleDeg", issue.normalizedAngleDeg)
    return `<NetLabelOrientationUnreadable ${attrs.join(" ")} />`
  }

  private isSchematicNetLabel(
    el: CircuitJson[number],
  ): el is SchematicNetLabel {
    return el.type === "schematic_net_label"
  }

  private computeAngleDeg(
    center: { x: number; y: number },
    anchor: { x: number; y: number },
  ): number {
    return (
      Math.atan2(anchor.y - center.y, anchor.x - center.x) * (180 / Math.PI)
    )
  }

  private isUpsideDown(angleDeg: number): boolean {
    return angleDeg < -90 || angleDeg > 90
  }

  private normalizeAngle(angleDeg: number): number {
    const shifted = (angleDeg + 90) % 180
    const positive = shifted < 0 ? shifted + 180 : shifted
    return positive - 90
  }

  private computeNetLabels(circuitJson: CircuitJson): NetLabel[] {
    const labels: NetLabel[] = []

    for (const el of circuitJson) {
      if (!this.isSchematicNetLabel(el)) continue
      if (!el.anchor_position) continue

      const angleDeg = this.computeAngleDeg(el.center, el.anchor_position)

      labels.push({
        schematicNetLabelId: el.schematic_net_label_id,
        text: el.text,
        centerX: el.center.x,
        centerY: el.center.y,
        anchorX: el.anchor_position.x,
        anchorY: el.anchor_position.y,
        anchorSide: el.anchor_side,
        angleDeg,
      })
    }

    return labels
  }
}
