import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTiTps25751EvmPinPaddingBoxes } from "../assets/ti-tps25751evm-pin-padding-boxes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("applies box-width suggestions to the TI TPS25751EVM pin-margin boxes", async () => {
  const original = await createTiTps25751EvmPinPaddingBoxes()
  const schWidthByName = Object.fromEntries(
    analyzeSchematicPlacement(original, {
      issueTypes: ["GenericSchematicBoxTooWide"],
    })
      .getIssues()
      .flatMap((issue) =>
        issue.lineItemType === "GenericSchematicBoxTooWide"
          ? [[issue.schematicBox.sourceComponentName, issue.suggestedSchWidth]]
          : [],
      ),
  )
  expect(Object.keys(schWidthByName).sort()).toEqual([
    "J2",
    "J3",
    "J4",
    "J5",
    "U5",
  ])

  const circuitJson = await createTiTps25751EvmPinPaddingBoxes(schWidthByName)
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson)
  // Narrowing to the suggested widths leaves no box, label or padding issues.
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
