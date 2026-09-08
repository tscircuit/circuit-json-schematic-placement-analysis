import { expect, test } from "bun:test"
import { realSchematics } from "../assets/real-schematics"
import { expectRealSchematicReview } from "../fixtures/expect-real-schematic-review"

test("reviews all seven original RP2040 sheets and isolates heading collisions", async () => {
  const review = await expectRealSchematicReview({
    fixture: realSchematics[1]!,
    testPath: import.meta.path,
    expectedSheetViews: 7,
    selectedType: "SchematicTextCollision",
    selectedSheetId: "schematic_sheet_6",
    expectedCounts: {
      SchematicTextCollision: 4,
      PinHeaderSchematicBoxTooWide: 2,
      GenericSchematicBoxTooWide: 12,
      SchematicPinPaddingToEdgeTooLarge: 84,
      SchematicBoxInnerLabelCollision: 7,
      DiodeResistorNotAligned: 1,
      TraceCanBeSimplifiedByMovingComponent: 11,
      NetLabelCollision: 2,
    },
  })
  expect(review.sheetCounts.SchematicTextCollision).toBe(2)
  const entry = review.visibleIssues[0]!
  expect(entry.issue.lineItemType).toBe("SchematicTextCollision")
  if (entry.issue.lineItemType !== "SchematicTextCollision")
    throw new Error("Expected a text collision")
  expect(entry.issue.text).toBe("Power-Stage Temperature Interlock")
  expect(entry.shapes[0]).toEqual({
    type: "box",
    bounds: entry.issue.textBounds,
  })
  expect(entry.shapes.some((shape) => shape.type === "line")).toBe(true)
})
