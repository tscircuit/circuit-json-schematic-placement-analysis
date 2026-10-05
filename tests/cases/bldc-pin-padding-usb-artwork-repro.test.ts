import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { getSchematicBoxGraphicBounds } from "lib/utils/schematic-box-graphics"
import {
  getSchematicBoxLabelRects,
  schematicLabelRectsOverlap,
} from "lib/utils/schematic-box-labels"
import { getPinLabelLength } from "lib/utils/schematic-box-resize"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("native USB-C sizing preserves both the pin labels and internal artwork", async () => {
  const circuitJson = await renderBldcSymbol("J1")
  expect(
    circuitJson.find((element) => element.type === "source_component"),
  ).toMatchObject({ ftype: "simple_connector", standard: "usb_c" })
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: [
      "SchematicPinPaddingToEdgeTooLarge",
      "GenericSchematicBoxTooWide",
    ],
  })
  expect(issues).toHaveLength(0)
  // Re-render the same real TSX connector with excess width. Artwork must
  // constrain a suggestion without categorically disabling USB-C resizing.
  const wide = await renderBldcSymbol("J1", { schWidth: 8 })
  const wideAnalysis = analyzeSchematicPlacement(wide)
  const suggestions = wideAnalysis
    .getIssues()
    .filter(
      (issue) =>
        issue.lineItemType === "GenericSchematicBoxTooWide" ||
        issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
  expect(suggestions).toHaveLength(2)
  expect(suggestions[0]!.suggestedSchWidth).toBeGreaterThan(1.96) // the label-only proposal
  const cases = [
    { circuitJson, analysis },
    { circuitJson: wide, analysis: wideAnalysis },
  ]
  let currentAnalysis = wideAnalysis
  let currentWidth = 8
  let passes = 0
  // Core rescales the drawing on re-render. Each subsequent suggestion must
  // preserve that newly rendered footprint, and converge without collisions.
  while (true) {
    const pending = currentAnalysis
      .getIssues()
      .filter(
        (issue) =>
          issue.lineItemType === "GenericSchematicBoxTooWide" ||
          issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      )
    if (!pending.length) break
    expect(++passes).toBeLessThanOrEqual(5)
    const width = pending[0]!.suggestedSchWidth!
    expect(width).toBeLessThan(currentWidth)
    expect(pending[1]!.suggestedSchWidth).toBe(width)
    const resized = await renderBldcSymbol("J1", { schWidth: width })
    const resizedAnalysis = analyzeSchematicPlacement(resized)
    const component = resized.find(
      (element) => element.type === "schematic_component",
    )!
    const graphics = getSchematicBoxGraphicBounds(
      resized,
      component.schematic_component_id,
    )!
    expect(graphics).toBeDefined()
    expect(graphics.xMin).toBeGreaterThan(
      component.center.x - component.size.width / 2,
    )
    expect(graphics.xMax).toBeLessThan(
      component.center.x + component.size.width / 2,
    )
    expect(graphics.yMin).toBeGreaterThan(
      component.center.y - component.size.height / 2,
    )
    expect(graphics.yMax).toBeLessThan(
      component.center.y + component.size.height / 2,
    )
    const labels = getSchematicBoxLabelRects(
      {
        positionAnchor: "center",
        schX: component.center.x,
        schY: component.center.y,
        width: component.size.width,
        height: component.size.height,
      },
      resized
        .filter((element) => element.type === "schematic_port")
        .filter(
          (element) =>
            element.schematic_component_id === component.schematic_component_id,
        ),
      getPinLabelLength,
    )
    for (const label of labels)
      expect(schematicLabelRectsOverlap(label, graphics)).toBe(false)
    cases.push({ circuitJson: resized, analysis: resizedAnalysis })
    currentAnalysis = resizedAnalysis
    currentWidth = width
  }
  expect(currentAnalysis.getIssues()).toHaveLength(0)
  await expect(
    stackSvgsVertically(
      cases.map(({ circuitJson, analysis }) =>
        createIssueReproSnapshot({
          width: 1200,
          showFullSchematic: true,
          showOverlay: false,
          showListingIssueMarkers: true,
          circuitJson,
          analysis,
          height: 550,
        }),
      ),
      { normalizeSize: false, gap: 0 },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
