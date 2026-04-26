import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"

test("returns an empty wrapper when there are no schematic boxes", () => {
  const analysis = analyzeSchematicPlacement([])

  expect(analysis.getLineItems()).toEqual([])
  expect(analysis.toString()).toBe(
    "<SchematicBoxPositions>\n</SchematicBoxPositions>",
  )
})
