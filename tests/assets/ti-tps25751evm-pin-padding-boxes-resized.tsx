import { Circuit } from "@tscircuit/core"

// TPS25751EVM, SLVUCP9B figures 5-2, 5-4 and 5-7: the eight boxes whose pin
// rows are spaced by schPinStyle margins rather than schPinSpacing. Box sizes,
// pin arrangements and pin styles are copied unchanged from the transcription
// in tscircuit/checks#578; only schematic positions are moved into a grid.
// J2, J3, J4, J5 and U5 use the widths GenericSchematicBoxTooWide suggests
// for the original boxes (3.1, 3.1, 3.1, 1.955 and 1.77).
export async function createTiTps25751EvmPinPaddingBoxesResized() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "none" }} routingDisabled>
      <chip
        name="J2"
        schX={0}
        schY={0}
        pinLabels={{
          pin1: ["A1_GND", "A1", "GND"],
          pin2: ["A2_SSTXp1", "A2", "SSTXp1"],
          pin3: ["A3_SSTXn1", "A3", "SSTXn1"],
          pin4: ["A4_VBUS", "A4", "VBUS"],
          pin5: ["A5_CC1", "A5", "CC1"],
          pin6: ["A6_Dp1", "A6", "Dp1"],
          pin7: ["A7_Dn1", "A7", "Dn1"],
          pin8: ["A8_SBU1", "A8", "SBU1"],
          pin9: ["A9_VBUS", "A9", "VBUS"],
          pin10: ["A10_SSRXn2", "A10", "SSRXn2"],
          pin11: ["A11_SSRXp2", "A11", "SSRXp2"],
          pin12: ["B12_GND", "B12", "GND"],
          pin13: ["B11_SSRXp1", "B11", "SSRXp1"],
          pin14: ["B10_SSRXn1", "B10", "SSRXn1"],
          pin15: ["B9_VBUS", "B9", "VBUS"],
          pin16: ["B8_SBU2", "B8", "SBU2"],
          pin17: ["B5_CC2", "B5", "CC2"],
          pin18: ["B4_VBUS", "B4", "VBUS"],
          pin19: ["B3_SSTXn2", "B3", "SSTXn2"],
          pin20: ["B2_SSTXp2", "B2", "SSTXp2"],
          pin21: ["B1_GND", "B1", "GND"],
          pin22: ["A12_GND", "A12", "GND"],
          pin23: ["S1_SHIELD", "S1", "SHIELD"],
          pin24: ["S2_SHIELD", "S2", "SHIELD"],
          pin25: ["S3_SHIELD", "S3", "SHIELD"],
          pin26: ["S4_SHIELD", "S4", "SHIELD"],
          pin27: ["B6_Dp2", "B6", "Dp2"],
          pin28: ["B7_Dn2", "B7", "Dn2"],
        }}
        schPinArrangement={{
          leftSide: {
            pins: [
              "pin1",
              "pin2",
              "pin3",
              "pin4",
              "pin5",
              "pin6",
              "pin7",
              "pin8",
              "pin9",
              "pin10",
              "pin11",
              "pin22",
              "pin23",
              "pin24",
            ],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: [
              "pin26",
              "pin25",
              "pin21",
              "pin20",
              "pin19",
              "pin18",
              "pin17",
              "pin27",
              "pin28",
              "pin16",
              "pin15",
              "pin14",
              "pin13",
              "pin12",
            ],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin1: { topMargin: 0 },
          pin2: { topMargin: 0.20024 },
          pin3: { topMargin: 0.20017 },
          pin4: { topMargin: 0.20024 },
          pin5: { topMargin: 0.20024 },
          pin6: { topMargin: 0.20017 },
          pin7: { topMargin: 0.20023 },
          pin8: { topMargin: 0.20024 },
          pin9: { topMargin: 0.20017 },
          pin10: { topMargin: 0.20024 },
          pin11: { topMargin: 0.20017 },
          pin22: { topMargin: 0.20024 },
          pin23: { topMargin: 0.60041 },
          pin24: { topMargin: 0.20024, bottomMargin: 0 },
          pin26: { bottomMargin: 0 },
          pin25: { bottomMargin: 0.20024 },
          pin21: { bottomMargin: 0.60041 },
          pin20: { bottomMargin: 0.20024 },
          pin19: { bottomMargin: 0.20017 },
          pin18: { bottomMargin: 0.20024 },
          pin17: { bottomMargin: 0.20017 },
          pin27: { bottomMargin: 0.20024 },
          pin28: { bottomMargin: 0.20023 },
          pin16: { bottomMargin: 0.20017 },
          pin15: { bottomMargin: 0.20024 },
          pin14: { bottomMargin: 0.20024 },
          pin13: { bottomMargin: 0.20017 },
          pin12: { bottomMargin: 0.20024, topMargin: 0 },
        }}
        schWidth={3.1}
        schHeight={6.40334}
        pinAttributes={{
          pin1: { isPassive: true },
          pin2: { isPassive: true },
          pin3: { isPassive: true },
          pin4: { isPassive: true },
          pin5: { isPassive: true },
          pin6: { isPassive: true },
          pin7: { isPassive: true },
          pin8: { isPassive: true },
          pin9: { isPassive: true },
          pin10: { isPassive: true },
          pin11: { isPassive: true },
          pin12: { isPassive: true },
          pin13: { isPassive: true },
          pin14: { isPassive: true },
          pin15: { isPassive: true },
          pin16: { isPassive: true },
          pin17: { isPassive: true },
          pin18: { isPassive: true },
          pin19: { isPassive: true },
          pin20: { isPassive: true },
          pin21: { isPassive: true },
          pin22: { isPassive: true },
          pin23: { isPassive: true },
          pin24: { isPassive: true },
          pin25: { isPassive: true },
          pin26: { isPassive: true },
          pin27: { isPassive: true },
          pin28: { isPassive: true },
        }}
        manufacturerPartNumber="DX07S024JJ2R1300"
      />
      <chip
        name="J3"
        schX={9}
        schY={0}
        pinLabels={{
          pin1: ["A1_GND", "A1", "GND"],
          pin2: ["A2_SSTXp1", "A2", "SSTXp1"],
          pin3: ["A3_SSTXn1", "A3", "SSTXn1"],
          pin4: ["A4_VBUS", "A4", "VBUS"],
          pin5: ["A5_CC1", "A5", "CC1"],
          pin6: ["A6_Dp1", "A6", "Dp1"],
          pin7: ["A7_Dn1", "A7", "Dn1"],
          pin8: ["A8_SBU1", "A8", "SBU1"],
          pin9: ["A9_VBUS", "A9", "VBUS"],
          pin10: ["A10_SSRXn2", "A10", "SSRXn2"],
          pin11: ["A11_SSRXp2", "A11", "SSRXp2"],
          pin12: ["B12_GND", "B12", "GND"],
          pin13: ["B11_SSRXp1", "B11", "SSRXp1"],
          pin14: ["B10_SSRXn1", "B10", "SSRXn1"],
          pin15: ["B9_VBUS", "B9", "VBUS"],
          pin16: ["B8_SBU2", "B8", "SBU2"],
          pin17: ["B5_CC2", "B5", "CC2"],
          pin18: ["B4_VBUS", "B4", "VBUS"],
          pin19: ["B3_SSTXn2", "B3", "SSTXn2"],
          pin20: ["B2_SSTXp2", "B2", "SSTXp2"],
          pin21: ["B1_GND", "B1", "GND"],
          pin22: ["A12_GND", "A12", "GND"],
          pin23: ["S1_SHIELD", "S1", "SHIELD"],
          pin24: ["S2_SHIELD", "S2", "SHIELD"],
          pin25: ["S3_SHIELD", "S3", "SHIELD"],
          pin26: ["S4_SHIELD", "S4", "SHIELD"],
          pin27: ["B6_Dp2", "B6", "Dp2"],
          pin28: ["B7_Dn2", "B7", "Dn2"],
        }}
        schPinArrangement={{
          leftSide: {
            pins: [
              "pin1",
              "pin2",
              "pin3",
              "pin4",
              "pin5",
              "pin6",
              "pin7",
              "pin8",
              "pin9",
              "pin10",
              "pin11",
              "pin22",
              "pin23",
              "pin24",
            ],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: [
              "pin26",
              "pin25",
              "pin21",
              "pin20",
              "pin19",
              "pin18",
              "pin17",
              "pin27",
              "pin28",
              "pin16",
              "pin15",
              "pin14",
              "pin13",
              "pin12",
            ],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin1: { topMargin: 0 },
          pin2: { topMargin: 0.20024 },
          pin3: { topMargin: 0.20017 },
          pin4: { topMargin: 0.20024 },
          pin5: { topMargin: 0.20024 },
          pin6: { topMargin: 0.20017 },
          pin7: { topMargin: 0.20023 },
          pin8: { topMargin: 0.20024 },
          pin9: { topMargin: 0.20017 },
          pin10: { topMargin: 0.20024 },
          pin11: { topMargin: 0.20017 },
          pin22: { topMargin: 0.20024 },
          pin23: { topMargin: 0.60041 },
          pin24: { topMargin: 0.20024, bottomMargin: 0 },
          pin26: { bottomMargin: 0 },
          pin25: { bottomMargin: 0.20024 },
          pin21: { bottomMargin: 0.60041 },
          pin20: { bottomMargin: 0.20024 },
          pin19: { bottomMargin: 0.20017 },
          pin18: { bottomMargin: 0.20024 },
          pin17: { bottomMargin: 0.20017 },
          pin27: { bottomMargin: 0.20024 },
          pin28: { bottomMargin: 0.20023 },
          pin16: { bottomMargin: 0.20017 },
          pin15: { bottomMargin: 0.20024 },
          pin14: { bottomMargin: 0.20024 },
          pin13: { bottomMargin: 0.20017 },
          pin12: { bottomMargin: 0.20024, topMargin: 0 },
        }}
        schWidth={3.1}
        schHeight={6.40334}
        pinAttributes={{
          pin1: { isPassive: true },
          pin2: { isPassive: true },
          pin3: { isPassive: true },
          pin4: { isPassive: true },
          pin5: { isPassive: true },
          pin6: { isPassive: true },
          pin7: { isPassive: true },
          pin8: { isPassive: true },
          pin9: { isPassive: true },
          pin10: { isPassive: true },
          pin11: { isPassive: true },
          pin12: { isPassive: true },
          pin13: { isPassive: true },
          pin14: { isPassive: true },
          pin15: { isPassive: true },
          pin16: { isPassive: true },
          pin17: { isPassive: true },
          pin18: { isPassive: true },
          pin19: { isPassive: true },
          pin20: { isPassive: true },
          pin21: { isPassive: true },
          pin22: { isPassive: true },
          pin23: { isPassive: true },
          pin24: { isPassive: true },
          pin25: { isPassive: true },
          pin26: { isPassive: true },
          pin27: { isPassive: true },
          pin28: { isPassive: true },
        }}
        manufacturerPartNumber="DX07S024JJ2R1300"
      />
      <chip
        name="J4"
        schX={18}
        schY={0}
        pinLabels={{
          pin1: ["A1_GND", "A1", "GND"],
          pin2: ["A2_SSTXp1", "A2", "SSTXp1"],
          pin3: ["A3_SSTXn1", "A3", "SSTXn1"],
          pin4: ["A4_VBUS", "A4", "VBUS"],
          pin5: ["A5_CC1", "A5", "CC1"],
          pin6: ["A6_Dp1", "A6", "Dp1"],
          pin7: ["A7_Dn1", "A7", "Dn1"],
          pin8: ["A8_SBU1", "A8", "SBU1"],
          pin9: ["A9_VBUS", "A9", "VBUS"],
          pin10: ["A10_SSRXn2", "A10", "SSRXn2"],
          pin11: ["A11_SSRXp2", "A11", "SSRXp2"],
          pin12: ["B12_GND", "B12", "GND"],
          pin13: ["B11_SSRXp1", "B11", "SSRXp1"],
          pin14: ["B10_SSRXn1", "B10", "SSRXn1"],
          pin15: ["B9_VBUS", "B9", "VBUS"],
          pin16: ["B8_SBU2", "B8", "SBU2"],
          pin17: ["B5_CC2", "B5", "CC2"],
          pin18: ["B4_VBUS", "B4", "VBUS"],
          pin19: ["B3_SSTXn2", "B3", "SSTXn2"],
          pin20: ["B2_SSTXp2", "B2", "SSTXp2"],
          pin21: ["B1_GND", "B1", "GND"],
          pin22: ["A12_GND", "A12", "GND"],
          pin23: ["S1_SHIELD", "S1", "SHIELD"],
          pin24: ["S2_SHIELD", "S2", "SHIELD"],
          pin25: ["S3_SHIELD", "S3", "SHIELD"],
          pin26: ["S4_SHIELD", "S4", "SHIELD"],
          pin27: ["B6_Dp2", "B6", "Dp2"],
          pin28: ["B7_Dn2", "B7", "Dn2"],
        }}
        schPinArrangement={{
          leftSide: {
            pins: [
              "pin1",
              "pin2",
              "pin3",
              "pin4",
              "pin5",
              "pin6",
              "pin7",
              "pin8",
              "pin9",
              "pin10",
              "pin11",
              "pin22",
              "pin23",
              "pin24",
            ],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: [
              "pin26",
              "pin25",
              "pin21",
              "pin20",
              "pin19",
              "pin18",
              "pin17",
              "pin27",
              "pin28",
              "pin16",
              "pin15",
              "pin14",
              "pin13",
              "pin12",
            ],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin1: { topMargin: 0 },
          pin2: { topMargin: 0.20024 },
          pin3: { topMargin: 0.20017 },
          pin4: { topMargin: 0.20024 },
          pin5: { topMargin: 0.20024 },
          pin6: { topMargin: 0.20017 },
          pin7: { topMargin: 0.20023 },
          pin8: { topMargin: 0.20024 },
          pin9: { topMargin: 0.20017 },
          pin10: { topMargin: 0.20024 },
          pin11: { topMargin: 0.20017 },
          pin22: { topMargin: 0.20024 },
          pin23: { topMargin: 0.60041 },
          pin24: { topMargin: 0.20024, bottomMargin: 0 },
          pin26: { bottomMargin: 0 },
          pin25: { bottomMargin: 0.20024 },
          pin21: { bottomMargin: 0.60041 },
          pin20: { bottomMargin: 0.20024 },
          pin19: { bottomMargin: 0.20017 },
          pin18: { bottomMargin: 0.20024 },
          pin17: { bottomMargin: 0.20017 },
          pin27: { bottomMargin: 0.20024 },
          pin28: { bottomMargin: 0.20023 },
          pin16: { bottomMargin: 0.20017 },
          pin15: { bottomMargin: 0.20024 },
          pin14: { bottomMargin: 0.20024 },
          pin13: { bottomMargin: 0.20017 },
          pin12: { bottomMargin: 0.20024, topMargin: 0 },
        }}
        schWidth={3.1}
        schHeight={6.40334}
        pinAttributes={{
          pin1: { isPassive: true },
          pin2: { isPassive: true },
          pin3: { isPassive: true },
          pin4: { isPassive: true },
          pin5: { isPassive: true },
          pin6: { isPassive: true },
          pin7: { isPassive: true },
          pin8: { isPassive: true },
          pin9: { isPassive: true },
          pin10: { isPassive: true },
          pin11: { isPassive: true },
          pin12: { isPassive: true },
          pin13: { isPassive: true },
          pin14: { isPassive: true },
          pin15: { isPassive: true },
          pin16: { isPassive: true },
          pin17: { isPassive: true },
          pin18: { isPassive: true },
          pin19: { isPassive: true },
          pin20: { isPassive: true },
          pin21: { isPassive: true },
          pin22: { isPassive: true },
          pin23: { isPassive: true },
          pin24: { isPassive: true },
          pin25: { isPassive: true },
          pin26: { isPassive: true },
          pin27: { isPassive: true },
          pin28: { isPassive: true },
        }}
        manufacturerPartNumber="DX07S024JJ2R1300"
      />
      <connector
        name="J5"
        schX={0}
        schY={-9}
        pinLabels={{
          pin1: "BAT",
          pin2: "GND",
          pin3: "GND",
          pin4: "VAC",
          pin5: "VAC",
          pin6: ["MNT_1_GND", "MNT_1", "GND"],
          pin7: ["MNT_2_GND", "MNT_2", "GND"],
        }}
        schPinArrangement={{
          rightSide: {
            pins: ["pin7", "pin6", "pin5", "pin4", "pin3", "pin2", "pin1"],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin7: { bottomMargin: 6e-5 },
          pin6: { bottomMargin: 0.60041 },
          pin5: { bottomMargin: 1.00065 },
          pin4: { bottomMargin: 0.60041 },
          pin3: { bottomMargin: 0.60041 },
          pin2: { bottomMargin: 0.60041 },
          pin1: { bottomMargin: 0.60041, topMargin: 0 },
        }}
        schWidth={1.955}
        schHeight={6.80358}
        pinAttributes={{
          pin1: { isPassive: true },
          pin2: { isPassive: true },
          pin3: { isPassive: true },
          pin4: { isPassive: true },
          pin5: { isPassive: true },
          pin6: { isPassive: true },
          pin7: { isPassive: true },
        }}
        manufacturerPartNumber="209159005101916"
      />
      <connector
        name="J6"
        schX={26}
        schY={0}
        pinLabels={{
          pin1: "GND",
          pin2: "GND",
          pin3: "I2Cc_SCL",
          pin4: "A_GPIO0",
          pin5: "I2Cc_SDA",
          pin6: "A_GPIO1",
          pin7: "I2Cc_IRQ",
          pin8: "A_GPIO2",
          pin9: "751_CC2",
          pin10: "A_GPIO3",
          pin11: "751_CC1",
          pin12: "A_GPIO4",
          pin13: "GND",
          pin14: "A_GPIO5",
          pin15: "I2Ct_SCL",
          pin17: "I2Ct_SDA",
          pin19: "I2Ct_IRQ",
          pin21: "GND",
          pin23: "VBUS_DIV2",
          pin25: "GND",
          pin27: "P3V3",
          pin29: "GND",
          pin16: "A_GPIO6",
          pin18: "A_GPIO7",
          pin20: "A_GPIO11",
          pin22: "NC",
          pin24: "PPHV_DIV2",
          pin26: "NC",
          pin28: "PP5V",
          pin30: "GND",
        }}
        schPinArrangement={{
          leftSide: {
            pins: [
              "pin1",
              "pin3",
              "pin5",
              "pin7",
              "pin9",
              "pin11",
              "pin13",
              "pin15",
              "pin17",
              "pin19",
              "pin21",
              "pin23",
              "pin25",
              "pin27",
              "pin29",
            ],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: [
              "pin30",
              "pin28",
              "pin26",
              "pin24",
              "pin22",
              "pin20",
              "pin18",
              "pin16",
              "pin14",
              "pin12",
              "pin10",
              "pin8",
              "pin6",
              "pin4",
              "pin2",
            ],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin1: { topMargin: 1e-5 },
          pin3: { topMargin: 0.20017 },
          pin5: { topMargin: 0.20024 },
          pin7: { topMargin: 0.20023 },
          pin9: { topMargin: 0.20017 },
          pin11: { topMargin: 0.20024 },
          pin13: { topMargin: 0.20017 },
          pin15: { topMargin: 0.20024 },
          pin17: { topMargin: 0.20024 },
          pin19: { topMargin: 0.20017 },
          pin21: { topMargin: 0.20024 },
          pin23: { topMargin: 0.20017 },
          pin25: { topMargin: 0.20024 },
          pin27: { topMargin: 0.20023 },
          pin29: { topMargin: 0.20018, bottomMargin: 0 },
          pin30: { bottomMargin: 0 },
          pin28: { bottomMargin: 0.20018 },
          pin26: { bottomMargin: 0.20023 },
          pin24: { bottomMargin: 0.20024 },
          pin22: { bottomMargin: 0.20017 },
          pin20: { bottomMargin: 0.20024 },
          pin18: { bottomMargin: 0.20017 },
          pin16: { bottomMargin: 0.20024 },
          pin14: { bottomMargin: 0.20024 },
          pin12: { bottomMargin: 0.20017 },
          pin10: { bottomMargin: 0.20024 },
          pin8: { bottomMargin: 0.20017 },
          pin6: { bottomMargin: 0.20023 },
          pin4: { bottomMargin: 0.20024 },
          pin2: { bottomMargin: 0.20017, topMargin: 1e-5 },
        }}
        schWidth={2.51}
        schHeight={6.4034}
        pinAttributes={{
          pin1: { isPassive: true },
          pin2: { isPassive: true },
          pin3: { isPassive: true },
          pin4: { isPassive: true },
          pin5: { isPassive: true },
          pin6: { isPassive: true },
          pin7: { isPassive: true },
          pin8: { isPassive: true },
          pin9: { isPassive: true },
          pin10: { isPassive: true },
          pin11: { isPassive: true },
          pin12: { isPassive: true },
          pin13: { isPassive: true },
          pin14: { isPassive: true },
          pin15: { isPassive: true },
          pin17: { isPassive: true },
          pin19: { isPassive: true },
          pin21: { isPassive: true },
          pin23: { isPassive: true },
          pin25: { isPassive: true },
          pin27: { isPassive: true },
          pin29: { isPassive: true },
          pin16: { isPassive: true },
          pin18: { isPassive: true },
          pin20: { isPassive: true },
          pin22: { isPassive: true },
          pin24: { isPassive: true },
          pin26: { isPassive: true },
          pin28: { isPassive: true },
          pin30: { isPassive: true },
        }}
        manufacturerPartNumber="TSW-115-08L-D"
      />
      <connector
        name="J7"
        schX={6}
        schY={-9}
        pinLabels={{
          pin1: "PP5V",
          pin2: "GND",
          pin3: "GND",
          pin4: "I2Cc_SCL",
          pin5: "NC",
          pin6: "I2Cc_SDA",
          pin7: "LDO_3V3",
          pin8: "NC",
        }}
        schPinArrangement={{
          leftSide: {
            pins: ["pin2", "pin4", "pin6", "pin8"],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: ["pin7", "pin5", "pin3", "pin1"],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin2: { topMargin: 0 },
          pin4: { topMargin: 0.20024 },
          pin6: { topMargin: 0.20017 },
          pin8: { topMargin: 0.20024, bottomMargin: 7e-5 },
          pin7: { bottomMargin: 7e-5 },
          pin5: { bottomMargin: 0.20024 },
          pin3: { bottomMargin: 0.20017 },
          pin1: { bottomMargin: 0.20024, topMargin: 0 },
        }}
        schWidth={2.4001}
        schHeight={2.00106}
        pinAttributes={{
          pin1: { isPassive: true },
          pin2: { isPassive: true },
          pin3: { isPassive: true },
          pin4: { isPassive: true },
          pin5: { isPassive: true },
          pin6: { isPassive: true },
          pin7: { isPassive: true },
          pin8: { isPassive: true },
        }}
        manufacturerPartNumber="TSW-104-07G-D"
      />
      <connector
        name="J11"
        schX={11}
        schY={-9}
        pinLabels={{
          pin4: "ICD_TDO",
          pin1: "ICD_TCK",
          pin2: "ICD_TMS",
          pin3: "ICD_TDI",
        }}
        schPinArrangement={{
          leftSide: {
            pins: ["pin1", "pin2", "pin3", "pin4"],
            direction: "top-to-bottom",
          },
        }}
        schPinStyle={{
          pin1: { topMargin: 0 },
          pin2: { topMargin: 0.20019 },
          pin3: { topMargin: 0.20012 },
          pin4: { topMargin: 0.20019, bottomMargin: 0 },
        }}
        schWidth={1.215}
        schHeight={2.00086}
        pinAttributes={{
          pin4: { isPassive: true },
          pin1: { isPassive: true },
          pin2: { isPassive: true },
          pin3: { isPassive: true },
        }}
        manufacturerPartNumber="350-10-104-00-006000"
      />
      <chip
        name="U5"
        schX={16}
        schY={-9}
        pinLabels={{
          pin1: "A0",
          pin2: "A1",
          pin3: "A2",
          pin4: "VSS",
          pin5: "SDA",
          pin6: "SCL",
          pin7: "WP",
          pin8: "VCC",
        }}
        schPinArrangement={{
          leftSide: {
            pins: ["pin1", "pin2", "pin3", "pin4"],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: ["pin5", "pin6", "pin7", "pin8"],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin1: { topMargin: 0 },
          pin2: { topMargin: 0.60025 },
          pin3: { topMargin: 0.60031 },
          pin4: { topMargin: 0.60032, bottomMargin: 0 },
          pin5: { bottomMargin: 0 },
          pin6: { bottomMargin: 0.60032 },
          pin7: { bottomMargin: 0.60031 },
          pin8: { bottomMargin: 0.60025, topMargin: 0 },
        }}
        schWidth={1.77}
        schHeight={3.20119}
        pinAttributes={{
          pin1: { isInput: true },
          pin2: { isInput: true },
          pin3: { isInput: true },
          pin4: { requiresGround: true },
          pin5: {
            isBidirectional: true,
            canUseOpenDrain: true,
            isUsingOpenDrain: true,
            capabilities: ["i2c_sda"],
          },
          pin6: { isInput: true, capabilities: ["i2c_scl"] },
          pin7: { isInput: true },
          pin8: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
        }}
        manufacturerPartNumber="CAT24C256WI-GT3"
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
