import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["OUT_L_POS"],
  pin2: ["PGND1"],
  pin3: ["OUT_L_NEG"],
  pin4: ["PVDD1"],
  pin5: ["MUTE"],
  pin6: ["VDD"],
  pin7: ["INL"],
  pin8: ["VREF"],
  pin9: ["NC"],
  pin10: ["INR"],
  pin11: ["GND"],
  pin12: ["SHND"],
  pin13: ["PVDD2"],
  pin14: ["OUT_R_NEG"],
  pin15: ["PGND2"],
  pin16: ["OUT_R_POS"],
} as const

export const PAM8403DR_H = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={{
        pin1: { isOutput: true },
        pin3: { isOutput: true },
        pin14: { isOutput: true },
        pin16: { isOutput: true },
        pin2: { requiresGround: true, mustBeConnected: true },
        pin11: { requiresGround: true, mustBeConnected: true },
        pin15: { requiresGround: true, mustBeConnected: true },
        pin4: { requiresPower: true, mustBeConnected: true },
        pin6: { requiresPower: true, mustBeConnected: true },
        pin13: { requiresPower: true, mustBeConnected: true },
        pin5: { isInput: true, mustBeConnected: true },
        pin7: { isInput: true },
        pin10: { isInput: true },
        pin8: { isOutput: true, mustBeConnected: true },
        pin9: { doNotConnect: true },
        pin12: { isInput: true, mustBeConnected: true },
      }}
      supplierPartNumbers={{
        jlcpcb: ["C17337"],
      }}
      manufacturerPartNumber="PAM8403DR_H"
      footprint="tssop16_p1.27mm_w3.38mm_pw0.35mm_pl2.02mm_pin1location(bottomside,left)"
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C17337.obj?uuid=9adfdf34b7774b23880141fd3e8b4dbb",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C17337.step?uuid=9adfdf34b7774b23880141fd3e8b4dbb",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.000012699999842880061, y: 0, z: 0.000575 },
      }}
      {...props}
    />
  )
}
