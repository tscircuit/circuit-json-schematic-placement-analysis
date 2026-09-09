import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import {
  getTrellisCoreSheetCircuitJson,
  trellisCoreCircuitJson,
} from "../assets/trellis-core"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reports the four scattered decoupling banks in Trellis Core's CPU sheet", () => {
  const original = JSON.stringify(trellisCoreCircuitJson)
  expectReproRendered(trellisCoreCircuitJson, 92)
  expect(
    trellisCoreCircuitJson
      .filter((element) => element.type === "schematic_sheet")
      .map((sheet) => sheet.name),
  ).toEqual(["power", "cpu-core", "cpu-io", "storage", "usb"])

  const circuitJson = getTrellisCoreSheetCircuitJson("cpu-core")
  expectReproRendered(circuitJson, 40)
  const caps = (first: number, last: number, pin: number) =>
    Array.from(
      { length: last - first + 1 },
      (_, i) => `C${first + i}.pin${pin}`,
    )
  expectReproNets(circuitJson, [
    ["net.P3V3", ...caps(9, 15, 1)],
    ["net.P1V8", ...caps(16, 21, 1), "C34.pin1", "C35.pin1"],
    ["net.P0V9", ...caps(22, 27, 1)],
    ["net.P1V5", ...caps(28, 31, 1)],
    ["net.GND", ...caps(9, 31, 2), "C34.pin2", "C35.pin2"],
  ])

  // Preserve the reviewed placement: the P3V3 bank spans 12 schematic units;
  // P1V8 also has C34/C35 in a separate cluster below C16–C21.
  for (const [name, x, y] of [
    ["C9", -12, 8],
    ["C15", 0, 8],
    ["C16", 2, 8],
    ["C21", 12, 8],
    ["C34", 5, 5],
    ["C35", 7, 5],
  ] as const) {
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  }

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.entries(analysis.getIssueCounts()).filter(([, count]) => count > 0),
  ).toEqual([
    ["TraceCanBeSimplifiedByMovingComponent", 3],
    ["CrystalNotCenteredOverLoadCapacitors", 1],
    ["TwoPinComponentShouldBeVertical", 5],
    ["DecouplingCapacitorsNotCloseTogether", 4],
  ])
  const banks = analysis.getIssues({
    issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
  })
  expect(
    banks
      .map((issue) => {
        if (issue.lineItemType !== "DecouplingCapacitorsNotCloseTogether")
          throw new Error("Expected capacitor grouping issue")
        expect(issue.maxBodyGap).toBeGreaterThan(issue.maxRecommendedBodyGap)
        return [
          issue.railName,
          issue.capacitorSchematicBoxes
            .map((box) => box.sourceComponentName)
            .sort(),
        ]
      })
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  ).toEqual([
    ["P0V9", ["C22", "C23", "C24", "C25", "C26", "C27"]],
    ["P1V5", ["C28", "C29", "C30", "C31"]],
    ["P1V8", ["C16", "C17", "C18", "C19", "C20", "C21", "C34", "C35"]],
    ["P3V3", ["C10", "C11", "C12", "C13", "C14", "C15", "C9"]],
  ])
  // Shared supply nets on other sheets must not change the CPU banks.
  const fullAnalysis = analyzeSchematicPlacement(trellisCoreCircuitJson)
  expect(
    fullAnalysis.getIssues({
      issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
      schematicSheetId: "schematic_sheet_1",
    }),
  ).toEqual(banks)
  const artifacts = createSchematicPlacementIssueArtifacts(
    trellisCoreCircuitJson,
    {
      analysis: fullAnalysis,
      schematicSheetId: "schematic_sheet_1",
      issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
      height: 450,
    },
  )
  expect(artifacts).toHaveLength(4)
  for (const artifact of artifacts) {
    const issue = artifact.issue
    if (issue.lineItemType !== "DecouplingCapacitorsNotCloseTogether")
      throw new Error("Expected capacitor grouping artifact")
    expect(artifact.schematicSheetId).toBe("schematic_sheet_1")
    expect(artifact.bounds).toBeDefined()
    expect(artifact.content.match(/data-issue-index=/g)).toHaveLength(1)
    expect(artifact.descriptionXml).toContain(
      "<DecouplingCapacitorsNotCloseTogether",
    )
    expect(artifact.descriptionXml).toContain('capacitorNames="')
    expect(artifact.descriptionXml).not.toContain("firstCapacitorName")
    expect(artifact.descriptionXml).not.toContain("secondCapacitorName")
    // Each real rail gets its own cropped schematic and diagnostic underneath.
    expect(artifact.content).toMatchSvgSnapshot(
      import.meta.path,
      issue.railName,
    )
  }
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1800,
      height: 1200,
      highlightIssues: ["DecouplingCapacitorsNotCloseTogether"],
    }).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(trellisCoreCircuitJson)).toBe(original)
})
