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

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicPlacementAnalysisReport requestedTarget="all" resolvedTarget="all" targetKind="circuit" issueCount="1" highSeverityCount="1" mediumSeverityCount="0" lowSeverityCount="0" labelLabelOverlapCount="0" labelSymbolOverlapCount="1" textCrossesConnectionCount="0">
      <Issues>
        <Issue id="unnamed_component_label:schematic_component_0" type="label_symbol_overlap" severity="high" summary="CLK overlaps schematic_component_0">
          <Bounds minX="-0.17" minY="-0.13" maxX="0.17" maxY="0.13" />
          <Participants>
            <Participant kind="label" ref="unnamed_component_label" text="CLK" />
            <Participant kind="component" ref="schematic_component_0" />
          </Participants>
          <Metadata>
            <Entry key="label" value="CLK" />
            <Entry key="component" value="schematic_component_0" />
            <Entry key="overlapWidth" value="0.33" />
            <Entry key="overlapHeight" value="0.25" />
          </Metadata>
        </Issue>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
