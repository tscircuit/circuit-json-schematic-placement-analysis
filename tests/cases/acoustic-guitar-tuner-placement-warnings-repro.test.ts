import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import acousticGuitarTunerCircuitJson from "../assets/acoustic-guitar-tuner.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

const circuitJson = acousticGuitarTunerCircuitJson as CircuitJson

test("records repeated placement warnings on the acoustic guitar tuner", () => {
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const orientationIssues = analysis.getIssues({
    issueTypes: ["TwoPinComponentShouldBeVertical"],
  })

  // These are nine repeated MCU-output -> resistor -> LED -> GND channels.
  // Record the current blanket rail-orientation findings without endorsing them.
  expect(
    orientationIssues.map((issue) =>
      issue.lineItemType === "TwoPinComponentShouldBeVertical"
        ? issue.schematicBox.sourceComponentName
        : undefined,
    ),
  ).toEqual([
    "LED_E2",
    "LED_A2",
    "LED_D3",
    "LED_G3",
    "LED_B3",
    "LED_E4",
    "LED_FLAT",
    "LED_TUNE",
    "LED_SHARP",
  ])

  const decouplingIssues = analysis.getIssues({
    issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
  })
  expect(decouplingIssues).toHaveLength(1)
  expect(
    decouplingIssues[0]?.lineItemType === "DecouplingCapacitorsNotCloseTogether"
      ? decouplingIssues[0].capacitorSchematicBoxes.map(
          (box) => box.sourceComponentName,
        )
      : [],
  ).toEqual(["C1", "C2", "C7", "C4"])
  expect(analysis.getIssues()).toHaveLength(10)

  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: [
        "TwoPinComponentShouldBeVertical",
        "DecouplingCapacitorsNotCloseTogether",
      ],
      showFullSchematic: true,
      showOverlay: true,
      showListingIssueMarkers: true,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
