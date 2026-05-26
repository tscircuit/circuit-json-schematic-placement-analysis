import { expect, test } from "bun:test"
import { createVerboseNetLabelFixedCircuitJson } from "../assets/verbose-net-label-fixed"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("verbose net label fixed - no component collision after applying suggestions", async () => {
  const circuitJson = await createVerboseNetLabelFixedCircuitJson()

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson }),
  ).toMatchSvgSnapshot(import.meta.path)
})
