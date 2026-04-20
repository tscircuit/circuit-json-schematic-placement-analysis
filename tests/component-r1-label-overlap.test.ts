import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeComponentSchematicPlacement } from "lib/index"
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

test("component r1 label overlap snapshot", () => {
  const analysis = analyzeComponentSchematicPlacement(
    crowdedSchematicOverlapJson,
    "R1",
  )
  const issueSummaries = analysis.listIssues().map((issue) => issue.summary)

  expect(analysis.issueCount).toBe(2)
  expect(issueSummaries).toEqual([
    "U1_VCP/C10_pin2 overlaps R1",
    "GND overlaps R1",
  ])
  expect(
    convertCircuitJsonToSchematicSvg(crowdedSchematicOverlapJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicPlacementAnalysisReport requestedTarget="R1" resolvedTarget="R1" targetKind="component" issueCount="2" highSeverityCount="2" mediumSeverityCount="0" lowSeverityCount="0" labelLabelOverlapCount="0" labelSymbolOverlapCount="2" textCrossesConnectionCount="0">
      <Issues>
        <Issue id="schematic_net_label_overlap_a:schematic_component_0" type="label_symbol_overlap" severity="high" summary="U1_VCP/C10_pin2 overlaps R1">
          <Bounds minX="-0.55" minY="-0.13" maxX="0.55" maxY="0.13" />
          <Participants>
            <Participant kind="label" ref="schematic_net_label_overlap_a" text="U1_VCP/C10_pin2" />
            <Participant kind="component" ref="R1" />
          </Participants>
          <Metadata>
            <Entry key="label" value="U1_VCP/C10_pin2" />
            <Entry key="component" value="R1" />
            <Entry key="overlapWidth" value="1.10" />
            <Entry key="overlapHeight" value="0.25" />
          </Metadata>
        </Issue>
        <Issue id="schematic_net_label_overlap_b:schematic_component_0" type="label_symbol_overlap" severity="high" summary="GND overlaps R1">
          <Bounds minX="0.18" minY="-0.09" maxX="0.52" maxY="0.17" />
          <Participants>
            <Participant kind="label" ref="schematic_net_label_overlap_b" text="GND" />
            <Participant kind="component" ref="R1" />
          </Participants>
          <Metadata>
            <Entry key="label" value="GND" />
            <Entry key="component" value="R1" />
            <Entry key="overlapWidth" value="0.33" />
            <Entry key="overlapHeight" value="0.25" />
          </Metadata>
        </Issue>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
