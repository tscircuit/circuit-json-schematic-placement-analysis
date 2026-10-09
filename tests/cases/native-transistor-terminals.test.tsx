import { Circuit } from "@tscircuit/core"
import { expect, test } from "bun:test"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("native transistor terminal aliases preserve three distinct connections", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <transistor name="Q1" type="npn" schX={0} schY={0} />
      <resistor
        name="R1"
        resistance="10k"
        schX={-3}
        schY={0.29}
        connections={{ pin2: ".Q1 .collector" }}
      />
      <resistor
        name="R2"
        resistance="1k"
        schX={3}
        schY={0.29}
        connections={{ pin1: ".Q1 .emitter" }}
      />
      <resistor
        name="R3"
        resistance="100k"
        schX={0}
        schY={-2}
        schRotation={90}
        connections={{ pin2: ".Q1 .base" }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const data = circuit.getCircuitJson()
  expectReproRendered(data, 4)
  const connected = getSourceConnectivity(data)
  const net = (name: string, pin: string) =>
    connected(getReproSourcePort(data, name, pin).source_port_id)
  expect(net("Q1", "collector")).toBe(net("R1", "pin2"))
  expect(net("Q1", "emitter")).toBe(net("R2", "pin1"))
  expect(net("Q1", "base")).toBe(net("R3", "pin2"))
  expect(
    new Set([net("Q1", "collector"), net("Q1", "emitter"), net("Q1", "base")])
      .size,
  ).toBe(3)
  for (const [role, pin] of [
    ["collector", 1],
    ["base", 2],
    ["emitter", 3],
  ] as const) {
    expect(getReproSourcePort(data, "Q1", role).pin_number).toBe(pin)
  }
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson: data }),
  ).toMatchSvgSnapshot(import.meta.path)
})
