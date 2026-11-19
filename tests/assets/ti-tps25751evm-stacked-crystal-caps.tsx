import { Circuit } from "@tscircuit/core"

// TPS25751EVM, SLVUCP9B Figure 5-7: the 16 MHz crystal Y1 between its stacked
// load capacitors, C41 above and C42 below, both drawn horizontally with
// their load ends in one column. Components and positions are copied
// unchanged from the transcription in tscircuit/checks#578; U7 is included
// as the oscillator host with its supply and ground pins on net labels.
export async function createTiTps25751EvmStackedCrystalCaps({
  crystalSchY = 7.89645,
}: {
  crystalSchY?: number
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "none" }}>
      <net name="GND" isGroundNet />
      <net name="TIVA_P3V3" isPowerNet />
      <chip
        name="U7"
        schX={16.69561}
        schY={8.49755}
        pinLabels={{
          pin1: "PB6",
          pin2: "VDDA",
          pin3: "GNDA",
          pin4: "PB7",
          pin5: "PF4",
          pin6: "PE3",
          pin7: "PE2",
          pin8: "PE1",
          pin9: "PE0",
          pin10: "PD7",
          pin11: "VDD",
          pin12: "GND",
          pin13: "PC7",
          pin14: "PC6",
          pin15: "PC5",
          pin16: "PC4",
          pin17: "PA0_U0Rx",
          pin18: "PA1_U0Tx",
          pin19: "PA2_SSI0Clk",
          pin20: "PA3_SSI0Fss",
          pin21: "PA4_SSI0Rx",
          pin22: "PA5_SSI0Tx",
          pin23: "PA6",
          pin24: "PA7",
          pin25: "VDDC",
          pin26: "VDD",
          pin27: "GND",
          pin28: "PF0",
          pin29: "PF1",
          pin30: "PF2",
          pin31: "PF3",
          pin32: "WAKE",
          pin33: "HIB",
          pin34: "XOSC0",
          pin35: "GNDX",
          pin36: "XOSC1",
          pin37: "VBAT",
          pin38: "RST",
          pin39: "GND",
          pin40: "OSC0",
          pin41: "OSC1",
          pin42: "VDD",
          pin43: "PD4",
          pin44: "PD5",
          pin45: "PB0_USB0VID",
          pin46: "PB1_USB0VBUS",
          pin47: "PB2_I2C0SCL",
          pin48: "PB3_I2C0SDA",
          pin49: "PC3_TDO_SWO",
          pin50: "PC2_TDI",
          pin51: "PC1_TMS_SWDIO",
          pin52: "PC0_TCK_SWCLK",
          pin53: "PD6",
          pin54: "VDD",
          pin55: "GND",
          pin56: "VDDC",
          pin57: "PB5",
          pin58: "PB4",
          pin59: "PE4",
          pin60: "PE5",
          pin61: "PD0",
          pin62: "PD1",
          pin63: "PD2",
          pin64: "PD3",
        }}
        schPinArrangement={{
          leftSide: {
            pins: [
              "pin11",
              "pin26",
              "pin42",
              "pin54",
              "pin2",
              "pin25",
              "pin56",
              "pin37",
              "pin32",
              "pin38",
              "pin40",
              "pin41",
              "pin17",
              "pin18",
              "pin19",
              "pin20",
              "pin21",
              "pin22",
              "pin23",
              "pin24",
              "pin45",
              "pin46",
              "pin47",
              "pin48",
              "pin58",
              "pin57",
              "pin1",
              "pin4",
            ],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: [
              "pin55",
              "pin39",
              "pin27",
              "pin12",
              "pin3",
              "pin35",
              "pin5",
              "pin31",
              "pin30",
              "pin29",
              "pin28",
              "pin60",
              "pin59",
              "pin6",
              "pin7",
              "pin8",
              "pin9",
              "pin10",
              "pin53",
              "pin44",
              "pin43",
              "pin64",
              "pin63",
              "pin62",
              "pin61",
              "pin13",
              "pin14",
              "pin15",
              "pin16",
              "pin49",
              "pin50",
              "pin51",
              "pin52",
              "pin36",
              "pin34",
              "pin33",
            ],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin11: { topMargin: 0 },
          pin26: { topMargin: 0.20019 },
          pin42: { topMargin: 0.20018 },
          pin54: { topMargin: 0.20019 },
          pin2: { topMargin: 1.00055 },
          pin25: { topMargin: 0.60031 },
          pin56: { topMargin: 0.20019 },
          pin37: { topMargin: 0.60037 },
          pin32: { topMargin: 0.60037 },
          pin38: { topMargin: 0.60037 },
          pin40: { topMargin: 0.60037 },
          pin41: { topMargin: 0.60037 },
          pin17: { topMargin: 1.00049 },
          pin18: { topMargin: 0.20019 },
          pin19: { topMargin: 0.20018 },
          pin20: { topMargin: 0.20019 },
          pin21: { topMargin: 0.19848 },
          pin22: { topMargin: 0.20019 },
          pin23: { topMargin: 0.20018 },
          pin24: { topMargin: 0.20019 },
          pin45: { topMargin: 1.00056 },
          pin46: { topMargin: 0.20018 },
          pin47: { topMargin: 0.20019 },
          pin48: { topMargin: 0.20018 },
          pin58: { topMargin: 0.20019 },
          pin57: { topMargin: 0.20018 },
          pin1: { topMargin: 0.20012 },
          pin4: { topMargin: 0.20025, bottomMargin: 1.2005 },
          pin55: { bottomMargin: 1e-5 },
          pin39: { bottomMargin: 0.20018 },
          pin27: { bottomMargin: 0.20018 },
          pin12: { bottomMargin: 0.20013 },
          pin3: { bottomMargin: 0.20025 },
          pin35: { bottomMargin: 0.20012 },
          pin5: { bottomMargin: 0.60037 },
          pin31: { bottomMargin: 0.20018 },
          pin30: { bottomMargin: 0.20019 },
          pin29: { bottomMargin: 0.20018 },
          pin28: { bottomMargin: 0.20019 },
          pin60: { bottomMargin: 0.60037 },
          pin59: { bottomMargin: 0.20019 },
          pin6: { bottomMargin: 0.20018 },
          pin7: { bottomMargin: 0.20019 },
          pin8: { bottomMargin: 0.19848 },
          pin9: { bottomMargin: 0.20019 },
          pin10: { bottomMargin: 0.60037 },
          pin53: { bottomMargin: 0.20018 },
          pin44: { bottomMargin: 0.20019 },
          pin43: { bottomMargin: 0.20012 },
          pin64: { bottomMargin: 0.20018 },
          pin63: { bottomMargin: 0.20019 },
          pin62: { bottomMargin: 0.20019 },
          pin61: { bottomMargin: 0.20018 },
          pin13: { bottomMargin: 0.60037 },
          pin14: { bottomMargin: 0.20019 },
          pin15: { bottomMargin: 0.20018 },
          pin16: { bottomMargin: 0.20019 },
          pin49: { bottomMargin: 0.20018 },
          pin50: { bottomMargin: 0.20019 },
          pin51: { bottomMargin: 0.20012 },
          pin52: { bottomMargin: 0.20019 },
          pin36: { bottomMargin: 0.60037 },
          pin34: { bottomMargin: 0.60037 },
          pin33: { bottomMargin: 0.60037, topMargin: 0 },
        }}
        schWidth={7.99851}
        schHeight={18.40664}
        pinAttributes={{
          pin1: { isBidirectional: true, isGpio: true },
          pin2: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin3: { requiresGround: true },
          pin4: { isBidirectional: true, isGpio: true },
          pin5: { isBidirectional: true, isGpio: true },
          pin6: { isBidirectional: true, isGpio: true },
          pin7: { isBidirectional: true, isGpio: true },
          pin8: { isBidirectional: true, isGpio: true },
          pin9: { isBidirectional: true, isGpio: true },
          pin10: { isBidirectional: true, isGpio: true },
          pin11: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin12: { requiresGround: true },
          pin13: { isBidirectional: true, isGpio: true },
          pin14: { isBidirectional: true, isGpio: true },
          pin15: { isBidirectional: true, isGpio: true },
          pin16: { isBidirectional: true, isGpio: true },
          pin17: { isBidirectional: true, isGpio: true },
          pin18: { isBidirectional: true, isGpio: true },
          pin19: { isBidirectional: true, isGpio: true },
          pin20: { isBidirectional: true, isGpio: true },
          pin21: { isBidirectional: true, isGpio: true },
          pin22: { isBidirectional: true, isGpio: true },
          pin23: { isBidirectional: true, isGpio: true },
          pin24: { isBidirectional: true, isGpio: true },
          pin25: {
            providesPower: true,
            providesVoltage: "1.2V",
            shouldHaveDecouplingCapacitor: true,
          },
          pin26: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin27: { requiresGround: true },
          pin28: { isBidirectional: true, isGpio: true },
          pin29: { isBidirectional: true, isGpio: true },
          pin30: { isBidirectional: true, isGpio: true },
          pin31: { isBidirectional: true, isGpio: true },
          pin32: { isInput: true },
          pin33: { isOutput: true },
          pin34: { isInput: true },
          pin35: { requiresGround: true },
          pin36: { isOutput: true },
          pin37: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin38: { isInput: true },
          pin39: { requiresGround: true },
          pin40: { isInput: true },
          pin41: { isOutput: true },
          pin42: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin43: { isBidirectional: true, isGpio: true },
          pin44: { isBidirectional: true, isGpio: true },
          pin45: { isBidirectional: true, isGpio: true },
          pin46: { isBidirectional: true, isGpio: true },
          pin47: { isBidirectional: true, isGpio: true },
          pin48: { isBidirectional: true, isGpio: true },
          pin49: { isBidirectional: true, isGpio: true },
          pin50: { isBidirectional: true, isGpio: true },
          pin51: { isBidirectional: true, isGpio: true },
          pin52: { isBidirectional: true, isGpio: true },
          pin53: { isBidirectional: true, isGpio: true },
          pin54: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin55: { requiresGround: true },
          pin56: {
            providesPower: true,
            providesVoltage: "1.2V",
            shouldHaveDecouplingCapacitor: true,
          },
          pin57: { isBidirectional: true, isGpio: true },
          pin58: { isBidirectional: true, isGpio: true },
          pin59: { isBidirectional: true, isGpio: true },
          pin60: { isBidirectional: true, isGpio: true },
          pin61: { isBidirectional: true, isGpio: true },
          pin62: { isBidirectional: true, isGpio: true },
          pin63: { isBidirectional: true, isGpio: true },
          pin64: { isBidirectional: true, isGpio: true },
        }}
        manufacturerPartNumber="TM4C123GH6PMTR"
      />
      <crystal
        name="Y1"
        schX={-0.09995}
        schY={crystalSchY}
        frequency="16MHz"
        loadCapacitance="8pF"
        pinVariant="four_pin"
        manufacturerPartNumber="NX3225GA-16.000M-STD-CRG-1"
      />
      <capacitor
        name="C42"
        schX={0.10004}
        schY={6.09729}
        capacitance="10pF"
        schRotation={180}
        manufacturerPartNumber="C0402C100K4GACTU"
      />
      <capacitor
        name="C41"
        schX={0.10004}
        schY={9.69725}
        capacitance="10pF"
        schRotation={180}
        manufacturerPartNumber="C0402C100K4GACTU"
      />
      <trace from="Y1.pin4" to="net.GND" />
      <trace from="Y1.pin2" to="net.GND" />
      <trace from="C42.pin2" to="net.GND" />
      <trace from="C41.pin2" to="net.GND" />
      <trace from="U7.pin40" to="Y1.pin3" />
      <trace from="U7.pin40" to="C41.pin1" />
      <trace from="U7.pin41" to="Y1.pin1" />
      <trace from="U7.pin41" to="C42.pin1" />
      <trace from="U7.pin32" to="net.GND" />
      <trace from="U7.pin2" to="net.TIVA_P3V3" />
      <trace from="U7.pin11" to="net.TIVA_P3V3" />
      <trace from="U7.pin26" to="net.TIVA_P3V3" />
      <trace from="U7.pin37" to="net.TIVA_P3V3" />
      <trace from="U7.pin42" to="net.TIVA_P3V3" />
      <trace from="U7.pin54" to="net.TIVA_P3V3" />
      <trace from="U7.pin3" to="net.GND" />
      <trace from="U7.pin12" to="net.GND" />
      <trace from="U7.pin27" to="net.GND" />
      <trace from="U7.pin35" to="net.GND" />
      <trace from="U7.pin39" to="net.GND" />
      <trace from="U7.pin55" to="net.GND" />
      <trace from="U7.pin34" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
