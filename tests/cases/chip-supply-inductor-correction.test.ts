import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createStridePedometer } from "../assets/stride-chip-supply-inductor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("moving only L1 beside U1 preserves the complete Stride connectivity", async () => {
  const before = await createStridePedometer()
  const after = await createStridePedometer(true)
  const sourceTypes = new Set([
    "source_component",
    "source_port",
    "source_net",
    "source_trace",
    "source_group",
  ])
  expect(after.filter((e) => sourceTypes.has(e.type))).toEqual(
    before.filter((e) => sourceTypes.has(e.type)),
  )
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
  expect(changed).toHaveLength(1)
  expect(changed[0]?.type).toBe("schematic_component")
  const part = after.find(
    (e) =>
      e.type === "source_component" &&
      changed[0]?.type === "schematic_component" &&
      e.source_component_id === changed[0].source_component_id,
  )
  expect(part?.type === "source_component" && part.name).toBe("L1")
  const analysis = analyzeSchematicPlacement(after)
  const beforeCounts = analyzeSchematicPlacement(before).getIssueCounts()
  expect(analysis.getIssueCounts()).toEqual({
    ...beforeCounts,
    InductorSeparatedFromChipPin: 0,
  })
  expect(analysis.getIssues()).toHaveLength(36)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1800,
      height: 1600,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
