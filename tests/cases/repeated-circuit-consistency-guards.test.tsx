import { describe, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRepeatedCircuitGuardCircuitJson } from "../assets/repeated-circuit-consistency-guards"

describe("RepeatedCircuitConsistencySolver guards", () => {
  test("does not report three consistently placed RC channels", async () => {
    const circuitJson =
      await createRepeatedCircuitGuardCircuitJson("consistent")
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["RepeatedCircuitLayoutInconsistent"],
    })
    expect(analysis.getIssues()).toHaveLength(0)
  })

  test("does not report two RC channels without a majority template", async () => {
    const circuitJson =
      await createRepeatedCircuitGuardCircuitJson("two-channels")
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["RepeatedCircuitLayoutInconsistent"],
    })
    expect(analysis.getIssues()).toHaveLength(0)
  })

  test("does not group RC channels with non-matching component values", async () => {
    const circuitJson =
      await createRepeatedCircuitGuardCircuitJson("distinct-values")
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["RepeatedCircuitLayoutInconsistent"],
    })
    expect(analysis.getIssues()).toHaveLength(0)
  })
})
