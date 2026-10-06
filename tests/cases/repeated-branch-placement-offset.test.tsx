import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema23Status } from "../assets/nema23-status"
import { createNema23BranchDetailSvg } from "../fixtures/create-nema23-branch-detail-svg"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("accepts a compact TSX branch layout with a modest middle-channel offset", async () => {
  // Real reference diagrams leave room for labels instead of enforcing a grid.
  const circuitJson = await createNema23Status({
    alignedBranches: true,
    branchOffset: 0.3,
  })
  expectReproRendered(circuitJson, 13)
  expect(analyzeSchematicPlacement(circuitJson).getIssues()).toEqual([])
  expect(createNema23BranchDetailSvg(circuitJson, -28.9)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
