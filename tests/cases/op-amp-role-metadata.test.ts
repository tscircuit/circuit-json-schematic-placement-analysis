import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("uses explicit op-amp port IDs for feedback and skips unknown capacitor roles", async () => {
  const circuitJson = await createFeedbackNetworkScatteredCircuitJson({
    capacitorY: 3,
  })
  const modelOf = (json: CircuitJson) => {
    const model = json.find((e) => e.type === "simulation_op_amp")
    if (!model) throw new Error("Expected the native op-amp to emit its model")
    return model
  }
  const findings = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, {
      issueTypes: ["FeedbackNetworkNotCompact", "CapacitorSymbolHorizontal"],
    }).getIssues()
  const model = modelOf(circuitJson)
  const expected = {
    lineItemType: "FeedbackNetworkNotCompact",
    outputSourcePortId: model.output_source_port_id,
    invertingInputSourcePortId: model.inverting_input_source_port_id,
  }
  expect(findings(circuitJson)).toMatchObject([expected])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis: analyzeSchematicPlacement(circuitJson, {
        issueTypes: ["FeedbackNetworkNotCompact", "CapacitorSymbolHorizontal"],
      }),
      highlightIssues: ["FeedbackNetworkNotCompact"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)

  // Display names, aliases, and element order do not establish terminal roles.
  const renamed = structuredClone(circuitJson).reverse()
  for (const e of renamed) {
    if (e.type === "source_component") e.name = `part_${e.source_component_id}`
    if (e.type === "source_port") {
      e.name = "unclassified"
      e.port_hints = ["output", "inverting_input", "non_inverting_input"]
    }
    if (e.type === "source_net") e.name = `net_${e.source_net_id}`
  }
  expect(findings(renamed)).toMatchObject([expected])
  const withoutOwner = structuredClone(renamed)
  delete modelOf(withoutOwner).source_component_id
  expect(findings(withoutOwner)).toMatchObject([expected])

  const guards: Record<string, (json: CircuitJson) => CircuitJson> = {
    "missing model despite familiar pin names": (json) =>
      json.filter((e) => e.type !== "simulation_op_amp"),
    "missing terminal": (json) => {
      modelOf(json).inverting_input_source_port_id = "missing-port"
      return json
    },
    "terminal owned by another component": (json) => {
      modelOf(json).output_source_port_id = json
        .filter((e) => e.type === "source_port")
        .find(
          (e) => e.source_component_id !== model.source_component_id,
        )!.source_port_id
      return json
    },
    "conflicting terminal roles": (json) => {
      modelOf(json).inverting_input_source_port_id = model.output_source_port_id
      return json
    },
    "multiple models": (json) => {
      json.push({ ...modelOf(json), simulation_op_amp_id: "duplicate-model" })
      return json
    },
    "duplicate source port": (json) => {
      json.push({
        ...json.find(
          (e) =>
            e.type === "source_port" &&
            e.source_port_id === model.output_source_port_id,
        )!,
      })
      return json
    },
    "unconnectable terminal": (json) => {
      for (const e of json)
        if (
          e.type === "source_port" &&
          e.source_port_id === model.output_source_port_id
        )
          e.do_not_connect = true
      return json
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    expect(findings(mutate(structuredClone(circuitJson))), name).toEqual([])
  }

  // Valid metadata can establish that the same capacitor is between two inputs.
  const inputToInput = structuredClone(circuitJson)
  const otherModel = modelOf(inputToInput)
  ;[
    otherModel.output_source_port_id,
    otherModel.non_inverting_input_source_port_id,
  ] = [
    otherModel.non_inverting_input_source_port_id,
    otherModel.output_source_port_id,
  ]
  expect(findings(inputToInput)).toMatchObject([
    { lineItemType: "CapacitorSymbolHorizontal" },
  ])

  const positiveFeedback = await createFeedbackNetworkScatteredCircuitJson({
    feedbackInput: "non_inverting_input",
    capacitorY: 3,
  })
  for (const e of positiveFeedback)
    if (e.type === "source_port") {
      e.name = e.source_port_id
      delete e.port_hints
    }
  expect(findings(positiveFeedback)).toEqual([])
})
