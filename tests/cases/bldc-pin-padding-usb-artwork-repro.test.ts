import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("does not shrink the BLDC board's standard USB-C artwork", async () => {
  const circuitJson = await renderBldcSymbol("J1")
  expect(
    circuitJson.find((element) => element.type === "source_component"),
  ).toMatchObject({ ftype: "simple_connector", standard: "usb_c" })
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
  expect(issues).toHaveLength(0)
  await expect(
    createIssueReproSnapshot({
      width: 1200,
      showFullSchematic: true,
      showOverlay: false,
      showListingIssueMarkers: true,
      circuitJson,
      analysis,
      height: 550,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
