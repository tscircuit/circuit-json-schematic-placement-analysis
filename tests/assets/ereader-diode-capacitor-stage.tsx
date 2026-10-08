import { Circuit } from "@tscircuit/core"

// Complete display sheet from rushabhcodes/ESP32-E-Reader v1.0.58.
// https://tscircuit.com/rushabhcodes/ESP32-E-Reader?version=1.0.58
// Source TSX expanded in place; PCB/CAD data and other sheets omitted.
// This core uses absolute custom-symbol port coordinates and native diode
// terminal aliases (the source import numbers cathode=1, anode=2).
export default function EreaderDisplay() {
  return (
    <board schMaxTraceDistance={4} schSheetName="display_power">
      <schematicsheet
        name={"display_power"}
        displayName={"E-Paper Interface & Bias Rails"}
        sheetIndex={2}
      >
        <schematictext
          text={"E-paper FPC & logic"}
          schX={5}
          schY={16}
          fontSize={0.38}
          anchor={"center"}
        />
        <schematictext
          text={"Display charge pump"}
          schX={18}
          schY={16}
          fontSize={0.38}
          anchor={"center"}
        />
        <schematictext
          text={"Panel bias decoupling"}
          schX={11}
          schY={-3}
          fontSize={0.38}
          anchor={"center"}
        />
      </schematicsheet>
      <capacitor
        name={"C15"}
        capacitance={"4.7uF"}
        supplierPartNumbers={{ jlcpcb: ["C1779"] }}
        schRotation={-90}
        schX={0}
        schY={13}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C16"}
        capacitance={"4.7uF"}
        supplierPartNumbers={{ jlcpcb: ["C1779"] }}
        schRotation={-90}
        schX={19.5}
        schY={8}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C17"}
        capacitance={"4.7uF"}
        supplierPartNumbers={{ jlcpcb: ["C1779"] }}
        schRotation={-90}
        schX={23}
        schY={11}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C19"}
        capacitance={"10uF"}
        supplierPartNumbers={{ jlcpcb: ["C3039694"] }}
        schRotation={-90}
        schX={2.5}
        schY={13}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C20"}
        capacitance={"100nF"}
        supplierPartNumbers={{ jlcpcb: ["C49678"] }}
        schRotation={-90}
        schX={5}
        schY={13}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C21"}
        capacitance={"1uF"}
        supplierPartNumbers={{ jlcpcb: ["C28323"] }}
        schRotation={90}
        schX={7.5}
        schY={13}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C22"}
        capacitance={"4.7uF"}
        supplierPartNumbers={{ jlcpcb: ["C1779"] }}
        schRotation={90}
        schX={11}
        schY={0}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C23"}
        capacitance={"4.7uF"}
        supplierPartNumbers={{ jlcpcb: ["C1779"] }}
        schRotation={90}
        schX={25}
        schY={4}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C25"}
        capacitance={"1uF"}
        supplierPartNumbers={{ jlcpcb: ["C28323"] }}
        schRotation={90}
        schX={8}
        schY={0}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C27"}
        capacitance={"1uF"}
        supplierPartNumbers={{ jlcpcb: ["C28323"] }}
        schRotation={90}
        schX={17}
        schY={0}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C28"}
        capacitance={"4.7uF"}
        supplierPartNumbers={{ jlcpcb: ["C1779"] }}
        schRotation={90}
        schX={14}
        schY={0}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C29"}
        capacitance={"4.7uF"}
        supplierPartNumbers={{ jlcpcb: ["C1779"] }}
        schRotation={90}
        schX={5}
        schY={0}
        schSheetName={"display_power"}
      />
      <capacitor
        name={"C32"}
        capacitance={"100nF"}
        supplierPartNumbers={{ jlcpcb: ["C49678"] }}
        schRotation={-90}
        schX={27.5}
        schY={4}
        schSheetName={"display_power"}
      />
      <resistor
        name={"R16"}
        resistance={"1M"}
        supplierPartNumbers={{ jlcpcb: ["C22935"] }}
        schX={12.5}
        schY={7}
        schRotation={-90}
        schSheetName={"display_power"}
      />
      <resistor
        name={"R17"}
        resistance={"2.2"}
        supplierPartNumbers={{ jlcpcb: ["C137549"] }}
        schX={16}
        schY={5.5}
        schRotation={-90}
        schSheetName={"display_power"}
      />
      <resistor
        name={"R18"}
        resistance={"10k"}
        supplierPartNumbers={{ jlcpcb: ["C98220"] }}
        schX={0}
        schY={4.5}
        schRotation={90}
        schSheetName={"display_power"}
      />
      <resistor
        name={"R19"}
        resistance={"10k"}
        supplierPartNumbers={{ jlcpcb: ["C98220"] }}
        schX={0}
        schY={8}
        schRotation={90}
        schSheetName={"display_power"}
      />
      <resistor
        name={"R21"}
        resistance={"10k"}
        supplierPartNumbers={{ jlcpcb: ["C98220"] }}
        schX={2.5}
        schY={8}
        schRotation={90}
        schSheetName={"display_power"}
      />
      <inductor
        inductance={"47uH"}
        supplierPartNumbers={{ jlcpcb: ["C520357"] }}
        manufacturerPartNumber={"CR5040-470M"}
        name={"L1"}
        schX={16}
        schY={13}
        schSheetName={"display_power"}
      />
      <diode
        name={"D2"}
        supplierPartNumbers={{ jlcpcb: ["C82046"] }}
        manufacturerPartNumber={"MBR0530T1G"}
        schX={22}
        schY={4}
        schSheetName={"display_power"}
      />
      <diode
        name={"D3"}
        supplierPartNumbers={{ jlcpcb: ["C82046"] }}
        manufacturerPartNumber={"MBR0530T1G"}
        schX={22}
        schY={7}
        schRotation={90}
        schSheetName={"display_power"}
      />
      <diode
        name={"D4"}
        supplierPartNumbers={{ jlcpcb: ["C82046"] }}
        manufacturerPartNumber={"MBR0530T1G"}
        schX={20}
        schY={11}
        schRotation={180}
        schSheetName={"display_power"}
      />
      <chip
        supplierPartNumbers={{ jlcpcb: ["C2856831"] }}
        manufacturerPartNumber={"FH12-24S-0.5SH(55)"}
        name={"J2"}
        schX={7}
        schY={8}
        schSheetName={"display_power"}
        symbol={
          <symbol>
            <schematicrect
              schX={0}
              schY={0}
              width={2.8}
              height={6.7}
              isFilled={false}
              strokeWidth={0.04}
            />
            <schematictext
              text={"{REF}"}
              schX={1.25}
              schY={3.2}
              anchor={"top_right"}
              fontSize={0.22}
            />
            <schematictext
              text={"FH12-24S-0.5SH"}
              schX={1.5999999999999999}
              schY={3.45}
              anchor={"left"}
              fontSize={0.16}
            />
            <port
              name={"pin2"}
              aliases={["GDR"]}
              pinNumber={2}
              direction={"right"}
              schX={8.75}
              schY={10.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"2"}
              schX={1.5799999999999998}
              schY={2.37}
              fontSize={0.12}
            />
            <port
              name={"pin3"}
              aliases={["RESE"]}
              pinNumber={3}
              direction={"right"}
              schX={8.75}
              schY={9.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"3"}
              schX={1.5799999999999998}
              schY={1.87}
              fontSize={0.12}
            />
            <port
              name={"pin4"}
              aliases={["NC4"]}
              pinNumber={4}
              direction={"left"}
              schX={5.25}
              schY={9.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"4"}
              schX={-1.5799999999999998}
              schY={1.87}
              fontSize={0.12}
            />
            <port
              name={"pin5"}
              aliases={["VSH2"]}
              pinNumber={5}
              direction={"right"}
              schX={8.75}
              schY={9.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"5"}
              schX={1.5799999999999998}
              schY={1.37}
              fontSize={0.12}
            />
            <port
              name={"pin6"}
              aliases={["TSCL"]}
              pinNumber={6}
              direction={"down"}
              schX={6.55}
              schY={4.3}
              schStemLength={0.35}
            />
            <schematictext
              text={"6"}
              schX={-0.36999999999999994}
              schY={-3.5300000000000002}
              fontSize={0.12}
            />
            <port
              name={"pin7"}
              aliases={["TSDA"]}
              pinNumber={7}
              direction={"down"}
              schX={6.85}
              schY={4.3}
              schStemLength={0.35}
            />
            <schematictext
              text={"7"}
              schX={-0.06999999999999999}
              schY={-3.5300000000000002}
              fontSize={0.12}
            />
            <port
              name={"pin8"}
              aliases={["GND8"]}
              pinNumber={8}
              direction={"down"}
              schX={7.15}
              schY={4.3}
              schStemLength={0.35}
            />
            <schematictext
              text={"8"}
              schX={0.22999999999999998}
              schY={-3.5300000000000002}
              fontSize={0.12}
            />
            <port
              name={"pin1"}
              aliases={["NC1"]}
              pinNumber={1}
              direction={"left"}
              schX={5.25}
              schY={10.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"1"}
              schX={-1.5799999999999998}
              schY={2.37}
              fontSize={0.12}
            />
            <port
              name={"pin9"}
              aliases={["BUSY"]}
              pinNumber={9}
              direction={"left"}
              schX={5.25}
              schY={9.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"9"}
              schX={-1.5799999999999998}
              schY={1.37}
              fontSize={0.12}
            />
            <port
              name={"pin10"}
              aliases={["RST"]}
              pinNumber={10}
              direction={"left"}
              schX={5.25}
              schY={8.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"10"}
              schX={-1.5799999999999998}
              schY={0.87}
              fontSize={0.12}
            />
            <port
              name={"pin11"}
              aliases={["DC"]}
              pinNumber={11}
              direction={"left"}
              schX={5.25}
              schY={8.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"11"}
              schX={-1.5799999999999998}
              schY={0.37}
              fontSize={0.12}
            />
            <port
              name={"pin12"}
              aliases={["CS"]}
              pinNumber={12}
              direction={"left"}
              schX={5.25}
              schY={7.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"12"}
              schX={-1.5799999999999998}
              schY={-0.13}
              fontSize={0.12}
            />
            <port
              name={"pin13"}
              aliases={["SCLK"]}
              pinNumber={13}
              direction={"left"}
              schX={5.25}
              schY={7.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"13"}
              schX={-1.5799999999999998}
              schY={-0.63}
              fontSize={0.12}
            />
            <port
              name={"pin14"}
              aliases={["MOSI"]}
              pinNumber={14}
              direction={"left"}
              schX={5.25}
              schY={6.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"14"}
              schX={-1.5799999999999998}
              schY={-1.13}
              fontSize={0.12}
            />
            <port
              name={"pin15"}
              aliases={["VDDIO"]}
              pinNumber={15}
              direction={"up"}
              schX={6.85}
              schY={11.7}
              schStemLength={0.35}
            />
            <schematictext
              text={"15"}
              schX={-0.06999999999999999}
              schY={3.5300000000000002}
              fontSize={0.12}
            />
            <port
              name={"pin16"}
              aliases={["VDD"]}
              pinNumber={16}
              direction={"up"}
              schX={7.15}
              schY={11.7}
              schStemLength={0.35}
            />
            <schematictext
              text={"16"}
              schX={0.22999999999999998}
              schY={3.5300000000000002}
              fontSize={0.12}
            />
            <port
              name={"pin17"}
              aliases={["GND17"]}
              pinNumber={17}
              direction={"down"}
              schX={7.45}
              schY={4.3}
              schStemLength={0.35}
            />
            <schematictext
              text={"17"}
              schX={0.5299999999999999}
              schY={-3.5300000000000002}
              fontSize={0.12}
            />
            <port
              name={"pin18"}
              aliases={["VDD1"]}
              pinNumber={18}
              direction={"right"}
              schX={8.75}
              schY={8.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"18"}
              schX={1.5799999999999998}
              schY={0.87}
              fontSize={0.12}
            />
            <port
              name={"pin19"}
              aliases={["NC19"]}
              pinNumber={19}
              direction={"right"}
              schX={8.75}
              schY={8.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"19"}
              schX={1.5799999999999998}
              schY={0.37}
              fontSize={0.12}
            />
            <port
              name={"pin20"}
              aliases={["VSH1"]}
              pinNumber={20}
              direction={"right"}
              schX={8.75}
              schY={7.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"20"}
              schX={1.5799999999999998}
              schY={-0.13}
              fontSize={0.12}
            />
            <port
              name={"pin21"}
              aliases={["PREVGH"]}
              pinNumber={21}
              direction={"right"}
              schX={8.75}
              schY={7.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"21"}
              schX={1.5799999999999998}
              schY={-0.63}
              fontSize={0.12}
            />
            <port
              name={"pin22"}
              aliases={["VSL"]}
              pinNumber={22}
              direction={"right"}
              schX={8.75}
              schY={6.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"22"}
              schX={1.5799999999999998}
              schY={-1.13}
              fontSize={0.12}
            />
            <port
              name={"pin23"}
              aliases={["PREVGL"]}
              pinNumber={23}
              direction={"right"}
              schX={8.75}
              schY={6.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"23"}
              schX={1.5799999999999998}
              schY={-1.63}
              fontSize={0.12}
            />
            <port
              name={"pin24"}
              aliases={["VCOM"]}
              pinNumber={24}
              direction={"right"}
              schX={8.75}
              schY={5.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"24"}
              schX={1.5799999999999998}
              schY={-2.13}
              fontSize={0.12}
            />
            <port
              name={"pin25"}
              aliases={["SHIELD1"]}
              pinNumber={25}
              direction={"left"}
              schX={5.25}
              schY={6.25}
              schStemLength={0.35}
            />
            <schematictext
              text={"25"}
              schX={-1.5799999999999998}
              schY={-1.63}
              fontSize={0.12}
            />
            <port
              name={"pin26"}
              aliases={["SHIELD2"]}
              pinNumber={26}
              direction={"left"}
              schX={5.25}
              schY={5.75}
              schStemLength={0.35}
            />
            <schematictext
              text={"26"}
              schX={-1.5799999999999998}
              schY={-2.13}
              fontSize={0.12}
            />
          </symbol>
        }
        noConnect={["pin1", "pin4", "pin19", "pin25", "pin26"]}
      />
      <chip
        symbol={
          <symbol>
            <schematictext
              text={"{REF}"}
              schX={0.25}
              schY={0.15}
              fontSize={0.25}
            />
            <schematicpath
              points={[
                { x: -0.2, y: 0 },
                { x: -0.08, y: -0.04 },
                { x: -0.08, y: 0.04 },
                { x: -0.2, y: 0 },
              ]}
              strokeColor={"#880000"}
              isFilled={true}
              fillColor={"#FEFEFE"}
            />
            <schematicpath
              points={[
                { x: 0.2, y: 0.04 },
                { x: 0.14, y: -0.06 },
                { x: 0.26, y: -0.06 },
                { x: 0.2, y: 0.04 },
              ]}
              strokeColor={"#880000"}
              isFilled={true}
              fillColor={"#FEFEFE"}
            />
            <schematicpath
              points={[
                { x: -0.2, y: 0.14 },
                { x: 0, y: 0.14 },
                { x: 0, y: 0.2 },
                { x: 0.2, y: 0.2 },
                { x: 0.2, y: 0.04 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: -0.2, y: 0 },
                { x: 0, y: 0 },
                { x: 0, y: -0.2 },
                { x: 0.2, y: -0.2 },
                { x: 0.2, y: -0.06 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: 0, y: -0.14 },
                { x: -0.2, y: -0.14 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: -0.24, y: 0.18 },
                { x: -0.24, y: -0.18 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: -0.2, y: 0.18 },
                { x: -0.2, y: 0.1 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: -0.2, y: -0.04 },
                { x: -0.2, y: 0.04 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: -0.2, y: -0.18 },
                { x: -0.2, y: -0.1 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: 0.28, y: 0.04 },
                { x: 0.24, y: 0.04 },
                { x: 0.16, y: 0.04 },
                { x: 0.12, y: 0.04 },
              ]}
              strokeColor={"#880000"}
            />
            <port
              name={"pin3"}
              pinNumber={3}
              aliases={["D"]}
              direction={"up"}
              schX={16.1}
              schY={8.5}
              schStemLength={0.2}
            />
            <port
              name={"pin1"}
              pinNumber={1}
              aliases={["G"]}
              direction={"left"}
              schX={15.500000000000002}
              schY={8.1}
              schStemLength={0.2}
            />
            <port
              name={"pin2"}
              pinNumber={2}
              aliases={["S"]}
              direction={"down"}
              schX={16.1}
              schY={7.5}
              schStemLength={0.2}
            />
            <schematicpath
              points={[
                { x: -0.24, y: 0 },
                { x: -0.4, y: 0 },
                { x: -0.4, y: -0.4 },
                { x: 0, y: -0.4 },
                { x: 0, y: -0.2 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: -0.32, y: -0.06 },
                { x: -0.36, y: -0.08 },
                { x: -0.44, y: -0.08 },
                { x: -0.48, y: -0.1 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: -0.4, y: -0.08 },
                { x: -0.46, y: -0.18 },
                { x: -0.34, y: -0.18 },
                { x: -0.4, y: -0.08 },
              ]}
              strokeColor={"#880000"}
              isFilled={true}
              fillColor={"#FEFEFE"}
            />
            <schematicpath
              points={[
                { x: -0.48, y: -0.36 },
                { x: -0.44, y: -0.34 },
                { x: -0.36, y: -0.34 },
                { x: -0.32, y: -0.32 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              points={[
                { x: -0.4, y: -0.34 },
                { x: -0.34, y: -0.24 },
                { x: -0.46, y: -0.24 },
                { x: -0.4, y: -0.34 },
              ]}
              strokeColor={"#880000"}
              isFilled={true}
              fillColor={"#FEFEFE"}
            />
          </symbol>
        }
        supplierPartNumbers={{ jlcpcb: ["C469327"] }}
        manufacturerPartNumber={"SI1308EDL-T1-GE3"}
        name={"Q2"}
        schX={16.1}
        schY={8.1}
        schSheetName={"display_power"}
      />
      <testpoint
        name={"TP4"}
        footprintVariant={"pad"}
        padShape={"circle"}
        padDiameter={"1.5mm"}
        doNotPlace={true}
        schX={29.5}
        schY={4.8}
        schSheetName={"display_power"}
      />
      <testpoint
        name={"TP5"}
        footprintVariant={"pad"}
        padShape={"circle"}
        padDiameter={"1.5mm"}
        doNotPlace={true}
        schX={25}
        schY={11.8}
        schSheetName={"display_power"}
      />
      <net name={"V3V3"} isGroundNet={false} isPowerNet={true} />
      <trace from={".C15 > .pin1"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".C19 > .pin1"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".C20 > .pin1"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".C21 > .pin2"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".J2 > .pin15"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".J2 > .pin16"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".L1 > .pin1"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".R18 > .pin2"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".R19 > .pin2"} to={"net.V3V3"} thickness={"0.5mm"} />
      <trace from={".R21 > .pin2"} to={"net.V3V3"} thickness={"0.5mm"} />
      <net name={"GND"} isGroundNet={true} isPowerNet={true} />
      <trace from={".C15 > .pin2"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C17 > .pin2"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C19 > .pin2"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C20 > .pin2"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C21 > .pin1"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C22 > .pin1"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C23 > .pin1"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C25 > .pin1"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C27 > .pin1"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C28 > .pin1"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C29 > .pin1"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".C32 > .pin2"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".D3 > .cathode"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin6"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin7"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin8"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin17"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".R16 > .pin2"} to={"net.GND"} thickness={"0.2mm"} />
      <trace from={".R17 > .pin2"} to={"net.GND"} thickness={"0.2mm"} />
      <net name={"EPD_DC"} isGroundNet={false} isPowerNet={false} />
      <trace from={".J2 > .pin11"} to={"net.EPD_DC"} thickness={"0.2mm"} />
      <net name={"EPD_RST"} isGroundNet={false} isPowerNet={false} />
      <trace from={".J2 > .pin10"} to={"net.EPD_RST"} thickness={"0.2mm"} />
      <trace from={".R21 > .pin1"} to={"net.EPD_RST"} thickness={"0.2mm"} />
      <net name={"EPD_BUSY"} isGroundNet={false} isPowerNet={false} />
      <trace from={".J2 > .pin9"} to={"net.EPD_BUSY"} thickness={"0.2mm"} />
      <trace from={".R19 > .pin1"} to={"net.EPD_BUSY"} thickness={"0.2mm"} />
      <net name={"EPD_CS"} isGroundNet={false} isPowerNet={false} />
      <trace from={".J2 > .pin12"} to={"net.EPD_CS"} thickness={"0.2mm"} />
      <trace from={".R18 > .pin1"} to={"net.EPD_CS"} thickness={"0.2mm"} />
      <net name={"SPI_SCLK"} isGroundNet={false} isPowerNet={false} />
      <trace from={".J2 > .pin13"} to={"net.SPI_SCLK"} thickness={"0.2mm"} />
      <net name={"SPI_MOSI"} isGroundNet={false} isPowerNet={false} />
      <trace from={".J2 > .pin14"} to={"net.SPI_MOSI"} thickness={"0.2mm"} />
      <net name={"EPD_PUMP_SWITCH"} isGroundNet={false} isPowerNet={false} />
      <trace
        from={".C16 > .pin2"}
        to={"net.EPD_PUMP_SWITCH"}
        thickness={"0.6mm"}
      />
      <trace
        from={".D4 > .anode"}
        to={"net.EPD_PUMP_SWITCH"}
        thickness={"0.6mm"}
      />
      <trace
        from={".L1 > .pin2"}
        to={"net.EPD_PUMP_SWITCH"}
        thickness={"0.6mm"}
      />
      <trace
        from={".Q2 > .pin3"}
        to={"net.EPD_PUMP_SWITCH"}
        thickness={"0.6mm"}
      />
      <net name={"EPD_PUMP_NEG"} isGroundNet={false} isPowerNet={false} />
      <trace
        from={".C16 > .pin1"}
        to={"net.EPD_PUMP_NEG"}
        thickness={"0.6mm"}
      />
      <trace
        from={".D2 > .cathode"}
        to={"net.EPD_PUMP_NEG"}
        thickness={"0.6mm"}
      />
      <trace
        from={".D3 > .anode"}
        to={"net.EPD_PUMP_NEG"}
        thickness={"0.6mm"}
      />
      <net name={"PREVGH"} isGroundNet={false} isPowerNet={false} />
      <trace from={".C17 > .pin1"} to={"net.PREVGH"} thickness={"0.4mm"} />
      <trace from={".D4 > .cathode"} to={"net.PREVGH"} thickness={"0.4mm"} />
      <trace from={".J2 > .pin21"} to={"net.PREVGH"} thickness={"0.4mm"} />
      <trace from={".TP5 > .pin1"} to={"net.PREVGH"} thickness={"0.4mm"} />
      <net name={"PREVGL"} isGroundNet={false} isPowerNet={false} />
      <trace from={".C23 > .pin2"} to={"net.PREVGL"} thickness={"0.4mm"} />
      <trace from={".C32 > .pin1"} to={"net.PREVGL"} thickness={"0.4mm"} />
      <trace from={".D2 > .anode"} to={"net.PREVGL"} thickness={"0.4mm"} />
      <trace from={".J2 > .pin23"} to={"net.PREVGL"} thickness={"0.4mm"} />
      <trace from={".TP4 > .pin1"} to={"net.PREVGL"} thickness={"0.4mm"} />
      <net name={"GDR"} isGroundNet={false} isPowerNet={false} />
      <trace from={".J2 > .pin2"} to={"net.GDR"} thickness={"0.2mm"} />
      <trace from={".Q2 > .pin1"} to={"net.GDR"} thickness={"0.2mm"} />
      <trace from={".R16 > .pin1"} to={"net.GDR"} thickness={"0.2mm"} />
      <net name={"RESE"} isGroundNet={false} isPowerNet={false} />
      <trace from={".J2 > .pin3"} to={"net.RESE"} thickness={"0.2mm"} />
      <trace from={".Q2 > .pin2"} to={"net.RESE"} thickness={"0.2mm"} />
      <trace from={".R17 > .pin1"} to={"net.RESE"} thickness={"0.2mm"} />
      <net name={"EPD_VDD"} isGroundNet={false} isPowerNet={false} />
      <trace from={".C25 > .pin2"} to={"net.EPD_VDD"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin18"} to={"net.EPD_VDD"} thickness={"0.2mm"} />
      <net name={"EPD_VSH1"} isGroundNet={false} isPowerNet={false} />
      <trace from={".C22 > .pin2"} to={"net.EPD_VSH1"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin20"} to={"net.EPD_VSH1"} thickness={"0.2mm"} />
      <net name={"EPD_VSH2"} isGroundNet={false} isPowerNet={false} />
      <trace from={".C29 > .pin2"} to={"net.EPD_VSH2"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin5"} to={"net.EPD_VSH2"} thickness={"0.2mm"} />
      <net name={"EPD_VSL"} isGroundNet={false} isPowerNet={false} />
      <trace from={".C28 > .pin2"} to={"net.EPD_VSL"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin22"} to={"net.EPD_VSL"} thickness={"0.2mm"} />
      <net name={"VCOM"} isGroundNet={false} isPowerNet={false} />
      <trace from={".C27 > .pin2"} to={"net.VCOM"} thickness={"0.2mm"} />
      <trace from={".J2 > .pin24"} to={"net.VCOM"} thickness={"0.2mm"} />
    </board>
  )
}

export async function createEreaderDisplay() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<EreaderDisplay />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
