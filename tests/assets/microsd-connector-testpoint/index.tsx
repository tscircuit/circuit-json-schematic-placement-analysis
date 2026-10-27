import React from "react"
import { Circuit } from "@tscircuit/core"
import { TF_01A } from "./TF_01A"

// Real-board extract: https://tscircuit.com/ShiboSoftwareDev/t113-s3-linux-computer-p9?version=0.1.4#schematic
// Release 24a45ffe-9c14-4f95-9142-5364be4705cc. Source: subcircuits/microsd-boot.tsx
// and imports/TF_01A.tsx. Other connector signals remain boundary nets.
// Published testpoint_left is reproduced with schRotation=180; default core differs.
// VDD label is placed above the signal labels; connector pin layout is unchanged.
// Centers/orientations are frozen from that release; no published JSON is loaded.
function MicroSdClock() {
  return (
    <>
      <net name="VDD_3V3" isPowerNet />
      <net name="GND" isGroundNet />
      <TF_01A name="J_SD" schX={0} schY={0} />
      <testpoint
        name="TP_SD_CLK"
        schRotation={180}
        schX={-7.73375}
        schY={-4.4}
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1"]}
              width="1mm"
              height="1mm"
              shape="rect"
            />
            <courtyardrect width="1.5mm" height="1.5mm" />
          </footprint>
        }
        connections={{ pin1: "net.SD_CLK" }}
      />
      <trace name="SD_CLK_ESCAPE" from=".J_SD > .CLK" to=".TP_SD_CLK > .pin1" />
      {["DAT2", "DAT3", "CMD", "DAT0", "DAT1"].map((p) => (
        <trace
          key={p}
          from={".J_SD > ." + p}
          to={"net.SD_" + p}
          schDisplayLabel={"SD_" + p}
        />
      ))}
      <trace
        from=".J_SD > .CARD_DETECT_N"
        to="net.SD_CARD_DETECT_N"
        schDisplayLabel="SD_CARD_DETECT_N"
      />
      <netlabel
        net="VDD_3V3"
        connection="J_SD.VDD"
        schX={-2.5}
        schY={1.5}
        anchorSide="bottom"
      />
      {["VSS", "GND1", "GND2", "GND3", "GND4"].map((p) => (
        <trace key={p} from={".J_SD > ." + p} to="net.GND" />
      ))}
    </>
  )
}
export async function createMicroSdConnectorTestPoint() {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(
    <board schLayout={{ layoutMode: "relative" }}>
      <MicroSdClock />
    </board>,
  )
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
