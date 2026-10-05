import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
  type SchematicPlacementIssue,
} from "lib/index"
import { SchematicPlacementPipeline } from "lib/solvers/SchematicPlacementPipeline/SchematicPlacementPipeline"
import { museviewCircuitJson as circuitJson } from "../assets/museview"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports Museview's long local passive connections and a verified direct buck wire across four unchanged sheets", () => {
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const longConnections = analysis.getIssues({
    issueTypes: ["LocalPassiveConnectionTooLong"],
  })
  expect(longConnections).toMatchObject([
    {
      firstComponent: { sourceComponentName: "J1", schematicSheetName: "usb" },
      secondComponent: { sourceComponentName: "R1" },
      pinDistance: 5.103001567705031,
      maxRecommendedPinDistance: 4,
    },
    {
      firstComponent: { sourceComponentName: "J1", schematicSheetName: "usb" },
      secondComponent: { sourceComponentName: "R2" },
      pinDistance: 5.50596267695305,
      maxRecommendedPinDistance: 4,
    },
    {
      firstComponent: { sourceComponentName: "U1", schematicSheetName: "mcu" },
      secondComponent: { sourceComponentName: "R13" },
      pinDistance: 14.401611020993451,
      maxRecommendedPinDistance: 4,
    },
  ])
  const directConnections = analysis.getIssues({
    issueTypes: ["LocalPassiveConnectionShouldBeDirectWire"],
  })
  expect(directConnections).toMatchObject([
    {
      firstComponent: {
        sourceComponentName: "U3",
        schematicSheetName: "power",
      },
      secondComponent: { sourceComponentName: "L1" },
      schematicNetLabelIds: [],
      schematicTextIds: ["schematic_text_51", "schematic_text_52"],
    },
  ])
  expect(analysis.getIssues()).toHaveLength(4)
  expect(analysis.getIssueCounts().LocalPassiveConnectionTooLong).toBe(3)
  expect(
    analysis.getIssueCounts().LocalPassiveConnectionShouldBeDirectWire,
  ).toBe(1)
  expect(analysis.getIssues({ schematicSheetId: "schematic_sheet_3" })).toEqual(
    [],
  )
  for (const issue of [...longConnections, ...directConnections]) {
    if (
      issue.lineItemType !== "LocalPassiveConnectionTooLong" &&
      issue.lineItemType !== "LocalPassiveConnectionShouldBeDirectWire"
    )
      throw new Error("Expected local passive issue")
    expect(issue.firstComponent.schematicSheetId).toBe(
      issue.secondComponent.schematicSheetId,
    )
  }
  // Existing rules still reproduce the original zero-findings result.
  const originalIssueTypes = Object.keys(analysis.getIssueCounts()).filter(
    (type) =>
      type !== "LocalPassiveConnectionTooLong" &&
      type !== "LocalPassiveConnectionShouldBeDirectWire",
  ) as SchematicPlacementIssue["lineItemType"][]
  expect(
    analyzeSchematicPlacement(circuitJson, {
      issueTypes: originalIssueTypes,
    }).toString(),
  ).toBe("")
  for (const issueType of [
    "LocalPassiveConnectionTooLong",
    "LocalPassiveConnectionShouldBeDirectWire",
  ] as const) {
    const selected = analyzeSchematicPlacement(circuitJson, {
      issueTypes: [issueType],
    })
    expect(selected.getIssues()).toEqual(
      analysis.getIssues({ issueTypes: [issueType] }),
    )
    const pipeline = new SchematicPlacementPipeline(circuitJson, {
      issueTypes: [issueType],
    })
    pipeline.solve()
    expect(Object.keys(pipeline.startTimeOfStage)).toEqual([
      issueType === "LocalPassiveConnectionTooLong"
        ? "LocalPassiveSpacingSolver"
        : "LocalPassiveNetLabelSolver",
    ])
  }
  const artifacts = createSchematicPlacementIssueArtifacts(circuitJson, {
    analysis,
  })
  expect(artifacts).toHaveLength(4)
  for (const artifact of artifacts) {
    expect(artifact.bounds).toBeDefined()
    expect(artifact.descriptionXml).toContain(`<${artifact.issue.lineItemType}`)
    expect(artifact.content.match(/data-issue-index=/g)).toHaveLength(1)
    expect(artifact.content).toMatchSvgSnapshot(
      import.meta.path,
      artifact.fileName,
    )
  }
  expect(
    artifacts.find(
      (artifact) =>
        artifact.issue.lineItemType ===
        "LocalPassiveConnectionShouldBeDirectWire",
    )!.content,
  ).toContain('stroke="#16a34a"')
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
      width: 1600,
      height: 1000,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheets")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
