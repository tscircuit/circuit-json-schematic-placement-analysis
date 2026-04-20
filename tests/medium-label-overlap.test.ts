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

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicPlacementAnalysisReport requestedTarget="all" resolvedTarget="all" targetKind="circuit" issueCount="1" highSeverityCount="0" mediumSeverityCount="1" lowSeverityCount="0" labelLabelOverlapCount="1" labelSymbolOverlapCount="0" textCrossesConnectionCount="0">
      <Issues>
        <Issue id="medium_overlap_a:medium_overlap_b" type="label_label_overlap" severity="medium" summary="VIN overlaps GND">
          <Bounds minX="0.09" minY="-0.13" maxX="0.17" maxY="0.13" />
          <Participants>
            <Participant kind="label" ref="medium_overlap_a" text="VIN" />
            <Participant kind="label" ref="medium_overlap_b" text="GND" />
          </Participants>
          <Metadata>
            <Entry key="labelA" value="VIN" />
            <Entry key="labelB" value="GND" />
            <Entry key="overlapWidth" value="0.07" />
            <Entry key="overlapHeight" value="0.25" />
          </Metadata>
        </Issue>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
