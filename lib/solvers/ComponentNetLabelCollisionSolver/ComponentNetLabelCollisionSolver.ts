import { getNetLabelBounds } from "../../utils/net-label-bounds"
import { getComponentSymbolGeometry } from "../../utils/component-symbol-geometry"
import { escapeAttr } from "../../utils/format"
import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  CircuitJson,
  SchematicNetLabel,
  SchematicPort,
} from "circuit-json"
import type {
  NetLabelCollision,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import {
  centeredRect,
  type RectBounds,
  rectOverlap,
} from "../../utils/geometry"
import type { SolverContext } from "../SolverContext"

type CollisionSuggestion = {
  componentName: string
  newSchX: number
  newSchY: number
}

interface RawLabelLabelCollision {
  type: "label-label"
  leftComp?: SchematicBoxPlacement
  rightComp?: SchematicBoxPlacement
  leftLabel: SchematicNetLabel
  rightLabel: SchematicNetLabel
  xSeparation?: number
  bounds: RectBounds
}

interface RawBoxLabelCollision {
  type: "box-label"
  boxComp: SchematicBoxPlacement
  labelComp?: SchematicBoxPlacement
  label: SchematicNetLabel
  xSeparation?: number
  bounds: RectBounds
}

type RawCollision = RawLabelLabelCollision | RawBoxLabelCollision

export class ComponentNetLabelCollisionSolver extends BaseSolver {
  private readonly placements: SchematicBoxPlacement[]
  private readonly labels: SchematicNetLabel[]
  private readonly ownerByLabel = new Map<string, SchematicBoxPlacement>()
  private rawCollisions: RawCollision[] = []
  private index = 0
  private readonly symbolGeometry: ReturnType<typeof getComponentSymbolGeometry>

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.placements = params.ctx.componentPlacements
    this.symbolGeometry = getComponentSymbolGeometry(params.ctx.circuitJson)
    const labelsByComponentId = this.buildNetLabelsByComponentId(
      params.ctx.circuitJson,
    )
    for (const placement of this.placements) {
      for (const label of labelsByComponentId.get(
        placement.schematicComponentId ?? "",
      ) ?? []) {
        this.ownerByLabel.set(label.schematic_net_label_id, placement)
      }
    }
    const seen = new Set<string>()
    this.labels = params.ctx.circuitJson.filter(
      (element): element is SchematicNetLabel => {
        if (element.type !== "schematic_net_label" || !element.text)
          return false
        // Identical overprinting does not obscure another label.
        const key = JSON.stringify([
          element.schematic_sheet_id,
          element.text,
          element.symbol_name,
          element.anchor_side,
          element.anchor_position,
          element.center,
        ])
        if (seen.has(key)) return false
        seen.add(key)
        return true
      },
    )
  }

  override _step(): void {
    if (this.index >= this.labels.length) {
      this.buildAndPushIssues()
      this.solved = true
      return
    }
    const label = this.labels[this.index]!
    for (const other of this.labels.slice(this.index + 1)) {
      this.rawCollisions.push(...this.detectLabelLabel(label, other))
    }
    for (const component of this.placements) {
      this.rawCollisions.push(...this.detectBoxLabel(component, label))
    }
    this.index++
  }

  private detectLabelLabel(
    leftLabel: SchematicNetLabel,
    rightLabel: SchematicNetLabel,
  ): RawLabelLabelCollision[] {
    if (leftLabel.schematic_sheet_id !== rightLabel.schematic_sheet_id)
      return []
    let leftComp = this.ownerByLabel.get(leftLabel.schematic_net_label_id)
    let rightComp = this.ownerByLabel.get(rightLabel.schematic_net_label_id)
    if (leftComp && rightComp && leftComp.schX > rightComp.schX) {
      ;[leftComp, rightComp] = [rightComp, leftComp]
      ;[leftLabel, rightLabel] = [rightLabel, leftLabel]
    }
    const leftBounds = getNetLabelBounds(leftLabel)
    const rightBounds = getNetLabelBounds(rightLabel)
    const overlap = rectOverlap(leftBounds, rightBounds)
    if (!overlap || overlap.ow <= 1e-6 || overlap.oh <= 1e-6) return []
    return [
      {
        type: "label-label",
        bounds: {
          left: Math.max(leftBounds.left, rightBounds.left),
          right: Math.min(leftBounds.right, rightBounds.right),
          top: Math.min(leftBounds.top, rightBounds.top),
          bottom: Math.max(leftBounds.bottom, rightBounds.bottom),
        },
        leftComp,
        rightComp,
        leftLabel,
        rightLabel,
        // Moving one component cannot separate its own labels, and labels on
        // wires have no unambiguous component to move.
        xSeparation:
          leftComp && rightComp && leftComp !== rightComp
            ? leftBounds.right - rightBounds.left + 0.1
            : undefined,
      },
    ]
  }

  private detectBoxLabel(
    boxComp: SchematicBoxPlacement,
    label: SchematicNetLabel,
  ): RawBoxLabelCollision[] {
    const boxId = boxComp.schematicComponentId
    const labelComp = this.ownerByLabel.get(label.schematic_net_label_id)
    if (
      !boxId ||
      boxComp === labelComp ||
      boxComp.schematicSheetId !== label.schematic_sheet_id
    )
      return []
    const boxBounds =
      this.symbolGeometry.get(boxId)?.bounds ??
      centeredRect(boxComp.schX, boxComp.schY, boxComp.width, boxComp.height)
    const labelBounds = getNetLabelBounds(label)
    const overlap = rectOverlap(boxBounds, labelBounds)
    if (!overlap || overlap.ow <= 1e-6 || overlap.oh <= 1e-6) return []
    return [
      {
        type: "box-label",
        bounds: {
          left: Math.max(boxBounds.left, labelBounds.left),
          right: Math.min(boxBounds.right, labelBounds.right),
          top: Math.min(boxBounds.top, labelBounds.top),
          bottom: Math.max(boxBounds.bottom, labelBounds.bottom),
        },
        boxComp,
        labelComp,
        label,
        xSeparation: labelComp
          ? boxComp.schX <= labelComp.schX
            ? boxBounds.right - labelBounds.left + 0.1
            : labelBounds.right - boxBounds.left + 0.1
          : undefined,
      },
    ]
  }

  private buildAndPushIssues(): void {
    if (this.rawCollisions.length === 0) return

    const collisionsBySheet = new Map<string, RawCollision[]>()
    for (const collision of this.rawCollisions) {
      const label =
        collision.type === "label-label" ? collision.leftLabel : collision.label
      // Keep label/routing guidance separate from component-move suggestions.
      const sheetKey = JSON.stringify([
        label.schematic_sheet_id,
        collision.xSeparation !== undefined,
      ])
      const sheetCollisions = collisionsBySheet.get(sheetKey)
      if (sheetCollisions) sheetCollisions.push(collision)
      else collisionsBySheet.set(sheetKey, [collision])
    }

    for (const collisions of collisionsBySheet.values()) {
      this.buildAndPushIssueForSheet(collisions)
    }
  }

  private buildAndPushIssueForSheet(collisions: RawCollision[]): void {
    const globalFixes = this.computeGlobalFixes(collisions)

    const seenPairs = new Set<string>()
    const pairs: Array<{ comp1Name: string; comp2Name: string }> = []
    for (const collision of collisions) {
      let comp1Name: string
      let comp2Name: string
      if (collision.type === "label-label") {
        comp1Name =
          collision.leftComp?.sourceComponentName ??
          `label ${collision.leftLabel.text}`
        comp2Name =
          collision.rightComp?.sourceComponentName ??
          `label ${collision.rightLabel.text}`
      } else {
        comp1Name = collision.boxComp.sourceComponentName ?? ""
        comp2Name =
          collision.labelComp?.sourceComponentName ??
          `label ${collision.label.text}`
      }
      const key = `${comp1Name}/${comp2Name}`
      if (!seenPairs.has(key)) {
        seenPairs.add(key)
        pairs.push({ comp1Name, comp2Name })
      }
    }

    const firstCollision = collisions[0]!
    const firstPlacement =
      firstCollision.type === "label-label"
        ? firstCollision.leftComp
        : firstCollision.boxComp
    const firstLabel =
      firstCollision.type === "label-label"
        ? firstCollision.leftLabel
        : firstCollision.label
    this.params.issues.push({
      lineItemType: "NetLabelCollision",
      schematicSheetId: firstLabel.schematic_sheet_id,
      schematicSheetName:
        firstPlacement?.schematicSheetName ??
        this.placements.find(
          (p) => p.schematicSheetId === firstLabel.schematic_sheet_id,
        )?.schematicSheetName,
      pairs,
      collisionBounds: collisions.map((collision) => collision.bounds),
      moves: Array.from(globalFixes.values()),
      message: globalFixes.size
        ? undefined
        : "Separate the overlapping net labels from other labels and component bodies. Adjust label positions, pin spacing, or attached routing while preserving connections.",
    })
  }

  private computeGlobalFixes(
    collisions: RawCollision[],
  ): Map<string, CollisionSuggestion> {
    const compById = new Map<string, SchematicBoxPlacement>()
    for (const placement of this.placements) {
      if (placement.schematicComponentId)
        compById.set(placement.schematicComponentId, placement)
    }

    // Build 1D separation constraints: newRight.x - newLeft.x >= minSep
    type Constraint = { leftId: string; rightId: string; minSep: number }
    const constraintMap = new Map<string, number>()

    const addConstraint = (
      leftId: string | undefined,
      rightId: string | undefined,
      xSeparation: number,
    ): void => {
      if (!leftId || !rightId || leftId === rightId) return
      const leftComp = compById.get(leftId)
      const rightComp = compById.get(rightId)
      if (!leftComp || !rightComp) return
      const minSep = rightComp.schX - leftComp.schX + xSeparation
      const key = `${leftId}|${rightId}`
      constraintMap.set(key, Math.max(constraintMap.get(key) ?? 0, minSep))
    }

    for (const collision of collisions) {
      if (collision.xSeparation === undefined) continue
      if (collision.type === "label-label") {
        addConstraint(
          collision.leftComp?.schematicComponentId,
          collision.rightComp?.schematicComponentId,
          collision.xSeparation,
        )
      } else if (!collision.labelComp) {
        continue
      } else if (collision.boxComp.schX <= collision.labelComp.schX) {
        addConstraint(
          collision.boxComp.schematicComponentId,
          collision.labelComp.schematicComponentId,
          collision.xSeparation,
        )
      } else {
        addConstraint(
          collision.labelComp.schematicComponentId,
          collision.boxComp.schematicComponentId,
          collision.xSeparation,
        )
      }
    }

    const constraints: Constraint[] = [...constraintMap.entries()].map(
      ([key, minSep]) => {
        const pipeIndex = key.indexOf("|")
        return {
          leftId: key.slice(0, pipeIndex),
          rightId: key.slice(pipeIndex + 1),
          minSep,
        }
      },
    )

    // BFS to find connected component groups
    const allIds = new Set<string>()
    const adjacency = new Map<string, Set<string>>()
    for (const { leftId, rightId } of constraints) {
      allIds.add(leftId)
      allIds.add(rightId)
      if (!adjacency.has(leftId)) adjacency.set(leftId, new Set())
      if (!adjacency.has(rightId)) adjacency.set(rightId, new Set())
      adjacency.get(leftId)!.add(rightId)
      adjacency.get(rightId)!.add(leftId)
    }

    const visited = new Set<string>()
    const result = new Map<string, CollisionSuggestion>()

    for (const startId of allIds) {
      if (visited.has(startId)) continue

      const group: string[] = []
      const queue = [startId]
      visited.add(startId)
      while (queue.length) {
        const compId = queue.shift()!
        group.push(compId)
        for (const neighbor of adjacency.get(compId) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }

      group.sort(
        (idA, idB) =>
          (compById.get(idA)?.schX ?? 0) - (compById.get(idB)?.schX ?? 0),
      )

      const groupIds = new Set(group)
      const groupConstraints = constraints.filter(
        (c) => groupIds.has(c.leftId) && groupIds.has(c.rightId),
      )

      // Forward pass: place each component at max(origX, leftNeighbour + minSep)
      const assigned = new Map<string, number>()
      for (const compId of group) {
        let newX = compById.get(compId)?.schX ?? 0
        for (const { leftId, rightId, minSep } of groupConstraints) {
          if (rightId === compId && assigned.has(leftId)) {
            newX = Math.max(newX, assigned.get(leftId)! + minSep)
          }
        }
        assigned.set(compId, newX)
      }

      // Centering: shift group left to distribute displacement across components
      const totalPush = [...assigned.entries()].reduce(
        (sum, [compId, newX]) =>
          sum + (newX - (compById.get(compId)?.schX ?? 0)),
        0,
      )
      if (totalPush > 1e-9) {
        const pullBack = totalPush / group.length
        const shifted = new Map<string, number>()
        for (const compId of group) {
          let newX = (compById.get(compId)?.schX ?? 0) - pullBack
          for (const { leftId, rightId, minSep } of groupConstraints) {
            if (rightId === compId && shifted.has(leftId)) {
              newX = Math.max(newX, shifted.get(leftId)! + minSep)
            }
          }
          shifted.set(compId, newX)
        }
        const maxDisplacement = (positions: Map<string, number>) =>
          [...positions.entries()].reduce(
            (currentMax, [compId, newX]) =>
              Math.max(
                currentMax,
                Math.abs(newX - (compById.get(compId)?.schX ?? 0)),
              ),
            0,
          )
        if (maxDisplacement(shifted) < maxDisplacement(assigned)) {
          for (const [compId, newX] of shifted) assigned.set(compId, newX)
        }
      }

      for (const [compId, newX] of assigned) {
        const comp = compById.get(compId)
        if (!comp || Math.abs(newX - comp.schX) < 1e-9) continue
        result.set(compId, {
          componentName: comp.sourceComponentName ?? compId,
          newSchX: Math.round(newX * 100) / 100,
          newSchY: Math.round(comp.schY * 100) / 100,
        })
      }
    }

    return result
  }

  private buildNetLabelsByComponentId(
    circuitJson: CircuitJson,
  ): Map<string, SchematicNetLabel[]> {
    const MATCH_EPSILON = 1e-4
    const portPositions: Array<{
      componentId: string
      cx: number
      cy: number
      schematicSheetId?: string
    }> = []
    for (const element of circuitJson) {
      if (element.type !== "schematic_port") continue
      const port = element as SchematicPort
      if (!port.schematic_component_id) continue
      portPositions.push({
        componentId: port.schematic_component_id,
        cx: port.center.x,
        cy: port.center.y,
        schematicSheetId: port.schematic_sheet_id,
      })
    }

    const result = new Map<string, SchematicNetLabel[]>()
    for (const element of circuitJson) {
      if (element.type !== "schematic_net_label") continue
      const label = element as SchematicNetLabel
      if (!label.anchor_position) continue
      const { x: anchorX, y: anchorY } = label.anchor_position

      const matches = portPositions.filter(
        (port) =>
          port.schematicSheetId === label.schematic_sheet_id &&
          Math.hypot(port.cx - anchorX, port.cy - anchorY) < MATCH_EPSILON,
      )
      if (matches.length === 0) continue

      const componentIds = new Set(matches.map((match) => match.componentId))
      if (componentIds.size !== 1) continue

      const componentId = matches[0]!.componentId
      const labels = result.get(componentId) ?? []
      labels.push(label)
      result.set(componentId, labels)
    }
    return result
  }

  static netLabelCollisionToString(issue: NetLabelCollision): string {
    const pairAttrs = issue.pairs
      .map(
        (pair, i) =>
          `pair${i + 1}="${escapeAttr(`${pair.comp1Name}/${pair.comp2Name}`)}"`,
      )
      .join(" ")
    const moves = issue.moves.map(
      (move) =>
        `    <Move componentName="${move.componentName}" newSchX="${move.newSchX}" newSchY="${move.newSchY}" />`,
    )
    if (issue.moves.length === 0) {
      return `<ComponentNetLabelCollision ${pairAttrs}>\n  ${escapeAttr(issue.message ?? "Separate the overlapping labels while preserving connections.")}\n</ComponentNetLabelCollision>`
    }
    return [
      `<ComponentNetLabelCollision ${pairAttrs}>`,
      `  <SuggestedFix note="Apply all moves simultaneously. Set schAutoLayoutEnabled on your circuit.">`,
      ...moves,
      `  </SuggestedFix>`,
      `</ComponentNetLabelCollision>`,
    ].join("\n")
  }
}
