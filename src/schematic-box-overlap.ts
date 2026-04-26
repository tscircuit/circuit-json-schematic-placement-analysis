import type { AnyCircuitElement, SchematicBox } from "circuit-json"
import { getCenteredRectBounds, getRectOverlap } from "./geometry"
import {
  getSchematicBoxRef,
  type SchematicBoxOverlapIssue,
} from "./issues"

export function getSchematicBoxes(
  circuitJson: AnyCircuitElement[],
): SchematicBox[] {
  return circuitJson.filter(
    (element): element is SchematicBox => element.type === "schematic_box",
  )
}

export function generateSchematicBoxOverlapIssues(
  circuitJson: AnyCircuitElement[],
): SchematicBoxOverlapIssue[] {
  const boxes = getSchematicBoxes(circuitJson)
  const issues: SchematicBoxOverlapIssue[] = []

  for (let firstIndex = 0; firstIndex < boxes.length; firstIndex++) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < boxes.length;
      secondIndex++
    ) {
      const firstBox = boxes[firstIndex]!
      const secondBox = boxes[secondIndex]!
      const overlap = getRectOverlap(
        getCenteredRectBounds(firstBox),
        getCenteredRectBounds(secondBox),
      )

      if (!overlap) continue

      const boxA = getSchematicBoxRef(firstBox, firstIndex)
      const boxB = getSchematicBoxRef(secondBox, secondIndex)

      issues.push({
        type: "schematic_box_overlap",
        message: `Schematic boxes ${boxA.label} and ${boxB.label} overlap by ${formatNumber(overlap.width)} x ${formatNumber(overlap.height)}.`,
        boxA,
        boxB,
        overlap,
      })
    }
  }

  return issues
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3)
}
