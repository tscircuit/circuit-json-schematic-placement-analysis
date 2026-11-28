import { beforeAll, expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import acousticGuitarTunerCircuitJson from "../assets/acoustic-guitar-tuner.circuit.json"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

const circuitJson = acousticGuitarTunerCircuitJson as CircuitJson
let defaultSvgRoot = ""
let croppedSvgRoot = ""

beforeAll(() => {
  const original = JSON.stringify(circuitJson)
  expect(circuitJson).toHaveLength(1430)
  expect(
    circuitJson.filter((element) => element.type === "schematic_component"),
  ).toHaveLength(40)

  const analysis = analyzeSchematicPlacement(circuitJson)
  const input = { circuitJson, analysis, width: 1400, height: 900 }
  const defaultSvg = createIssueOverlaySvg(input)
  const croppedSvg = createIssueOverlaySvg({
    ...input,
    showFullSchematic: false,
  })
  const fullSvg = createIssueOverlaySvg({
    ...input,
    showFullSchematic: true,
  })
  defaultSvgRoot = defaultSvg.match(/^<svg\b[^>]*>/)?.[0] ?? ""
  croppedSvgRoot = croppedSvg.match(/^<svg\b[^>]*>/)?.[0] ?? ""
  const fullSvgRoot = fullSvg.match(/^<svg\b[^>]*>/)?.[0] ?? ""
  expect(croppedSvgRoot).toContain("viewBox=")
  expect(fullSvgRoot).not.toContain("viewBox=")
  expect(defaultSvg).toBe(fullSvg)

  expect(
    createIssueReproSnapshot({ ...input, showFullSchematic: false }),
  ).toMatchSvgSnapshot(import.meta.path, "cropped")
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(
    import.meta.path,
    "full",
  )
  expect(JSON.stringify(circuitJson)).toBe(original)
})

test("shows the complete acoustic guitar tuner by default", () => {
  expect(defaultSvgRoot).not.toContain("viewBox=")
})
