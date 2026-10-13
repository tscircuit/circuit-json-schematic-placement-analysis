import type { ChipProps } from "@tscircuit/props"

const pcf8563Pins = {
  pin1: ["OSCI"],
  pin2: ["OSCO"],
  pin3: ["INT"],
  pin4: ["VSS"],
  pin5: ["SDA"],
  pin6: ["SCL"],
  pin7: ["CLKOUT"],
  pin8: ["VDD"],
} as const

export const PCF8563TS = (props: ChipProps<typeof pcf8563Pins>) => (
  <chip
    pinLabels={pcf8563Pins}
    manufacturerPartNumber="PCF8563TS/5,118"
    supplierPartNumbers={{ jlcpcb: ["C27397"] }}
    pinAttributes={{
      VDD: { requiresPower: true },
      VSS: { requiresGround: true },
    }}
    footprint="tssop8"
    schWidth={1.6}
    schHeight={1.2}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["OSCI", "OSCO", "INT"] },
      rightSide: { direction: "top-to-bottom", pins: ["SCL", "SDA", "CLKOUT"] },
      topSide: { direction: "left-to-right", pins: ["VDD"] },
      bottomSide: { direction: "left-to-right", pins: ["VSS"] },
    }}
    {...props}
  />
)
