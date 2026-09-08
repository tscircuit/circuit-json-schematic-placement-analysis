import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export type ResetVariant =
  | "scattered"
  | "filter"
  | "shared"
  | "grouped"
  | "sheets"
  | "unknown-supply"
  | "large-host"
  | "missing-capacitor"
  | "unrelated-decoupler"
  | "remote-testpoint"

export async function createResetGroupingVariant(
  variant: ResetVariant,
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const support = (
    <>
      <resistor
        name="R1"
        resistance="10k"
        schX={variant === "remote-testpoint" ? -3 : -10}
        schY={2}
        schRotation={90}
        schSheetName={variant === "sheets" ? "Support" : undefined}
        connections={{ pin1: "net.RESET", pin2: "net.SUPPLY" }}
      />
      {variant !== "missing-capacitor" && (
        <capacitor
          name="C1"
          capacitance="100nF"
          schX={variant === "remote-testpoint" ? -3 : -10}
          schY={-2}
          schOrientation="vertical"
          schSheetName={variant === "sheets" ? "Support" : undefined}
          connections={{ pin1: "net.RESET", pin2: "net.GND" }}
        />
      )}
    </>
  )
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={2}>
      <net name="SUPPLY" isPowerNet={variant !== "unknown-supply"} />
      <net name="GND" isGroundNet />
      <net name="RESET" />
      {variant === "sheets" && (
        <>
          <schematicsheet name="Host" displayName="Host" />
          <schematicsheet name="Support" displayName="Support" />
        </>
      )}
      <chip
        name="U1"
        schX={0}
        schY={0}
        schWidth={variant === "large-host" ? 24 : 2}
        schHeight={2}
        pinLabels={{
          pin1: variant === "filter" ? "ADC_IN" : "NRST",
          pin2: "IO",
        }}
        schPinArrangement={{ leftSide: [1, 2] }}
        schSheetName={variant === "sheets" ? "Host" : undefined}
        connections={{ pin1: "net.RESET" }}
      />
      {variant === "grouped" ? (
        <group name="ExternalResetBlock">{support}</group>
      ) : (
        support
      )}
      {variant === "shared" && (
        <chip
          name="U2"
          schX={5}
          schY={0}
          pinLabels={{ pin1: "RESET_N", pin2: "IO" }}
          connections={{ pin1: "net.RESET" }}
        />
      )}
      {variant === "remote-testpoint" && (
        <testpoint
          name="TP1"
          schX={15}
          schY={10}
          connections={{ pin1: "net.RESET" }}
        />
      )}
      {variant === "unrelated-decoupler" && (
        <capacitor
          name="C2"
          capacitance="100nF"
          schX={15}
          schY={-10}
          schOrientation="vertical"
          connections={{ pin1: "net.SUPPLY", pin2: "net.GND" }}
        />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
