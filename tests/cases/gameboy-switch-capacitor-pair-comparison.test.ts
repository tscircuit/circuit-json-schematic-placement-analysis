import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { createGameboySwitchCapacitorRepro } from "../assets/gameboy-switch-capacitors"

test("shows one complete switch/capacitor/pull branch before and after at equal scale", async () => {
  const before = await createGameboySwitchCapacitorRepro()
  const after = await createGameboySwitchCapacitorRepro("grouped")
  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssues()).toEqual([])
  const issueIndex = baseline
    .getIssues()
    .findIndex(
      (issue) =>
        issue.lineItemType === "CapacitorSeparatedFromSwitch" &&
        issue.switchSchematicBox.sourceComponentName === "SW3",
    )
  expect(issueIndex).toBeGreaterThanOrEqual(0)
  const width = 950
  const height = 475
  const pixelsPerUnit = width / 13
  const windows = [
    { left: -19.5, right: -6.5, bottom: 10.5, top: 17 },
    { left: -15, right: -8.7, bottom: 10.9, top: 15.3 },
  ]
  // Translate the corrected close-up and keep its pixels/unit unchanged. Its
  // smaller clip excludes the next branch, which moved much closer in the sheet.
  const drawings = [before, after].map((circuitJson, i) => {
    const bounds = windows[i]!
    const w = (bounds.right - bounds.left) * pixelsPerUnit
    const h = (bounds.top - bounds.bottom) * pixelsPerUnit
    const svg = renderIssueOverlay({
      circuitJson,
      analysis: i === 0 ? baseline : analysis,
      schematicSheetId: "schematic_sheet_0",
      issueIndex,
      showOverlay: i === 0,
      showIssueGeometry: false,
      viewportBounds: bounds,
      width: w,
      height: h,
    }).svg
    const matrix = svg
      .match(/data-real-to-screen-transform="matrix\(([^)]+)\)"/)![1]!
      .split(/[,\s]+/)
      .map(Number)
    const viewBox = svg
      .match(/viewBox="([^"]+)"/)![1]!
      .split(" ")
      .map(Number)
    expect((matrix[0]! * w) / viewBox[2]!).toBeCloseTo(pixelsPerUnit, 6)
    const scoped = svg
      .replace(/\sid="([^"]+)"/g, ` id="detail-${i}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#detail-${i}-$1)`)
      .replace(/href="#([^"]+)"/g, `href="#detail-${i}-$1"`)
    return `<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f3f0eb"/><svg x="${(width - w) / 2}" y="${(height - h) / 2}" width="${w}" height="${h}" overflow="hidden">${scoped}</svg></svg>`
  })
  const diagnostic = "SW3 / C45: parallel branches separated."
  const descriptions = [
    createAnalyzerTextSvg(diagnostic, width, [
      {
        number: issueIndex + 1,
        text: diagnostic,
        sheetId: "schematic_sheet_0",
      },
    ]),
    createAnalyzerTextSvg(
      "Adjacent parallel branches with continuous local wires.\nFull controls-sheet analysis: 0 reported issues.",
      width,
    ),
  ]
  const totalHeight =
    56 +
    height +
    Math.max(
      ...descriptions.map((svg) => Number(svg.match(/height="([\d.]+)"/)![1])),
    )
  const panels = drawings.map(
    (drawing, i) =>
      `<g transform="translate(${i * width} 0)"><text x="18" y="35" font-family="sans-serif" font-size="24" fill="#172b3a">${i === 0 ? "Before" : "After"} — SW3 / C45 / R26</text><svg y="56" width="${width}" height="${height}">${drawing}</svg><g transform="translate(0 ${56 + height})">${descriptions[i]}</g></g>`,
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${2 * width}" height="${totalHeight}" viewBox="0 0 ${2 * width} ${totalHeight}"><rect width="100%" height="100%" fill="white"/>${panels.join("\n")}<line x1="${width}" y1="0" x2="${width}" y2="${totalHeight}" stroke="#9ca3af" stroke-width="2"/></svg>`
  expect(drawings[0]!.match(/data-issue-number=/g)).toHaveLength(2)
  expect(svg.replace(/[ \t]+$/gm, "")).toMatchSvgSnapshot(import.meta.path)
})
