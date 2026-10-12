import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getReproSourcePort } from "../fixtures/placement-repro-assertions"

test("custom diode footprints preserve their physical cathode/anode mapping in both orientations", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      {[0, 180].map((rotation, i) => (
        <diode
          key={rotation}
          name={`D${i}`}
          schX={i * 5}
          schRotation={rotation}
          pinLabels={{ pin1: ["cathode", "neg"], pin2: ["anode", "pos"] }}
          footprint={
            <footprint>
              <smtpad
                portHints={["pin1"]}
                pcbX={-1.7}
                pcbY={0}
                width={1.1}
                height={1}
                shape="rect"
              />
              <smtpad
                portHints={["pin2"]}
                pcbX={1.7}
                pcbY={0}
                width={1.1}
                height={1}
                shape="rect"
              />
            </footprint>
          }
        />
      ))}
    </board>,
  )
  await circuit.renderUntilSettled()
  const json = circuit.getCircuitJson()
  expect(json.filter((e) => e.type.endsWith("_error"))).toEqual([])
  expect(json.filter((e) => e.type === "schematic_port")).toHaveLength(4)
  for (let i = 0; i < 2; i++) {
    const anode = getReproSourcePort(json, `D${i}`, "pin2")
    const cathode = getReproSourcePort(json, `D${i}`, "pin1")
    const a = json.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === anode.source_port_id,
    )
    const k = json.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === cathode.source_port_id,
    )
    if (a?.type !== "schematic_port" || k?.type !== "schematic_port")
      throw new Error("Missing diode symbol terminals")
    expect(a.pin_number).toBe(2)
    expect(k.pin_number).toBe(1)
    expect(a.facing_direction).toBe(i ? "right" : "left")
    expect(k.facing_direction).toBe(i ? "left" : "right")
    expect(Math.sign(k.center.x - a.center.x)).toBe(i ? -1 : 1)
  }
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson: json }),
  ).toMatchSvgSnapshot(import.meta.path)
})
