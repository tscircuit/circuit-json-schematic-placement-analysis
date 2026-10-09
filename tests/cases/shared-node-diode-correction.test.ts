import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRp2040LogicPower } from "../assets/rp2040-shared-node-diodes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("moving only D2 and D5 beside one another preserves the complete power sheet connectivity", async () => {
  const before = await createRp2040LogicPower()
  const after = await createRp2040LogicPower(true)
  expect(
    after.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
        "source_group",
      ].includes(e.type),
    ),
  ).toEqual(
    before.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
        "source_group",
      ].includes(e.type),
    ),
  )
  const analysis = analyzeSchematicPlacement(after)
  expect(
    analysis.getIssues({ issueTypes: ["SharedNodeDiodesInline"] }),
  ).toEqual([])
  const existing = analyzeSchematicPlacement(before)
    .getIssues()
    .filter((i) => i.lineItemType !== "SharedNodeDiodesInline")
  const previousMessages = existing.map((i) =>
    analysis.schematicIssuesToString(i),
  )
  expect(analysis.getIssues()).toHaveLength(5)
  for (const issue of analysis.getIssues())
    expect(previousMessages).toContain(analysis.schematicIssuesToString(issue))
  const changed = after.filter(
    (e) =>
      e.type === "schematic_component" &&
      JSON.stringify(e) !==
        JSON.stringify(
          before.find(
            (b) =>
              b.type === "schematic_component" &&
              b.schematic_component_id === e.schematic_component_id,
          ),
        ),
  )
  expect(
    changed
      .map(
        (e) =>
          e.type === "schematic_component" &&
          after.find(
            (c) =>
              c.type === "source_component" &&
              c.source_component_id === e.source_component_id,
          ),
      )
      .map((c) => c && c.type === "source_component" && c.name)
      .sort(),
  ).toEqual(["D2", "D5"])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
