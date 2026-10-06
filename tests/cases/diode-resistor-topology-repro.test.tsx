import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { expectReproNets } from "../fixtures/placement-repro-assertions"

test("checks alignment only for a series pair, preserving parallel and shared-supply branches", async () => {
  for (const [topology, diode, resistor, count] of [
    ["parallel", "D1", "R4", 0],
    ["branched", "D4", "R30", 0],
    ["series", "D2", "R2", 1],
  ] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
        <diode name={diode} schX={0} schY={0} />
        <resistor
          name={resistor}
          resistance={topology === "series" ? "1k" : "100k"}
          schX={3}
          schY={2}
        />
        <trace from={`.${diode} > .cathode`} to={`.${resistor} > .pin1`} />
        {topology === "parallel" ? (
          // BLDC D1/R4 share the input-switch gate and source: two parallel branches.
          <trace from={`.${diode} > .anode`} to={`.${resistor} > .pin2`} />
        ) : (
          <>
            <net name="GND" isGroundNet />
            <trace from={`.${diode} > .anode`} to="net.GND" />
            <trace from={`.${resistor} > .pin2`} to="net.ADC" />
          </>
        )}
        {topology === "branched" && (
          <>
            {/* BLDC D4/R30 share the motor supply with its load, not a private junction. */}
            <net name="VMOTOR" isPowerNet />
            <chip
              name="U1"
              schX={-3}
              schY={3}
              pinLabels={{ pin1: "VDD" }}
              pinAttributes={{ VDD: { requiresPower: true } }}
            />
            <trace from={`.${diode} > .cathode`} to="net.VMOTOR" />
            <trace from="net.VMOTOR" to=".U1 > .VDD" />
          </>
        )}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    expectReproNets(circuitJson, [
      [
        `${diode}.cathode`,
        `${resistor}.pin1`,
        ...(topology === "branched" ? ["U1.VDD"] : []),
      ],
      ...(topology === "parallel"
        ? [[`${diode}.anode`, `${resistor}.pin2`]]
        : []),
    ])
    const issueTypes = ["DiodeResistorNotAligned"] as const
    const analysis = analyzeSchematicPlacement(circuitJson, { issueTypes })
    // Only the private series junction supports an alignment recommendation.
    expect(analysis.getIssues()).toHaveLength(count)
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        issueTypes,
        showFullSchematic: true,
        width: 1000,
        height: 500,
      }),
    ).toMatchSvgSnapshot(import.meta.path, topology)
  }
})
