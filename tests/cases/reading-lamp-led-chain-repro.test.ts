import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createReadingLampLedChain } from "../assets/reading-lamp-led-chain"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete reading-lamp Light sheet with a scattered six-LED series chain", async () => {
  const circuitJson = await createReadingLampLedChain()
  expectReproRendered(circuitJson, 14)
  expect(circuitJson.filter((e) => e.type === "source_port")).toHaveLength(32)
  expectReproNets(circuitJson, [
    ["U6.pin1", "L2.pin1", "C18.pin1"],
    ["U6.pin2", "R16.pin1"],
    ["U6.pin3", "L2.pin2", "D1.anode"],
    ["U6.pin4", "R16.pin2", "R17.pin2", "C18.pin2", "C19.pin2", "C20.pin2"],
    ["U6.pin5", "C19.pin1"],
    ["U6.pin6", "R17.pin1", "LED6.cathode"],
    ["D1.cathode", "C20.pin1", "LED1.anode"],
    ...Array.from({ length: 5 }, (_, i) => [
      `LED${i + 1}.cathode`,
      `LED${i + 2}.anode`,
    ]),
  ])
  for (const [name, x, y] of [
    ["U6", 27, 7],
    ["L2", 33, 8],
    ["D1", 33, 4],
    ["LED1", 24, 19],
    ["LED2", 29, 19],
    ["LED3", 34, 19],
    ["LED4", 24, 22],
    ["LED5", 29, 22],
    ["LED6", 34, 22],
    ["R16", 25, 14],
    ["R17", 30, 14],
    ["C18", 25, 18],
    ["C19", 30, 18],
    ["C20", 35, 18],
  ] as const) {
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  }
  expect(getReproSchematicComponent(circuitJson, "LED6").symbol_name).toBe(
    "led_left",
  )
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toHaveLength(1)
  const issue = analysis.getIssues()[0]!
  if (issue.lineItemType !== "SeriesLedChainNotOrdered")
    throw new Error("Missing LED chain issue")
  expect(issue.ledSchematicBoxes.map((box) => box.sourceComponentName)).toEqual(
    ["LED1", "LED2", "LED3", "LED4", "LED5", "LED6"],
  )
  expect(issue.backtrackingConnections).toHaveLength(2)
  expect(issue.backtrackingConnections[0]!.pinDistance).toBeCloseTo(11.479, 3)
  expect(issue.backtrackingConnections[1]!.pinDistance).toBeCloseTo(5, 3)
  expect(
    analysis.getIssues({
      issueTypes: [
        "TraceCanBeSimplifiedByMovingComponent",
        "DiodeResistorNotAligned",
      ],
    }),
  ).toEqual([])
  expect(analysis.getIssueCounts().SeriesLedChainNotOrdered).toBe(1)
  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson,
    analysis,
    width: 1600,
    height: 1400,
    highlightIssues: ["SeriesLedChainNotOrdered"],
  })
  expect(svg).toContain('data-listing-issue-number="1"')
  expect([...svg.matchAll(/class="issue-marker"/g)]).toHaveLength(6)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
