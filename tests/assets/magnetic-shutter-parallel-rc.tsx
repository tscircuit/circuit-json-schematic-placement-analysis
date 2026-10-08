import { Circuit } from "@tscircuit/core"
// Complete Power sheet from AnasSarkiz/magnetic-shutter-remote-r8 v0.3.20.
// https://tscircuit.com/AnasSarkiz/magnetic-shutter-remote-r8?version=0.3.20
// Source: src/remote-circuit.tsx and its component imports; PCB/CAD/fanouts omitted.
// The installed core predates sheetSize and isInput/isOutput/isBidirectional props.
export default function MagneticShutterPower({
  alignParallelRc = false,
}: {
  alignParallelRc?: boolean
}) {
  return (
    <board
      schSheetName="Power"
      schAutoLayoutEnabled={false}
      schLayout={{ layoutMode: "relative" }}
      title="Magnetic shutter remote R8 ESP32-C3 — engineering prototype"
    >
      <net name={"GND"} isGroundNet={true} />
      <net name={"USB5V"} isPowerNet={true} />
      <net name={"VBAT"} isPowerNet={true} />
      <net name={"V3"} isPowerNet={true} />
      <net name={"INDUCTOR_L1"} />
      <net name={"INDUCTOR_L2"} />
      <net name={"CC2"} />
      <net name={"CC1"} />
      <net name={"CHARGER_SYS"} />
      <net name={"CHARGE_STAT"} />
      <net name={"BATTERY_OK"} />
      <net name={"UART_RX"} />
      <net name={"VSET"} />
      <net name={"BOOT"} />
      <net name={"TEMP_SET_HOT"} />
      <net name={"CHARGE_DISABLE"} />
      <schematicsheet
        name={"Power"}
        displayName={"USB-C, charge and regulated power"}
        sheetIndex={0}
      />
      <schematictext
        text={"J1: Accepts 5 V for charging only."}
        schX={-15.5}
        schY={9.5}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"USB present holds the radio power off."}
        schX={-15.5}
        schY={9.14}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"R1: Identifies a USB-C power sink on CC1."}
        schX={-15.5}
        schY={8.65}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Allows either cable orientation with R2."}
        schX={-15.5}
        schY={8.290000000000001}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"R2: Identifies a USB-C power sink on CC2."}
        schX={-15.5}
        schY={7.8}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Allows either cable orientation with R1."}
        schX={-15.5}
        schY={7.4399999999999995}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"U2: Charges the cell at nominal 300 mA."}
        schX={-15.5}
        schY={6.95}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Manages USB input and the SYS power path."}
        schX={-15.5}
        schY={6.59}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"R3: Programs U2 ISET for nominal 300 mA."}
        schX={-15.5}
        schY={6.1}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Actual current has component tolerance."}
        schX={-15.5}
        schY={5.739999999999999}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"C1: Filters USB5V at the charger input."}
        schX={-15.5}
        schY={5.25}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Supplies brief input-current changes."}
        schX={-15.5}
        schY={4.89}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"C2: Filters VBAT at the charger BAT pin."}
        schX={-15.5}
        schY={4.4}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Supports stable battery charging."}
        schX={-15.5}
        schY={4.04}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"J2: Pin 1 is GND; pin 2 is battery positive."}
        schX={-15.5}
        schY={3.55}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Use the qualified protected-cell pack."}
        schX={-15.5}
        schY={3.19}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"R4: Limits current through red LED1."}
        schX={-15.5}
        schY={2.7}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Connects VBAT to the LED anode path."}
        schX={-15.5}
        schY={2.3400000000000003}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"LED1: Lights when U2 pulls CHARGE_STAT low."}
        schX={-15.5}
        schY={1.8500000000000005}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Indicates charger status, not BLE status."}
        schX={-15.5}
        schY={1.4900000000000007}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"R8: Selects the nominal 4.1 V charge target."}
        schX={-15.5}
        schY={1}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Sets U2's combined VSET / ILIM mode."}
        schX={-15.5}
        schY={0.64}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"R9: Provides the fixed bias on U2 TS input."}
        schX={-15.5}
        schY={0.15000000000000036}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"U5 supplies the separate temperature gate."}
        schX={-15.5}
        schY={-0.20999999999999963}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"C8: Decouples the charger's SYS output."}
        schX={-15.5}
        schY={-0.6999999999999993}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"The radio regulator uses VBAT, not SYS."}
        schX={-15.5}
        schY={-1.0599999999999992}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"C9: Filters noise at the PROG / ISET node."}
        schX={-15.5}
        schY={-1.549999999999999}
        anchor={"left"}
        fontSize={0.23}
      />
      <schematictext
        text={"Works with charge-setting resistor R3."}
        schX={-15.5}
        schY={-1.9099999999999988}
        anchor={"left"}
        fontSize={0.23}
      />
      <connector
        pinLabels={{
          pin13: ["EH2"],
          pin14: ["EH1"],
          pin15: ["EH3"],
          pin16: ["EH4"],
          pin17: ["GND1", "A1B12"],
          pin18: ["VBUS1", "A4B9"],
          pin19: ["SBU2", "B8"],
          pin20: ["CC1", "A5"],
          pin21: ["Dn2", "B7"],
          pin22: ["Dp1", "A6"],
          pin23: ["Dn1", "A7"],
          pin24: ["Dp2", "B6"],
          pin25: ["SBU1", "A8"],
          pin26: ["CC2", "B5"],
          pin27: ["VBUS2", "B4A9"],
          pin28: ["GND2", "B1A12"],
        }}
        manufacturerPartNumber={"USB4215-03-A"}
        standard="usb_c"
        // Preserve the standard connector's published pin arrangement on the older core.
        schPinArrangement={{
          rightSide: {
            pins: [18, 27, 20, 26, 22, 24, 25, 19, 17, 28],
            direction: "top-to-bottom",
          },
        }}
        schWidth={1.575}
        name={"J1"}
        noConnect={["pin19", "pin21", "pin22", "pin23", "pin24", "pin25"]}
        schX={-8}
        schY={3}
        connections={{
          pin13: "net.GND",
          pin14: "net.GND",
          pin15: "net.GND",
          pin16: "net.GND",
          pin17: "net.GND",
          pin18: "net.USB5V",
          pin20: "net.CC1",
          pin26: "net.CC2",
          pin27: "net.USB5V",
          pin28: "net.GND",
        }}
      />
      <resistor
        name={"R2"}
        resistance={"5.1kohm"}
        manufacturerPartNumber={"0603WAF5101T5E"}
        schRotation={-90}
        schX={-4}
        schY={2}
        connections={{ pin1: "net.CC2", pin2: "net.GND" }}
      />
      <resistor
        name={"R1"}
        resistance={"5.1kohm"}
        manufacturerPartNumber={"0603WAF5101T5E"}
        schRotation={-90}
        schX={-4}
        schY={4}
        connections={{ pin1: "net.CC1", pin2: "net.GND" }}
      />
      <chip
        pinLabels={{
          pin1: ["SYS"],
          pin2: ["BAT"],
          pin3: ["STAT2"],
          pin4: ["N_CE"],
          pin5: ["GND"],
          pin6: ["TS", "MR"],
          pin7: ["ILIM", "VSET"],
          pin8: ["ISET"],
          pin9: ["STAT1"],
          pin10: ["IN"],
          pin11: ["EP"],
        }}
        pinAttributes={{
          pin5: { requiresGround: true },
          GND: { requiresGround: true },

          pin10: { requiresPower: true },
          IN: { requiresPower: true },
          pin11: { requiresGround: true },
          EP: { requiresGround: true },
        }}
        manufacturerPartNumber={"BQ25185DLHR"}
        name={"U2"}
        schX={1}
        schY={4}
        connections={{
          pin1: "net.CHARGER_SYS",
          pin2: "net.VBAT",
          pin3: "net.CHARGE_STAT",
          pin4: "net.CHARGE_DISABLE",
          pin5: "net.GND",
          pin6: "net.TS_BIAS",
          pin7: "net.VSET",
          pin8: "net.PROG",
          pin10: "net.USB5V",
          pin11: "net.GND",
        }}
      />
      <resistor
        name={"R3"}
        resistance={"1kohm"}
        manufacturerPartNumber={"0603WAF1001T5E"}
        schRotation={-90}
        schX={1}
        schY={1}
        connections={{ pin1: "net.PROG", pin2: "net.GND" }}
      />
      <capacitor
        name={"C2"}
        capacitance={"4.7uF"}
        manufacturerPartNumber={"CL10A475KO8NNNC"}
        schRotation={-90}
        schX={4}
        schY={6}
        connections={{ pin1: "net.VBAT", pin2: "net.GND" }}
      />
      <capacitor
        name={"C1"}
        capacitance={"4.7uF"}
        manufacturerPartNumber={"CL10A475KO8NNNC"}
        schRotation={-90}
        schX={-2}
        schY={6}
        connections={{ pin1: "net.USB5V", pin2: "net.GND" }}
      />
      <resistor
        name={"R4"}
        resistance={"1kohm"}
        manufacturerPartNumber={"0603WAF1001T5E"}
        schRotation={-90}
        schX={-2}
        schY={-1}
        connections={{ pin1: "net.VBAT", pin2: "net.CHARGE_LED_A" }}
      />
      <trace from={"R4.pin1"} to={"net.VBAT"} />
      <led
        name={"LED1"}
        manufacturerPartNumber={"KT-0603R"}
        schX={1}
        schY={-1}
        connections={{
          anode: "net.CHARGE_LED_A",
          cathode: "net.CHARGE_STAT",
        }}
      />
      <connector
        pinLabels={{
          pin1: ["pin1"],
          pin2: ["pin2"],
          pin3: ["pin3"],
          pin4: ["pin4"],
        }}
        manufacturerPartNumber={"SM02B-SRSS-TB(LF)(SN)"}
        name={"J2"}
        schPinArrangement={{ leftSide: [2], rightSide: [1, 4, 3] }}
        schX={8}
        schY={4}
        connections={{
          pin1: "net.GND",
          pin2: "net.VBAT",
          pin3: "net.GND",
          pin4: "net.GND",
        }}
      />
      <resistor
        name={"R8"}
        resistance={"130kohm"}
        manufacturerPartNumber={"0603WAF1303T5E"}
        schRotation={-90}
        schX={5}
        schY={0}
        connections={{ pin1: "net.VSET", pin2: "net.GND" }}
      />
      <resistor
        name={"R9"}
        resistance={"10kohm"}
        manufacturerPartNumber={"0603WAF1002T5E"}
        schRotation={-90}
        schX={5}
        schY={-3}
        connections={{ pin1: "net.TS_BIAS", pin2: "net.GND" }}
      />
      <capacitor
        name={"C8"}
        capacitance={"10uF"}
        manufacturerPartNumber={"CL21A106KAYNNNE"}
        schRotation={-90}
        schX={-3}
        schY={-4}
        connections={{ pin1: "net.CHARGER_SYS", pin2: "net.GND" }}
      />
      <capacitor
        name={"C9"}
        capacitance={"47pF"}
        manufacturerPartNumber={"TCC0603COG470J500CT"}
        schRotation={-90}
        schX={alignParallelRc ? 0 : 1}
        schY={alignParallelRc ? 1 : -3}
        connections={{ pin1: "net.PROG", pin2: "net.GND" }}
      />
    </board>
  )
}
export async function createMagneticShutterPower(alignParallelRc = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<MagneticShutterPower alignParallelRc={alignParallelRc} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
