import { expect, test } from "bun:test"
import { realSchematics } from "../assets/real-schematics"
import { expectRealSchematicReview } from "../fixtures/expect-real-schematic-review"

test("reviews all four original wireless mouse sheets and highlights the crystal network", async () => {
  const review = await expectRealSchematicReview({
    fixture: realSchematics[0]!,
    testPath: import.meta.path,
    expectedSheetViews: 4,
    selectedType: "CrystalNotCenteredOverLoadCapacitors",
    selectedSheetId: "schematic_sheet_1",
    expectedCounts: {
      SchematicBoxInnerLabelCollision: 1,
      TraceCanBeSimplifiedByMovingComponent: 7,
      CrystalNotCenteredOverLoadCapacitors: 1,
      TwoPinComponentCouldBeFlipped: 3,
    },
  })
  expect(review.visibleIssues[0]!.shapes).toHaveLength(3)
  expect(review.sheetCounts.CrystalNotCenteredOverLoadCapacitors).toBe(1)
})
