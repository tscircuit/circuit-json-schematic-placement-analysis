import { expect, test } from "bun:test"
import { createComponentLabelOverlapFixedCircuitJson } from "../assets/component-label-overlap-fixed"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("component label overlap fixed - no collision after applying suggestions", async () => {
  const circuitJson = await createComponentLabelOverlapFixedCircuitJson()

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson }),
  ).toMatchSvgSnapshot(import.meta.path)
})
