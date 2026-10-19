import { Circuit } from "@tscircuit/core"
import { TPS63802DLAR } from "./imports/TPS63802DLAR"
import { DFE201612E_R47M_P2 } from "./imports/DFE201612E_R47M_P2"
import { GRM188R61A106ME69D } from "./imports/GRM188R61A106ME69D"
import { GRM188R61A226ME15D } from "./imports/GRM188R61A226ME15D"
import { RC0603FR_0751K1L } from "./imports/RC0603FR_0751K1L"
import { RC0603FR_079K1L } from "./imports/RC0603FR_079K1L"
import { RC0603FR_07100KL } from "./imports/RC0603FR_07100KL"

// Complete seven-part regulator schematic from AnasSarkiz/tscircuit-ai-agent-remote:
// https://tscircuit.com/AnasSarkiz/tscircuit-ai-agent-remote?version=0.0.11-wip-generator-qualification#schematic
// Release 8fe561a8-c751-44f1-a168-fe0dba085bf8, src/board/RegulatorSheet.tsx.
// Positions, symbols, pin layout/attributes, values and electrical connections are
// preserved. Only PCB routing/placement, CAD models and editorial frames are omitted.
// The focused pair omits other components and chip boundary connections equally
// in both states. The complete sheet separately verifies all seven parts/nets.
export async function createRemoteChipPinInductor(
  corrected = false,
  scope: "pair" | "full" = "full",
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      {scope === "full" && (
        <>
          <net name="VSYS" isPowerNet />
          <net name="V3V3" isPowerNet />
          <net name="GND" isGroundNet />
          <net name="BUCK_ENABLE" />
          <net name="REG_FB" />
          <net name="REG_PG" />
        </>
      )}
      <group name="regulator-review" schLayout={{ layoutMode: "relative" }}>
        <TPS63802DLAR name="U2" schX={0} schY={0} />
        <DFE201612E_R47M_P2
          name="L1"
          schX={corrected ? 3 : 0}
          schY={corrected ? 0 : 4}
          schRotation={corrected ? -90 : 0}
        />
        {scope === "full" && (
          <>
            <GRM188R61A106ME69D
              name="C4"
              schX={-6}
              schY={0}
              schRotation={-90}
            />
          </>
        )}
        {scope === "full" && (
          <>
            <GRM188R61A226ME15D name="C5" schX={6} schY={0} schRotation={-90} />
          </>
        )}
        {scope === "full" && (
          <>
            <RC0603FR_0751K1L
              name="R5"
              schX={corrected ? -3 : 6}
              schY={corrected ? 0.8 : -4}
              schRotation={-90}
            />
          </>
        )}
        {scope === "full" && (
          <>
            <RC0603FR_079K1L
              name="R6"
              schX={corrected ? -3 : 6}
              schY={corrected ? -1.2 : -7}
              schRotation={-90}
            />
          </>
        )}
        {scope === "full" && (
          <>
            <RC0603FR_07100KL name="R7" schX={-6} schY={4} schRotation={-90} />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="U2.pin10" to="net.VSYS" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="U2.pin1" to="net.BUCK_ENABLE" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="U2.pin2" to="net.GND" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace path={["U2.pin3", "U2.pin2", "net.GND"]} />
          </>
        )}
        {scope === "full" && (
          <>
            <trace path={["U2.pin8", "U2.pin3", "net.GND"]} />
          </>
        )}
        <trace name="REG_L1" from="U2.pin9" to="L1.pin1" />
        <trace name="REG_L2" from="U2.pin7" to="L1.pin2" />
        {scope === "full" && (
          <>
            <trace from="U2.pin6" to="net.V3V3" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="C4.pin1" to="net.VSYS" />
            <trace from="C4.pin2" to="net.GND" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="C5.pin1" to="net.V3V3" />
            <trace from="C5.pin2" to="net.GND" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="R5.pin1" to="net.V3V3" />
            <trace from="R5.pin2" to="net.REG_FB" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="R6.pin1" to="net.REG_FB" />
            <trace from="R6.pin2" to="net.GND" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="U2.pin4" to="net.REG_FB" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="R7.pin1" to="net.V3V3" />
            <trace from="R7.pin2" to="net.REG_PG" />
          </>
        )}
        {scope === "full" && (
          <>
            <trace from="U2.pin5" to="net.REG_PG" />
          </>
        )}
      </group>
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
