import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { watchyI2cPullups as circuitJson } from "../assets/watchy-i2c-pullups"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("records the separated I2C pull-ups on the unchanged Watchy controls sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 16)
  expectReproNets(circuitJson, [
    ["R18.pin1", "U6.pin2", "net.SDA"],
    ["R20.pin1", "U6.pin12", "net.SCL"],
    ["R18.pin2", "R20.pin2", "net.P3V3"],
  ])

  const sdaPullup = getReproSchematicComponent(circuitJson, "R18")
  const sclPullup = getReproSchematicComponent(circuitJson, "R20")
  const accelerometer = getReproSchematicComponent(circuitJson, "U6")
  expect(sdaPullup.schematic_sheet_id).toBe("schematic_sheet_3")
  expect(sclPullup.schematic_sheet_id).toBe("schematic_sheet_3")
  expect(sdaPullup.center.y).toBeGreaterThan(accelerometer.center.y)
  expect(sclPullup.center.x).toBeGreaterThan(accelerometer.center.x)
  expect(Math.abs(sdaPullup.center.y - sclPullup.center.y)).toBeGreaterThan(1)

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis
      .getIssues()
      .filter(
        (issue) => String(issue.lineItemType) === "I2cPullupPairNotGrouped",
      ),
  ).toEqual([])
  const circuitSvg = createIssueOverlaySvg({
    circuitJson,
    analysis,
    schematicSheetId: "schematic_sheet_3",
    showFullSchematic: true,
    showOverlay: false,
    width: 1000,
    height: 750,
  })
  const matrix = circuitSvg.match(
    /data-real-to-screen-transform="matrix\(([^)]+)\)"/,
  )
  if (!matrix) throw new Error("Missing schematic transform")
  const [a, b, c, d, e, f] = matrix[1]!.split(/[\s,]+/).map(Number)
  const screen = (x: number, y: number) => ({
    x: a! * x + c! * y + e!,
    y: b! * x + d! * y + f!,
  })
  // Crop only the accelerometer block while analyzing the complete sheet.
  const topLeft = screen(21.8, -16.8)
  const bottomRight = screen(29.4, -22.5)
  const viewBox = `${topLeft.x} ${topLeft.y} ${bottomRight.x - topLeft.x} ${bottomRight.y - topLeft.y}`
  const focusedSvg = circuitSvg.replace(/^<svg\b[^>]*>/, (root) =>
    root.replace(/>$/, ` viewBox="${viewBox}">`),
  )
  const analysisSvg = createAnalyzerTextSvg(
    "Published Watchy controls sheet\nI2C pull-up pair finding: none in current analysis",
    1000,
  )
  expect(
    stackSvgsVertically(
      [
        `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750">${focusedSvg}</svg>`,
        analysisSvg,
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "focused")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
