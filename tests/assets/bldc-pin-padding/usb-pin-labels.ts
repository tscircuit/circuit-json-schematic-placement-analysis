// Pin aliases copied from circuit/usb-c-footprint.tsx in the BLDC board.
export const usbCPinLabels = {
  pin1: ["SHIELD2", "EH2", "SHELL2"],
  pin2: ["SHIELD1", "EH1", "SHELL1"],
  pin3: ["SHIELD4", "EH4", "SHELL4"],
  pin4: ["SHIELD3", "EH3", "SHELL3"],
  pin5: ["SBU2", "B8"],
  pin6: ["CC1", "A5"],
  pin7: ["DN2", "B7", "DM2"],
  pin8: ["DP1", "A6"],
  pin9: ["DN1", "A7", "DM1"],
  pin10: ["DP2", "B6"],
  pin11: ["SBU1", "A8"],
  pin12: ["CC2", "B5"],
  pin13: ["GND1", "A1B12"],
  pin14: ["GND2", "B1A12"],
  pin15: ["VBUS1", "B4A9"],
  pin16: ["VBUS2", "A4B9"],
} as const
