import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"

test("counts supply devices rather than pin aliases, ground users, or pins in other groups", async () => {
  for (const mode of [
    "same-device",
    "ground-only",
    "other-group",
    "power-source",
    "power-load",
  ] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    const second = (
      <chip
        name="U2"
        schX={8}
        pinLabels={{ pin1: "VCC", pin2: "GND" }}
        pinAttributes={{
          pin1: {
            providesPower: mode === "power-source",
            requiresPower: mode === "power-load" || mode === "other-group",
          },
          pin2: { requiresGround: true },
        }}
        connections={{ pin1: "net.SUPPLY", pin2: "net.RETURN" }}
      />
    )
    circuit.add(
      <board>
        <net name="SUPPLY" isPowerNet />
        <net name="RETURN" isGroundNet />
        <chip
          name="U1"
          pinLabels={{ pin1: "A", pin2: "B", pin3: "C" }}
          pinAttributes={{
            pin1: { requiresPower: true },
            pin2: { requiresPower: true },
            pin3: { requiresGround: true },
          }}
          connections={{
            pin1: "net.SUPPLY",
            pin2: "net.SUPPLY",
            pin3: "net.RETURN",
          }}
        />
        {mode === "other-group" ? (
          <group name="remote">{second}</group>
        ) : mode === "same-device" ? null : (
          second
        )}
        {[-8, 8].map((x, i) => (
          <capacitor
            key={i}
            name={`C${i + 1}`}
            capacitance="100nF"
            schX={x}
            schY={4}
            schRotation={270}
            connections={{ pin1: "net.SUPPLY", pin2: "net.RETURN" }}
          />
        ))}
      </board>,
    )
    await circuit.renderUntilSettled()
    const analysis = analyzeSchematicPlacement(circuit.getCircuitJson(), {
      issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
    })
    expect(analysis.getIssues()).toHaveLength(
      mode === "power-source" || mode === "power-load" ? 0 : 1,
    )
  }
})
