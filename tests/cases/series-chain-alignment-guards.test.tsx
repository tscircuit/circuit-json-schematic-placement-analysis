import { describe, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSeriesChainGuardCircuitJson } from "../assets/series-chain-alignment-guards"

describe("SeriesChainAlignmentSolver guards", () => {
  test("does not report a horizontally aligned R-L-R series chain", async () => {
    const circuitJson = await createSeriesChainGuardCircuitJson("horizontal")
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SeriesChainNotAligned"],
    })
    expect(analysis.getIssues()).toHaveLength(0)
  })

  test("does not report a vertically aligned R-C-R series chain", async () => {
    const circuitJson = await createSeriesChainGuardCircuitJson("vertical")
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SeriesChainNotAligned"],
    })
    expect(analysis.getIssues()).toHaveLength(0)
  })

  test("does not treat a diode-interrupted R-D-R path as a passive series chain", async () => {
    const circuitJson = await createSeriesChainGuardCircuitJson("diode")
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SeriesChainNotAligned"],
    })
    expect(analysis.getIssues()).toHaveLength(0)
  })
})
