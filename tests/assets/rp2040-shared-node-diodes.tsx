import { Circuit } from "@tscircuit/core"
import { createElement } from "react"

// Complete logic_power sheet from MustafaMulla29/rp2040-bldc-motor-controller-new v0.3.59.
// https://tscircuit.com/MustafaMulla29/rp2040-bldc-motor-controller-new?version=0.3.59
// Expanded source TSX; PCB/CAD data, unsupported ANSI_B frame and other sheets omitted. The repository's
// core regenerates wires and uses absolute custom-symbol port coordinates. Imported diode pin numbers are expressed through their
// original anode/cathode aliases for this core's native diode terminal mapping.
export function Rp2040LogicPower({
  parallelDiodes = false,
}: {
  parallelDiodes?: boolean
} = {}) {
  return (
    <board schTraceAutoLabelEnabled schMaxTraceDistance={12}>
      <schematictext
        text={"3 / 8 — Power switch and 3.3 V supply"}
        schX={-18.9}
        schY={12.78}
        anchor={"left"}
        fontSize={0.45}
        color={"#174e70"}
      />
      <schematictext
        text={"PD input or DATA USB → isolated 3.3 V logic supply"}
        schX={-19}
        schY={10.6}
        anchor={"left"}
        fontSize={0.32}
        color={"#46556a"}
      />
      <schematictext
        text={"SW4 POWER: OFF removes motor power and clamps ARM_BASE low."}
        schX={-19}
        schY={-0.3}
        anchor={"left"}
        fontSize={0.32}
        color={"#46556a"}
      />
      <schematictext
        text={
          "USB communication remains available in OFF. No battery or charger is fitted."
        }
        schX={-19}
        schY={-11.2}
        anchor={"left"}
        fontSize={0.28}
        color={"#46556a"}
      />
      <schematictext
        text={
          "R142 = 1.5k sets approx. 1.64 A nominal motor-feed limit; verify tolerance and heating."
        }
        schX={-19}
        schY={-11.75}
        anchor={"left"}
        fontSize={0.28}
        color={"#46556a"}
      />
      <schematictext
        text={
          "D6 returns transients to local TVS; D3 blocks USB backfeed. Use coast stop; no sustained regeneration."
        }
        schX={-19}
        schY={-12.299999999999999}
        anchor={"left"}
        fontSize={0.28}
        color={"#46556a"}
      />
      <schematicline
        x1={-22.5}
        y1={12.15}
        x2={22.5}
        y2={12.15}
        strokeWidth={0.015}
        color={"#aeb7c0"}
      />
      <schematicline
        x1={-22.5}
        y1={-13.32}
        x2={22.5}
        y2={-13.32}
        strokeWidth={0.015}
        color={"#aeb7c0"}
      />
      <net
        name={"PD_LOAD"}
        isGroundNet={false}
        isPowerNet={true}
        nominalTraceWidth={2}
      />
      <net name={"POWER_ON_LEVEL"} isGroundNet={false} isPowerNet={false} />
      <net name={"POWER_SWITCH_EN"} isGroundNet={false} isPowerNet={false} />
      <net
        name={"POWER_CURRENT_LIMIT"}
        isGroundNet={false}
        isPowerNet={false}
      />
      <net name={"PROG_VBUS"} isGroundNet={false} isPowerNet={false} />
      <net
        name={"VBUS_RAW"}
        isGroundNet={false}
        isPowerNet={true}
        nominalTraceWidth={1}
      />
      <net
        name={"LOGIC_IN"}
        isGroundNet={false}
        isPowerNet={true}
        nominalTraceWidth={0.3}
      />
      <net
        name={"VMOTOR"}
        isGroundNet={false}
        isPowerNet={true}
        nominalTraceWidth={2}
      />
      <net
        name={"V3V3"}
        isGroundNet={false}
        isPowerNet={true}
        nominalTraceWidth={0.3}
      />
      <net
        name={"GND"}
        isGroundNet={true}
        isPowerNet={false}
        nominalTraceWidth={2}
      />
      <net
        name={"LOGIC_SW"}
        isGroundNet={false}
        isPowerNet={false}
        nominalTraceWidth={0.3}
      />
      <net name={"LOGIC_BST"} isGroundNet={false} isPowerNet={false} />
      <net name={"ARM_BASE"} isGroundNet={false} isPowerNet={false} />
      {createElement("switch", {
        name: "SW4",
        type: "dpdt",
        pinLabels: {
          pin1: ["pin1"],
          pin2: ["pin2"],
          pin3: ["pin3"],
          pin5: ["pin5"],
          pin6: ["pin6"],
          pin7: ["pin7"],
        },
        symbol: (
          <symbol>
            <port
              name={"pin1"}
              pinNumber={1}
              direction={"left"}
              schX={-7.8}
              schY={-4.3}
              schStemLength={0.2}
            />
            <port
              name={"pin2"}
              pinNumber={2}
              direction={"right"}
              schX={-6.2}
              schY={-4.6}
              schStemLength={0.2}
            />
            <port
              name={"pin3"}
              pinNumber={3}
              direction={"left"}
              schX={-7.8}
              schY={-4.9}
              schStemLength={0.2}
            />
            <port
              name={"pin5"}
              pinNumber={5}
              direction={"left"}
              schX={-7.8}
              schY={-5.5}
              schStemLength={0.2}
            />
            <port
              name={"pin6"}
              pinNumber={6}
              direction={"right"}
              schX={-6.2}
              schY={-5.8}
              schStemLength={0.2}
            />
            <port
              name={"pin7"}
              pinNumber={7}
              direction={"left"}
              schX={-7.8}
              schY={-6.1}
              schStemLength={0.2}
            />
            <schematicpath
              points={[
                { x: -0.6, y: 0.7 },
                { x: -0.4, y: 0.7 },
                { x: 0.4, y: 0.4 },
                { x: 0.6, y: 0.4 },
              ]}
            />
            <schematicpath
              points={[
                { x: -0.6, y: 0.1 },
                { x: -0.4, y: 0.1 },
              ]}
            />
            <schematicpath
              points={[
                { x: -0.6, y: -0.5 },
                { x: -0.4, y: -0.5 },
                { x: 0.4, y: -0.8 },
                { x: 0.6, y: -0.8 },
              ]}
            />
            <schematicpath
              points={[
                { x: -0.6, y: -1.1 },
                { x: -0.4, y: -1.1 },
              ]}
            />
            <schematicpath
              points={[
                { x: 0, y: 0.5 },
                { x: 0, y: 0.25 },
              ]}
            />
            <schematicpath
              points={[
                { x: 0, y: 0.05 },
                { x: 0, y: -0.2 },
              ]}
            />
            <schematicpath
              points={[
                { x: 0, y: -0.4 },
                { x: 0, y: -0.65 },
              ]}
            />
            <schematictext
              text={"{NAME}"}
              schX={0}
              schY={1.15}
              fontSize={0.2}
            />
            <schematictext
              text={"DPDT • shown OFF"}
              schX={0}
              schY={-1.5}
              fontSize={0.16}
            />
          </symbol>
        ),
        supplierPartNumbers: { jlcpcb: ["C221665"] },
        manufacturerPartNumber: "JS202011JCQN",
        schX: -7,
        schY: -5,
        schRotation: 0,
        noConnect: ["pin7"],
        connections: {
          pin1: "net.GND",
          pin2: "net.POWER_SWITCH_EN",
          pin3: "net.POWER_ON_LEVEL",
          pin5: "net.GND",
          pin6: "net.ARM_BASE",
        },
      })}
      <chip
        name={"U11"}
        pinLabels={{
          pin1: ["NC3"],
          pin2: ["GND"],
          pin3: ["IN"],
          pin4: ["NC2"],
          pin5: ["OUT3"],
          pin6: ["OUT2"],
          pin7: ["OUT1"],
          pin8: ["VS3"],
          pin9: ["VS2"],
          pin10: ["VS1"],
          pin11: ["NC1"],
          pin12: ["DIAG_EN"],
          pin13: ["CL"],
          pin14: ["N_ST"],
          pin15: ["PAD"],
        }}
        supplierPartNumbers={{ jlcpcb: ["C478465"] }}
        manufacturerPartNumber={"TPS1H100AQPWPRQ1"}
        schX={1}
        schY={-4}
        schRotation={0}
        schWidth={1.465}
        schHeight={1.75}
        schPinSpacing={0.4}
        schPinArrangement={{
          leftSide: { pins: [8, 9, 10, 3], direction: "top-to-bottom" },
          rightSide: { pins: [5, 6, 7, 14], direction: "top-to-bottom" },
          bottomSide: { pins: [2, 15, 12, 13], direction: "left-to-right" },
          topSide: { pins: [1, 4, 11], direction: "left-to-right" },
        }}
        noConnect={["pin1", "pin4", "pin11", "pin14"]}
        connections={{
          pin2: "net.GND",
          pin3: "net.POWER_SWITCH_EN",
          pin5: "net.VMOTOR",
          pin6: "net.VMOTOR",
          pin7: "net.VMOTOR",
          pin8: "net.PD_LOAD",
          pin9: "net.PD_LOAD",
          pin10: "net.PD_LOAD",
          pin12: "net.GND",
          pin13: "net.POWER_CURRENT_LIMIT",
          pin15: "net.GND",
        }}
      />
      <diode
        name={"D6"}
        supplierPartNumbers={{ jlcpcb: ["C22452"] }}
        manufacturerPartNumber={"SS54"}
        variant={"schottky"}
        schX={1}
        schY={0}
        schRotation={270}
        connections={{ anode: "net.VMOTOR", cathode: "net.PD_LOAD" }}
      />
      <diode
        name={"D7"}
        supplierPartNumbers={{ jlcpcb: ["C2116"] }}
        manufacturerPartNumber={"BZT52C4V7"}
        variant={"zener"}
        schX={-16}
        schY={-7}
        schRotation={-90}
        connections={{ cathode: "net.POWER_ON_LEVEL", anode: "net.GND" }}
      />
      <resistor
        name={"R140"}
        resistance={"22k"}
        tolerance={"1%"}
        manufacturerPartNumber={"0603WAF2202T5E"}
        supplierPartNumbers={{ jlcpcb: ["C31850"] }}
        schX={-18}
        schY={-3}
        schRotation={-90}
        connections={{ pin1: "net.PD_LOAD", pin2: "net.POWER_ON_LEVEL" }}
      />
      <resistor
        name={"R141"}
        resistance={"10k"}
        tolerance={"1%"}
        manufacturerPartNumber={"0603WAF1002T5E"}
        supplierPartNumbers={{ jlcpcb: ["C25804"] }}
        schX={-18}
        schY={-7}
        schRotation={-90}
        connections={{ pin1: "net.POWER_ON_LEVEL", pin2: "net.GND" }}
      />
      <resistor
        name={"R142"}
        resistance={"1.5k"}
        tolerance={"1%"}
        manufacturerPartNumber={"0603WAF1501T5E"}
        supplierPartNumbers={{ jlcpcb: ["C22843"] }}
        schX={1}
        schY={-9}
        schRotation={-90}
        connections={{ pin1: "net.POWER_CURRENT_LIMIT", pin2: "net.GND" }}
      />
      <resistor
        name={"R143"}
        resistance={"10k"}
        tolerance={"1%"}
        manufacturerPartNumber={"0603WAF1002T5E"}
        supplierPartNumbers={{ jlcpcb: ["C25804"] }}
        schX={9}
        schY={-6}
        schRotation={-90}
        connections={{ pin1: "net.VMOTOR", pin2: "net.GND" }}
      />
      <resistor
        name={"R144"}
        resistance={"100k"}
        tolerance={"1%"}
        manufacturerPartNumber={"0603WAF1003T5E"}
        supplierPartNumbers={{ jlcpcb: ["C25803"] }}
        schX={-3}
        schY={-7}
        schRotation={-90}
        connections={{ pin1: "net.POWER_SWITCH_EN", pin2: "net.GND" }}
      />
      <capacitor
        name={"C140"}
        capacitance={"100nF"}
        maxVoltageRating={50}
        manufacturerPartNumber={"CL05B104KB5NNNC"}
        supplierPartNumbers={{ jlcpcb: ["C960916"] }}
        schX={12}
        schY={-4}
        schRotation={-90}
        connections={{ pin1: "net.PD_LOAD", pin2: "net.GND" }}
      />
      <capacitor
        name={"C141"}
        capacitance={"1uF"}
        maxVoltageRating={50}
        manufacturerPartNumber={"CL21B105KBFNNNE"}
        supplierPartNumbers={{ jlcpcb: ["C28323"] }}
        schX={15}
        schY={-4}
        schRotation={-90}
        connections={{ pin1: "net.PD_LOAD", pin2: "net.GND" }}
      />
      <chip
        pinLabels={{
          pin1: ["FB"],
          pin2: ["EN"],
          pin3: ["VIN"],
          pin4: ["GND"],
          pin5: ["SW"],
          pin6: ["BST"],
        }}
        pinAttributes={{
          pin3: { requiresPower: true },
          pin4: { requiresGround: true },
        }}
        supplierPartNumbers={{ jlcpcb: ["C780769"] }}
        manufacturerPartNumber={"AP63203WU-7"}
        name={"U3"}
        schX={-2}
        schY={5}
        schWidth={1.77}
        schHeight={1.6}
        schPinSpacing={0.6}
        schPinArrangement={{
          leftSide: { pins: [3, 2], direction: "top-to-bottom" },
          rightSide: { pins: [6, 5, 1], direction: "top-to-bottom" },
          bottomSide: { pins: [4], direction: "left-to-right" },
        }}
        schPinStyle={{
          pin2: { marginTop: 0.39999999999999997 },
          pin5: { marginTop: 0.39999999999999997 },
          pin1: { marginTop: 0.39999999999999997 },
        }}
        connections={{
          FB: "net.V3V3",
          EN: "net.LOGIC_IN",
          VIN: "net.LOGIC_IN",
          GND: "net.GND",
          SW: "net.LOGIC_SW",
          BST: "net.LOGIC_BST",
        }}
      />
      <inductor
        inductance={"4.7uH"}
        supplierPartNumbers={{ jlcpcb: ["C2044594"] }}
        manufacturerPartNumber={"SRN6045TA-4R7M"}
        name={"L1"}
        schX={4}
        schY={5}
        schRotation={0}
        connections={{ pin1: "net.LOGIC_SW", pin2: "net.V3V3" }}
      />
      <diode
        name={"D2"}
        supplierPartNumbers={{ jlcpcb: ["C85100"] }}
        manufacturerPartNumber={"B560C-13-F"}
        variant={"schottky"}
        schRotation={90}
        schX={parallelDiodes ? -12 : -10}
        schY={parallelDiodes ? 4.5 : 7.5}
        connections={{ anode: "net.VBUS_RAW", cathode: "net.LOGIC_IN" }}
      />
      <capacitor
        name={"C10"}
        capacitance={"4.7uF"}
        maxVoltageRating={50}
        manufacturerPartNumber={"CL31A475KBHNNNE"}
        supplierPartNumbers={{ jlcpcb: ["C12881"] }}
        schX={-6}
        schY={3}
        schRotation={-90}
        connections={{ pin1: "net.LOGIC_IN", pin2: "net.GND" }}
      />
      <capacitor
        name={"C11"}
        capacitance={"100nF"}
        maxVoltageRating={50}
        manufacturerPartNumber={"CL05B104KB5NNNC"}
        supplierPartNumbers={{ jlcpcb: ["C960916"] }}
        schX={1.2}
        schY={5.3}
        schRotation={-90}
        connections={{ pin1: "net.LOGIC_BST", pin2: "net.LOGIC_SW" }}
      />
      <capacitor
        name={"C12"}
        capacitance={"22uF"}
        maxVoltageRating={10}
        manufacturerPartNumber={"CL21A226MPQNNNE"}
        supplierPartNumbers={{ jlcpcb: ["C29277"] }}
        schX={7}
        schY={3}
        schRotation={-90}
        connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
      />
      <capacitor
        name={"C13"}
        capacitance={"22uF"}
        maxVoltageRating={10}
        manufacturerPartNumber={"CL21A226MPQNNNE"}
        supplierPartNumbers={{ jlcpcb: ["C29277"] }}
        schX={9.4}
        schY={3}
        schRotation={-90}
        connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
      />
      <diode
        name={"D5"}
        supplierPartNumbers={{ jlcpcb: ["C193342"] }}
        manufacturerPartNumber={"PMEG4010CEH,115"}
        variant={"schottky"}
        schRotation={90}
        schX={-10}
        schY={parallelDiodes ? 4.5 : 2.5}
        connections={{ anode: "net.PROG_VBUS", cathode: "net.LOGIC_IN" }}
      />
    </board>
  )
}

export async function createRp2040LogicPower(parallelDiodes = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Rp2040LogicPower parallelDiodes={parallelDiodes} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
