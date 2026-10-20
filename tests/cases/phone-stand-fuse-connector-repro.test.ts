import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPhoneStandFuseConnector } from "../assets/phone-stand-fuse-connector"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
test("reproduces the phone-stand-fuse-connector with original positions and pin connections", async () => {
  const json = await createPhoneStandFuseConnector()
  expectReproRendered(json, 2)
  for (const [name, x, y] of [
    ["J_QI", -1, 4],
    ["F_QI", -5, 4],
  ] as const)
    expect(getReproSchematicComponent(json, name).center).toEqual({ x, y })
  expectReproNets(json, [
    ["F_QI.pin1", "net.J_USB_PIN1"],
    ["F_QI.pin2", "J_QI.pin1"],
    ["J_QI.pin2", "net.GND"],
  ])
  for (const [name, pin, direction] of [
    ["F_QI", "pin2", "right"],
    ["J_QI", "pin1", "right"],
  ] as const) {
    const id = getReproSourcePort(json, name, pin).source_port_id
    expect(
      json.find((e) => e.type === "schematic_port" && e.source_port_id === id),
    ).toMatchObject({ facing_direction: direction })
  }
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "FuseConnectorNotAligned",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 650,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "network")
})
