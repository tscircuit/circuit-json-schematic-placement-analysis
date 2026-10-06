import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

// Same TSX geometry/connectivity as diode-resistor-topology-repro-parallel in
// #192. That snapshot selects only the series checker. Exercise the parallel
// checker here without depending on #192 or importing its test/implementation.
test("reports the crossed D1/R4 topology with the parallel checker", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <diode name="D1" schX={0} schY={0} />
      <resistor name="R4" resistance="100k" schX={3} schY={2} />
      <trace from=".D1 > .cathode" to=".R4 > .pin1" />
      <trace from=".D1 > .anode" to=".R4 > .pin2" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expectReproRendered(circuitJson, 2)
  expectReproNets(circuitJson, [
    ["D1.cathode", "R4.pin1"],
    ["D1.anode", "R4.pin2"],
  ])
  const issueTypes = ["ParallelDiodeResistorNotAligned"] as const
  const analysis = analyzeSchematicPlacement(circuitJson, { issueTypes })
  expect(analysis.getIssues()).toMatchObject([
    {
      lineItemType: "ParallelDiodeResistorNotAligned",
      diodeSchematicBox: { sourceComponentName: "D1" },
      resistorSchematicBox: { sourceComponentName: "R4" },
      reason: "crossed_connections",
    },
  ])
  expect(
    analyzeSchematicPlacement(circuitJson).getIssues({ issueTypes }),
  ).toEqual(analysis.getIssues())
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes,
      showFullSchematic: true,
      showOverlay: true,
      showListingIssueMarkers: true,
      width: 1000,
      height: 500,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
