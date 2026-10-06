import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("requires role evidence for rail orientation and preserves identified branch warnings", async () => {
  for (const declared of [false, true]) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board schTraceAutoLabelEnabled schMaxTraceDistance={3}>
        <net name="BAT_POS_RAW" isPowerNet />
        <net name="PD_SWITCHED" isPowerNet />
        <net name="PD9" isPowerNet />
        <net name="VBUS_RAW" isPowerNet />
        <net name="GND" isGroundNet />
        {/* BLDC input fuse, charge-current shunt and PD voltage-sense filter. */}
        <fuse
          name="F1"
          currentRating="3A"
          schX={-6}
          schY={4}
          connections={{ pin1: "net.BAT_POS_RAW", pin2: "net.VMOTOR" }}
        />
        <resistor
          name="R13"
          resistance="0.02"
          schX={0}
          schY={4}
          connections={{ pin1: "net.PD_SWITCHED", pin2: "net.PD9" }}
        />
        <resistor
          name="R1"
          resistance="470"
          schX={6}
          schY={4}
          connections={{ pin1: "net.VBUS_RAW", pin2: "net.PD_VS" }}
        />
        <chip
          name="U1"
          schX={9}
          schY={4}
          pinLabels={{ pin1: "VBUS_VS_DISCH" }}
          connections={{ pin1: "net.PD_VS" }}
        />
        {/* The same drawing is a proven pull branch only when its host declares it. */}
        <resistor
          name="R2"
          resistance="10k"
          schX={-6}
          schY={0}
          connections={{ pin1: "net.VBUS_RAW", pin2: ".U2 > .pin1" }}
        />
        <resistor
          name="R3"
          resistance="10k"
          schX={0}
          schY={0}
          connections={{ pin1: ".U2 > .pin2", pin2: "net.GND" }}
        />
        <chip
          name="U2"
          schX={-3}
          schY={-3}
          pinLabels={{ pin1: "A", pin2: "B" }}
          pinAttributes={{
            pin1: { needsExternalPullup: declared },
            pin2: { needsExternalPulldown: declared },
          }}
        />
        <capacitor
          name="C1"
          capacitance="100nF"
          schX={6}
          schY={0}
          connections={{ pin1: "net.VBUS_RAW", pin2: "net.GND" }}
        />
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    expectReproNets(circuitJson, [
      ["F1.pin1", "net.BAT_POS_RAW"],
      ["R13.pin1", "net.PD_SWITCHED"],
      ["R13.pin2", "net.PD9"],
      ["R1.pin2", "U1.VBUS_VS_DISCH"],
      ["R2.pin2", "U2.A"],
      ["R3.pin1", "U2.B"],
    ])
    expect(
      getReproSourcePort(circuitJson, "U2", "A").needs_external_pullup,
    ).toBe(declared)
    expect(
      getReproSourcePort(circuitJson, "U2", "B").needs_external_pulldown,
    ).toBe(declared)
    const issueTypes = ["TwoPinComponentShouldBeVertical"] as const
    const analysis = analyzeSchematicPlacement(circuitJson, { issueTypes })
    // Series paths and unidentified resistors remain horizontal; identified shunts still warn.
    expect(
      analysis
        .getIssues()
        .map((issue) =>
          issue.lineItemType === "TwoPinComponentShouldBeVertical"
            ? issue.schematicBox.sourceComponentName
            : undefined,
        ),
    ).toEqual(declared ? ["R2", "R3", "C1"] : ["C1"])
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        issueTypes,
        showFullSchematic: true,
        width: 1200,
        height: 550,
      }),
    ).toMatchSvgSnapshot(
      import.meta.path,
      declared ? "declared" : "unidentified",
    )
  }
})
