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

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicPlacementAnalysisReport requestedTarget="all" resolvedTarget="all" targetKind="circuit" issueCount="1" highSeverityCount="0" mediumSeverityCount="1" lowSeverityCount="0" labelLabelOverlapCount="1" labelSymbolOverlapCount="0" textCrossesConnectionCount="0">
      <Issues>
        <Issue id="top_anchored_label:bottom_anchored_label" type="label_label_overlap" severity="medium" summary="VIN overlaps GND">
          <Bounds minX="-0.17" minY="0.00" maxX="0.17" maxY="0.10" />
          <Participants>
            <Participant kind="label" ref="top_anchored_label" text="VIN" />
            <Participant kind="label" ref="bottom_anchored_label" text="GND" />
          </Participants>
          <Metadata>
            <Entry key="labelA" value="VIN" />
            <Entry key="labelB" value="GND" />
            <Entry key="overlapWidth" value="0.33" />
            <Entry key="overlapHeight" value="0.10" />
          </Metadata>
        </Issue>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
