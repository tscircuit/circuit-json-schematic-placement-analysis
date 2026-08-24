import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { analyzeSchematicPlacementCircuitJson } from "../assets/analyze-schematic-placement"

test("does not output schematic box positions without an issue", () => {
  const analysis = analyzeSchematicPlacement(
    analyzeSchematicPlacementCircuitJson,
  )

  expect(analysis.getLineItems()).toEqual([])
  expect(analysis.toString()).toBe("")
  expect(analysis.getString()).toBe(analysis.toString())
})
