import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("highlights the buck network on the complete power sheet", () => {
  const circuitJson = getRp2040BldcSheet("power")
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "BuckConverterNetworkNotGrouped")
  expect(issues).toHaveLength(1)
  expect(issues[0]!.regulatorSchematicBox.sourceComponentName).toBe("U_BUCK")
  expect(
    issues[0]!.distantComponents.map(
      (part) => part.schematicBox.sourceComponentName,
    ),
  ).toEqual(["R_FB_TOP", "R_FB_BOT"])
  expect(
    issues[0]!.supportNetworkComponents.map((part) => part.sourceComponentName),
  ).toEqual(["L_BUCK", "R_FB_TOP", "R_FB_BOT", "C_BOOT_BUCK", "D_BUCK"])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    issueTypes: ["BuckConverterNetworkNotGrouped"],
    showFullSchematic: true,
    width: 1800,
    height: 1200,
  })
  expect(
    new Set(
      [...svg.matchAll(/data-issue-type="([^"]+)"/g)].map((match) => match[1]),
    ),
  ).toEqual(new Set(["BuckConverterNetworkNotGrouped"]))
  const issueNumber = String(analysis.getIssues().indexOf(issues[0]!) + 1)
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((match) => match[1]),
  ).toEqual(Array(6).fill(issueNumber))
  // Other issues already draw U_BUCK's box; this issue still numbers it.
  const allIssuesSvg = createIssueOverlaySvg({
    circuitJson,
    analysis,
    showFullSchematic: true,
  })
  expect(
    [...allIssuesSvg.matchAll(/data-issue-number="(\d+)"/g)].filter(
      (match) => match[1] === issueNumber,
    ),
  ).toHaveLength(6)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
