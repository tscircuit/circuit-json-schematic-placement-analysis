import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRp2040SectionHeadingWireCollisionCircuitJson } from "../assets/rp2040-section-heading-wire-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

beforeAll(async () => {
  const circuitJson = await createRp2040SectionHeadingWireCollisionCircuitJson()
  expectReproRendered(circuitJson, 3)
  expectReproNets(circuitJson, [
    ["R_TEMP_SCL.pin1", "R_TEMP_SDA.pin1", "R_TEMP_ALERT.pin1", "net.V3V3"],
    ["R_TEMP_SCL.pin2", "net.MCU_TEMP_SCL"],
    ["R_TEMP_SDA.pin2", "net.MCU_TEMP_SDA"],
    ["R_TEMP_ALERT.pin2", "net.MCU_TEMP_ALERT"],
  ])
  const heading = circuitJson.find(
    (element) =>
      element.type === "schematic_text" &&
      element.text === "Power-Stage Temperature Interlock",
  )
  if (heading?.type !== "schematic_text") throw new Error("Missing heading")
  expect(heading.anchor).toBe("top_left")
  expect(heading.font_size).toBe(0.18)
  // The V3V3 bus runs through the generated heading's vertical extent.
  // The stacked SVG verifies the intersection with the actual rendered glyphs.
  expect(
    circuitJson.some(
      (element) =>
        element.type === "schematic_trace" &&
        element.edges.some(
          ({ from, to }) =>
            Math.abs(from.y - to.y) < 0.001 &&
            from.y < heading.position.y &&
            from.y > heading.position.y - heading.font_size &&
            Math.min(from.x, to.x) <= heading.position.x + 0.5 &&
            Math.max(from.x, to.x) >= heading.position.x + 2,
        ),
    ),
  ).toBe(true)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    height: 300,
    highlightIssues: ["SchematicTextCollision"],
  })
  expect(svg).toContain('data-issue-type="SchematicTextCollision"')
  expect(svg).toContain('stroke-opacity="0.55"')
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
  issueTypes = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues"
        ? item.issues.map((issue) => issue.lineItemType)
        : [],
    )
})

test("reports a generated section heading crossed by the pull-up supply bus", () => {
  expect(issueTypes).toContain("SchematicTextCollision")
})
