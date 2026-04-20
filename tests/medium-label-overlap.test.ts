import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const mediumLabelOverlapJson = JSON.parse(
  readFileSync(
    new URL("./assets/medium-label-overlap.json", import.meta.url),
    "utf8",
  ),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("medium label overlap snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(mediumLabelOverlapJson)

  expect(analysis.issueCount).toBe(1)
  expect(analysis.mediumSeverityCount).toBe(1)
  expect(analysis.listIssues()[0]?.type).toBe("label_label_overlap")
  expect(
    convertCircuitJsonToSchematicSvg(mediumLabelOverlapJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`"<LabelLabelOverlap severity="medium" labelA="VIN" labelB="GND" left="0.09" right="0.17" bottom="-0.13" top="0.13" width="0.07" height="0.25" />"`)
})
