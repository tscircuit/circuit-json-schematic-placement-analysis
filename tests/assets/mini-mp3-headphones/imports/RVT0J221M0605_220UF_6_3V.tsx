import type { CapacitorProps } from "@tscircuit/props"

export const RVT0J221M0605_220UF_6_3V = (
  props: Omit<CapacitorProps, "capacitance">,
) => {
  const { name = "C1", ...restProps } = props

  return (
    <capacitor
      name={name}
      capacitance="220uF"
      polarized
      supplierPartNumbers={{
        jlcpcb: ["C970693"],
      }}
      manufacturerPartNumber="RVT0J221M0605 220UF 6.3V"
      footprint="cap_p5.3401mm_pw3.5mm_ph1.2mm_cyw9.3401mm_cyh7.1mm"
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C970693.obj?uuid=6cb1ec5759f6404189e20b90556867d6",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C970693.step?uuid=6cb1ec5759f6404189e20b90556867d6",
        pcbRotationOffset: 180,
        modelOriginPosition: { x: 0, y: -0.000012700000070253736, z: -0.05 },
      }}
      {...restProps}
    />
  )
}
