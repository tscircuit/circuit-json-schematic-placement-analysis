import type { CircuitJson } from "circuit-json"
import published from "./published.circuit.json"

// pixalynx/esp32-usb-ducky@1.2.8, release 523ada0b-73ca-4929-aff7-31b3b62b12b3.
// Complete 46-component sheet; schematic records and connectivity are unchanged.
// U2 pin 1 provides_power added from the TLV757P DRV pin table; the JLC import omits it.
// https://www.ti.com/lit/ds/symlink/tlv757p.pdf#page=3
export const esp32UsbDucky = published as unknown as CircuitJson
