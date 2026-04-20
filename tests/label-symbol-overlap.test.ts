import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const labelSymbolOverlapJson = JSON.parse(
  readFileSync(
    new URL("./assets/label-symbol-overlap.json", import.meta.url),
    "utf8",
  ),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("label symbol overlap snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(labelSymbolOverlapJson)

  expect(analysis.issueCount).toBe(1)
  expect(analysis.highSeverityCount).toBe(1)
  expect(analysis.listIssues()[0]?.type).toBe("label_symbol_overlap")
  expect(
    convertCircuitJsonToSchematicSvg(labelSymbolOverlapJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicPlacementAnalysisReport requestedTarget="all" resolvedTarget="all" targetKind="circuit" issueCount="1" highSeverityCount="1" mediumSeverityCount="0" lowSeverityCount="0" labelLabelOverlapCount="0" labelSymbolOverlapCount="1" textCrossesConnectionCount="0">
      <Issues>
        <Issue id="symbol_overlap_label:schematic_component_0" type="label_symbol_overlap" severity="high" summary="VREF overlaps U1">
          <Bounds minX="-0.22" minY="-0.13" maxX="0.22" maxY="0.13" />
          <Participants>
            <Participant kind="label" ref="symbol_overlap_label" text="VREF" />
            <Participant kind="component" ref="U1" />
          </Participants>
          <Metadata>
            <Entry key="label" value="VREF" />
            <Entry key="component" value="U1" />
            <Entry key="overlapWidth" value="0.45" />
            <Entry key="overlapHeight" value="0.25" />
          </Metadata>
        </Issue>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
