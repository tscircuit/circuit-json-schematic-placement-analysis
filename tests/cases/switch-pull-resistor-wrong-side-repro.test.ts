import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsHorizontally, stackSvgsVertically } from "stack-svgs"
import { createSwitchPullResistorCircuitJson } from "../assets/switch-pull-resistor-wrong-side"
import { createAnalyzerTextSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("reports the RUN pull-up below its grounded button without pull metadata", async () => {
  const circuitJson = await createSwitchPullResistorCircuitJson()
  const correctedCircuitJson = await createSwitchPullResistorCircuitJson({
    layout: "vertical",
  })
  for (const circuit of [circuitJson, correctedCircuitJson]) {
    expectReproRendered(circuit, 2)
    expectReproNets(circuit, [
      ["R_RUN.pin1", "SW_RUN.pin1", "net.RUN"],
      ["R_RUN.pin2", "net.V3V3"],
      ["SW_RUN.pin2", "net.GND"],
    ])
  }
  expect(
    circuitJson.some(
      (e) =>
        e.type === "source_port" &&
        (e.needs_external_pullup || e.needs_external_pulldown),
    ),
  ).toBe(false)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({ issueTypes: ["PullResistorOnWrongSide"] }),
  ).toMatchObject([
    {
      lineItemType: "PullResistorOnWrongSide",
      resistorSchematicBox: { sourceComponentName: "R_RUN" },
      hostSchematicBox: { sourceComponentName: "SW_RUN" },
      pullDirection: "up",
      preferredSide: "above",
    },
  ])
  expect(
    analysis.getIssues({ issueTypes: ["TwoPinComponentShouldBeVertical"] }),
  ).toMatchObject([{ schematicBox: { sourceComponentName: "SW_RUN" } }])
  const correctedAnalysis = analyzeSchematicPlacement(correctedCircuitJson)
  // Orientation is corrected; the symbol reference still crosses its wire.
  expect(correctedAnalysis.getIssues()).toMatchObject([
    {
      lineItemType: "SchematicTextCollision",
      text: "SW_RUN",
      suggestedMove: undefined,
    },
  ])

  const snapshot = stackSvgsVertically(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="48">
      <rect width="1200" height="48" fill="white" />
      <text x="300" y="32" text-anchor="middle" font-family="sans-serif" font-size="24">Bad layout</text>
      <text x="900" y="32" text-anchor="middle" font-family="sans-serif" font-size="24">Corrected layout</text>
    </svg>`,
      stackSvgsHorizontally(
        [circuitJson, correctedCircuitJson].map((circuit) =>
          convertCircuitJsonToSchematicSvg(circuit, {
            width: 600,
            height: 500,
          }),
        ),
        { normalizeSize: false },
      ),
      createAnalyzerTextSvg(
        `${analysis.toString()}\nCorrected orientation:\n${correctedAnalysis.toString()}`,
        1200,
      ),
    ],
    { normalizeSize: false },
  )
  expect(snapshot.replace(/[ \t]+$/gm, "")).toMatchSvgSnapshot(import.meta.path)
})
