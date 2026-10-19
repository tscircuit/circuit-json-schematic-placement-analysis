import type { ResistorProps } from "@tscircuit/props"

export const RC0603FR_079K1L = (props: Omit<ResistorProps, "resistance">) => {
  const { name = "R1", ...restProps } = props

  return (
    <resistor
      name={name}
      resistance="9.1kohm"
      supplierPartNumbers={{
        jlcpcb: ["C114639"],
      }}
      manufacturerPartNumber="RC0603FR-079K1L"
      footprint="smdpads2_p1.5067mm_pw0.8065mm_ph0.864mm_cyw2.8132mm_cyh1.364mm"
      {...restProps}
    />
  )
}
