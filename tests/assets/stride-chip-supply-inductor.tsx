import { Circuit } from "@tscircuit/core"

// Complete 78-component Stride pedometer v1.0.4 sheet, expanded from source TSX.
// https://tscircuit.com/MustafaMulla29/stride-pedometer?version=1.0.4
// PCB/CAD-only data omitted. This repository's core regenerates routes; custom
// symbol ports use its absolute-coordinate API and carry their original aliases.
// Labels already declared by custom-symbol ports are not also declared on the chip.
export function StridePedometer() {
  return (
    <board schTraceAutoLabelEnabled schMaxTraceDistance={2}>
      <net name={"V3"} isPowerNet={true} />
      <net name={"PMID"} isPowerNet={true} />
      <net name={"PACK_P"} isPowerNet={true} />
      <net name={"BAT_SYS"} isPowerNet={true} />
      <net name={"VIN5"} isPowerNet={true} />
      <net name={"OLED_3V"} isPowerNet={true} />
      <net name={"OLED_HV"} isPowerNet={true} />
      <net name={"CHG_VDD"} isPowerNet={true} />
      <net name={"GAUGE_VDD"} isPowerNet={true} />
      <net name={"VDDR"} isPowerNet={true} />
      <net name={"VDDD"} isPowerNet={true} />
      <net name={"CHG_CE"} />
      <net name={"CHG_LP"} />
      <net name={"CHG_IRQ"} />
      <net name={"IMAX"} />

      <net name={"GND"} isGroundNet={true} />
      <chip
        pinLabels={{
          pin1: ["VDDR2"],
          pin2: ["DIO8"],
          pin3: ["DIO9"],
          pin4: ["DIO10"],
          pin5: ["DIO11"],
          pin6: ["DIO12"],
          pin7: ["DIO13"],
          pin8: ["VDDS4"],
          pin9: ["DIO14"],
          pin10: ["DIO15"],
          pin11: ["DIO16_SWDIO"],
          pin12: ["DIO17_SWDCK"],
          pin13: ["DIO18"],
          pin14: ["DIO19"],
          pin15: ["DIO20_A11"],
          pin16: ["DIO21_A10"],
          pin17: ["VDDS3"],
          pin18: ["DIO22_A9"],
          pin19: ["DIO23_A8"],
          pin20: ["DIO24_A7"],
          pin21: ["DIO25_A6"],
          pin22: ["DIO0_A5"],
          pin23: ["DIO1_A4"],
          pin24: ["DIO2_A3"],
          pin25: ["RSTN"],
          pin26: ["DIO3_X32P"],
          pin27: ["DIO4_X32N"],
          pin28: ["VDDD"],
          pin29: ["DIO5_A2"],
          pin30: ["DCDC"],
          pin31: ["VDDS2"],
          pin32: ["DIO6_A1"],
          pin33: ["DIO7_A0"],
          pin34: ["VDDR1"],
          pin35: ["X48P"],
          pin36: ["X48N"],
          pin37: ["NC"],
          pin38: ["VDDS1"],
          pin39: ["ANT"],
          pin40: ["RFGND"],
          pin41: ["EP"],
        }}
        pinAttributes={{ pin37: { doNotConnect: true } }}
        supplierPartNumbers={{ jlcpcb: ["C5914214"] }}
        manufacturerPartNumber={"CC2340R52E0RKPR"}
        name={"U1"}
        schHeight={4.2}
        schX={0}
        schY={0}
        connections={{
          VDDS1: "net.V3",
          VDDS2: "net.V3",
          VDDS3: "net.V3",
          VDDS4: "net.V3",
          VDDR1: "net.VDDR",
          VDDR2: "net.VDDR",
          VDDD: "net.VDDD",
          DCDC: "net.DCDC",
          EP: "net.GND",
          RFGND: "net.GND",
          ANT: "net.RF_RAW",
          X48P: "net.X48P",
          X48N: "net.X48N",
          DIO3_X32P: "net.X32P",
          DIO4_X32N: "net.X32N",
          RSTN: "net.RESETN",
          DIO16_SWDIO: "net.SWDIO",
          DIO17_SWDCK: "net.SWCLK",
          DIO8: "net.I2C_SDA",
          DIO6_A1: "net.I2C_SCL",
          DIO9: "net.ACC_INT1",
          DIO10: "net.ACC_INT2",
          DIO11: "net.CHG_LP",
          DIO12: "net.CHG_CE",
          DIO13: "net.CHG_IRQ",
          DIO14: "net.GAUGE_IRQ",
          DIO15: "net.PG_BUTTON",
          DIO18: "net.OLED_SCL",
          DIO19: "net.OLED_SDA",
          DIO20_A11: "net.OLED_RST",
          DIO21_A10: "net.BOOST_EN",
        }}
        noConnect={[
          "NC",
          "DIO22_A9",
          "DIO23_A8",
          "DIO24_A7",
          "DIO25_A6",
          "DIO0_A5",
          "DIO1_A4",
          "DIO2_A3",
          "DIO5_A2",
          "DIO7_A0",
        ]}
      />
      <chip
        pinLabels={{
          pin1: ["IN", "A1"],
          pin2: ["PMID1", "A2"],
          pin3: ["BAT1", "A3"],
          pin4: ["GND", "A4"],
          pin5: ["N_PG", "B1"],
          pin6: ["PMID2", "B2"],
          pin7: ["BAT2", "B3"],
          pin8: ["TS", "B4"],
          pin9: ["N_MR", "C1"],
          pin10: ["N_CE", "C2"],
          pin11: ["IMAX", "C3"],
          pin12: ["ADCIN", "C4"],
          pin13: ["VDD", "D1"],
          pin14: ["N_INT", "D2"],
          pin15: ["N_LP", "D3"],
          pin16: ["LSLDO", "D4"],
          pin17: ["VIO", "E1"],
          pin18: ["SDA", "E2"],
          pin19: ["SCL", "E3"],
          pin20: ["VINLS", "E4"],
        }}
        supplierPartNumbers={{ jlcpcb: ["C2868498"] }}
        manufacturerPartNumber={"BQ25150YFPR"}
        name={"U2"}
        schX={13}
        schY={2}
        connections={{
          IN: "net.VIN5",
          PMID1: "net.PMID",
          PMID2: "net.PMID",
          BAT1: "net.BAT_SYS",
          BAT2: "net.BAT_SYS",
          GND: "net.GND",
          N_PG: "net.PG_BUTTON",
          TS: "net.TS",
          N_MR: "net.MRN",
          N_CE: "net.CHG_CE",
          IMAX: "net.IMAX",
          ADCIN: "net.GND",
          VDD: "net.CHG_VDD",
          N_INT: "net.CHG_IRQ",
          N_LP: "net.CHG_LP",
          LSLDO: "net.OLED_3V",
          VIO: "net.V3",
          SDA: "net.I2C_SDA",
          SCL: "net.I2C_SCL",
          VINLS: "net.PMID",
        }}
      />
      <chip
        pinLabels={{
          pin1: ["GPOUT", "A1"],
          pin2: ["BIN", "B1"],
          pin3: ["VSS1", "C1"],
          pin4: ["SDA", "A2"],
          pin5: ["VSS2", "B2"],
          pin6: ["SRX", "C2"],
          pin7: ["SCL", "A3"],
          pin8: ["VDD", "B3"],
          pin9: ["BAT", "C3"],
        }}
        supplierPartNumbers={{ jlcpcb: ["C6075475"] }}
        manufacturerPartNumber={"BQ27427YZFR"}
        name={"U3"}
        schHeight={1}
        schX={24}
        schY={2}
        connections={{
          GPOUT: "net.GAUGE_IRQ",
          BIN: "net.BIN",
          VSS1: "net.GND",
          VSS2: "net.GND",
          SRX: "net.BAT_SYS",
          BAT: "net.PACK_P",
          VDD: "net.GAUGE_VDD",
          SDA: "net.I2C_SDA",
          SCL: "net.I2C_SCL",
        }}
      />
      <chip
        pinLabels={{
          pin1: ["SDO"],
          pin2: ["SDX"],
          pin3: ["VDDIO"],
          pin4: ["NC2"],
          pin5: ["INT1"],
          pin6: ["INT2"],
          pin7: ["VDD"],
          pin8: ["GNDIO"],
          pin9: ["GND"],
          pin10: ["CSB"],
          pin11: ["NC1"],
          pin12: ["SCX"],
        }}
        pinAttributes={{
          pin4: { doNotConnect: true },
          pin7: { requiresPower: true },
          pin9: { requiresGround: true },
          pin11: { doNotConnect: true },
        }}
        supplierPartNumbers={{ jlcpcb: ["C437655"] }}
        manufacturerPartNumber={"BMA400"}
        name={"U4"}
        schX={24}
        schY={-7}
        connections={{
          SDO: "net.GND",
          SDX: "net.I2C_SDA",
          SCX: "net.I2C_SCL",
          VDD: "net.V3",
          VDDIO: "net.V3",
          GND: "net.GND",
          GNDIO: "net.GND",
          CSB: "net.V3",
          INT1: "net.ACC_INT1",
          INT2: "net.ACC_INT2",
        }}
      />
      <chip
        pinLabels={{
          pin1: ["IN"],
          pin2: ["GND"],
          pin3: ["EN"],
          pin4: ["NC"],
          pin5: ["OUT"],
        }}
        pinAttributes={{
          pin2: { requiresGround: true },
          pin4: { doNotConnect: true },
        }}
        supplierPartNumbers={{ jlcpcb: ["C3747031"] }}
        manufacturerPartNumber={"TPS7A0230PDBVR"}
        name={"U5"}
        schHeight={0.6}
        schX={13}
        schY={-7}
        connections={{
          IN: "net.PMID",
          EN: "net.PMID",
          GND: "net.GND",
          OUT: "net.V3",
        }}
      />
      <chip
        pinLabels={{
          pin1: ["VOUT", "C2"],
          pin2: ["EN", "C1"],
          pin3: ["SW", "B2"],
          pin4: ["FB", "B1"],
          pin5: ["GND", "A2"],
          pin6: ["VIN", "A1"],
        }}
        supplierPartNumbers={{ jlcpcb: ["C181551"] }}
        manufacturerPartNumber={"TPS61046YFFR"}
        name={"U6"}
        schX={35}
        schY={2}
        connections={{
          VIN: "net.PMID",
          GND: "net.GND",
          SW: "net.BOOST_SW",
          VOUT: "net.OLED_HV",
          FB: "net.BOOST_FB",
          EN: "net.BOOST_EN",
        }}
      />
      <chip
        name={"DS1"}
        schX={35}
        schY={-7}
        connections={{
          VBAT: "net.OLED_3V",
          VDD: "net.OLED_3V",
          VSS: "net.GND",
          RESN: "net.OLED_RST",
          SCL: "net.OLED_SCL",
          SDA: "net.OLED_SDA",
          IREF: "net.OLED_IREF",
          VCOMH: "net.OLED_VCOM",
          VCC: "net.OLED_HV",
        }}
        manufacturerPartNumber={"X091-2832TSWFG02-H14"}
        supplierPartNumbers={{ jlcpcb: ["C18723017"] }}
        doNotPlace={true}
        pinLabels={{
          pin1: "C2P",
          pin2: "C2N",
          pin3: "C1P",
          pin4: "C1N",
          pin5: "VBAT",
          pin6: "VBREF",
          pin7: "VSS",
          pin8: "VDD",
          pin9: "RESN",
          pin10: "SCL",
          pin11: "SDA",
          pin12: "IREF",
          pin13: "VCOMH",
          pin14: "VCC",
        }}
        noConnect={["C2P", "C2N", "C1P", "C1N", "VBREF"]}
      />
      <chip
        name={"Y1"}
        schX={-10}
        schY={2}
        connections={{
          X1: "net.X48P",
          X2: "net.X48N",
          GND1: "net.GND",
          GND2: "net.GND",
        }}
        manufacturerPartNumber={"XC32M4-48.000-F08NLDT"}
        supplierPartNumbers={{ jlcpcb: ["C2925606"] }}
        pinLabels={{ pin1: "X1", pin2: "GND1", pin3: "X2", pin4: "GND2" }}
      />
      <chip
        symbol={
          <symbol>
            <schematicpath
              points={[
                { x: 0.08, y: 0 },
                { x: 0.2, y: 0 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: -0.2, y: 0 },
                { x: -0.08, y: 0 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: -0.02, y: 0.12 },
                { x: -0.02, y: -0.12 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: -0.02, y: -0.12 },
                { x: 0.02, y: -0.12 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: 0.02, y: -0.12 },
                { x: 0.02, y: 0.12 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: 0.02, y: 0.12 },
                { x: -0.02, y: 0.12 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: 0.08, y: 0.14 },
                { x: 0.08, y: -0.14 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: -0.08, y: 0.14 },
                { x: -0.08, y: -0.14 },
              ]}
              strokeColor={"#8D2323"}
            />
            <port
              name={"pin2"}
              pinNumber={2}
              aliases={["2"]}
              direction={"right"}
              schX={-9.6}
              schY={-2}
              schStemLength={0.2}
            />
            <port
              name={"pin1"}
              pinNumber={1}
              aliases={["1"]}
              direction={"left"}
              schX={-10.4}
              schY={-2}
              schStemLength={0.2}
            />
          </symbol>
        }
        supplierPartNumbers={{ jlcpcb: ["C97604"] }}
        manufacturerPartNumber={"SC-32S32.768kHz20PPM7pF"}
        name={"Y2"}
        schX={-10}
        schY={-2}
        connections={{ pin1: "net.X32P", pin2: "net.X32N" }}
      />
      <chip
        symbol={
          <symbol>
            <schematicpath
              points={[
                { x: 0, y: 0 },
                { x: -0.2, y: 0.2 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: 0.2, y: 0.2 },
                { x: 0, y: 0 },
              ]}
              strokeColor={"#8D2323"}
            />
            <schematicpath
              points={[
                { x: 0, y: 0 },
                { x: 0, y: -0.2 },
              ]}
              strokeColor={"#8D2323"}
            />
            <port
              name={"pin1"}
              pinNumber={1}
              aliases={["ANT"]}
              direction={"down"}
              schX={-10}
              schY={-6.4}
              schStemLength={0.2}
            />
            <schematicpath
              points={[
                { x: 0, y: 0 },
                { x: 0, y: 0.3 },
              ]}
              strokeColor={"#880000"}
            />
            <port
              name={"pin2"}
              pinNumber={2}
              aliases={["2"]}
              direction={"up"}
              schX={-10}
              schY={-5.7}
              schStemLength={0.2}
            />
          </symbol>
        }
        supplierPartNumbers={{ jlcpcb: ["C89334"] }}
        manufacturerPartNumber={"2450AT18A100E"}
        name={"ANT1"}
        schX={-10}
        schY={-6}
        noConnect={["pin2"]}
        connections={{ ANT: "net.RF_ANT" }}
      />
      <pushbutton
        name={"SW1"}
        pinLabels={{ pin1: ["pin1"], pin2: ["pin2"] }}
        supplierPartNumbers={{ jlcpcb: ["C720477"] }}
        manufacturerPartNumber={"TS-1088-AR02016"}
        schX={13}
        schY={-12}
        connections={{ pin1: "net.MRN", pin2: "net.GND" }}
      />
      <chip
        symbol={
          <symbol>
            <port
              name={"pin2"}
              pinNumber={2}
              aliases={["2"]}
              direction={"right"}
              schX={24.4}
              schY={-12}
              schStemLength={0.2}
            />
            <port
              name={"pin1"}
              pinNumber={1}
              aliases={["1"]}
              direction={"left"}
              schX={23.6}
              schY={-12}
              schStemLength={0.2}
            />
            <schematicpath
              points={[
                { x: -0.04, y: 0.18 },
                { x: -0.04, y: 0.18 },
                { x: 0, y: 0.14 },
                { x: 0, y: -0.14 },
                { x: 0.04, y: -0.18 },
                { x: 0.04, y: -0.18 },
              ]}
              strokeColor={"#880000"}
            />
            <schematicpath
              svgPath={"M 0.2 0.14 L 0 0 L 0.2 -0.14 Z"}
              strokeColor={"#880000"}
            />
            <schematicpath
              svgPath={"M -0.2 -0.14 L 0 0 L -0.2 0.14 Z"}
              strokeColor={"#880000"}
            />
          </symbol>
        }
        supplierPartNumbers={{ jlcpcb: ["C48260"] }}
        manufacturerPartNumber={"TPD1E10B06DPYR"}
        name={"D1"}
        schX={24}
        schY={-12}
        connections={{ pin1: "net.VIN5", pin2: "net.GND" }}
      />
      <chip
        name={"J1"}
        schX={35}
        schY={-13}
        connections={{ pin1: "net.VIN5", pin2: "net.GND" }}
        doNotPlace={true}
        schPinArrangement={{
          leftSide: { pins: ["pin1", "pin2"], direction: "top-to-bottom" },
        }}
        pinLabels={{ pin1: "P1", pin2: "P2" }}
      />
      <chip
        name={"J2"}
        schX={24}
        schY={8}
        connections={{ pin1: "net.PACK_P", pin2: "net.GND", pin3: "net.TS" }}
        doNotPlace={true}
        schPinArrangement={{
          leftSide: {
            pins: ["pin1", "pin2", "pin3"],
            direction: "top-to-bottom",
          },
        }}
        pinLabels={{ pin1: "P1", pin2: "P2", pin3: "P3" }}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C1"}
        supplierPartNumbers={{ jlcpcb: ["C19666"] }}
        schX={-12}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.VIN5", pin2: "net.GND" }}
        capacitance={"4.7uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C2"}
        supplierPartNumbers={{ jlcpcb: ["C15850"] }}
        schX={-6}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.PMID", pin2: "net.GND" }}
        capacitance={"10uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C3"}
        supplierPartNumbers={{ jlcpcb: ["C52923"] }}
        schX={0}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.BAT_SYS", pin2: "net.GND" }}
        capacitance={"1uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C4"}
        supplierPartNumbers={{ jlcpcb: ["C19666"] }}
        schX={6}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.CHG_VDD", pin2: "net.GND" }}
        capacitance={"4.7uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C5"}
        supplierPartNumbers={{ jlcpcb: ["C52923"] }}
        schX={12}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.PMID", pin2: "net.GND" }}
        capacitance={"1uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C6"}
        supplierPartNumbers={{ jlcpcb: ["C19666"] }}
        schX={18}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_3V", pin2: "net.GND" }}
        capacitance={"4.7uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C7"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={24}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C8"}
        supplierPartNumbers={{ jlcpcb: ["C52923"] }}
        schX={30}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.PACK_P", pin2: "net.GND" }}
        capacitance={"1uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C9"}
        supplierPartNumbers={{ jlcpcb: ["C12530"] }}
        schX={36}
        schY={-20}
        doNotPlace={false}
        connections={{ pin1: "net.GAUGE_VDD", pin2: "net.GND" }}
        capacitance={"2.2uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C10"}
        supplierPartNumbers={{ jlcpcb: ["C19666"] }}
        schX={-12}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.PMID", pin2: "net.GND" }}
        capacitance={"4.7uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C11"}
        supplierPartNumbers={{ jlcpcb: ["C19666"] }}
        schX={-6}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"4.7uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C12"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={0}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C13"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={6}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C14"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={12}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C15"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={18}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C16"}
        supplierPartNumbers={{ jlcpcb: ["C15850"] }}
        schX={24}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"10uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C17"}
        supplierPartNumbers={{ jlcpcb: ["C15850"] }}
        schX={30}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.VDDR", pin2: "net.GND" }}
        capacitance={"10uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C18"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={36}
        schY={-24}
        doNotPlace={false}
        connections={{ pin1: "net.VDDR", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C19"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={-12}
        schY={-28}
        doNotPlace={false}
        connections={{ pin1: "net.VDDR", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C20"}
        supplierPartNumbers={{ jlcpcb: ["C52923"] }}
        schX={-6}
        schY={-28}
        doNotPlace={false}
        connections={{ pin1: "net.VDDD", pin2: "net.GND" }}
        capacitance={"1uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C21"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={0}
        schY={-28}
        doNotPlace={false}
        connections={{ pin1: "net.RESETN", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C22"}
        supplierPartNumbers={{ jlcpcb: ["C1545"] }}
        schX={6}
        schY={-28}
        doNotPlace={false}
        connections={{ pin1: "net.X32P", pin2: "net.GND" }}
        capacitance={"10pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C23"}
        supplierPartNumbers={{ jlcpcb: ["C1545"] }}
        schX={12}
        schY={-28}
        doNotPlace={false}
        connections={{ pin1: "net.X32N", pin2: "net.GND" }}
        capacitance={"10pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C24"}
        supplierPartNumbers={{ jlcpcb: ["C1552"] }}
        schX={18}
        schY={-28}
        doNotPlace={true}
        connections={{ pin1: "net.X48P", pin2: "net.GND" }}
        capacitance={"1.5pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C25"}
        supplierPartNumbers={{ jlcpcb: ["C1552"] }}
        schX={24}
        schY={-28}
        doNotPlace={true}
        connections={{ pin1: "net.X48N", pin2: "net.GND" }}
        capacitance={"1.5pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C26"}
        supplierPartNumbers={{ jlcpcb: ["C1552"] }}
        schX={30}
        schY={-28}
        doNotPlace={false}
        connections={{ pin1: "net.RF_RAW", pin2: "net.GND" }}
        capacitance={"1.5pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C27"}
        supplierPartNumbers={{ jlcpcb: ["C1552"] }}
        schX={36}
        schY={-28}
        doNotPlace={false}
        connections={{ pin1: "net.RF_FILTER", pin2: "net.GND" }}
        capacitance={"1.5pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C28"}
        supplierPartNumbers={{ jlcpcb: ["C1548"] }}
        schX={-12}
        schY={-32}
        doNotPlace={false}
        connections={{ pin1: "net.RF_FILTER", pin2: "net.RF_50" }}
        capacitance={"15pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C29"}
        schX={-6}
        schY={-32}
        doNotPlace={true}
        connections={{ pin1: "net.RF_50", pin2: "net.GND" }}
        capacitance={"1pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C30"}
        schX={0}
        schY={-32}
        doNotPlace={true}
        connections={{ pin1: "net.RF_ANT", pin2: "net.GND" }}
        capacitance={"1pF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C31"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={6}
        schY={-32}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C32"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={12}
        schY={-32}
        doNotPlace={false}
        connections={{ pin1: "net.V3", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C33"}
        supplierPartNumbers={{ jlcpcb: ["C23630"] }}
        schX={18}
        schY={-32}
        doNotPlace={false}
        connections={{ pin1: "net.PMID", pin2: "net.GND" }}
        capacitance={"2.2uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C34"}
        supplierPartNumbers={{ jlcpcb: ["C19666"] }}
        schX={24}
        schY={-32}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_HV", pin2: "net.GND" }}
        capacitance={"4.7uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C35"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={30}
        schY={-32}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_HV", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C36"}
        supplierPartNumbers={{ jlcpcb: ["C23630"] }}
        schX={36}
        schY={-32}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_VCOM", pin2: "net.GND" }}
        capacitance={"2.2uF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C37"}
        supplierPartNumbers={{ jlcpcb: ["C1525"] }}
        schX={-12}
        schY={-36}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_3V", pin2: "net.GND" }}
        capacitance={"100nF"}
      />
      <capacitor
        schOrientation={"vertical"}
        name={"C38"}
        supplierPartNumbers={{ jlcpcb: ["C19666"] }}
        schX={-6}
        schY={-36}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_3V", pin2: "net.GND" }}
        capacitance={"4.7uF"}
      />
      <resistor
        name={"R1"}
        supplierPartNumbers={{ jlcpcb: ["C25126"] }}
        schX={0}
        schY={-36}
        doNotPlace={false}
        connections={{ pin1: "net.IMAX", pin2: "net.GND" }}
        resistance={"560"}
      />
      <resistor
        name={"R2"}
        supplierPartNumbers={{ jlcpcb: ["C25744"] }}
        schX={6}
        schY={-36}
        doNotPlace={false}
        connections={{ pin1: "net.TS", pin2: "net.GND" }}
        resistance={"10k"}
      />
      <resistor
        name={"R3"}
        supplierPartNumbers={{ jlcpcb: ["C25744"] }}
        schX={12}
        schY={-35.46}
        doNotPlace={false}
        connections={{ pin1: "net.BIN", pin2: "net.GND" }}
        resistance={"10k"}
      />
      <resistor
        name={"R4"}
        supplierPartNumbers={{ jlcpcb: ["C25744"] }}
        schX={18}
        schY={-36}
        doNotPlace={false}
        connections={{ pin1: "net.GAUGE_IRQ", pin2: "net.V3" }}
        resistance={"10k"}
      />
      <resistor
        name={"R5"}
        supplierPartNumbers={{ jlcpcb: ["C25744"] }}
        schX={24}
        schY={-36}
        doNotPlace={false}
        connections={{ pin1: "net.CHG_CE", pin2: "net.V3" }}
        resistance={"10k"}
      />
      <resistor
        name={"R6"}
        supplierPartNumbers={{ jlcpcb: ["C25741"] }}
        schX={30}
        schY={-36}
        doNotPlace={false}
        connections={{ pin1: "net.CHG_IRQ", pin2: "net.V3" }}
        resistance={"100k"}
      />
      <resistor
        name={"R7"}
        supplierPartNumbers={{ jlcpcb: ["C25741"] }}
        schX={36}
        schY={-36}
        doNotPlace={false}
        connections={{ pin1: "net.PG_BUTTON", pin2: "net.V3" }}
        resistance={"100k"}
      />
      <resistor
        name={"R8"}
        supplierPartNumbers={{ jlcpcb: ["C25741"] }}
        schX={-12}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.RESETN", pin2: "net.V3" }}
        resistance={"100k"}
      />
      <resistor
        name={"R9"}
        supplierPartNumbers={{ jlcpcb: ["C25744"] }}
        schX={-6}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.I2C_SDA", pin2: "net.V3" }}
        resistance={"10k"}
      />
      <resistor
        name={"R10"}
        supplierPartNumbers={{ jlcpcb: ["C25744"] }}
        schX={0}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.I2C_SCL", pin2: "net.V3" }}
        resistance={"10k"}
      />
      <resistor
        name={"R11"}
        supplierPartNumbers={{ jlcpcb: ["C25900"] }}
        schX={6}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_SCL", pin2: "net.OLED_3V" }}
        resistance={"4.7k"}
      />
      <resistor
        name={"R12"}
        supplierPartNumbers={{ jlcpcb: ["C25900"] }}
        schX={12}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_SDA", pin2: "net.OLED_3V" }}
        resistance={"4.7k"}
      />
      <resistor
        name={"R13"}
        supplierPartNumbers={{ jlcpcb: ["C25741"] }}
        schX={18}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_RST", pin2: "net.OLED_3V" }}
        resistance={"100k"}
      />
      <resistor
        name={"R14"}
        supplierPartNumbers={{ jlcpcb: ["C132339"] }}
        schX={24}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_IREF", pin2: "net.GND" }}
        resistance={"560k"}
      />
      <resistor
        name={"R15"}
        supplierPartNumbers={{ jlcpcb: ["C4142"] }}
        schX={30}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.OLED_HV", pin2: "net.BOOST_FB" }}
        resistance={"82k"}
      />
      <resistor
        name={"R16"}
        supplierPartNumbers={{ jlcpcb: ["C25744"] }}
        schX={36}
        schY={-40}
        doNotPlace={false}
        connections={{ pin1: "net.BOOST_FB", pin2: "net.GND" }}
        resistance={"10k"}
      />
      <resistor
        name={"R17"}
        supplierPartNumbers={{ jlcpcb: ["C25741"] }}
        schX={-12}
        schY={-44}
        doNotPlace={false}
        connections={{ pin1: "net.BOOST_EN", pin2: "net.GND" }}
        resistance={"100k"}
      />
      <resistor
        name={"R18"}
        supplierPartNumbers={{ jlcpcb: ["C17168"] }}
        schX={-6}
        schY={-44}
        doNotPlace={false}
        connections={{ pin1: "net.RF_50", pin2: "net.RF_ANT" }}
        resistance={"0"}
      />
      <inductor
        name={"L1"}
        supplierPartNumbers={{ jlcpcb: ["C162582"] }}
        schX={0}
        schY={-44}
        doNotPlace={false}
        connections={{ pin1: "net.DCDC", pin2: "net.VDDR" }}
        inductance={"10uH"}
      />
      <inductor
        name={"L2"}
        supplierPartNumbers={{ jlcpcb: ["C6584793"] }}
        schX={6}
        schY={-44}
        doNotPlace={false}
        connections={{ pin1: "net.RF_RAW", pin2: "net.RF_FILTER" }}
        inductance={"2.8nH"}
      />
      <chip
        symbol={
          <symbol>
            <port
              name={"pin2"}
              pinNumber={2}
              aliases={["2"]}
              direction={"right"}
              schX={12.4}
              schY={-44}
              schStemLength={0.06}
            />
            <port
              name={"pin1"}
              pinNumber={1}
              aliases={["1"]}
              direction={"left"}
              schX={11.6}
              schY={-44}
              schStemLength={0.06}
            />
            <schematicpath
              svgPath={"M -0.3376 0.0014 A 0.08 0.078 0 1 0 -0.1784 0.0012"}
              strokeColor={"#880000"}
            />
            <schematicpath
              svgPath={"M -0.168 0.0014 A 0.08 0.078 0 1 0 -0.0088 0.0014"}
              strokeColor={"#880000"}
            />
            <schematicpath
              svgPath={"M 0.0014 0.0014 A 0.08 0.078 0 1 0 0.1606 0.0014"}
              strokeColor={"#880000"}
            />
            <schematicpath
              svgPath={"M 0.174 0.0014 A 0.08 0.078 0 1 0 0.3334 0.0012"}
              strokeColor={"#880000"}
            />
          </symbol>
        }
        supplierPartNumbers={{ jlcpcb: ["C426327"] }}
        manufacturerPartNumber={"DFE201610E-100M=P2"}
        name={"L3"}
        schX={12}
        schY={-44}
        doNotPlace={false}
        connections={{ pin1: "net.PMID", pin2: "net.BOOST_SW" }}
      />
      <trace from={"U1.ANT"} to={"C26.pin1"} />
      <trace from={"C26.pin1"} to={"L2.pin1"} />
      <trace from={"L2.pin2"} to={"C27.pin1"} />
      <trace from={"C27.pin1"} to={"C28.pin1"} />
      <trace from={"C28.pin2"} to={"C29.pin1"} />
      <trace from={"C29.pin1"} to={"R18.pin1"} />
      <trace from={"R18.pin2"} to={"ANT1.ANT"} />
      <trace from={"R18.pin2"} to={"C30.pin1"} />

      <testpoint
        name={"TP1"}
        padDiameter={1.2}
        schX={-10}
        schY={-52}
        connections={{ pin1: "net.V3" }}
      />
      <testpoint
        name={"TP2"}
        padDiameter={1.2}
        schX={-4}
        schY={-52}
        connections={{ pin1: "net.GND" }}
      />
      <testpoint
        name={"TP3"}
        padDiameter={1.2}
        schX={2}
        schY={-52}
        connections={{ pin1: "net.SWDIO" }}
      />
      <testpoint
        name={"TP4"}
        padDiameter={1.2}
        schX={8}
        schY={-52}
        connections={{ pin1: "net.SWCLK" }}
      />
      <testpoint
        name={"TP5"}
        padDiameter={1.2}
        schX={14}
        schY={-26.919}
        connections={{ pin1: "net.RESETN" }}
      />
    </board>
  )
}

export async function createStridePedometer() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<StridePedometer />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
