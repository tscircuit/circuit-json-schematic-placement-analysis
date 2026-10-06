import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema23StatusCompact } from "../assets/nema23-status-compact"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("accepts a compact TSX branch layout with a modest middle-channel offset", async () => {
  // Real reference diagrams leave room for labels instead of enforcing a grid.
  const circuitJson = await createNema23StatusCompact({ branchOffset: 0.3 })
  expectReproRendered(circuitJson, 13)
  expect(analyzeSchematicPlacement(circuitJson).getIssues()).toEqual([])
})
