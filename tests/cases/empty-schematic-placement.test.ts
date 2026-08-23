import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { emptySchematicPlacementCircuitJson } from "../assets/empty-schematic-placement"

test("returns an empty string when there are no issues", () => {
  const analysis = analyzeSchematicPlacement(emptySchematicPlacementCircuitJson)

  expect(analysis.getLineItems()).toEqual([])
  expect(analysis.toString()).toBe("")
})
