import type { ChipProps } from "@tscircuit/props"

// Resolved schematic props from the BLDC board, 5 October 2026.
// circuit/schematic-layout.json, circuit/helpers.tsx and imports/*.tsx.
// PCB footprints and surrounding nets are omitted: these tests exercise symbol geometry.
export const components = {
  U1: {
    name: "U1",
    manufacturerPartNumber: "STUSB4500QTR",
    pinLabels: {
      pin1: "CC1DB",
      pin2: "CC1",
      pin3: "NC",
      pin4: "CC2",
      pin5: "CC2DB",
      pin6: "RESET",
      pin7: "SCL",
      pin8: "SDA",
      pin9: "DISCH",
      pin10: "GND",
      pin11: "ATTACH",
      pin12: "ADDR0",
      pin13: "ADDR1",
      pin14: "POWER_OK3",
      pin15: "GPIO",
      pin16: "VBUS_EN_SNK",
      pin17: "A_B_SIDE",
      pin18: "VBUS_VS_DISCH",
      pin19: "ALERT",
      pin20: "POWER_OK2",
      pin21: "VREG_1V2",
      pin22: "VSYS",
      pin23: "VREG_2V7",
      pin24: "VDD",
      pin25: "EP",
    },
    schX: -5,
    schY: 0,
    schWidth: 3.48,
    schHeight: 5.43,
    schPinArrangement: {
      leftSide: {
        pins: [18, 1, 2, 4, 5],
        direction: "top-to-bottom",
      },
      rightSide: {
        pins: [16, 9, 15, 20, 14, 17, 11, 7, 8, 19, 6],
        direction: "top-to-bottom",
      },
      topSide: {
        pins: [23, 21, 3, 24],
        direction: "left-to-right",
      },
      bottomSide: {
        pins: [10, 25, 12, 13, 22],
        direction: "left-to-right",
      },
    },
    schPinSpacing: 0.4,
    schPinStyle: {
      pin1: {
        marginTop: 0.2,
      },
      pin2: {
        marginTop: 0.2,
      },
      pin4: {
        marginTop: 0.2,
      },
      pin5: {
        marginTop: 0.2,
      },
      pin9: {
        marginTop: 0.2,
      },
      pin15: {
        marginTop: 0.2,
      },
      pin20: {
        marginTop: 0.2,
      },
      pin14: {
        marginTop: 0.2,
      },
      pin17: {
        marginTop: 0.2,
      },
      pin11: {
        marginTop: 0.2,
      },
      pin7: {
        marginTop: 0.2,
      },
      pin8: {
        marginTop: 0.2,
      },
      pin19: {
        marginTop: 0.2,
      },
      pin6: {
        marginTop: 0.2,
      },
      pin21: {
        marginLeft: 0.2,
      },
      pin3: {
        marginLeft: 0.2,
      },
      pin24: {
        marginLeft: 0.2,
      },
      pin25: {
        marginLeft: 0.2,
      },
      pin12: {
        marginLeft: 0.2,
      },
      pin13: {
        marginLeft: 0.2,
      },
      pin22: {
        marginLeft: 0.2,
      },
    },
  },
  U3: {
    name: "U3",
    manufacturerPartNumber: "AP63203WU-7",
    pinLabels: {
      pin1: "FB",
      pin2: "EN",
      pin3: "VIN",
      pin4: "GND",
      pin5: "SW",
      pin6: "BST",
    },
    schX: -3,
    schY: 1,
    schWidth: 1.77,
    schHeight: 1.6,
    schPinArrangement: {
      leftSide: {
        pins: [3, 2],
        direction: "top-to-bottom",
      },
      rightSide: {
        pins: [6, 5, 1],
        direction: "top-to-bottom",
      },
      bottomSide: {
        pins: [4],
        direction: "left-to-right",
      },
    },
    schPinSpacing: 0.6,
    schPinStyle: {
      pin2: {
        marginTop: 0.39999999999999997,
      },
      pin5: {
        marginTop: 0.39999999999999997,
      },
      pin1: {
        marginTop: 0.39999999999999997,
      },
    },
  },
  U5: {
    name: "U5",
    manufacturerPartNumber: "RP2040",
    pinLabels: {
      pin1: "IOVDD6",
      pin2: "GPIO0",
      pin3: "GPIO1",
      pin4: "GPIO2",
      pin5: "GPIO3",
      pin6: "GPIO4",
      pin7: "GPIO5",
      pin8: "GPIO6",
      pin9: "GPIO7",
      pin10: "IOVDD5",
      pin11: "GPIO8",
      pin12: "GPIO9",
      pin13: "GPIO10",
      pin14: "GPIO11",
      pin15: "GPIO12",
      pin16: "GPIO13",
      pin17: "GPIO14",
      pin18: "GPIO15",
      pin19: "TESTEN",
      pin20: "XIN",
      pin21: "XOUT",
      pin22: "IOVDD4",
      pin23: "DVDD2",
      pin24: "SWCLK",
      pin25: "SWD",
      pin26: "RUN",
      pin27: "GPIO16",
      pin28: "GPIO17",
      pin29: "GPIO18",
      pin30: "GPIO19",
      pin31: "GPIO20",
      pin32: "GPIO21",
      pin33: "IOVDD3",
      pin34: "GPIO22",
      pin35: "GPIO23",
      pin36: "GPIO24",
      pin37: "GPIO25",
      pin38: "GPIO26_ADC0",
      pin39: "GPIO27_ADC1",
      pin40: "GPIO28_ADC2",
      pin41: "GPIO29_ADC3",
      pin42: "IOVDD2",
      pin43: "ADC_AVDD",
      pin44: "VREG_IN",
      pin45: "VREG_VOUT",
      pin46: "USB_DM",
      pin47: "USB_DP",
      pin48: "USB_VDD",
      pin49: "IOVDD1",
      pin50: "DVDD1",
      pin51: "QSPI_SD3",
      pin52: "QSPI_SCLK",
      pin53: "QSPI_SD0",
      pin54: "QSPI_SD2",
      pin55: "QSPI_SD1",
      pin56: "QSPI_SS",
      pin57: "GND",
    },
    schX: 1,
    schY: -1,
    schWidth: 3.06,
    schHeight: 11.2,
    schPinArrangement: {
      leftSide: {
        pins: [56, 52, 53, 55, 54, 51, 47, 46, 20, 21, 26, 24, 25, 44, 45, 43],
        direction: "top-to-bottom",
      },
      rightSide: {
        pins: [
          2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 27, 28, 29,
          30, 31, 32, 34, 35, 36, 37, 38, 39, 40, 41,
        ],
        direction: "top-to-bottom",
      },
      topSide: {
        pins: [1, 10, 22, 33, 42, 49, 48],
        direction: "left-to-right",
      },
      bottomSide: {
        pins: [19, 57, 23, 50],
        direction: "left-to-right",
      },
    },
    schPinSpacing: 0.28,
    schPinStyle: {
      pin52: {
        marginTop: 0.12,
      },
      pin53: {
        marginTop: 0.12,
      },
      pin55: {
        marginTop: 0.12,
      },
      pin54: {
        marginTop: 0.12,
      },
      pin51: {
        marginTop: 0.12,
      },
      pin47: {
        marginTop: 0.4,
      },
      pin46: {
        marginTop: 0.12,
      },
      pin20: {
        marginTop: 0.4,
      },
      pin21: {
        marginTop: 0.12,
      },
      pin26: {
        marginTop: 0.4,
      },
      pin24: {
        marginTop: 0.12,
      },
      pin25: {
        marginTop: 0.12,
      },
      pin44: {
        marginTop: 0.4,
      },
      pin45: {
        marginTop: 0.12,
      },
      pin43: {
        marginTop: 0.4,
      },
      pin3: {
        marginTop: 0.12,
      },
      pin4: {
        marginTop: 0.12,
      },
      pin5: {
        marginTop: 0.12,
      },
      pin6: {
        marginTop: 0.12,
      },
      pin7: {
        marginTop: 0.12,
      },
      pin8: {
        marginTop: 0.12,
      },
      pin9: {
        marginTop: 0.12,
      },
      pin11: {
        marginTop: 0.12,
      },
      pin12: {
        marginTop: 0.12,
      },
      pin13: {
        marginTop: 0.12,
      },
      pin14: {
        marginTop: 0.12,
      },
      pin15: {
        marginTop: 0.12,
      },
      pin16: {
        marginTop: 0.12,
      },
      pin17: {
        marginTop: 0.12,
      },
      pin18: {
        marginTop: 0.12,
      },
      pin27: {
        marginTop: 0.12,
      },
      pin28: {
        marginTop: 0.12,
      },
      pin29: {
        marginTop: 0.12,
      },
      pin30: {
        marginTop: 0.12,
      },
      pin31: {
        marginTop: 0.12,
      },
      pin32: {
        marginTop: 0.12,
      },
      pin34: {
        marginTop: 0.12,
      },
      pin35: {
        marginTop: 0.12,
      },
      pin36: {
        marginTop: 0.12,
      },
      pin37: {
        marginTop: 0.12,
      },
      pin38: {
        marginTop: 0.12,
      },
      pin39: {
        marginTop: 0.12,
      },
      pin40: {
        marginTop: 0.12,
      },
      pin41: {
        marginTop: 0.12,
      },
      pin10: {
        marginLeft: 0.12,
      },
      pin22: {
        marginLeft: 0.12,
      },
      pin33: {
        marginLeft: 0.12,
      },
      pin42: {
        marginLeft: 0.12,
      },
      pin49: {
        marginLeft: 0.12,
      },
      pin48: {
        marginLeft: 0.12,
      },
      pin57: {
        marginLeft: 0.12,
      },
      pin23: {
        marginLeft: 0.12,
      },
      pin50: {
        marginLeft: 0.12,
      },
    },
  },
  U7: {
    name: "U7",
    manufacturerPartNumber: "MCT8329A1IREER",
    pinLabels: {
      pin1: "DGND",
      pin2: "VREG",
      pin3: "GCTRL",
      pin4: "GND",
      pin5: "PVDD",
      pin6: "CPL",
      pin7: "CPH",
      pin8: "GVDD",
      pin9: "BSTA",
      pin10: "SHA",
      pin11: "GHA",
      pin12: "GLA",
      pin13: "BSTB",
      pin14: "SHB",
      pin15: "GHB",
      pin16: "GLB",
      pin17: "BSTC",
      pin18: "SHC",
      pin19: "GHC",
      pin20: "GLC",
      pin21: "LSS",
      pin22: "SP",
      pin23: "SN",
      pin24: "DRVOFF",
      pin25: "AGND",
      pin26: "AVDD",
      pin27: "pin27",
      pin28: "FG",
      pin29: "SDA",
      pin30: "SCL",
      pin31: "DIR",
      pin32: "EXT_CLK",
      pin33: "pin33",
      pin34: "BRAKE",
      pin35: "nFAULT",
      pin36: "DVDD",
      pin37: "PAD",
    },
    schX: 0,
    schY: 4,
    schWidth: 2.24,
    schHeight: 7.4,
    schPinArrangement: {
      leftSide: {
        pins: [26, 36, 8, 5, 2, 27, 33, 32, 34, 24, 31, 35, 28, 3, 30, 29],
        direction: "top-to-bottom",
      },
      rightSide: {
        pins: [7, 6, 22, 12, 11, 10, 9, 16, 15, 14, 13, 20, 19, 18, 17, 21],
        direction: "top-to-bottom",
      },
      bottomSide: {
        pins: [1, 4, 25, 37, 23],
        direction: "left-to-right",
      },
    },
    schPinSpacing: 0.4,
    schPinStyle: {
      pin36: {
        marginTop: 0.2,
      },
      pin8: {
        marginTop: 0.2,
      },
      pin5: {
        marginTop: 0.2,
      },
      pin2: {
        marginTop: 0.2,
      },
      pin27: {
        marginTop: 0.2,
      },
      pin33: {
        marginTop: 0.2,
      },
      pin32: {
        marginTop: 0.2,
      },
      pin34: {
        marginTop: 0.2,
      },
      pin24: {
        marginTop: 0.2,
      },
      pin31: {
        marginTop: 0.2,
      },
      pin35: {
        marginTop: 0.2,
      },
      pin28: {
        marginTop: 0.2,
      },
      pin3: {
        marginTop: 0.2,
      },
      pin30: {
        marginTop: 0.2,
      },
      pin29: {
        marginTop: 0.2,
      },
      pin6: {
        marginTop: 0.4,
      },
      pin22: {
        marginTop: 0.2,
      },
      pin12: {
        marginTop: 0.2,
      },
      pin11: {
        marginTop: 0.2,
      },
      pin10: {
        marginTop: 0.2,
      },
      pin9: {
        marginTop: 0.2,
      },
      pin16: {
        marginTop: 0.2,
      },
      pin15: {
        marginTop: 0.2,
      },
      pin14: {
        marginTop: 0.2,
      },
      pin13: {
        marginTop: 0.2,
      },
      pin20: {
        marginTop: 0.2,
      },
      pin19: {
        marginTop: 0.2,
      },
      pin18: {
        marginTop: 0.2,
      },
      pin17: {
        marginTop: 0.2,
      },
      pin21: {
        marginTop: 0.2,
      },
      pin4: {
        marginLeft: 0.2,
      },
      pin25: {
        marginLeft: 0.2,
      },
      pin37: {
        marginLeft: 0.2,
      },
      pin23: {
        marginLeft: 0.2,
      },
    },
  },
  U8: {
    name: "U8",
    manufacturerPartNumber: "BQ25798RQMR",
    pinLabels: {
      pin1: "STAT",
      pin2: "VBUS1",
      pin3: "VBUS2",
      pin4: "BTST1",
      pin5: "REGN",
      pin6: "D_POS",
      pin7: "D_NEG",
      pin8: "VAC2",
      pin9: "VAC1",
      pin10: "ACDRV2",
      pin11: "ACDRV1",
      pin12: "N_QON",
      pin13: "N_CE",
      pin14: "SCL",
      pin15: "SDA",
      pin16: "TS",
      pin17: "ILIM_HIZ",
      pin18: "BATP",
      pin19: "BTST2",
      pin20: "PROG",
      pin21: "N_INT",
      pin22: "BAT2",
      pin23: "BAT1",
      pin24: "SDRV",
      pin25: "SYS",
      pin26: "SW2",
      pin27: "GND",
      pin28: "SW1",
      pin29: "PMID",
    },
    schX: -2,
    schY: 3,
    schWidth: 2.43,
    schHeight: 9.5,
    schPinArrangement: {
      leftSide: {
        pins: [2, 3, 9, 8, 4, 28, 5, 26, 19, 1, 13, 14, 15, 21],
        direction: "top-to-bottom",
      },
      rightSide: {
        pins: [29, 20, 17, 25, 22, 23, 24, 18, 16, 12, 6, 7],
        direction: "top-to-bottom",
      },
      bottomSide: {
        pins: [10, 27, 11],
        direction: "left-to-right",
      },
    },
    schPinSpacing: 0.6,
    schPinStyle: {
      pin3: {
        marginTop: 0.39999999999999997,
      },
      pin9: {
        marginTop: 0.39999999999999997,
      },
      pin8: {
        marginTop: 0.39999999999999997,
      },
      pin4: {
        marginTop: 0.39999999999999997,
      },
      pin28: {
        marginTop: 0.39999999999999997,
      },
      pin5: {
        marginTop: 0.39999999999999997,
      },
      pin26: {
        marginTop: 0.39999999999999997,
      },
      pin19: {
        marginTop: 0.39999999999999997,
      },
      pin1: {
        marginTop: 0.39999999999999997,
      },
      pin13: {
        marginTop: 0.39999999999999997,
      },
      pin14: {
        marginTop: 0.39999999999999997,
      },
      pin15: {
        marginTop: 0.39999999999999997,
      },
      pin21: {
        marginTop: 0.39999999999999997,
      },
      pin20: {
        marginTop: 0.39999999999999997,
      },
      pin17: {
        marginTop: 0.39999999999999997,
      },
      pin25: {
        marginTop: 0.39999999999999997,
      },
      pin22: {
        marginTop: 0.39999999999999997,
      },
      pin23: {
        marginTop: 0.39999999999999997,
      },
      pin24: {
        marginTop: 0.39999999999999997,
      },
      pin18: {
        marginTop: 0.39999999999999997,
      },
      pin16: {
        marginTop: 0.39999999999999997,
      },
      pin12: {
        marginTop: 0.39999999999999997,
      },
      pin6: {
        marginTop: 0.39999999999999997,
      },
      pin7: {
        marginTop: 0.39999999999999997,
      },
      pin27: {
        marginLeft: 0.39999999999999997,
      },
      pin11: {
        marginLeft: 0.39999999999999997,
      },
    },
  },
  U9: {
    name: "U9",
    manufacturerPartNumber: "BQ7791501PWR",
    pinLabels: {
      pin1: "VDD",
      pin2: "AVDD",
      pin3: "VC5",
      pin4: "VC4",
      pin5: "VC3",
      pin6: "VC2",
      pin7: "VC1",
      pin8: "VC0",
      pin9: "VSS",
      pin10: "SRP",
      pin11: "SRN",
      pin12: "DSG",
      pin13: "CHG",
      pin14: "LD",
      pin15: "LPWR",
      pin16: "CBI",
      pin17: "OCDP",
      pin18: "TS",
      pin19: "VTB",
      pin20: "CCFG",
      pin21: "CBO",
      pin22: "PRES",
      pin23: "CTRC",
      pin24: "CTRD",
    },
    schX: 0,
    schY: 4,
    schWidth: 1.95,
    schHeight: 7.6,
    schPinArrangement: {
      leftSide: {
        pins: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12],
        direction: "top-to-bottom",
      },
      rightSide: {
        pins: [22, 19, 18, 17, 21, 15, 14, 13],
        direction: "top-to-bottom",
      },
      bottomSide: {
        pins: [9, 24, 23, 20, 16],
        direction: "left-to-right",
      },
    },
    schPinSpacing: 0.4,
    schPinStyle: {
      pin6: {
        marginTop: 1,
      },
      pin7: {
        marginTop: 1,
      },
      pin8: {
        marginTop: 1,
      },
      pin2: {
        marginTop: 0.2,
      },
      pin3: {
        marginTop: 0.2,
      },
      pin4: {
        marginTop: 0.2,
      },
      pin5: {
        marginTop: 0.2,
      },
      pin10: {
        marginTop: 0.2,
      },
      pin11: {
        marginTop: 0.2,
      },
      pin19: {
        marginTop: 0.2,
      },
      pin18: {
        marginTop: 0.4,
      },
      pin17: {
        marginTop: 0.2,
      },
      pin21: {
        marginTop: 0.2,
      },
      pin15: {
        marginTop: 0.2,
      },
      pin14: {
        marginTop: 0.2,
      },
      pin12: {
        marginTop: 0.2,
      },
      pin13: {
        marginTop: 0.2,
      },
      pin24: {
        marginLeft: 0.2,
      },
      pin23: {
        marginLeft: 0.2,
      },
      pin20: {
        marginLeft: 0.2,
      },
      pin16: {
        marginLeft: 0.2,
      },
    },
  },
  J5: {
    name: "J5",
    pinLabels: {
      pin1: "V3V3",
      pin2: "GND",
      pin3: "MCT_SDA",
      pin4: "MCT_SCL",
      pin5: "MCT_DRVOFF",
    },
    schX: 12,
    schY: 7,
    schWidth: 2.05,
    schHeight: 2,
    schPinArrangement: {
      topSide: {
        pins: [1],
        direction: "left-to-right",
      },
      bottomSide: {
        pins: [2],
        direction: "left-to-right",
      },
      rightSide: {
        pins: [3, 4, 5],
        direction: "top-to-bottom",
      },
    },
    schPinStyle: {
      pin4: {
        marginTop: 0.3,
      },
      pin5: {
        marginTop: 0.3,
      },
    },
  },
} satisfies Record<string, ChipProps>
