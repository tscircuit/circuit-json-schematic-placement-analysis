import React from "react"
import { Circuit } from "@tscircuit/core"
import { KH_3216_A27 } from "./KH_3216_A27"

// Real-board extract: https://tscircuit.com/MustafaMulla29/wireless-mouse-pcb?version=1.0.13#schematic
// Release c0f724e9-7392-4aea-ae58-a3cc36d0f598. Source: sections/WirelessControllerSection.tsx,
// sections/shared.tsx, imports/KH_3216_A27.tsx. RF1 and GND are extract boundaries.
// Centers/orientations are frozen from that release; no published JSON is loaded.
function MouseAntenna({ after = false }: { after?: boolean }) {
  return (
    <>
      <capacitor
        name="C_ANT_SHUNT"
        capacitance="0.5pF"
        footprint="0402"
        schX={after ? 13.6 : 9}
        schY={after ? -8.4 : -9}
        schOrientation="vertical"
        supplierPartNumbers={{ jlcpcb: ["C76987"] }}
      />
      <inductor
        name="L_ANT_SERIES"
        inductance="5.6nH"
        footprint="0402"
        schX={12}
        schY={-7}
        supplierPartNumbers={{ jlcpcb: ["C279773"] }}
      />
      <KH_3216_A27
        name="ANT_BLE"
        noConnect={["pin2"]}
        schX={15}
        schY={after ? -6.6 : -7}
      />
      <trace
        name="RF1"
        from="net.RF1"
        to=".L_ANT_SERIES > .pin1"
        schDisplayLabel="RF1"
      />
      <trace
        name={after ? undefined : "ANT_SHUNT"}
        from=".L_ANT_SERIES > .pin2"
        to=".C_ANT_SHUNT > .pin1"
        schDisplayLabel={after ? "" : "ANT_SHUNT"}
      />
      <trace
        name="C_ANT_GND"
        from=".C_ANT_SHUNT > .pin2"
        to="net.GND"
        schDisplayLabel=""
      />
      <trace
        name={after ? undefined : "ANT_FEED"}
        from=".L_ANT_SERIES > .pin2"
        to=".ANT_BLE > .ANT"
        schDisplayLabel={after ? "" : "ANT_FEED"}
      />
    </>
  )
}
export async function createMouseInductorCapacitor(after = false) {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(
    <board
      schLayout={{ layoutMode: "relative" }}
      schMaxTraceDistance={after ? 20 : undefined}
    >
      <MouseAntenna after={after} />
    </board>,
  )
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
