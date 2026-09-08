import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPedometerResetNetworkCircuitJson } from "../assets/pedometer-reset-network-scattered"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

const hasGroupingIssue: boolean[] = []

beforeAll(async () => {
  for (const compact of [false, true]) {
    const circuitJson = await createPedometerResetNetworkCircuitJson(compact)
    expectReproRendered(circuitJson, 4)
    expectReproNets(circuitJson, [
      ["U1.RSTN", "R8.pin1", "C21.pin1", "TP5.pin1", "net.RESETN"],
      ["R8.pin2", "net.V3"],
      ["C21.pin2", "net.GND"],
    ])
    const host = getReproSchematicComponent(circuitJson, "U1")
    const resistor = getReproSchematicComponent(circuitJson, "R8")
    const capacitor = getReproSchematicComponent(circuitJson, "C21")
    expect(host.center).toEqual({ x: 0, y: 0 })
    expect(resistor.center).toEqual(
      compact ? { x: 3, y: 1.5 } : { x: -12, y: -40 },
    )
    expect(capacitor.center).toEqual(
      compact ? { x: 3, y: -1.5 } : { x: 0, y: -28 },
    )
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issueTypes: string[] = analysis
      .getLineItems()
      .flatMap((item) =>
        item.lineItemType === "SchematicPlacementIssues"
          ? item.issues.map((issue) => issue.lineItemType)
          : [],
      )
    // Trace simplification only shifts C21 horizontally: it stays 28 units below
    // its host. This documents the additional grouping problem explicitly.
    if (!compact) {
      const moves = analysis
        .getLineItems()
        .flatMap((item) =>
          item.lineItemType === "SchematicPlacementIssues"
            ? item.issues.filter(
                (issue) =>
                  issue.lineItemType ===
                  "TraceCanBeSimplifiedByMovingComponent",
              )
            : [],
        )
      expect(moves).toHaveLength(1)
      expect(moves[0]!.targetComponent.sourceComponentName).toBe("C21")
      expect(moves[0]!.newSchY).toBe(-28)
      expect(Math.hypot(moves[0]!.newSchX, moves[0]!.newSchY)).toBeGreaterThan(
        25,
      )
    }
    await expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
    ).toMatchSvgSnapshot(import.meta.path, compact ? "compact" : undefined)
    hasGroupingIssue.push(issueTypes.includes("FunctionalBlockNotGrouped"))
  }
})

test.failing("groups the pedometer reset support network even when auto labels hide its distance", () => {
  expect(hasGroupingIssue).toEqual([true, false])
})
