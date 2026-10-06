import { Circuit } from "@tscircuit/core"
import {
  AP63203WU_7,
  BZT52C12,
  DMP4015SK3Q_13,
  F1206SB3000V032TM,
  KF301_5_0_2P,
  SMBJ18A,
  SRN6045TA_4R7M,
  R,
  C,
} from "./parts"
// Full Power sheet adapted from published lib/power.tsx and its part definitions:
// https://tscircuit.com/AnasSarkiz/pa25-12v-brushed-dc-motor-controller-stm32c071-drv8874?version=0.1.0-dev.7#files
// Release: 767e409f-1555-4ad6-a9e6-af6689a7c515
// Power source file: b39c7208-9fa2-4d3a-8d41-d1896388fa20
// Preserve all 14 components, positions, rotations, pin arrangements and nets.
// Omit PCB/CAD data, unsupported sheetSize and unrelated sheets; the installed
// core regenerates wires. See parts.tsx for legacy prop compatibility changes.
// No stored Circuit JSON, moved components or post-render edits.
const input = { schSheetName: "Power", schSectionName: "input" }
const buck = { schSheetName: "Power", schSectionName: "buck" }
export function Power() {
  return (
    <>
      <KF301_5_0_2P
        name="J1"
        schPinArrangement={{ topSide: ["pin1"], bottomSide: ["pin2"] }}
        {...input}
        schX={-9.1}
        schY={5.2}
        connections={{ pin1: "net.VIN", pin2: "net.GND" }}
      />
      <F1206SB3000V032TM
        name="F1"
        {...input}
        schX={-5.85}
        schY={5.2}
        connections={{ pin1: "net.VIN", pin2: "net.VIN_FUSED" }}
      />
      <DMP4015SK3Q_13
        name="Q1"
        {...input}
        schX={-1.95}
        schY={5.2}
        connections={{ G: "net.REVERSE_GATE", D: "net.VIN_FUSED", S: "net.VM" }}
      />
      <BZT52C12
        name="D2"
        schRotation={90}
        {...input}
        schX={1.3}
        schY={5.2}
        connections={{ cathode: "net.VM", anode: "net.REVERSE_GATE" }}
      />
      <R
        name="R1"
        schRotation={-90}
        {...input}
        resistance="4.7k"
        schX={1.3}
        schY={2.6}
        connections={{ pin1: "net.REVERSE_GATE", pin2: "net.GND" }}
      />
      <R
        name="R2"
        schRotation={90}
        {...input}
        resistance="100k"
        schX={-1.95}
        schY={2.6}
        connections={{ pin1: "net.REVERSE_GATE", pin2: "net.VM" }}
      />
      <SMBJ18A
        name="D1"
        {...input}
        schX={5.2}
        schY={5.2}
        connections={{ K: "net.VM", A: "net.GND" }}
      />
      <C
        name="C1"
        schRotation={-90}
        {...input}
        capacitance="10uF"
        schX={-7.8}
        schY={-0.65}
        connections={{ pin1: "net.VM", pin2: "net.GND" }}
      />
      <AP63203WU_7
        name="U3"
        {...buck}
        schX={-3.25}
        schY={-4.55}
        schWidth={1.77}
        schHeight={0.8}
        schPinArrangement={{
          leftSide: { pins: ["VIN", "EN", "GND"], direction: "top-to-bottom" },
          rightSide: { pins: ["BST", "SW", "FB"], direction: "top-to-bottom" },
        }}
        connections={{
          VIN: "net.VM",
          EN: "net.VM",
          GND: "net.GND",
          BST: "net.BUCK_BST",
          SW: "net.BUCK_SW",
          FB: "net.V3V3",
        }}
      />
      <C
        name="C2"
        schRotation={-90}
        {...buck}
        capacitance="10uF"
        schX={-7.8}
        schY={-4.55}
        connections={{ pin1: "net.VM", pin2: "net.GND" }}
      />
      <C
        name="C3"
        schRotation={180}
        {...buck}
        capacitance="100nF"
        schX={0.65}
        schY={-2.6}
        connections={{ pin1: "net.BUCK_BST", pin2: "net.BUCK_SW" }}
      />
      <SRN6045TA_4R7M
        name="L1"
        {...buck}
        schX={1.3}
        schY={-5.2}
        connections={{ pin1: "net.BUCK_SW", pin2: "net.V3V3" }}
      />
      <C
        name="C4"
        schRotation={-90}
        {...buck}
        capacitance="22uF"
        schX={5.2}
        schY={-4.55}
        connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
      />
      <C
        name="C5"
        schRotation={-90}
        {...buck}
        capacitance="22uF"
        schX={7.475}
        schY={-4.55}
        connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
      />
    </>
  )
}

export default function Pa25MotorControllerPower() {
  return (
    <board>
      <schematicsheet
        name="Power"
        displayName="Power input, protection and 3.3 V"
        sheetIndex={1}
      />
      <schematicsection name="input" displayName="Protected motor supply" />
      <schematicsection name="buck" displayName="3.3 V regulator" />
      <Power />
    </board>
  )
}
export async function createPa25MotorControllerPower() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Pa25MotorControllerPower />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
