import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsHorizontally, stackSvgsVertically } from "stack-svgs"
import { createSwitchPullResistorCircuitJson as createCircuit } from "../assets/switch-pull-resistor-wrong-side"
import { createAnalyzerTextSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getReproSourcePort } from "../fixtures/placement-repro-assertions"

test("accepts horizontal pushbutton pairs but rejects mixed pairs and horizontal switches", async () => {
  const mixed = await createCircuit({ layout: "mixed" })
  const horizontal = await createCircuit({ layout: "horizontal" })
  const mixedAnalysis = analyzeSchematicPlacement(mixed)
  expect(mixedAnalysis.getIssues()).toMatchObject([
    {
      lineItemType: "TwoPinComponentShouldBeVertical",
      schematicBox: { sourceComponentName: "SW_RUN" },
    },
  ])
  expect(analyzeSchematicPlacement(horizontal).getIssues()).toEqual([])
  const otherMixed = await createCircuit({
    layout: "horizontal",
    switchRotation: 270,
  })
  expect(
    analyzeSchematicPlacement(otherMixed).getIssues({
      issueTypes: ["TwoPinComponentShouldBeVertical"],
    }),
  ).toMatchObject([{ schematicBox: { sourceComponentName: "R_RUN" } }])
  const ordinarySwitch = await createCircuit({
    layout: "horizontal",
    switchType: "switch",
  })
  expect(
    analyzeSchematicPlacement(ordinarySwitch).getIssues({
      issueTypes: ["TwoPinComponentShouldBeVertical"],
    }),
  ).toMatchObject([
    { schematicBox: { sourceComponentName: "SW_RUN" } },
    { schematicBox: { sourceComponentName: "R_RUN" } },
  ])
  expect(
    analyzeSchematicPlacement(
      await createCircuit({ layout: "vertical", switchType: "switch" }),
    ).getIssues(),
  ).toMatchObject([
    {
      lineItemType: "SchematicTextCollision",
      text: "SW_RUN",
      suggestedMove: undefined,
    },
  ])

  // Both horizontal remains exempt from the wrong-side rule, even below the button
  // and with an explicit pull-up requirement. Filtering must preserve the exception.
  const below = await createCircuit({ layout: "horizontal", resistorY: -4 })
  for (const declared of [false, true]) {
    getReproSourcePort(below, "SW_RUN", "pin1").needs_external_pullup = declared
    for (const issueTypes of [
      undefined,
      ["PullResistorOnWrongSide" as const],
      ["TwoPinComponentShouldBeVertical" as const],
    ]) {
      expect(
        analyzeSchematicPlacement(below, { issueTypes }).getIssues(),
      ).toEqual([])
    }
  }
  // An IC reading RUN does not change the accepted orientation of the pair.
  below.push(
    {
      type: "source_component",
      ftype: "simple_chip",
      source_component_id: "input",
      name: "U_INPUT",
    },
    {
      ...getReproSourcePort(below, "SW_RUN", "pin1"),
      source_port_id: "input-port",
      source_component_id: "input",
      name: "RUN",
    },
  )
  expect(analyzeSchematicPlacement(below).getIssues()).toEqual([])

  const snapshot = stackSvgsVertically(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="48">
      <rect width="1200" height="48" fill="white" />
      <text x="300" y="32" text-anchor="middle" font-family="sans-serif" font-size="24">Mixed orientations (bad)</text>
      <text x="900" y="32" text-anchor="middle" font-family="sans-serif" font-size="24">Both horizontal (accepted pushbutton)</text>
    </svg>`,
      stackSvgsHorizontally(
        [mixed, horizontal].map((circuit) =>
          convertCircuitJsonToSchematicSvg(circuit, {
            width: 600,
            height: 400,
          }),
        ),
        { normalizeSize: false },
      ),
      createAnalyzerTextSvg(
        `${mixedAnalysis.toString()}\nBoth horizontal: no placement issues.`,
        1200,
      ),
    ],
    { normalizeSize: false },
  )
  expect(snapshot.replace(/[ \t]+$/gm, "")).toMatchSvgSnapshot(import.meta.path)
})
