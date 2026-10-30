import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { create555OutputConnector } from "../assets/555-output-connector"
import { create555TimingNetwork } from "../assets/555-timing-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
test("reproduces the 555 output connector behind its output pin", async () => {
  const json = await create555OutputConnector()
  expectReproRendered(json, 2)
  expectReproNets(json, [
    ["U1.pin1", "J_OUT.pin2", "net.GND"],
    ["U1.pin3", "J_OUT.pin1", "net.OUT"],
  ])
  expect(getReproSchematicComponent(json, "U1").center).toEqual({ x: 0, y: 0 })
  expect(getReproSchematicComponent(json, "J_OUT").center).toEqual({
    x: 5,
    y: 0,
  })
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues()).toMatchObject([
    {
      lineItemType: "ConnectorPositionCausesTraceDetours",
      evaluatedSignalCount: 1,
    },
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1200,
      height: 600,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "output")
  // Keep the existing complete published seven-component fixture as context.
  const full = await create555TimingNetwork()
  expectReproRendered(full, 7)
  expect(
    analyzeSchematicPlacement(full).getIssues({
      issueTypes: ["ConnectorPositionCausesTraceDetours"],
    }),
  ).toMatchObject([
    {
      evaluatedSignalCount: 1,
      connectorSchematicBox: { sourceComponentName: "J_OUT" },
    },
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: full,
      analysis: analyzeSchematicPlacement(full),
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 1000,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
