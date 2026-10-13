import { beforeAll, expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createKeyboardSwitchDiodeRepro } from "../assets/keyboard-switch-series-diodes"

let before: CircuitJson

beforeAll(async () => {
  before = await createKeyboardSwitchDiodeRepro()
})

test("shows SW1 and D1 before and after at the same close-up scale", async () => {
  const after = await createKeyboardSwitchDiodeRepro(true)
  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssues()).toEqual([])
  const issue = baseline
    .getIssues()
    .find(
      (item) =>
        item.lineItemType === "SwitchMatrixDiodeSeparatedFromSwitch" &&
        item.switchSchematicBox.sourceComponentName === "SW1" &&
        item.diodeSchematicBox.sourceComponentName === "D1",
    )
  expect(issue).toBeDefined()
  const issueIndex = baseline.getIssues().indexOf(issue!)
  const width = 600
  const height = 525
  // Equal 6.4 × 5.6 schematic-unit windows. Recenter the corrected pair to
  // keep the neighboring RGB LED outside the close-up; the circuit is unchanged.
  const windows = [
    { left: 22.3, right: 28.7, bottom: 10.2, top: 15.8 },
    { left: 19.4, right: 25.8, bottom: 12.2, top: 17.8 },
  ] as const
  const drawings = [before, after].map(
    (circuitJson, index) =>
      renderIssueOverlay({
        circuitJson,
        analysis: index === 0 ? baseline : analysis,
        issueIndex,
        showOverlay: index === 0,
        showIssueGeometry: false,
        viewportBounds: windows[index]!,
        width,
        height,
      }).svg,
  )
  const diagnostic = "SW1 / D1: diode separated from switch."
  const descriptions = [
    createAnalyzerTextSvg(diagnostic, width, [
      { number: issueIndex + 1, text: diagnostic, sheetId: "" },
    ]),
    createAnalyzerTextSvg(
      "D1 is beside SW1 with a straight connecting wire.\nFull-sheet analysis: 0 reported issues.",
      width,
    ),
  ]
  const panels = drawings.map((drawing, index) => {
    // Each render contains the full sheet; scope IDs before embedding both crops.
    const scoped = drawing
      .replace(/\sid="([^"]+)"/g, ` id="pair-${index}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#pair-${index}-$1)`)
      .replace(/href="#([^"]+)"/g, `href="#pair-${index}-$1"`)
    return `<g transform="translate(${index * width} 0)">
<text x="18" y="35" font-family="sans-serif" font-size="24" fill="#172b3a">${index === 0 ? "Before" : "After"} — SW1 / D1</text>
<svg y="56" width="${width}" height="${height}" overflow="hidden">${scoped}</svg>
<g transform="translate(0 ${56 + height})">${descriptions[index]}</g>
</g>`
  })
  const descriptionHeight = Math.max(
    ...descriptions.map((svg) => Number(svg.match(/height="([\d.]+)"/)![1])),
  )
  const totalHeight = 56 + height + descriptionHeight
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 2}" height="${totalHeight}" viewBox="0 0 ${width * 2} ${totalHeight}">
<rect width="100%" height="100%" fill="white" />
${panels.join("\n")}
</svg>`
  expect(drawings[0]!.match(/data-issue-number=/g)).toHaveLength(2)
  expect(drawings[1]).not.toContain("data-issue-number=")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
