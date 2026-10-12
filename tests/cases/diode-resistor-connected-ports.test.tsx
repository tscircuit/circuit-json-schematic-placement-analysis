import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { expectReproNets } from "../fixtures/placement-repro-assertions"

test("reports alignment for a direct wire and skips separate named-net stubs", async () => {
  for (const connection of ["direct", "named-net"] as const) {
    const circuit = new Circuit()
    circuit.add(
      <board routingDisabled>
        <led name="D1" schX={0} schY={0} />
        <resistor name="R1" resistance="1k" schX={2} schY={2} />
        {connection === "direct" && (
          <trace from=".D1 > .cathode" to=".R1 > .pin1" />
        )}
        {connection === "named-net" && (
          <>
            <net name="SIGNAL" />
            <trace from=".D1 > .cathode" to="net.SIGNAL" />
            <trace from=".R1 > .pin1" to="net.SIGNAL" />
          </>
        )}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = analysis.getIssues({
      issueTypes: ["DiodeResistorNotAligned"],
    })
    expectReproNets(circuitJson, [
      connection === "direct"
        ? ["D1.cathode", "R1.pin1"]
        : ["D1.cathode", "R1.pin1", "net.SIGNAL"],
    ])
    if (connection === "direct") {
      expect(issues).toHaveLength(1)
      expect(issues[0]).toMatchObject({
        diodeSchematicBox: { sourceComponentName: "D1" },
        resistorSchematicBox: { sourceComponentName: "R1" },
      })
    } else {
      // Current core draws separate labeled stubs, not a wire between the parts.
      expect(issues).toEqual([])
      expect(
        circuitJson.filter(
          (e) =>
            e.type === "schematic_text" &&
            e.text === "SIGNAL" &&
            e.source_trace_id,
        ),
      ).toHaveLength(2)
      expect(
        circuitJson.filter((e) => e.type === "schematic_trace"),
      ).toHaveLength(2)
    }
  }
})
