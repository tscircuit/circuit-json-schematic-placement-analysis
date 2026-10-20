import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMq135Potentiometer } from "../assets/mq135-potentiometer"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reproduces the MQ135 potentiometer with published position, terminals and rails", async () => {
  const json = await createMq135Potentiometer()
  expectReproRendered(json, 1)
  expect(getReproSchematicComponent(json, "RV1").center).toEqual({ x: 0, y: 5 })
  expectReproNets(json, [
    ["RV1.pin1", "net.VCC_5V"],
    ["RV1.pin2", "net.THRESHOLD"],
    ["RV1.pin3", "net.GND"],
  ])
  for (const [pin, direction] of [
    ["pin1", "left"],
    ["pin2", "down"],
    ["pin3", "right"],
  ]) {
    const id = getReproSourcePort(json, "RV1", pin!).source_port_id
    expect(
      json.find((e) => e.type === "schematic_port" && e.source_port_id === id),
    ).toMatchObject({ facing_direction: direction })
  }
  expect(
    json.find((e) => e.type === "source_net" && e.name === "VCC_5V"),
  ).toMatchObject({ is_positive_voltage_source: true })
  expect(
    json.find((e) => e.type === "source_net" && e.name === "GND"),
  ).toMatchObject({ is_ground: true })
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1200,
      height: 750,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "control")
})
