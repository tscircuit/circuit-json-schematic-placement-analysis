import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const unnamedComponentOverlapJson = JSON.parse(
  readFileSync(
    new URL("./assets/unnamed-component-overlap.json", import.meta.url),
    "utf8",
  ),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("unnamed component overlap snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(unnamedComponentOverlapJson)

  expect(analysis.issueCount).toBe(1)
  expect(analysis.listIssues()[0]?.participants[1]?.ref).toBe(
    "schematic_component_0",
  )
  expect(
    convertCircuitJsonToSchematicSvg(unnamedComponentOverlapJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`"<LabelSymbolOverlap severity="high" label="CLK" component="schematic_component_0" left="-0.17" right="0.17" bottom="-0.13" top="0.13" width="0.33" height="0.25" />"`)
})
