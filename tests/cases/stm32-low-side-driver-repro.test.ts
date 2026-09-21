import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stm32MiniDevBoard as circuitJson } from "../assets/stm32-mini-dev-board"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("renders the complete unchanged published STM32 board", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(
    circuitJson.filter((e) => e.type.startsWith("schematic_")),
    29,
  )
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      showFullSchematic: true,
      showOverlay: false,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
