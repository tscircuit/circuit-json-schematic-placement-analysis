import { Circuit } from "@tscircuit/core"
import { MT3608L } from "./MT3608L"
import { SS34 } from "./SS34"
import { WPN4020H4R7MT } from "./WPN4020H4R7MT"
// Published gokul/fieldkit-usb 0.4.2 (release 8a89486b-fc6d-4334-9548-406cbe74c314).
// https://tscircuit.com/gokul/fieldkit-usb#schematic — sections/display.tsx.
// Complete U10/L2/D3 extract, translated together so U10 is at the origin.
// Source-relative positions, rotations, values, symbols and chip pins are preserved.
// External supply/feedback connections terminate at explicit boundary net labels.
export async function createFieldkitInductorDiode() {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(
    <board schMaxTraceDistance={20}>
      <MT3608L
        name="U10"
        schX={0}
        schY={0}
        showPinAliases
        connections={{ SW: "net.OLED_SW", FB: "net.OLED_FB" }}
        noConnect={["OC"]}
      />
      <WPN4020H4R7MT
        name="L2"
        schX={0}
        schY={2.5329125}
        schRotation={270}
        connections={{ pin2: "net.OLED_SW" }}
      />
      <SS34
        name="D3"
        schX={-2.885}
        schY={-1.44375}
        schRotation={90}
        connections={{ anode: "net.OLED_SW", cathode: "net.OLED_12V" }}
      />
      <trace from="U10.GND" to="net.GND" schDisplayLabel="GND" />
      <trace from="U10.VIN" to="net.V5" schDisplayLabel="V5" />
      <trace from="U10.EN" to="net.V5" schDisplayLabel="V5" />
      <trace from="L2.pin1" to="net.V5" schDisplayLabel="V5" />
      <netlabel
        net="V5"
        connectsTo={[".U10 > .VIN", ".U10 > .EN"]}
        schX={1.5}
        schY={0.5}
        anchorSide="bottom"
      />
      <netlabel
        net="V5"
        connectsTo=".L2 > .pin1"
        schX={0}
        schY={3.3}
        anchorSide="bottom"
      />
      <netlabel
        net="GND"
        connectsTo=".U10 > .GND"
        schX={-1.25}
        schY={0}
        anchorSide="right"
      />
      <netlabel
        net="OLED_FB"
        connectsTo=".U10 > .FB"
        schX={-1.5}
        schY={-0.65}
        anchorSide="right"
      />
      <net name="V5" isPowerNet />
      <net name="OLED_12V" isPowerNet />
      <net name="GND" isGroundNet />
    </board>,
  )
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
