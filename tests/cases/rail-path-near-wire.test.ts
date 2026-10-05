import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("a label near a long segment does not create a visible connection", () => {
  const circuitJson = createRailPathRepro()
  // Same electrical net, but detached from the actual drawn segment by 0.01 units.
  circuitJson.push({
    type: "source_net",
    source_net_id: "near-power",
    name: "VBUS",
    is_power: true,
    subcircuit_connectivity_map_key: "input",
  })
  circuitJson.push({
    type: "schematic_net_label",
    schematic_net_label_id: "near-label",
    source_net_id: "near-power",
    text: "VBUS",
    anchor_position: { x: 0.275, y: 6.01 },
    center: { x: 0.275, y: 6.1 },
    anchor_side: "bottom",
    symbol_name: "rail_up",
    schematic_sheet_id: "visibility-sheet",
  })
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  expect(analysis.getIssues()).toHaveLength(1)
  expect(analysis.getIssues()[0]).toMatchObject({ railType: "ground" })
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1100,
      height: 750,
      showFullSchematic: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
