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
    "<SchematicPlacementAnalysisReport requestedTarget="all" resolvedTarget="all" targetKind="circuit" issueCount="7" highSeverityCount="7" mediumSeverityCount="0" lowSeverityCount="0" labelLabelOverlapCount="1" labelSymbolOverlapCount="4" textCrossesConnectionCount="2">
      <Issues>
        <Issue id="schematic_net_label_overlap_a:schematic_net_label_overlap_b" type="label_label_overlap" severity="high" summary="U1_VCP/C10_pin2 overlaps GND">
          <Bounds minX="0.18" minY="-0.09" maxX="0.52" maxY="0.13" />
          <Participants>
            <Participant kind="label" ref="schematic_net_label_overlap_a" text="U1_VCP/C10_pin2" />
            <Participant kind="label" ref="schematic_net_label_overlap_b" text="GND" />
          </Participants>
          <Metadata>
            <Entry key="labelA" value="U1_VCP/C10_pin2" />
            <Entry key="labelB" value="GND" />
            <Entry key="overlapWidth" value="0.33" />
            <Entry key="overlapHeight" value="0.21" />
          </Metadata>
        </Issue>
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
        <Issue id="schematic_net_label_overlap_a:schematic_component_1" type="label_symbol_overlap" severity="high" summary="U1_VCP/C10_pin2 overlaps C1">
          <Bounds minX="0.00" minY="-0.13" maxX="0.86" maxY="0.13" />
          <Participants>
            <Participant kind="label" ref="schematic_net_label_overlap_a" text="U1_VCP/C10_pin2" />
            <Participant kind="component" ref="C1" />
          </Participants>
          <Metadata>
            <Entry key="label" value="U1_VCP/C10_pin2" />
            <Entry key="component" value="C1" />
            <Entry key="overlapWidth" value="0.86" />
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
        <Issue id="schematic_net_label_overlap_b:schematic_component_1" type="label_symbol_overlap" severity="high" summary="GND overlaps C1">
          <Bounds minX="0.18" minY="-0.09" maxX="0.52" maxY="0.17" />
          <Participants>
            <Participant kind="label" ref="schematic_net_label_overlap_b" text="GND" />
            <Participant kind="component" ref="C1" />
          </Participants>
          <Metadata>
            <Entry key="label" value="GND" />
            <Entry key="component" value="C1" />
            <Entry key="overlapWidth" value="0.33" />
            <Entry key="overlapHeight" value="0.25" />
          </Metadata>
        </Issue>
        <Issue id="schematic_net_label_overlap_a:schematic_trace_overlap_0:0" type="text_crosses_connection" severity="high" summary="U1_VCP/C10_pin2 crosses R1.2-C1.1">
          <Bounds minX="-0.82" minY="-0.13" maxX="0.86" maxY="0.13" />
          <Participants>
            <Participant kind="label" ref="schematic_net_label_overlap_a" text="U1_VCP/C10_pin2" />
            <Participant kind="trace" ref="R1.2-C1.1" />
          </Participants>
          <Metadata>
            <Entry key="label" value="U1_VCP/C10_pin2" />
            <Entry key="trace" value="R1.2-C1.1" />
            <Entry key="traceFromX" value="-0.60" />
            <Entry key="traceFromY" value="0.00" />
            <Entry key="traceToX" value="1.00" />
            <Entry key="traceToY" value="0.00" />
          </Metadata>
        </Issue>
        <Issue id="schematic_net_label_overlap_b:schematic_trace_overlap_0:0" type="text_crosses_connection" severity="high" summary="GND crosses R1.2-C1.1">
          <Bounds minX="0.18" minY="-0.09" maxX="0.52" maxY="0.17" />
          <Participants>
            <Participant kind="label" ref="schematic_net_label_overlap_b" text="GND" />
            <Participant kind="trace" ref="R1.2-C1.1" />
          </Participants>
          <Metadata>
            <Entry key="label" value="GND" />
            <Entry key="trace" value="R1.2-C1.1" />
            <Entry key="traceFromX" value="-0.60" />
            <Entry key="traceFromY" value="0.00" />
            <Entry key="traceToX" value="1.00" />
            <Entry key="traceToY" value="0.00" />
          </Metadata>
        </Issue>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
