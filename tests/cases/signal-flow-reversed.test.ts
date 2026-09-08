import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSignalFlowReversedCircuitJson } from "../assets/signal-flow-reversed"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createSignalFlowReversedCircuitJson()
  expectReproRendered(circuitJson, 2)
  expectReproNets(circuitJson, [["U1.TX", "U2.RX"]])

  const transmitter = getReproSchematicComponent(circuitJson, "U1")
  const receiver = getReproSchematicComponent(circuitJson, "U2")
  expect(transmitter.center.x - receiver.center.x).toBeGreaterThan(7)
  expect(transmitter.center.y).toBe(receiver.center.y)

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
  issueTypes = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues"
        ? item.issues.map((issue) => issue.lineItemType)
        : [],
    )
})

test.failing("reports a UART transmitter placed to the right of its receiver", () => {
  expect(issueTypes).toContain("SignalFlowReversed")
})
