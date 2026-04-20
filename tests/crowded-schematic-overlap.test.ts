import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const crowdedSchematicOverlapJson = JSON.parse(
  readFileSync(
    new URL("./assets/crowded-schematic-overlap.json", import.meta.url),
    "utf8",
  ),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("crowded schematic overlap snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(crowdedSchematicOverlapJson)
  const issueTypes = analysis.listIssues().map((issue) => issue.type)

  expect(analysis.issueCount).toBeGreaterThan(0)
  expect(issueTypes).toContain("label_label_overlap")
  expect(issueTypes).toContain("label_symbol_overlap")
  expect(issueTypes).toContain("text_crosses_connection")
  expect(
    convertCircuitJsonToSchematicSvg(crowdedSchematicOverlapJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<LabelLabelOverlap severity="high" labelA="U1_VCP/C10_pin2" labelB="GND" left="0.18" right="0.52" bottom="-0.09" top="0.13" width="0.33" height="0.21" />

    <LabelSymbolOverlap severity="high" label="U1_VCP/C10_pin2" component="R1" left="-0.55" right="0.55" bottom="-0.13" top="0.13" width="1.10" height="0.25" />

    <LabelSymbolOverlap severity="high" label="U1_VCP/C10_pin2" component="C1" left="0.00" right="0.86" bottom="-0.13" top="0.13" width="0.86" height="0.25" />

    <LabelSymbolOverlap severity="high" label="GND" component="R1" left="0.18" right="0.52" bottom="-0.09" top="0.17" width="0.33" height="0.25" />

    <LabelSymbolOverlap severity="high" label="GND" component="C1" left="0.18" right="0.52" bottom="-0.09" top="0.17" width="0.33" height="0.25" />

    <TextCrossesConnection severity="high" label="U1_VCP/C10_pin2" trace="R1.2-C1.1" traceFromX="-0.60" traceFromY="0.00" traceToX="1.00" traceToY="0.00" left="-0.82" right="0.86" bottom="-0.13" top="0.13" width="1.67" height="0.25" />

    <TextCrossesConnection severity="high" label="GND" trace="R1.2-C1.1" traceFromX="-0.60" traceFromY="0.00" traceToX="1.00" traceToY="0.00" left="0.18" right="0.52" bottom="-0.09" top="0.17" width="0.33" height="0.25" />"
  `)
})
