import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createProgrammerResistorConnector } from "../assets/programmer-resistor-connector"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reproduces the real programmer-resistor-connector positions and connections", async () => {
  const json = await createProgrammerResistorConnector()
  expectReproRendered(json, 3)
  for (const [name, x, y] of [
    ["J5", 8, -6],
    ["R_UART_TX", 3, -5],
    ["R_UART_RX", 3, -7],
  ] as const)
    expect(getReproSchematicComponent(json, name).center).toEqual({ x, y })
  expectReproNets(json, [
    ["R_UART_TX.pin1", "net.UART_TX_GPIO"],
    ["R_UART_RX.pin1", "net.UART_RX_GPIO"],
    ["R_UART_TX.pin2", "J5.pin1"],
    ["R_UART_RX.pin2", "J5.pin3"],
    ["J5.pin2", "net.GND"],
  ])
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues()).toEqual([])
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
