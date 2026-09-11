import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { importedFullSchematicCircuitJson as circuitJson } from "../assets/imported-full-schematic"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

let croppedSvgRoot = ""

beforeAll(() => {
  const original = JSON.stringify(circuitJson)
  expect(circuitJson).toHaveLength(1430)
  expect(
    circuitJson.filter((element) => element.type === "schematic_component"),
  ).toHaveLength(40)

  const analysis = analyzeSchematicPlacement(circuitJson)
  const input = { circuitJson, analysis, width: 1400, height: 900 }
  const croppedSvg = createIssueOverlaySvg(input)
  const fullSvg = createIssueOverlaySvg({
    ...input,
    showFullSchematic: true,
  })
  croppedSvgRoot = croppedSvg.match(/^<svg\b[^>]*>/)?.[0] ?? ""
  const fullSvgRoot = fullSvg.match(/^<svg\b[^>]*>/)?.[0] ?? ""
  expect(croppedSvgRoot).toContain("viewBox=")
  expect(fullSvgRoot).not.toContain("viewBox=")

  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(
    import.meta.path,
    "cropped",
  )
  expect(
    createIssueReproSnapshot({ ...input, showFullSchematic: true }),
  ).toMatchSvgSnapshot(import.meta.path, "full")
  expect(JSON.stringify(circuitJson)).toBe(original)
})

test.failing("shows the complete imported circuit by default", () => {
  expect(croppedSvgRoot).not.toContain("viewBox=")
})
