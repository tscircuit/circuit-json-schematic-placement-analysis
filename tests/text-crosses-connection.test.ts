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

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicPlacementAnalysisReport requestedTarget="all" resolvedTarget="all" targetKind="circuit" issueCount="1" highSeverityCount="1" mediumSeverityCount="0" lowSeverityCount="0" labelLabelOverlapCount="0" labelSymbolOverlapCount="0" textCrossesConnectionCount="1">
      <Issues>
        <Issue id="trace_cross_label:trace_cross_0:0" type="text_crosses_connection" severity="high" summary="CLK crosses U1.CLK-J1.CLK">
          <Bounds minX="-0.17" minY="-0.13" maxX="0.17" maxY="0.13" />
          <Participants>
            <Participant kind="label" ref="trace_cross_label" text="CLK" />
            <Participant kind="trace" ref="U1.CLK-J1.CLK" />
          </Participants>
          <Metadata>
            <Entry key="label" value="CLK" />
            <Entry key="trace" value="U1.CLK-J1.CLK" />
            <Entry key="traceFromX" value="-0.50" />
            <Entry key="traceFromY" value="0.00" />
            <Entry key="traceToX" value="0.50" />
            <Entry key="traceToY" value="0.00" />
          </Metadata>
        </Issue>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
