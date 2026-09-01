import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicNetLabel } from "circuit-json"
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
import { getNetLabelsByComponentId } from "./getNetLabelsByComponentId"

type CollisionSuggestion = {
  componentName: string
  newSchX: number
  newSchY: number
}

interface RawLabelLabelCollision {
  type: "label-label"
  leftComp: SchematicBoxPlacement
  rightComp: SchematicBoxPlacement
  leftId: string
  rightId: string
  xSeparation: number
}

interface RawBoxLabelCollision {
  type: "box-label"
  boxComp: SchematicBoxPlacement
  labelComp: SchematicBoxPlacement
  boxId: string
  labelId: string
  xSeparation: number
}

type RawCollision = RawLabelLabelCollision | RawBoxLabelCollision

export class ComponentNetLabelCollisionSolver extends BaseSolver {
  private readonly LABEL_HALF_HEIGHT = 0.1
  private readonly LABEL_BOUNDS_SLACK = 0.1
  private readonly SCH_CHAR_WIDTH = 0.13
  private readonly placements: SchematicBoxPlacement[]
  private readonly netLabelsByComponentId: Map<string, SchematicNetLabel[]>
  private rawCollisions: RawCollision[] = []
  private firstIndex = 0
  private secondIndex = 1

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.placements = params.ctx.componentPlacements
    this.netLabelsByComponentId = getNetLabelsByComponentId(
      params.ctx.circuitJson,
    )
    this.solved = this.placements.length < 2
  }

  override _step(): void {
    if (this.firstIndex >= this.placements.length - 1) {
      this.buildAndPushIssues()
      this.solved = true
      return
    }
    const compA = this.placements[this.firstIndex]!
    const compB = this.placements[this.secondIndex]!
    this.detectPair(compA, compB)
    this.secondIndex++
    if (this.secondIndex >= this.placements.length) {
      this.firstIndex++
      this.secondIndex = this.firstIndex + 1
    }
  }

  private detectPair(
    compA: SchematicBoxPlacement,
    compB: SchematicBoxPlacement,
  ): void {
    if (compA.schematicSheetId !== compB.schematicSheetId) return

    this.rawCollisions.push(...this.detectLabelLabel(compA, compB))
    this.rawCollisions.push(...this.detectBoxLabel(compA, compB))
    this.rawCollisions.push(...this.detectBoxLabel(compB, compA))
  }

  private detectLabelLabel(
    firstComponent: SchematicBoxPlacement,
    secondComponent: SchematicBoxPlacement,
  ): RawLabelLabelCollision[] {
    let leftComp = firstComponent
    let rightComp = secondComponent
    if (firstComponent.schX > secondComponent.schX) {
      leftComp = secondComponent
      rightComp = firstComponent
    }

    const leftId = leftComp.schematicComponentId
    const rightId = rightComp.schematicComponentId
    if (!leftId || !rightId) return []

    const leftLabels = this.netLabelsByComponentId.get(leftId) ?? []
    const rightLabels = this.netLabelsByComponentId.get(rightId) ?? []
    if (leftLabels.length === 0 || rightLabels.length === 0) return []

    const hits: RawLabelLabelCollision[] = []
    for (const leftLabel of leftLabels) {
      for (const rightLabel of rightLabels) {
        const leftBounds = this.getNetLabelBounds(leftLabel)
        const rightBounds = this.getNetLabelBounds(rightLabel)
        if (rectOverlap(leftBounds, rightBounds)) {
          hits.push({
            type: "label-label",
            leftComp,
            rightComp,
            leftId,
            rightId,
            xSeparation: leftBounds.right - rightBounds.left + 0.1,
          })
        }
      }
    }
    return hits
  }

  private detectBoxLabel(
    boxComp: SchematicBoxPlacement,
    labelComp: SchematicBoxPlacement,
  ): RawBoxLabelCollision[] {
    const boxId = boxComp.schematicComponentId
    const labelId = labelComp.schematicComponentId
    if (!boxId || !labelId) return []

    const labels = this.netLabelsByComponentId.get(labelId) ?? []
    if (labels.length === 0) return []

    const boxBounds = centeredRect(
      boxComp.schX,
      boxComp.schY,
      boxComp.width,
      boxComp.height,
    )
    const boxIsLeft = boxComp.schX <= labelComp.schX
    const hits: RawBoxLabelCollision[] = []

    for (const label of labels) {
      const labelBounds = this.getNetLabelBounds(label)
      if (!rectOverlap(boxBounds, labelBounds)) continue
      let xSeparation: number
      if (boxIsLeft) {
        xSeparation = boxBounds.right - labelBounds.left + 0.1
      } else {
        xSeparation = labelBounds.right - boxBounds.left + 0.1
      }
      hits.push({
        type: "box-label",
        boxComp,
        labelComp,
        boxId,
        labelId,
        xSeparation,
      })
    }
    return hits
  }

  private buildAndPushIssues(): void {
    if (this.rawCollisions.length === 0) return

    const collisionsBySheet = new Map<string, RawCollision[]>()
    for (const collision of this.rawCollisions) {
      const placement =
        collision.type === "label-label"
          ? collision.leftComp
          : collision.boxComp
      const sheetKey = placement.schematicSheetId ?? ""
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
    if (globalFixes.size === 0) return

    const pairs: Array<{ comp1Name: string; comp2Name: string }> = []
    for (const collision of collisions) {
      let comp1Name: string
      let comp2Name: string
      if (collision.type === "label-label") {
        comp1Name = collision.leftComp.sourceComponentName ?? ""
        comp2Name = collision.rightComp.sourceComponentName ?? ""
      } else {
        comp1Name = collision.boxComp.sourceComponentName ?? ""
        comp2Name = collision.labelComp.sourceComponentName ?? ""
      }
      const pairExists = pairs.some(
        (pair) =>
          (pair.comp1Name === comp1Name && pair.comp2Name === comp2Name) ||
          (pair.comp1Name === comp2Name && pair.comp2Name === comp1Name),
      )
      if (!pairExists) {
        pairs.push({ comp1Name, comp2Name })
      }
    }

    const firstCollision = collisions[0]!
    const firstPlacement =
      firstCollision.type === "label-label"
        ? firstCollision.leftComp
        : firstCollision.boxComp
    this.params.issues.push({
      lineItemType: "NetLabelCollision",
      schematicSheetId: firstPlacement.schematicSheetId,
      schematicSheetName: firstPlacement.schematicSheetName,
      pairs,
      moves: Array.from(globalFixes.values()),
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
    const constraints: Constraint[] = []

    const addConstraint = (
      leftId: string,
      rightId: string,
      xSeparation: number,
    ): void => {
      const leftComp = compById.get(leftId)
      const rightComp = compById.get(rightId)
      if (!leftComp || !rightComp) return
      const minSep = rightComp.schX - leftComp.schX + xSeparation
      const existingConstraint = constraints.find(
        (constraint) =>
          constraint.leftId === leftId && constraint.rightId === rightId,
      )
      if (existingConstraint) {
        existingConstraint.minSep = Math.max(existingConstraint.minSep, minSep)
        return
      }
      constraints.push({ leftId, rightId, minSep })
    }

    for (const collision of collisions) {
      if (collision.type === "label-label") {
        addConstraint(
          collision.leftId,
          collision.rightId,
          collision.xSeparation,
        )
      } else if (collision.boxComp.schX <= collision.labelComp.schX) {
        addConstraint(collision.boxId, collision.labelId, collision.xSeparation)
      } else {
        addConstraint(collision.labelId, collision.boxId, collision.xSeparation)
      }
    }

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

  private getNetLabelBounds(label: SchematicNetLabel): RectBounds {
    const anchorSide = label.anchor_side
    const isVertical = anchorSide === "top" || anchorSide === "bottom"

    if (isVertical) {
      const anchorY = label.anchor_position?.y ?? label.center.y
      const textHalfExtent =
        ((label.text?.length ?? 8) * this.SCH_CHAR_WIDTH) / 2 +
        this.LABEL_BOUNDS_SLACK
      const left = label.center.x - this.LABEL_HALF_HEIGHT
      const right = label.center.x + this.LABEL_HALF_HEIGHT
      if (anchorSide === "top") {
        return {
          left,
          right,
          top: anchorY,
          bottom: anchorY - textHalfExtent * 2,
        }
      }
      return { left, right, top: anchorY + textHalfExtent * 2, bottom: anchorY }
    }

    const anchorX = label.anchor_position?.x ?? label.center.x
    const halfWidth = Math.abs(label.center.x - anchorX)
    const farHalfWidth = halfWidth + this.LABEL_BOUNDS_SLACK
    const top = label.center.y + this.LABEL_HALF_HEIGHT
    const bottom = label.center.y - this.LABEL_HALF_HEIGHT
    if (label.center.x >= anchorX) {
      return {
        left: anchorX,
        right: label.center.x + farHalfWidth,
        top,
        bottom,
      }
    }
    return { left: label.center.x - farHalfWidth, right: anchorX, top, bottom }
  }

  static netLabelCollisionToString(issue: NetLabelCollision): string {
    const pairAttrs = issue.pairs
      .map((pair, i) => `pair${i + 1}="${pair.comp1Name}/${pair.comp2Name}"`)
      .join(" ")
    const moves = issue.moves.map(
      (move) =>
        `    <Move componentName="${move.componentName}" newSchX="${move.newSchX}" newSchY="${move.newSchY}" />`,
    )
    return [
      `<ComponentNetLabelCollision ${pairAttrs}>`,
      `  <SuggestedFix note="Apply all moves simultaneously. Set schAutoLayoutEnabled on your circuit.">`,
      ...moves,
      `  </SuggestedFix>`,
      `</ComponentNetLabelCollision>`,
    ].join("\n")
  }
}
