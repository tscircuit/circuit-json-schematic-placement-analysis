import { expect, test } from "bun:test"
import { realSchematics } from "../assets/real-schematics"
import { expectRealSchematicReview } from "../fixtures/expect-real-schematic-review"

test("reviews the complete original pedometer and highlights the reset host and support components", async () => {
  const review = await expectRealSchematicReview({
    fixture: realSchematics[2]!,
    testPath: import.meta.path,
    expectedSheetViews: 1,
    selectedType: "ResetNetworkNotGrouped",
    selectedSheetId: "",
    expectedCounts: {
      ResetNetworkNotGrouped: 1,
      ComponentOverlap: 2,
      SchematicPinPaddingToEdgeTooLarge: 4,
      TraceCanBeSimplifiedByMovingComponent: 12,
      CrystalNotCenteredOverLoadCapacitors: 1,
      NetLabelCollision: 1,
    },
  })
  const issue = review.visibleIssues[0]!.issue
  if (issue.lineItemType !== "ResetNetworkNotGrouped")
    throw new Error("Expected a reset grouping issue")
  expect(issue.hostSchematicBox.sourceComponentName).toBe("U_MCU")
  expect(
    issue.supportNetworkComponents.map((p) => p.sourceComponentName),
  ).toEqual(["R_RESET", "C_RESET"])
  expect(review.visibleIssues[0]!.shapes).toHaveLength(4)
})
