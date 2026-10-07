import { Circuit } from "@tscircuit/core"
import type { ChipProps } from "@tscircuit/props"

// Complete charger sheet from techmannih/Esp32-bluetooth-speaker,
// release 0e5ed2fc-7939-44a6-859f-e93c184f4dbe (published source version 1.0.7).
// https://tscircuit.com/techmannih/Esp32-bluetooth-speaker?version=1.0.7
// Original positions, pin arrangement and connections; PCB-only data omitted.
const pinLabels = {
  pin1: ["TEMP"],
  pin2: ["PROG"],
  pin3: ["GND"],
  pin4: ["VCC"],
  pin5: ["BAT"],
  pin6: ["STDBY"],
  pin7: ["CHRG"],
  pin8: ["CE"],
  pin9: ["EP"],
} as const
const TP4056_42_ESOP8 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      schWidth={2}
      schHeight={1}
      schPinArrangement={{
        leftSide: {
          direction: "top-to-bottom",
          pins: ["VCC", "CE", "TEMP", "PROG", "GND"],
        },
        rightSide: {
          direction: "top-to-bottom",
          pins: ["BAT", "CHRG", "STDBY", "EP"],
        },
      }}
      pinLabels={pinLabels}
      manufacturerPartNumber="TP4056-42-ESOP8"
      {...props}
    />
  )
}

export default function SpeakerChargerResistorRepro() {
  return (
    <board schSheetName="charger">
      <schematicsheet
        name="charger"
        displayName="Li-ion Charger and Status"
        sheetIndex={6}
      />
      <capacitor
        capacitance="10uF"
        name="C40"
        schSheetName="charger"
        schX={5.348}
        schY={-0.1292}
        schOrientation="vertical"
        connections={{
          pin1: "net.V_BATT",
          pin2: "net.GND",
        }}
      />
      <TP4056_42_ESOP8
        name="U6"
        schSheetName="charger"
        schX={1.3856}
        schY={-1.3484}
        connections={{
          pin2: "net.Net_U6_PROG",
          pin3: "net.GND",
          pin4: "net.Net_D2_A",
          pin5: "net.V_BATT",
          pin6: "net.Net_U6_STDBY",
          pin7: "net.Net_U6_CHRG",
          pin8: "net.Net_D2_A",
          pin9: "net.GND",
        }}
        noConnect={["pin1"]}
      />
      <led
        color="red"
        name="D2"
        schSheetName="charger"
        schX={-3}
        schY={-0.1292}
        schOrientation="horizontal"
        connections={{
          pin1: "net.Net_D2_K",
          pin2: "net.Net_D2_A",
        }}
      />
      <led
        color="red"
        name="D3"
        schSheetName="charger"
        schX={-3}
        schY={1.09}
        schOrientation="horizontal"
        connections={{
          pin1: "net.Net_D3_K",
          pin2: "net.Net_D2_A",
        }}
      />
      <resistor
        resistance="0.4ohm"
        name="R16"
        schSheetName="charger"
        schX={1.3856}
        schY={3.2236}
        schOrientation="vertical"
        connections={{
          pin1: "net.Net_D2_A",
          pin2: "net.V_USB",
        }}
      />
      <resistor
        resistance="1.2k"
        name="R17"
        schSheetName="charger"
        schX={5.0432}
        schY={-3.482}
        schOrientation="vertical"
        connections={{
          pin1: "net.GND",
          pin2: "net.Net_U6_PROG",
        }}
      />
      <resistor
        resistance="1k"
        name="R18"
        schSheetName="charger"
        schX={-4.5}
        schY={-0.1292}
        schOrientation="horizontal"
        connections={{
          pin1: "net.Net_U6_CHRG",
          pin2: "net.Net_D2_K",
        }}
      />
      <resistor
        resistance="1k"
        name="R19"
        schSheetName="charger"
        schX={-4.5}
        schY={1.09}
        schOrientation="horizontal"
        connections={{
          pin1: "net.Net_U6_STDBY",
          pin2: "net.Net_D3_K",
        }}
      />
      <capacitor
        capacitance="0.1uF"
        name="C41"
        schSheetName="charger"
        schX={-5.0152}
        schY={3.5284}
        schOrientation="vertical"
        connections={{
          pin1: "net.Net_D2_A",
          pin2: "net.GND",
        }}
      />
    </board>
  )
}
export async function createSpeakerChargerResistorRepro() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<SpeakerChargerResistorRepro />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
