import { Circuit } from "@tscircuit/core"
import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("I2C grouping distinguishes split pairs from compact corners and same-side pairs", async () => {
  for (const [name, sda, scl, count] of [
    ["split", { x: 0, y: 4 }, { x: 4, y: 0 }, 1],
    ["compact-corner", { x: 3, y: 3.6 }, { x: 3.6, y: 3 }, 0],
    ["same-side", { x: 4, y: 3 }, { x: 4, y: -3 }, 0],
  ] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board>
        <net name="VCC" isPowerNet />
        <net name="GND" isGroundNet />
        <net name="SDA" />
        <net name="SCL" />
        <chip
          name="U1"
          schX={0}
          schY={0}
          schWidth={2}
          schHeight={2}
          pinLabels={{ pin1: "SDA", pin2: "SCL", pin3: "VCC", pin4: "GND" }}
          connections={{
            SDA: "net.SDA",
            SCL: "net.SCL",
            VCC: "net.VCC",
            GND: "net.GND",
          }}
        />
        <resistor
          name="R1"
          resistance="4.7k"
          schX={sda.x}
          schY={sda.y}
          connections={{ pin1: "net.SDA", pin2: "net.VCC" }}
        />
        <resistor
          name="R2"
          resistance="4.7k"
          schX={scl.x}
          schY={scl.y}
          connections={{ pin1: "net.SCL", pin2: "net.VCC" }}
        />
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    const analysis = analyzeSchematicPlacement(circuitJson)
    expect(
      analysis.getIssues({ issueTypes: ["I2cPullupPairNotGrouped"] }),
    ).toHaveLength(count)
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        issueTypes: ["I2cPullupPairNotGrouped"],
        width: 1000,
        height: 650,
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
