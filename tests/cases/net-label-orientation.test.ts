// Run: bun test tests/cases/net-label-orientation.test.ts
import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "../../lib/index"
import type { CircuitJson } from "circuit-json"

const netLabelUpsideDownCircuitJson: CircuitJson = [
  { type: "source_net", source_net_id: "net_GND", name: "GND", member_source_group_ids: [] },
  { type: "source_net", source_net_id: "net_V3_3", name: "V3_3", member_source_group_ids: [] },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "schematic_net_label_GND",
    source_net_id: "net_GND",
    center: { x: 0, y: 0 },
    anchor_position: { x: -1, y: 1 },
    anchor_side: "left",
    text: "GND",
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "schematic_net_label_V3_3",
    source_net_id: "net_V3_3",
    center: { x: 0, y: 0 },
    anchor_position: { x: 1, y: -1 },
    anchor_side: "right",
    text: "V3_3",
  },
]

test("detects unreadable net label orientation", () => {
  const analysis = analyzeSchematicPlacement(netLabelUpsideDownCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  expect(issuesLineItem).toMatchObject({
    lineItemType: "SchematicPlacementIssues",
    issues: [
      {
        lineItemType: "NetLabelOrientationUnreadable",
        text: "GND",
        anchorSide: "left",
        currentAngleDeg: 135,
        normalizedAngleDeg: -45,
      },
    ],
  })

  expect(issuesLineItem?.issues).toHaveLength(1)

  expect(analysis.toString()).toContain(
    '<NetLabelOrientationUnreadable text="GND" anchorSide="left" currentAngleDeg="135" normalizedAngleDeg="-45" />',
  )
})