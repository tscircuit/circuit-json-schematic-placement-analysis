import { parseReproCircuitJson } from "../repros/import-circuit-json"
import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { wirelessMouseSensorSheetCircuitJson as circuitJson } from "../assets/wireless-mouse-sensor-sheet"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("suppresses the real sensor's unverified trace movement suggestions", () => {
  const imported = parseReproCircuitJson(JSON.stringify(circuitJson))
  expect(imported).toEqual(circuitJson)
  expect(() => parseReproCircuitJson("{}")).toThrow(
    "Expected a Circuit JSON array",
  )
  expect(() => parseReproCircuitJson("[null]")).toThrow("index 0")
  expect(() => parseReproCircuitJson("[]")).toThrow("No schematic components")
  const analysis = analyzeSchematicPlacement(imported)
  expect(
    Object.entries(analysis.getIssueCounts()).filter(([, count]) => count > 0),
  ).toEqual([
    ["TwoPinComponentCouldBeFlipped", 2],
    ["TwoPinComponentShouldBeVertical", 2],
    ["DecouplingCapacitorsNotCloseTogether", 2],
  ])
  expect(analysis.getIssues()).toHaveLength(6)
  const input = {
    circuitJson,
    analysis,
    issueTypes: ["TraceCanBeSimplifiedByMovingComponent" as const],
    showFullSchematic: true,
  }
  const svg = createIssueOverlaySvg(input)
  expect(analysis.getIssueCounts().TraceCanBeSimplifiedByMovingComponent).toBe(
    0,
  )
  expect(svg).not.toContain("data-issue-index=")
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
