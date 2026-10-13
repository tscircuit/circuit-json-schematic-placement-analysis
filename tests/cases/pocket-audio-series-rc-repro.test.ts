import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPocketAudioDac } from "../assets/pocket-audio-dac"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete pocket audio DAC sheet with separated output RC filters", async () => {
  const circuitJson = await createPocketAudioDac()
  expectReproRendered(circuitJson, 12)
  expect(circuitJson.filter((e) => e.type === "source_port")).toHaveLength(42)
  expectReproNets(circuitJson, [
    [
      "C_DAC_AVDD.pin1",
      "C_DAC_CPVDD.pin1",
      "C_DAC_DVDD.pin1",
      "U_DAC.pin1",
      "U_DAC.pin20",
      "U_DAC.pin8",
    ],
    [
      "C_DAC_AVDD.pin2",
      "C_DAC_CPVDD.pin2",
      "C_DAC_DVDD.pin2",
      "C_DAC_LDO.pin2",
      "C_DAC_NEG.pin1",
      "C_FILTER_L.pin2",
      "C_FILTER_R.pin2",
      "R_DAC_MUTE.pin2",
      "U_DAC.pin10",
      "U_DAC.pin11",
      "U_DAC.pin12",
      "U_DAC.pin16",
      "U_DAC.pin19",
      "U_DAC.pin3",
      "U_DAC.pin9",
    ],
    ["C_DAC_CP.pin1", "U_DAC.pin2"],
    ["C_DAC_CP.pin2", "U_DAC.pin4"],
    ["C_DAC_LDO.pin1", "U_DAC.pin18"],
    ["C_DAC_NEG.pin2", "U_DAC.pin5"],
    ["C_FILTER_L.pin1", "R_DAC_L.pin2"],
    ["C_FILTER_R.pin1", "R_DAC_R.pin2"],
    ["R_DAC_L.pin1", "U_DAC.pin6"],
    ["R_DAC_MUTE.pin1", "U_DAC.pin17"],
    ["R_DAC_R.pin1", "U_DAC.pin7"],
    ["U_DAC.pin13"],
    ["U_DAC.pin14"],
    ["U_DAC.pin15"],
  ])
  for (const [name, x, y, symbol] of [
    ["U_DAC", -12, -7, null],
    ["R_DAC_MUTE", -19, -15, "boxresistor_right"],
    ["R_DAC_L", -15.5, -15, "boxresistor_right"],
    ["R_DAC_R", -12, -15, "boxresistor_right"],
    ["C_DAC_CP", -8.5, -15, "capacitor_down"],
    ["C_DAC_NEG", -5, -15, "capacitor_up"],
    ["C_DAC_CPVDD", -19, -19, "capacitor_down"],
    ["C_DAC_AVDD", -15.5, -19, "capacitor_down"],
    ["C_DAC_DVDD", -12, -19, "capacitor_down"],
    ["C_DAC_LDO", -8.5, -19, "capacitor_down"],
    ["C_FILTER_L", -5, -19, "capacitor_down"],
    ["C_FILTER_R", -19, -23, "capacitor_down"],
  ] as const) {
    const placement = getReproSchematicComponent(circuitJson, name)
    expect(placement.center).toEqual({ x, y })
    expect(placement.symbol_name ?? null).toBe(symbol)
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "GenericSchematicBoxTooWide",
    "SchematicPinPaddingToEdgeTooLarge",
    "TwoPinComponentShouldBeVertical",
    "DecouplingCapacitorsNotCloseTogether",
    "ResistorSeparatedFromChipPin",
    "CapacitorSeparatedFromChipPins",
    "SeriesRcFilterComponentsNotGrouped",
    "SeriesRcFilterComponentsNotGrouped",
  ])
  const filters = analysis.getIssues({
    issueTypes: ["SeriesRcFilterComponentsNotGrouped"],
  })
  expect(filters).toMatchObject([
    {
      resistorSchematicBox: { sourceComponentName: "R_DAC_L" },
      capacitorSchematicBox: { sourceComponentName: "C_FILTER_L" },
    },
    {
      resistorSchematicBox: { sourceComponentName: "R_DAC_R" },
      capacitorSchematicBox: { sourceComponentName: "C_FILTER_R" },
    },
  ])
  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    width: 1500,
    height: 1500,
    highlightIssues: ["SeriesRcFilterComponentsNotGrouped"],
  })
  expect([...svg.matchAll(/class="issue-marker"/g)]).toHaveLength(4)
  expect([...svg.matchAll(/data-listing-issue-number=/g)]).toHaveLength(2)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
