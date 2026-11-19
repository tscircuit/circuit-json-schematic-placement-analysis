// Supplier footprint: tsci import C21190 --jlcpcb --use-exact-footprint; see docs/component-imports.json.
import type { ResistorProps } from "@tscircuit/props"

export const A_0603WAF1001T5E = (props: ResistorProps) => {
  const { name = "R1", resistance = "1kohm", ...restProps } = props

  return (
    <resistor
      name={name}
      resistance={resistance}
      supplierPartNumbers={{
        jlcpcb: ["C21190"],
      }}
      manufacturerPartNumber="0603WAF1001T5E"
      // PCB footprint and CAD omitted from this schematic-only extract.
      {...restProps}
    />
  )
}
