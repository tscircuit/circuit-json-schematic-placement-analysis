import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { renderRp2040InputSymbol } from "../assets/rp2040-bldc-controller/input-symbols"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("width and padding validation use geometry and skip incomplete pin metadata", async () => {
  const original = await renderRp2040InputSymbol("J_PD", { width: 8 })
  const renamed = structuredClone(original)
  for (const element of renamed) {
    if (element.type === "source_component")
      element.name = "different_reference"
    if (element.type === "source_port") {
      element.name = "unrelated_name"
      element.port_hints = ["VCC", "GND", "anything"]
    }
    if (element.type === "schematic_port" && element.display_pin_label) {
      element.display_pin_label = "X".repeat(
        Array.from(element.display_pin_label).length,
      )
    }
  }
  const originalIssues = analyzeSchematicPlacement(original)
    .getIssues()
    .filter((issue) => issue.lineItemType === "GenericSchematicBoxTooWide")
  const renamedAnalysis = analyzeSchematicPlacement(renamed)
  const renamedIssues = renamedAnalysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "GenericSchematicBoxTooWide")
  expect(originalIssues).toHaveLength(1)
  expect(renamedIssues).toHaveLength(1)
  expect(renamedIssues[0]!.suggestedSchWidth).toBe(
    originalIssues[0]!.suggestedSchWidth,
  )
  expect(renamedIssues[0]!.measuredInnerLabelHorizontalEmptySpace).toBe(
    originalIssues[0]!.measuredInnerLabelHorizontalEmptySpace,
  )
  const originalPadding = analyzeSchematicPlacement(original)
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
  const renamedPadding = renamedAnalysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
  expect(originalPadding).toHaveLength(1)
  expect(renamedPadding).toHaveLength(1)
  expect(renamedPadding[0]!.suggestedSchWidth).toBe(
    originalPadding[0]!.suggestedSchWidth,
  )
  expect(renamedPadding[0]!.suggestedSchHeight).toBe(
    originalPadding[0]!.suggestedSchHeight,
  )

  const snapshots = [
    createIssueReproSnapshot({
      circuitJson: renamed,
      analysis: renamedAnalysis,
      width: 1200,
      height: 450,
      showFullSchematic: true,
      showOverlay: false,
    }),
  ]
  for (const missing of ["side", "spacing"] as const) {
    const incomplete = structuredClone(original)
    if (missing === "side") {
      const port = incomplete
        .filter((element) => element.type === "schematic_port")
        .find((element) => element.side_of_component === "bottom")!
      delete port.side_of_component
    } else {
      const component = incomplete.find(
        (element) => element.type === "schematic_component",
      )!
      delete component.pin_spacing
    }
    const analysis = analyzeSchematicPlacement(incomplete)
    expect(
      analysis.getIssues({
        issueTypes: [
          "GenericSchematicBoxTooWide",
          "SchematicPinPaddingToEdgeTooLarge",
        ],
      }),
    ).toHaveLength(0)
    snapshots.push(
      createIssueReproSnapshot({
        circuitJson: incomplete,
        analysis,
        width: 1200,
        height: 450,
        showFullSchematic: true,
        showOverlay: false,
      }),
    )
  }
  await expect(
    stackSvgsVertically(snapshots, { normalizeSize: false, gap: 0 }),
  ).toMatchSvgSnapshot(import.meta.path)
})
