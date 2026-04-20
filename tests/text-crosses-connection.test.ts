import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const textCrossesConnectionJson = JSON.parse(
  readFileSync(
    new URL("./assets/text-crosses-connection.json", import.meta.url),
    "utf8",
  ),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("text crosses connection snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(textCrossesConnectionJson)

  expect(analysis.issueCount).toBe(1)
  expect(analysis.highSeverityCount).toBe(1)
  expect(analysis.listIssues()[0]?.type).toBe("text_crosses_connection")
  expect(
    convertCircuitJsonToSchematicSvg(textCrossesConnectionJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`"<TextCrossesConnection severity="high" label="CLK" trace="U1.CLK-J1.CLK" traceFromX="-0.50" traceFromY="0.00" traceToX="0.50" traceToY="0.00" left="-0.17" right="0.17" bottom="-0.13" top="0.13" width="0.33" height="0.25" />"`)
})
