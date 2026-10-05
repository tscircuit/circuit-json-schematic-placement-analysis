import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("does not recommend resizing when a pin's side metadata is missing", async () => {
  const circuitJson = await renderBldcSymbol("U3", { schHeight: 5 })
  const port = circuitJson.find((element) => element.type === "schematic_port")!
  delete port.side_of_component
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis
      .getIssues()
      .filter(
        (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      ),
  ).toHaveLength(0)
  await expect(
    createIssueReproSnapshot({
      width: 1200,
      showFullSchematic: true,
      showOverlay: false,
      showListingIssueMarkers: true,
      circuitJson,
      analysis,
      height: 450,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
