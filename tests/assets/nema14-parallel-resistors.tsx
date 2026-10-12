import { Circuit } from "@tscircuit/core"

// Complete USB-PD sheet from AnasSarkiz/smart-nema14-motor-controller--01a0fd9b v0.0.54-alpha.0.
// https://tscircuit.com/AnasSarkiz/smart-nema14-motor-controller--01a0fd9b?version=0.0.54-alpha.0
// TSX component imports are inlined; original schematic props retained, PCB/CAD data omitted.
export default function Nema14ParallelResistors() {
  return (
    <board schLayout={{ layoutMode: "none" }}>
      <net name="PD_LOAD_ENABLE_N" />
      <net name="GND" isGroundNet />
      <net name="V3V3" isPowerNet />
      <net name="I2C_SCL" />
      <net name="I2C_SDA" />
      <net name="VM" isPowerNet />
      <net name="VBUS_CONN" isPowerNet />
      <net name="VBUS_PROTECTED" isPowerNet />
      <net name="PD_CC1_CONN" />
      <net name="PD_CC2_CONN" />
      <net name="VBUS_DIV" />
      <net name="VBUS_ADC" />
      <net name="VBUS_ADC_PRE_GUARD" />
      <net name="PD_ALERT_N" />
      <net name="PD_RESET" />
      <net name="PD_CONTRACT_15_N" />
      <net name="PD_VREG_1V2" />
      <net name="PD_VREG_2V7" />
      <net name="PD_VDD" />
      <net name="PD_FET_SOURCE" isPowerNet />
      <net name="PD_GATE" />
      <net name="PD_DISCH" />
      <net name="PD_VBUS_SENSE" />
      <schematicsheet
        name={"UsbPd"}
        displayName={"Autonomous USB-PD sink and protected power path"}
        sheetSize={"A4"}
        sheetIndex={6}
      >
        <schematictext
          schX={-6.5}
          schY={8.7}
          fontSize={0.22}
          text={
            "STUSB4500 negotiates USB-PD on CC1/CC2, independently of RP2040 firmware. POWER port has no USB data; the independent DATA port connects to RP2040."
          }
        />
        <connector
          pinLabels={{
            pin8: ["SHELL4"],
            pin9: ["SHELL3"],
            pin10: ["SHELL2"],
            pin11: ["SHELL1"],
            pin12: ["DN1", "A7"],
            pin13: ["DP2", "B6"],
            pin14: ["SBU1", "A8"],
            pin15: ["CC2", "B5"],
            pin16: ["DP1", "A6"],
            pin17: ["DN2", "B7"],
            pin18: ["CC1", "A5"],
            pin19: ["SBU2", "B8"],
            pin20: ["VBUS1", "B4A9"],
            pin21: ["VBUS2", "A4B9"],
            pin22: ["GND1", "B1A12"],
            pin23: ["GND2", "A1B12"],
          }}
          supplierPartNumbers={{ jlcpcb: ["C5143397"] }}
          manufacturerPartNumber={"USB4110-GF-A"}
          name={"J_USB"}
          schX={-13}
          schY={1.44}
          noConnect={["SBU1", "SBU2", "DP1", "DP2", "DN1", "DN2"]}
          connections={{
            SHELL1: "net.GND",
            SHELL2: "net.GND",
            SHELL3: "net.GND",
            SHELL4: "net.GND",
            GND1: "net.GND",
            GND2: "net.GND",
            VBUS1: "net.VBUS_CONN",
            VBUS2: "net.VBUS_CONN",
            CC1: "net.PD_CC1_CONN",
            CC2: "net.PD_CC2_CONN",
          }}
          standard={"usb_c"}
          schWidth={1.65}
          schPinArrangement={{
            rightSide: [
              "VBUS1",
              "VBUS2",
              "CC1",
              "CC2",
              "DP1",
              "DP2",
              "DN1",
              "DN2",
              "SBU1",
              "SBU2",
              "GND1",
              "GND2",
              "SHELL1",
              "SHELL2",
              "SHELL3",
              "SHELL4",
            ],
          }}
        />
        <chip
          pinLabels={{
            pin1: ["CC1DB"],
            pin2: ["CC1"],
            pin3: ["NC"],
            pin4: ["CC2"],
            pin5: ["CC2DB"],
            pin6: ["RESET"],
            pin7: ["SCL"],
            pin8: ["SDA"],
            pin9: ["DISCH"],
            pin10: ["GND"],
            pin11: ["ATTACH"],
            pin12: ["ADDR0"],
            pin13: ["ADDR1"],
            pin14: ["POWER_OK3"],
            pin15: ["GPIO"],
            pin16: ["VBUS_EN_SNK"],
            pin17: ["A_B_SIDE"],
            pin18: ["VBUS_VS_DISCH"],
            pin19: ["ALERT"],
            pin20: ["POWER_OK2"],
            pin21: ["VREG_1V2"],
            pin22: ["VSYS"],
            pin23: ["VREG_2V7"],
            pin24: ["VDD"],
            pin25: ["EP"],
          }}
          pinAttributes={{
            pin3: { doNotConnect: true },
            pin10: { requiresGround: true },
            pin24: { requiresPower: true },
          }}
          supplierPartNumbers={{ jlcpcb: ["C2678061"] }}
          manufacturerPartNumber={"STUSB4500QTR"}
          name={"U3"}
          schX={-7.5}
          schY={0}
          schWidth={2.5}
          noConnect={["NC", "ATTACH", "GPIO", "A_B_SIDE", "POWER_OK3"]}
          connections={{
            CC1DB: "net.PD_CC1_CONN",
            CC1: "net.PD_CC1_CONN",
            CC2: "net.PD_CC2_CONN",
            CC2DB: "net.PD_CC2_CONN",
            RESET: "net.PD_RESET",
            SCL: "net.I2C_SCL",
            SDA: "net.I2C_SDA",
            DISCH: "net.PD_DISCH",
            GND: "net.GND",
            ADDR0: "net.GND",
            ADDR1: "net.GND",
            POWER_OK2: "net.PD_CONTRACT_15_N",
            VBUS_EN_SNK: "net.PD_LOAD_ENABLE_N",
            VBUS_VS_DISCH: "net.PD_VBUS_SENSE",
            ALERT: "net.PD_ALERT_N",
            VREG_1V2: "net.PD_VREG_1V2",
            VSYS: "net.GND",
            VREG_2V7: "net.PD_VREG_2V7",
            VDD: "net.PD_VDD",
            EP: "net.GND",
          }}
        />
        <chip
          pinLabels={{
            pin1: ["S1"],
            pin2: ["S2"],
            pin3: ["S3"],
            pin4: ["G"],
            pin5: ["D1"],
            pin6: ["D2"],
            pin7: ["D3"],
            pin8: ["D4"],
            pin9: ["D5"],
          }}
          supplierPartNumbers={{ jlcpcb: ["C222138"] }}
          manufacturerPartNumber={"STL8P4LLF6"}
          name={"Q_PD_IN"}
          schX={-3.9}
          schY={6.2}
          connections={{
            S1: "net.PD_FET_SOURCE",
            S2: "net.PD_FET_SOURCE",
            S3: "net.PD_FET_SOURCE",
            G: "net.PD_GATE",
            D1: "net.VBUS_CONN",
            D2: "net.VBUS_CONN",
            D3: "net.VBUS_CONN",
            D4: "net.VBUS_CONN",
            D5: "net.VBUS_CONN",
          }}
        />
        <chip
          pinLabels={{
            pin1: ["S1"],
            pin2: ["S2"],
            pin3: ["S3"],
            pin4: ["G"],
            pin5: ["D1"],
            pin6: ["D2"],
            pin7: ["D3"],
            pin8: ["D4"],
            pin9: ["D5"],
          }}
          supplierPartNumbers={{ jlcpcb: ["C222138"] }}
          manufacturerPartNumber={"STL8P4LLF6"}
          name={"Q_PD_OUT"}
          schX={0.5}
          schY={6.2}
          connections={{
            S1: "net.PD_FET_SOURCE",
            S2: "net.PD_FET_SOURCE",
            S3: "net.PD_FET_SOURCE",
            G: "net.PD_GATE",
            D1: "net.VBUS_PROTECTED",
            D2: "net.VBUS_PROTECTED",
            D3: "net.VBUS_PROTECTED",
            D4: "net.VBUS_PROTECTED",
            D5: "net.VBUS_PROTECTED",
          }}
        />
        <resistor
          name={"R13"}
          resistance={"100kohm"}
          supplierPartNumbers={{ jlcpcb: ["C852472"] }}
          manufacturerPartNumber={"RT0402BRD07100KL"}
          schX={-3.1}
          schY={4.1}
          schRotation={270}
          connections={{ pin1: "net.PD_FET_SOURCE", pin2: "net.PD_GATE" }}
        />
        <resistor
          name={"R_PD_GATE"}
          resistance={"22kohm"}
          supplierPartNumbers={{ jlcpcb: ["C25768"] }}
          manufacturerPartNumber={"0402WGF2202TCE"}
          schX={0.5}
          schY={4.1}
          schRotation={270}
          connections={{ pin1: "net.PD_GATE", pin2: "net.PD_LOAD_ENABLE_N" }}
        />
        <resistor
          name={"R14"}
          resistance={"470ohm"}
          supplierPartNumbers={{ jlcpcb: ["C25117"] }}
          manufacturerPartNumber={"0402WGF4700TCE"}
          schX={-7.5}
          schY={6.2}
          schRotation={270}
          connections={{ pin1: "net.VBUS_CONN", pin2: "net.PD_VDD" }}
        />
        <capacitor
          name={"C_PD_VDD"}
          capacitance={"2.2uF"}
          supplierPartNumbers={{ jlcpcb: ["C268016"] }}
          manufacturerPartNumber={"UMK107BBJ225KA-T"}
          schX={-7.5}
          schY={4.1}
          schRotation={270}
          connections={{ pin1: "net.PD_VDD", pin2: "net.GND" }}
        />
        <capacitor
          name={"C_PD_1V2"}
          capacitance={"1uF"}
          supplierPartNumbers={{ jlcpcb: ["C15849"] }}
          manufacturerPartNumber={"CL10A105KB8NNNC"}
          schX={-3.5}
          schY={1}
          schRotation={270}
          connections={{ pin1: "net.PD_VREG_1V2", pin2: "net.GND" }}
        />
        <capacitor
          name={"C_PD_2V7"}
          capacitance={"1uF"}
          supplierPartNumbers={{ jlcpcb: ["C15849"] }}
          manufacturerPartNumber={"CL10A105KB8NNNC"}
          schX={0.5}
          schY={1}
          schRotation={270}
          connections={{ pin1: "net.PD_VREG_2V7", pin2: "net.GND" }}
        />
        <resistor
          name={"R_PD_RESET"}
          resistance={"10kohm"}
          supplierPartNumbers={{ jlcpcb: ["C25744"] }}
          manufacturerPartNumber={"0402WGF1002TCE"}
          schX={-3.5}
          schY={-1.2}
          schRotation={270}
          connections={{ pin1: "net.PD_RESET", pin2: "net.GND" }}
        />
        <resistor
          name={"R12"}
          resistance={"10kohm"}
          supplierPartNumbers={{ jlcpcb: ["C25744"] }}
          manufacturerPartNumber={"0402WGF1002TCE"}
          schX={0.5}
          schY={-1.2}
          schRotation={270}
          connections={{ pin1: "net.V3V3", pin2: "net.PD_ALERT_N" }}
        />
        <resistor
          name={"R_PD_OK"}
          resistance={"10kohm"}
          supplierPartNumbers={{ jlcpcb: ["C25744"] }}
          manufacturerPartNumber={"0402WGF1002TCE"}
          schX={2.8}
          schY={1}
          schRotation={270}
          connections={{ pin1: "net.V3V3", pin2: "net.PD_CONTRACT_15_N" }}
        />
        <resistor
          name={"R_PD_SENSE"}
          resistance={"1kohm"}
          supplierPartNumbers={{ jlcpcb: ["C4261071"] }}
          manufacturerPartNumber={"ERJ-P08F1001V"}
          schX={-11}
          schY={-5.5}
          schRotation={270}
          connections={{ pin1: "net.VBUS_CONN", pin2: "net.PD_VBUS_SENSE" }}
        />
        <resistor
          name={"R_PD_DISCH1"}
          resistance={"1kohm"}
          supplierPartNumbers={{ jlcpcb: ["C4261071"] }}
          manufacturerPartNumber={"ERJ-P08F1001V"}
          schX={-7.5}
          schY={-5.5}
          schRotation={270}
          connections={{ pin1: "net.VM", pin2: "net.PD_DISCH" }}
        />
        <resistor
          name={"R_PD_DISCH2"}
          resistance={"1kohm"}
          supplierPartNumbers={{ jlcpcb: ["C4261071"] }}
          manufacturerPartNumber={"ERJ-P08F1001V"}
          schX={-7.5}
          schY={-7}
          schRotation={270}
          connections={{ pin1: "net.VM", pin2: "net.PD_DISCH" }}
        />
        <chip
          pinLabels={{ pin1: ["pin1"], pin2: ["pin2"] }}
          symbol={
            <symbol>
              <schematicpath
                points={[
                  { x: -0.2, y: 0.14 },
                  { x: -0.2, y: -0.14 },
                ]}
                strokeColor={"#880000"}
              />
              <schematicpath
                svgPath={"M 0 0.12 L -0.2 0 L 0 -0.14 Z"}
                strokeColor={"#880000"}
                isFilled={true}
                fillColor={"#880000"}
              />
              <port
                name={"pin1"}
                pinNumber={1}
                aliases={["1"]}
                direction={"left"}
                schX={-0.5}
                schY={0}
                schStemLength={0.3}
              />
              <port
                name={"pin2"}
                pinNumber={2}
                aliases={["2"]}
                direction={"right"}
                schX={0.3}
                schY={0}
                schStemLength={0.3}
              />
            </symbol>
          }
          supplierPartNumbers={{ jlcpcb: ["C1974707"] }}
          manufacturerPartNumber={"ESDA25P35-1U1M"}
          name={"D_VBUS"}
          schX={-4.5}
          schY={-3.3}
          schRotation={270}
          connections={{ pin1: "net.VBUS_CONN", pin2: "net.GND" }}
        >
          <schematictext
            text={"{NAME}"}
            schX={-0.7}
            schY={0.65}
            fontSize={0.2}
            anchor={"left"}
          />
        </chip>
        <capacitor
          name={"C25"}
          capacitance={"2.2uF"}
          supplierPartNumbers={{ jlcpcb: ["C268016"] }}
          manufacturerPartNumber={"UMK107BBJ225KA-T"}
          schX={0}
          schY={-3.3}
          schRotation={270}
          connections={{ pin1: "net.VBUS_CONN", pin2: "net.GND" }}
        />
        <capacitor
          name={"C26"}
          capacitance={"100nF"}
          supplierPartNumbers={{ jlcpcb: ["C14663"] }}
          manufacturerPartNumber={"CC0603KRX7R9BB104"}
          schX={1.7}
          schY={-3.3}
          schRotation={270}
          connections={{ pin1: "net.VBUS_CONN", pin2: "net.GND" }}
        />
        <resistor
          name={"R16"}
          resistance={"220kohm"}
          supplierPartNumbers={{ jlcpcb: ["C25767"] }}
          manufacturerPartNumber={"0402WGF2203TCE"}
          schX={-2.5}
          schY={-5.5}
          schRotation={270}
          connections={{ pin1: "net.VBUS_PROTECTED", pin2: "net.VBUS_DIV" }}
        />
        <resistor
          name={"R17"}
          resistance={"10kohm"}
          supplierPartNumbers={{ jlcpcb: ["C25744"] }}
          manufacturerPartNumber={"0402WGF1002TCE"}
          schX={0}
          schY={-5.5}
          schRotation={270}
          connections={{ pin1: "net.VBUS_DIV", pin2: "net.GND" }}
        />
        <resistor
          name={"R18"}
          resistance={"1kohm"}
          supplierPartNumbers={{ jlcpcb: ["C11702"] }}
          manufacturerPartNumber={"0402WGF1001TCE"}
          schX={1.7}
          schY={-5.5}
          schRotation={270}
          connections={{ pin1: "net.VBUS_DIV", pin2: "net.VBUS_ADC_PRE_GUARD" }}
        />
        <capacitor
          name={"C27"}
          capacitance={"100nF"}
          supplierPartNumbers={{ jlcpcb: ["C1525"] }}
          manufacturerPartNumber={"CL05B104KO5NNNC"}
          schX={3.5}
          schY={-7}
          schRotation={270}
          connections={{ pin1: "net.VBUS_ADC", pin2: "net.GND" }}
        />
        <schematictext
          schX={-6.5}
          schY={-8.9}
          fontSize={0.22}
          text={
            "Required NVM: two active PDOs,5V/1.5A and15V/1.5A;20V PDO inactive. PWR_OK_CFG=10b. Program and cold-reset/read back before motor operation."
          }
        />
        <schematictext
          schX={-6.5}
          schY={-9.6}
          fontSize={0.22}
          text={
            "U3 I2C address0x28. Factory20V preference is not acceptable. Validate RDO and measured15V before MCU requests motor enable; hardware also checks POWER_OK2 and live VBUS_EN_SNK."
          }
        />
        <schematictext
          text={"COMPONENT PURPOSE"}
          schX={6}
          schY={8}
          anchor={"left"}
          fontSize={0.28}
        />
        <schematictext
          text={"J_USB: POWER USB-C; autonomous PD, no data contacts."}
          schX={6}
          schY={7.3}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"U3: STUSB4500; autonomous PD sink; I2C address 0x28."}
          schX={6}
          schY={6.779999999999999}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"Q_PD_IN: 40 V PMOS; input half of reverse-blocking pair."}
          schX={6}
          schY={6.26}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"Q_PD_OUT: 40 V PMOS; output half; shared source/gate."}
          schX={6}
          schY={5.74}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R13: 100 kohm; gate-to-source default-off resistor."}
          schX={6}
          schY={5.22}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R_PD_GATE: 22 kohm; limits gate drive/sink current."}
          schX={6}
          schY={4.699999999999999}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R14: 470 ohm; filters incoming PD-controller supply."}
          schX={6}
          schY={4.18}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"C_PD_VDD: 2.2 uF/50 V; decouples PD input supply."}
          schX={6}
          schY={3.6599999999999997}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"C_PD_1V2: 1 uF; bypasses the internal 1.2 V regulator."}
          schX={6}
          schY={3.1399999999999997}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"C_PD_2V7: 1 uF; bypasses the internal 2.7 V regulator."}
          schX={6}
          schY={2.62}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R_PD_RESET: 10 kohm; holds active-high PD reset low."}
          schX={6}
          schY={2.0999999999999996}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R12: 10 kohm; open-drain PD ALERT pull-up to 3.3 V."}
          schX={6}
          schY={1.5799999999999992}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R_PD_OK: 10 kohm; PD power flag pull-up to 3.3 V."}
          schX={6}
          schY={1.0599999999999996}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R_PD_SENSE: 1 kohm/0.66 W; input sense/discharge limit."}
          schX={6}
          schY={0.54}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R_PD_DISCH1: 1 kohm/0.66 W; motor rail discharge arm."}
          schX={6}
          schY={0.019999999999999574}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R_PD_DISCH2: 1 kohm/0.66 W; parallel discharge arm."}
          schX={6}
          schY={-0.5000000000000009}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"D_VBUS: input surge clamp; transient proof pending."}
          schX={6}
          schY={-1.0200000000000005}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"C25: 2.2 uF/50 V; USB connector VBUS input bypass."}
          schX={6}
          schY={-1.54}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"C26: 100 nF; high-frequency connector VBUS bypass."}
          schX={6}
          schY={-2.0599999999999996}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R16: 220 kohm; upper protected-VBUS ADC divider."}
          schX={6}
          schY={-2.580000000000001}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R17: 10 kohm; lower VBUS ADC divider to GND."}
          schX={6}
          schY={-3.1000000000000005}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"R18: 1 kohm; series ADC filter/isolation resistor."}
          schX={6}
          schY={-3.62}
          anchor={"left"}
          fontSize={0.2}
        />
        <schematictext
          text={"C27: 100 nF; filters guarded VBUS ADC input."}
          schX={6}
          schY={-4.1400000000000015}
          anchor={"left"}
          fontSize={0.2}
        />
      </schematicsheet>
    </board>
  )
}

export async function createNema14ParallelResistorRepro() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Nema14ParallelResistors />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
