import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const topBottomAnchorOverlapJson = JSON.parse(
  readFileSync(
    new URL("./assets/top-bottom-anchor-overlap.json", import.meta.url),
    "utf8",
  ),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("top bottom anchor overlap snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(topBottomAnchorOverlapJson)

  expect(analysis.issueCount).toBe(1)
  expect(analysis.listIssues()[0]?.summary).toBe("VIN overlaps GND")
  expect(
    convertCircuitJsonToSchematicSvg(topBottomAnchorOverlapJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`"<LabelLabelOverlap severity="medium" labelA="VIN" labelB="GND" left="-0.17" right="0.17" bottom="0.00" top="0.10" width="0.33" height="0.10" />"`)
})
