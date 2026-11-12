// Supplier footprint: tsci import C5942077 --jlcpcb --use-exact-footprint; see docs/component-imports.json.
import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["EN", "UVLO"],
  pin2: ["MODE"],
  pin3: ["SCL"],
  pin4: ["SDA"],
  pin5: ["DITH", "SYNC"],
  pin6: ["FSW"],
  pin7: ["VIN"],
  pin8: ["SW1"],
  pin9: ["PGND"],
  pin10: ["SW2"],
  pin11: ["VOUT"],
  pin12: ["ISP"],
  pin13: ["ISN"],
  pin14: ["FB", "N_INT"],
  pin15: ["COMP"],
  pin16: ["CDC"],
  pin17: ["AGND"],
  pin18: ["VCC"],
  pin19: ["BOOT2"],
  pin20: ["BOOT1"],
  pin21: ["EXTVCC"],
} as const

const pinAttributes = {
  pin7: { requiresPower: true },
  pin9: { requiresGround: true },
  pin17: { requiresGround: true },
  pin18: { requiresPower: true },
} as const

export const TPS55289RYQR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      schWidth={4.6}
      schHeight={6.4}
      schPinArrangement={{
        leftSide: { pins: [7, 1, 3, 4, 6], direction: "top-to-bottom" },
        topSide: { pins: [20, 8, 10, 19], direction: "left-to-right" },
        rightSide: {
          pins: [11, 14, 16, 12, 13, 15],
          direction: "top-to-bottom",
        },
        bottomSide: { pins: [18, 21, 2, 5, 9, 17], direction: "left-to-right" },
      }}
      schPinStyle={{
        pin7: { marginBottom: 1.4 },
        pin1: { marginBottom: 0.4 },
        pin3: { marginBottom: 0.4 },
        pin4: { marginBottom: 1.4 },
        pin11: { marginBottom: 1.2 },
        pin12: { marginBottom: 0.6 },
        pin13: { marginBottom: 1 },
        pin14: { marginBottom: 0.4 },
        pin16: { marginBottom: 0.6 },
        pin20: { marginRight: 0.8 },
        pin8: { marginRight: 0.8 },
        pin10: { marginRight: 0.8 },
        pin18: { marginRight: 0.6 },
        pin21: { marginRight: 0.2 },
        pin2: { marginRight: 0.2 },
        pin5: { marginRight: 0.2 },
        pin9: { marginRight: 0.2 },
      }}
      supplierPartNumbers={{
        jlcpcb: ["C5942077"],
      }}
      manufacturerPartNumber="TPS55289RYQR"
      // PCB footprint and CAD omitted from this schematic-only extract.
      {...props}
    />
  )
}
