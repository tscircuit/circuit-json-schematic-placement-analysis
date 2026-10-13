import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createReadingLampPinLabelBoundsCircuitJson } from "../assets/reading-lamp-pin-label-bounds"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("checks explicit and legacy boxes but skips non-box symbols and invisible pin labels", async () => {
  for (const variant of [
    "legacy",
    "box",
    "not-box",
    "hidden-labels",
  ] as const) {
    const circuitJson = await createReadingLampPinLabelBoundsCircuitJson()
    const box = circuitJson.find((e) => e.type === "schematic_component")!
    if (variant === "box") box.is_box_with_pins = true
    if (variant === "not-box") box.is_box_with_pins = false
    if (variant === "hidden-labels") {
      for (const port of circuitJson.filter((e) => e.type === "schematic_port"))
        delete port.display_pin_label
    }
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SchematicBoxInnerLabelOutOfBounds"],
    })
    expect(analysis.getIssues()).toHaveLength(
      variant === "box" || variant === "legacy" ? 1 : 0,
    )
  }
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board routingDisabled>
      <resistor name="R1" resistance="1k" schX={-2} />
      <chip
        name="U2"
        schX={2}
        pinLabels={{ pin1: "A", pin2: "B" }}
        symbol={
          <symbol>
            <schematicrect width={0.1} height={0.1} isFilled />
            <port name="pin1" direction="left" schX={-0.5} />
            <port name="pin2" direction="right" schX={0.5} />
          </symbol>
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  // Symbols may expose labels outside their drawing bounds; containment only
  // applies to box bodies, not built-in or custom schematic artwork.
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["SchematicBoxInnerLabelOutOfBounds"],
  })
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
