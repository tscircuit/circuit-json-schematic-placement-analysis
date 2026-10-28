import { Circuit } from "@tscircuit/core"
import { PAM8403DR_H } from "./gameboy-grounded-capacitor-imports/PAM8403DR_H"
import { CL05A105KA5NQNC } from "./gameboy-grounded-capacitor-imports/CL05A105KA5NQNC"
// Source: https://tscircuit.com/ShiboSoftwareDev/linux-gameboy-advance?version=1.0.154
// Release b0c4b57c-2e3e-40cf-b61a-e646c5920d62, index.circuit.tsx lines 391–427.
// Two-component audio extract. Imported symbols, positions and chip pin arrangement retained.
// External audio connections use boundary nets; BOARD_GND is displayed as GND.
export async function createGameboyGroundedCapacitor() {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(
    <board schLayout={{ layoutMode: "relative" }} schMaxTraceDistance={2}>
      <PAM8403DR_H
        name="U_SPK_AMP"
        schX={-2}
        schY={2}
        schWidth={2.2}
        noConnect={["OUT_R_POS", "OUT_R_NEG", "NC"]}
        connections={{
          VREF: ".C_AMP_VREF > .pin1",
          PVDD1: "net.V3V3",
          VDD: "net.V3V3",
          PVDD2: "net.V3V3",
          MUTE: "net.V3V3",
          SHND: "net.AMP_ENABLE",
          INL: "net.AMP_INPUT",
          OUT_L_POS: "net.SPK_POS",
          OUT_L_NEG: "net.SPK_NEG",
        }}
      />
      <CL05A105KA5NQNC name="C_AMP_VREF" schX={2} schY={2} schRotation={-90} />
      <trace from=".U_SPK_AMP > .PGND1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".U_SPK_AMP > .GND" to="net.GND" schDisplayLabel="GND" />
      <trace from=".U_SPK_AMP > .PGND2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".U_SPK_AMP > .INR" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C_AMP_VREF > .pin2" to="net.GND" schDisplayLabel="GND" />
      <net name="GND" isGroundNet />
    </board>,
  )
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
