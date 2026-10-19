import { Circuit } from "@tscircuit/core"
import { PMEG6020ELRX } from "./imports/PMEG6020ELRX"
import { TCJD226M050R0090E } from "./imports/TCJD226M050R0090E"

// Extracted from astra/nema17-stepper-motor-controller-spring-clamp-rp2040 v1.4.0:
// https://tscircuit.com/astra/nema17-stepper-motor-controller-spring-clamp-rp2040?version=1.4.0#schematic
// Release bde55b83-e437-4d8f-b5c0-1e0b68a70ec3, schematic/MotorPowerFilteringSection.tsx.
// Preserve published positions, rotations, values, imported symbols and pin mapping.
// PCB/CAD data and sheet/section frames are omitted. The context view contains all
// five filtering components; connector/driver boundary connections are outside it.
// The pair view retains only F_MOTOR_VBUS, D_MOTOR_BLOCK and their shared trace,
// with both external ends left open equally before/after (no invented rail labels).
// The shared trace name MOTOR_REVERSE_BLOCK is omitted in both states: core
// otherwise turns it into a tall boxed label on the corrected straight wire.
// Current core fixes the older published export's diode terminal geometry; both
// states here are generated from the same original TSX using the installed core.
export async function createAstraFuseDiode(
  corrected = false,
  scope: "pair" | "filter" = "pair",
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <PMEG6020ELRX name="D_MOTOR_BLOCK" schX={0} schY={-7.5} />
      <fuse
        name="F_MOTOR_VBUS"
        currentRating="2A"
        voltageRating="30V"
        footprint="1812"
        supplierPartNumbers={{ jlcpcb: ["C960026"] }}
        manufacturerPartNumber="BSMD1812-200-30V"
        schX={-3}
        schY={corrected ? -7.54 : -7.5}
        schRotation={corrected ? 0 : 90}
      />
      <trace
        from=".F_MOTOR_VBUS > .pin2"
        to=".D_MOTOR_BLOCK > .anode"
        thickness="0.8mm"
      />
      {scope === "filter" && (
        <>
          <capacitor
            name="C_PD_VBUS"
            capacitance="10uF"
            maxVoltageRating="50V"
            footprint="1206"
            supplierPartNumbers={{ jlcpcb: ["C13585"] }}
            manufacturerPartNumber="CL31A106KBHNNNE"
            maxDecouplingTraceLength={22}
            schX={3}
            schY={-7.5}
            schOrientation="vertical"
          />
          <TCJD226M050R0090E
            name="C_MOTOR_BULK"
            schX={6}
            schY={-7.5}
            schOrientation="vertical"
          />
          <diode
            name="D_MOTOR_TVS"
            footprint="smb"
            supplierPartNumbers={{ jlcpcb: ["C1975329"] }}
            manufacturerPartNumber="SMBJ22CAQ-13-F"
            schX={9}
            schY={-7.5}
            schOrientation="vertical"
          />
          <trace
            name="MOTOR_VBUS_CAP"
            from=".D_MOTOR_BLOCK > .cathode"
            to=".C_PD_VBUS > .pin1"
            schDisplayLabel="VMOTOR_PROTECTED"
            thickness="0.8mm"
          />
          <trace
            name="MOTOR_VBUS_BULK"
            from=".D_MOTOR_BLOCK > .cathode"
            to=".C_MOTOR_BULK > .pin1"
            thickness="0.8mm"
          />
          <trace
            name="MOTOR_VBUS_TVS"
            from=".D_MOTOR_BLOCK > .cathode"
            to=".D_MOTOR_TVS > .cathode"
            thickness="0.8mm"
          />
          <trace
            name="PD_VBUS_CAP_GND"
            from=".C_PD_VBUS > .pin2"
            to="net.GND"
          />
          <trace
            name="MOTOR_BULK_GND"
            from=".C_MOTOR_BULK > .pin2"
            to="net.GND"
          />
          <trace
            name="MOTOR_TVS_GND"
            from=".D_MOTOR_TVS > .anode"
            to="net.GND"
          />
        </>
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
