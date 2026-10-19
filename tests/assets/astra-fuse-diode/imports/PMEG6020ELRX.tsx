import type { DiodeProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["cathode", "neg"],
  pin2: ["anode", "pos"],
} as const

export const PMEG6020ELRX = (props: DiodeProps) => {
  const { name = "D1", ...restProps } = props

  return (
    <diode
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C478000"],
      }}
      manufacturerPartNumber="PMEG6020ELRX"
      footprint="smdpads2_p3.3848mm_pw0.95mm_ph1.15mm"
      {...restProps}
    />
  )
}
