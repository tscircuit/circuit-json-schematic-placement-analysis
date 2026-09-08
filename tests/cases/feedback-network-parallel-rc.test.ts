import { expect, test } from "bun:test"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("reports a distant parallel feedback capacitor once and includes its compact resistor as context", async () => {
  const circuitJson = await createFeedbackNetworkScatteredCircuitJson({
    feedbackY: 2,
    capacitorY: 7,
  })
  expectReproRendered(circuitJson, 4)
  expectReproNets(circuitJson, [
    ["U1.output", "R1.pin2", "C1.pin2"],
    ["U1.inverting_input", "R1.pin1", "C1.pin1"],
  ])
  const { feedback, analysis } = inspectNetworkFixture(
    circuitJson,
    import.meta.path,
  )
  expect(feedback).toHaveLength(1)
  expect(
    feedback[0]!.feedbackComponents
      .map((box) => box.sourceComponentName)
      .sort(),
  ).toEqual(["C1", "R1"])
  expect(
    feedback[0]!.distantComponents.map(
      ({ schematicBox }) => schematicBox.sourceComponentName,
    ),
  ).toEqual(["C1"])
  const context = analysis
    .getLineItems()
    .filter((item) => item.lineItemType === "SchematicBoxPlacement")
    .map((item) => item.sourceComponentName)
  expect(context).toContain("U1")
  expect(context).toContain("R1")
  expect(context).toContain("C1")
})
