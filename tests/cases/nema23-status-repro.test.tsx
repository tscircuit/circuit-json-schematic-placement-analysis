import { expect, test } from "bun:test"
import { createNema23Status } from "../assets/nema23-status"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete NEMA23 status sheet with scattered RGB branches", async () => {
  const circuitJson = await createNema23Status()
  expectReproRendered(circuitJson, 13)
  const ports = circuitJson.filter((element) => element.type === "source_port")
  expect(ports).toHaveLength(34)
  for (const port of ports) {
    expect(
      circuitJson.filter(
        (element) =>
          element.type === "schematic_port" &&
          element.source_port_id === port.source_port_id,
      ),
    ).toHaveLength(1)
  }
  // Published pin positions, including each custom symbol's drawing origin.
  for (const [component, pin, x, y] of [
    ["D_STATUS", "R_NEG", 1.6075, -24.1],
    ["D_STATUS", "G_NEG", 2.0075, -24.1],
    ["D_STATUS", "B_NEG", 2.4075, -24.1],
    ["Q_STATUS_R", "C", 2.6975, -31.3],
    ["Q_STATUS_G", "C", 2.6975, -26.9],
    ["Q_STATUS_B", "C", 2.6975, -35.7],
  ] as const) {
    const port = getReproSourcePort(circuitJson, component, pin)
    const schematic = circuitJson.find(
      (e) =>
        e.type === "schematic_port" && e.source_port_id === port.source_port_id,
    )
    if (schematic?.type !== "schematic_port")
      throw new Error(`Missing ${component}.${pin}`)
    expect(schematic.center.x).toBeCloseTo(x, 6)
    expect(schematic.center.y).toBeCloseTo(y, 6)
  }
  expectReproNets(circuitJson, [
    ["D_STATUS.R_NEG", "R_STATUS_R.pin1"],
    ["D_STATUS.G_NEG", "R_STATUS_G.pin1"],
    ["D_STATUS.B_NEG", "R_STATUS_B.pin1"],
    ["R_STATUS_R.pin2", "Q_STATUS_R.C"],
    ["R_STATUS_G.pin2", "Q_STATUS_G.C"],
    ["R_STATUS_B.pin2", "Q_STATUS_B.C"],
    [
      "Q_STATUS_R.E",
      "Q_STATUS_G.E",
      "Q_STATUS_B.E",
      "Q_BUZZER.S",
      "R_BUZZER_PD.pin2",
      "C_BUZZER.pin2",
    ],
    ["BZ1._NEG", "D_BUZZER.anode", "Q_BUZZER.D"],
    ["BZ1._POS", "D_BUZZER.cathode", "C_BUZZER.pin1", "net.V3V3"],
    ["R_BUZZER_GATE.pin2", "R_BUZZER_PD.pin1", "Q_BUZZER.G"],
    ["D_STATUS._POS", "net.VBUS"],
    ["Q_STATUS_R.B", "net.LED_R"],
    ["Q_STATUS_G.B", "net.LED_G"],
    ["Q_STATUS_B.B", "net.LED_B"],
    ["R_BUZZER_GATE.pin1", "net.BUZZER_PWM"],
  ])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      width: 1600,
      height: 1100,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
