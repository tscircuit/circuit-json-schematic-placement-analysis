import { Circuit } from "@tscircuit/core"
import { BMA456 } from "./BMA456"
import { PCF8563TS } from "./PCF8563TS"

// Complete Motion & RTC sheet from anil08607/Smartwatch v1.0.8.
// https://tscircuit.com/anil08607/Smartwatch?version=1.0.8
// Original component props and sheet settings; other sheets and saved PCB routing omitted.
const cap100n = { mpn: "CC0402KRX7R7BB104", jlc: "C60474" } as const

export default function SmartwatchMotionRtc({
  crystalBesidePins = false,
}: {
  crystalBesidePins?: boolean
} = {}) {
  return (
    <board
      name="SMARTWATCH_V1_STM32"
      width="40mm"
      height="40mm"
      schRelative
      schMaxTraceDistance="5mm"
    >
      <schematicsheet
        name="sensors"
        displayName="Motion & RTC"
        sheetIndex={3}
        sheetSize="ANSI_B"
      >
        {/* Sensors */}
        <BMA456
          name="U2"
          pcbX={9}
          pcbY={8.5}
          schX={-8}
          schY={3}
          noConnect={["ASDA", "ASCL"]}
          connections={{
            VDD: "net.V3V3",
            VDDIO: "net.V3V3",
            GND: "net.GND",
            GNDIO: "net.GND",
            CSB: "net.V3V3",
            SDO: "net.GND",
            SDA: "net.I2C_SDA",
            SCL: "net.I2C_SCL",
            INT1: "net.BMA_INT1",
            INT2: "net.BMA_INT2",
          }}
        />
        <capacitor
          name="C16"
          capacitance="100nF"
          footprint="0402"
          manufacturerPartNumber={cap100n.mpn}
          supplierPartNumbers={{ jlcpcb: [cap100n.jlc] }}
          pcbX={6.4}
          pcbY={8.5}
          schX={-9}
          schY={0.5}
          connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
        />
        <capacitor
          name="C17"
          capacitance="100nF"
          footprint="0402"
          manufacturerPartNumber={cap100n.mpn}
          supplierPartNumbers={{ jlcpcb: [cap100n.jlc] }}
          pcbX={11.6}
          pcbY={8.5}
          schX={-7}
          schY={0.5}
          connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
        />

        <PCF8563TS
          name="U4"
          pcbX={10}
          pcbY={-4}
          schX={7}
          schY={3}
          noConnect={["CLKOUT"]}
          connections={{
            VDD: "net.BAT",
            VSS: "net.GND",
            SDA: "net.I2C_SDA",
            SCL: "net.I2C_SCL",
            INT: "net.RTC_INT",
            OSCI: "net.RTC_OSCI",
            OSCO: "net.RTC_OSCO",
          }}
        />
        <crystal
          name="Y1"
          frequency="32.768kHz"
          loadCapacitance="7pF"
          manufacturerPartNumber="FC-135 32.7680KA-AG3"
          supplierPartNumbers={{ jlcpcb: ["C7275970"] }}
          cadModel={{
            objUrl:
              "https://modelcdn.tscircuit.com/easyeda_models/assets/C7275970.obj?uuid=eac14d4facdb45dfa3b66d00e2a3c6e4",
            stepUrl:
              "https://modelcdn.tscircuit.com/easyeda_models/assets/C7275970.step?uuid=eac14d4facdb45dfa3b66d00e2a3c6e4",
            pcbRotationOffset: 0,
            modelOriginPosition: { x: -0.0000254, y: -0.0001397, z: -0.01 },
          }}
          pcbX={5}
          pcbY={-4}
          schX={crystalBesidePins ? 3 : 10.5}
          schY={crystalBesidePins ? 3.1 : 3}
          schRotation={crystalBesidePins ? 270 : 0}
          connections={{ pin1: "net.RTC_OSCI", pin2: "net.RTC_OSCO" }}
          footprint={
            <footprint>
              <smtpad
                portHints={["pin1"]}
                pcbX={-1.15}
                pcbY={0}
                width={1.15}
                height={1.35}
                shape="rect"
              />
              <smtpad
                portHints={["pin2"]}
                pcbX={1.15}
                pcbY={0}
                width={1.15}
                height={1.35}
                shape="rect"
              />
              <courtyardrect width={3.7} height={2} />
              <silkscreenrect pcbX={0} pcbY={0} width={3.2} height={1.5} />
            </footprint>
          }
        />
        <capacitor
          name="C22"
          capacitance="100nF"
          footprint="0402"
          manufacturerPartNumber={cap100n.mpn}
          supplierPartNumbers={{ jlcpcb: [cap100n.jlc] }}
          pcbX={9}
          pcbY={-6.2}
          schX={6}
          schY={0}
          connections={{ pin1: "net.BAT", pin2: "net.GND" }}
        />
        <resistor
          name="R17"
          resistance="10k"
          footprint="0402"
          manufacturerPartNumber="0402WGF1002TCE"
          supplierPartNumbers={{ jlcpcb: ["C25744"] }}
          pcbX={11}
          pcbY={-6.2}
          schX={8.5}
          schY={0}
          connections={{ pin1: "net.V3V3", pin2: "net.RTC_INT" }}
        />
      </schematicsheet>
    </board>
  )
}

export async function createSmartwatchMotionRtcRepro(
  crystalBesidePins = false,
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<SmartwatchMotionRtc crystalBesidePins={crystalBesidePins} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
