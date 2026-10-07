import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSpeakerChargerResistorRepro } from "../assets/speaker-charger-resistor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("preserves the complete speaker charger sheet with R17 across U6 from its connected pin", async () => {
  const circuitJson = await createSpeakerChargerResistorRepro()
  expectReproRendered(circuitJson, 9)
  expectReproNets(circuitJson, [
    ["U6.PROG", "R17.pin2"],
    ["U6.GND", "U6.EP", "R17.pin1", "C40.pin2", "C41.pin2"],
    ["U6.BAT", "C40.pin1"],
    ["U6.VCC", "U6.CE", "C41.pin1", "R16.pin1", "D2.pin2", "D3.pin2"],
    ["U6.CHRG", "R18.pin1"],
    ["R18.pin2", "D2.pin1"],
    ["U6.STDBY", "R19.pin1"],
    ["R19.pin2", "D3.pin1"],
    ["R16.pin2", "net.V_USB"],
  ])
  expect(getReproSchematicComponent(circuitJson, "U6").center).toEqual({
    x: 1.3856,
    y: -1.3484,
  })
  expect(getReproSchematicComponent(circuitJson, "R17").center).toEqual({
    x: 5.0432,
    y: -3.482,
  })
  const sheet = circuitJson.find((e) => e.type === "schematic_sheet")
  if (sheet?.type !== "schematic_sheet")
    throw new Error("Missing charger sheet")
  expect(
    circuitJson
      .filter((e) => e.type === "schematic_trace")
      .every((e) => e.schematic_sheet_id === sheet.schematic_sheet_id),
  ).toBe(true)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({ issueTypes: ["ResistorSeparatedFromChipPin"] }),
  ).toMatchObject([
    {
      hostSchematicBox: { sourceComponentName: "U6" },
      resistorSchematicBox: { sourceComponentName: "R17" },
    },
  ])
  expect(
    analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    }),
  ).toEqual([])
  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    width: 1800,
    height: 1200,
    highlightIssues: ["ResistorSeparatedFromChipPin"],
  })
  const issue = analysis.getIssues({
    issueTypes: ["ResistorSeparatedFromChipPin"],
  })[0]!
  const number = analysis.getIssues().indexOf(issue) + 1
  expect(svg).toContain(`data-listing-issue-number="${number}"`)
  expect(svg).toContain(`data-issue-number="${number}"`)
  expect([...svg.matchAll(/class="issue-marker"/g)]).toHaveLength(2)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
