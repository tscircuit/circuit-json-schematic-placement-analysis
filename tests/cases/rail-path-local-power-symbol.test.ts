import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("rail path visibility: local-power-symbol", () => {
  const circuitJson = createRailPathRepro()
  circuitJson.push({
    type: "source_net",
    source_net_id: "local-power",
    name: "VBUS",
    is_power: true,
    subcircuit_connectivity_map_key: "input",
  })
  circuitJson.push({
    type: "schematic_net_label",
    schematic_net_label_id: "local-power-label",
    source_net_id: "local-power",
    text: "VBUS",
    anchor_position: { x: 1.55, y: 6 },
    center: { x: 1.55, y: 6.1 },
    anchor_side: "bottom",
    symbol_name: "rail_up",
    schematic_sheet_id: "visibility-sheet",
  })
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  const issues = analysis.getIssues()
  expect(issues).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["RailPathTooSpreadOut"],
      width: 1100,
      height: 750,
      showFullSchematic: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
