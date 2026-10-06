import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createStaggeredChipLabelsCircuitJson } from "../assets/staggered-chip-labels"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("clears staggered label warnings after resizing and accepts narrow glyphs", async () => {
  for (const vertical of [false, true]) {
    for (const control of [
      { name: "resized", dimension: 1.8 },
      {
        name: "narrow",
        dimension: 0.8,
        labels: { pin1: "IIIIII", pin2: "llllll", pin3: "iiiiii" },
      },
    ]) {
      const circuitJson = await createStaggeredChipLabelsCircuitJson({
        vertical,
        ...control,
      })
      const analysis = analyzeSchematicPlacement(circuitJson, {
        issueTypes: ["SchematicBoxInnerLabelCollision"],
      })
      expect(
        circuitJson.filter((element) => element.type === "schematic_port"),
      ).toHaveLength(3)
      expect(analysis.getIssues()).toEqual([])
      expect(
        createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
      ).toMatchSvgSnapshot(
        import.meta.path,
        `${vertical ? "top-bottom" : "left-right"}-${control.name}`,
      )
    }
  }
})
