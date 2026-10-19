import type { ResistorProps } from "@tscircuit/props"

export const RC0603FR_0751K1L = (props: Omit<ResistorProps, "resistance">) => {
  const { name = "R1", ...restProps } = props

  return (
    <resistor
      name={name}
      resistance="51.1kohm"
      supplierPartNumbers={{
        jlcpcb: ["C364359"],
      }}
      manufacturerPartNumber="RC0603FR-0751K1L"
      footprint="smdpads2_p1.5067mm_pw0.8065mm_ph0.864mm_cyw2.8132mm_cyh1.364mm"
      {...restProps}
    />
  )
}
