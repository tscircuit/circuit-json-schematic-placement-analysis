import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTextClearanceVariant } from "../assets/text-clearance-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("checks multiline text without flagging the clear control", async () => {
  for (const clear of [false, true]) {
    const circuitJson = await createTextClearanceVariant("multiline", clear)
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = getPlacementIssues(analysis).filter(
      (e) => e.lineItemType === "SchematicTextCollision",
    )
    expect(issues).toHaveLength(clear ? 0 : 1)
    if (!clear) expect(issues[0]!.collidingObject.type).toBe("trace")
    expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
    ).toMatchSvgSnapshot(import.meta.path, clear ? "clear" : undefined)
  }
})
