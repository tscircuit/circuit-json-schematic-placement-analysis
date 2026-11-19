import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTiTps25751EvmPinPaddingBoxes } from "../assets/ti-tps25751evm-pin-padding-boxes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts one drawn pin pitch of padding on TI TPS25751EVM boxes spaced by pin margins", async () => {
  const circuitJson = await createTiTps25751EvmPinPaddingBoxes()
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(8)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issueNames = (type: string) =>
    analysis
      .getIssues()
      .flatMap((issue) =>
        issue.lineItemType === type && "schematicBox" in issue
          ? [issue.schematicBox.sourceComponentName]
          : [],
      )
      .sort()
  // Pins are drawn 0.4 or 0.8 apart via pin margins, with about one drawn
  // pitch of padding at each end, so none of these boxes are over-padded.
  expect(issueNames("SchematicPinPaddingToEdgeTooLarge")).toEqual([])
  // Legitimate: these boxes are much wider than their labels need.
  expect(issueNames("GenericSchematicBoxTooWide")).toEqual([
    "J2",
    "J3",
    "J4",
    "J5",
    "U5",
  ])
  expect(analysis.getIssues()).toHaveLength(5)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
