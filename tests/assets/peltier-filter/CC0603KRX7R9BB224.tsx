// Supplier footprint: tsci import C107083 --jlcpcb --use-exact-footprint; see docs/component-imports.json.
import type { CapacitorProps } from "@tscircuit/props"

export const CC0603KRX7R9BB224 = (
  props: Omit<CapacitorProps, "capacitance">,
) => {
  const { name = "C1", ...restProps } = props

  return (
    <capacitor
      name={name}
      capacitance="220nF"
      supplierPartNumbers={{
        jlcpcb: ["C107083"],
      }}
      manufacturerPartNumber="CC0603KRX7R9BB224"
      // PCB footprint and CAD omitted from this schematic-only extract.
      {...restProps}
    />
  )
}
