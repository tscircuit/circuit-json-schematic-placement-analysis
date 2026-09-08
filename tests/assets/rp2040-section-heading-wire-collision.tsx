import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

// Reduced from rp2040-bldc-controller's protection sheet, ProtectionSection.tsx.
// Preserve the three pull-up values, coordinates, rotations and section heading.
// Core generates the heading; there is no manually positioned schematictext.
export async function createRp2040SectionHeadingWireCollisionCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <schematicsection
        name="temperature_protection"
        displayName="Power-Stage Temperature Interlock"
      />
      <net name="V3V3" isPowerNet />
      {(["SCL", "SDA", "ALERT"] as const).map((signal, index) => (
        <resistor
          key={signal}
          name={`R_TEMP_${signal}`}
          resistance={signal === "ALERT" ? "10k" : "4.7k"}
          schX={-6 + 2 * index}
          schY={3}
          schRotation={270}
          schSectionName="temperature_protection"
          connections={{
            pin1: "net.V3V3",
            pin2: `net.MCU_TEMP_${signal}`,
          }}
        />
      ))}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
