import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createGameboySwitchCapacitorRepro } from "../assets/gameboy-switch-capacitors"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces all ten parallel switch/capacitor branches on the original controls sheet", async () => {
  const circuitJson = await createGameboySwitchCapacitorRepro()
  expectReproRendered(circuitJson, 30)
  const signals: string[][] = []
  const ground = ["net.GND"]
  const power = ["net.SYS_3V3"]
  for (let i = 0; i < 10; i++) {
    const sw = `SW${i + 3}`
    const cap = `C${i + 45}`
    const resistor = `R${i + 26}`
    const x = -18 + (i % 2) * 24
    const y = 14 - Math.floor(i / 2) * 6
    for (const [name, offset] of [
      [sw, 0],
      [resistor, 5],
      [cap, 10],
    ] as const) {
      expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
        x: x + offset,
        y,
      })
    }
    signals.push([`${sw}.pin2`, `${cap}.pin1`, `${resistor}.pin2`])
    ground.push(`${sw}.pin1`, `${cap}.pin2`)
    power.push(`${resistor}.pin1`)
  }
  expectReproNets(circuitJson, [...signals, ground, power])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssueCounts().TwoPinComponentShouldBeVertical).toBe(10)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1800,
      height: 1450,
      // Fit the complete controls sheet without the unused page border.
      schematicSheetId: "schematic_sheet_0",
      viewportBounds: { left: -20, right: 19, bottom: -13, top: 18.5 },
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
