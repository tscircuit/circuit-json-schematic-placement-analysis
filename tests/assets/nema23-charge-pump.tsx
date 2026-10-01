import { Circuit } from "@tscircuit/core"

// Complete driver sheet extracted from imrishabh18/nema-23-stepper-controller v1.0.8.
// https://tscircuit.com/imrishabh18/nema-23-stepper-controller
// Schematic positions, values, pin arrangement and connections follow its TSX;
// PCB-only data and other sheets are omitted. Traces are rendered by this repo's core.
const driver = { schSheetName: "driver", schSectionName: "driver" }
const driverPinLabels = {
  pin1: ["VCP"],
  pin2: ["VM1"],
  pin3: ["PGNDA1"],
  pin4: ["AOUT11"],
  pin5: ["AOUT12"],
  pin6: ["AOUT13"],
  pin7: ["AOUT21"],
  pin8: ["AOUT22"],
  pin9: ["AOUT23"],
  pin10: ["PGNDA2"],
  pin11: ["VM2"],
  pin12: ["VM3"],
  pin13: ["PGNDB1"],
  pin14: ["BOUT21"],
  pin15: ["BOUT22"],
  pin16: ["BOUT23"],
  pin17: ["BOUT11"],
  pin18: ["BOUT12"],
  pin19: ["BOUT13"],
  pin20: ["PGNDB2"],
  pin21: ["VM4"],
  pin22: ["GND1"],
  pin23: ["GND2"],
  pin24: ["DVDD"],
  pin25: ["VCC"],
  pin26: ["nFAULT"],
  pin27: ["nHOME"],
  pin28: ["MODE"],
  pin29: ["RSVD4"],
  pin30: ["RSVD3"],
  pin31: ["RSVD2"],
  pin32: ["RSVD1"],
  pin33: ["VREF"],
  pin34: ["pin34"],
  pin35: ["pin35"],
  pin36: ["pin36"],
  pin37: ["pin37"],
  pin38: ["pin38"],
  pin39: ["STEP"],
  pin40: ["DIR"],
  pin41: ["ENABLE"],
  pin42: ["nSLEEP"],
  pin43: ["CPL"],
  pin44: ["CPH"],
  pin45: ["EP"],
} as const
const driverNets: Record<string, string> = {
  pin1: "VCP",
  pin2: "VM",
  pin3: "GND",
  pin4: "A_PLUS",
  pin5: "A_PLUS",
  pin6: "A_PLUS",
  pin7: "A_MINUS",
  pin8: "A_MINUS",
  pin9: "A_MINUS",
  pin10: "GND",
  pin11: "VM",
  pin12: "VM",
  pin13: "GND",
  pin14: "B_MINUS",
  pin15: "B_MINUS",
  pin16: "B_MINUS",
  pin17: "B_PLUS",
  pin18: "B_PLUS",
  pin19: "B_PLUS",
  pin20: "GND",
  pin21: "VM",
  pin22: "GND",
  pin23: "GND",
  pin24: "DVDD",
  pin25: "V3V3",
  pin26: "FAULT_N",
  pin27: "HOME_N",
  pin28: "V3V3",
  pin33: "VREF",
  pin34: "SPI_CS",
  pin36: "SPI_MISO",
  pin37: "SPI_MOSI",
  pin38: "SPI_SCK",
  pin39: "STEP",
  pin40: "DIR",
  pin41: "ENABLE_SAFE",
  pin42: "WAKE",
  pin45: "GND",
}

export default function Nema23ChargePumpRepro() {
  return (
    <board schSheetName="driver">
      <net name="GND" />
      <net name="V3V3" />
      <schematicsheet
        name="driver"
        displayName="DRV8462 stepper driver"
        sheetIndex={4}
      >
        <schematicsection name="driver" />
      </schematicsheet>
      <chip
        name="DRIVER"
        manufacturerPartNumber="DRV8462DDWR"
        pinLabels={driverPinLabels}
        pinAttributes={{
          pin22: { requiresGround: true },
          pin23: { requiresGround: true },
          pin25: { requiresPower: true },
        }}
        schX={0}
        schY={0}
        schWidth={2.3}
        schHeight={4.6}
        {...driver}
        noConnect={["pin29", "pin30", "pin31", "pin32", "pin35"]}
        schPinArrangement={{
          leftSide: {
            pins: [
              1, 2, 11, 12, 21, 24, 25, 43, 44, 34, 38, 37, 36, 39, 40, 41, 42,
              26, 27, 28, 33, 35,
            ],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: [
              4, 5, 6, 7, 8, 9, 14, 15, 16, 17, 18, 19, 3, 10, 13, 20, 22, 23,
              29, 30, 31, 32, 45,
            ],
            direction: "top-to-bottom",
          },
        }}
      />
      {Object.entries(driverNets).map(([pin, net]) => (
        <trace
          key={pin}
          from={`.DRIVER > .${pin}`}
          to={`net.${net}`}
          schDisplayLabel={net}
        />
      ))}
      <connector
        name="J_MOTOR"
        manufacturerPartNumber="B4B-XH-A(LF)(SN)"
        pinLabels={{
          pin1: ["pin1"],
          pin2: ["pin2"],
          pin3: ["pin3"],
          pin4: ["pin4"],
        }}
        schX={8}
        schY={1}
        {...driver}
        schPinArrangement={{
          leftSide: { pins: [1, 2, 3, 4], direction: "top-to-bottom" },
        }}
        connections={{
          pin1: "net.A_PLUS",
          pin2: "net.A_MINUS",
          pin3: "net.B_PLUS",
          pin4: "net.B_MINUS",
        }}
      />
      <capacitor
        name="C_VM1"
        maxVoltageRating="100V"
        capacitance="10nF"
        schX={-8}
        schY={7}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.VM", pin2: "net.GND" }}
      />
      <capacitor
        name="C_VM2"
        maxVoltageRating="100V"
        capacitance="10nF"
        schX={-6}
        schY={7}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.VM", pin2: "net.GND" }}
      />
      <capacitor
        name="C_VM3"
        maxVoltageRating="100V"
        capacitance="2.2uF"
        schX={-4}
        schY={7}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.VM", pin2: "net.GND" }}
      />
      {/* TI DRV8462 section 7.3.15 identifies the capacitor between CPH and CPL
          as the charge-pump flying capacitor (not the VCP/VM storage capacitor).
          https://www.ti.com/lit/ds/symlink/drv8462.pdf#page=52 */}
      <trace from=".DRIVER > .CPH" to="net.CPH" schDisplayLabel="CPH" />
      <trace from=".DRIVER > .CPL" to="net.CPL" schDisplayLabel="CPL" />
      <capacitor
        name="C_CP"
        maxVoltageRating="100V"
        capacitance="100nF"
        schX={3}
        schY={9}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.CPH", pin2: "net.CPL" }}
      />
      <capacitor
        name="C_VCP"
        maxVoltageRating="25V"
        capacitance="1uF"
        schX={7}
        schY={8}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.VCP", pin2: "net.VM" }}
      />
      <capacitor
        name="C_DVDD"
        maxVoltageRating="10V"
        capacitance="1uF"
        schX={10}
        schY={8}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.DVDD", pin2: "net.GND" }}
      />
      <capacitor
        name="C_VCC"
        maxVoltageRating="16V"
        capacitance="100nF"
        schX={10}
        schY={-7}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
      />
      <capacitor
        name="C_VREF"
        maxVoltageRating="16V"
        capacitance="10nF"
        schX={6}
        schY={-8}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.VREF", pin2: "net.GND" }}
      />
      <resistor
        name="R_REF_TOP"
        resistance="6.65k"
        schX={-10}
        schY={-7}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.V3V3", pin2: "net.VREF" }}
      />
      <resistor
        name="R_REF_BOT"
        resistance="10k"
        schX={-6}
        schY={-7}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.VREF", pin2: "net.GND" }}
      />
      <resistor
        name="R_CS"
        resistance="10k"
        schX={-9}
        schY={4}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.SPI_CS", pin2: "net.V3V3" }}
      />
      <resistor
        name="R_FAULT"
        resistance="10k"
        schX={-9}
        schY={1}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.FAULT_N", pin2: "net.V3V3" }}
      />
      <resistor
        name="R_HOME"
        resistance="10k"
        schX={-9}
        schY={-2}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.HOME_N", pin2: "net.V3V3" }}
      />
      <resistor
        name="R_WAKE"
        resistance="100k"
        schX={-12}
        schY={4}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.WAKE", pin2: "net.GND" }}
      />
      <resistor
        name="R_ENABLE"
        resistance="100k"
        schX={-12}
        schY={1}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.ENABLE_SAFE", pin2: "net.GND" }}
      />
      <resistor
        name="R_STEP"
        resistance="100k"
        schX={-12}
        schY={-2}
        schOrientation="vertical"
        {...driver}
        connections={{ pin1: "net.STEP", pin2: "net.GND" }}
      />
    </board>
  )
}

export async function createNema23ChargePump() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Nema23ChargePumpRepro />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
