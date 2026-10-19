// Published component import; local CAD asset references omitted (CAD is disabled).
import type { DiodeProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["cathode", "neg"],
  pin2: ["anode", "pos"],
} as const

export const A_1N4148X_TP = (props: DiodeProps) => {
  const { name = "D1", ...restProps } = props

  return (
    <diode
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C507292"],
      }}
      manufacturerPartNumber="1N4148X-TP"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1", "cathode", "neg"]}
            points={[
              { x: "-1.016mm", y: "0.2463038mm" },
              { x: "-0.4064mm", y: "0.2463038mm" },
              { x: "-0.4064mm", y: "-0.2362962mm" },
              { x: "-1.016mm", y: "-0.2362962mm" },
            ]}
            shape="polygon"
          />
          <smtpad
            portHints={["pin2", "anode", "pos"]}
            points={[
              { x: "0.4064mm", y: "0.2362962mm" },
              { x: "1.016mm", y: "0.2362962mm" },
              { x: "1.016mm", y: "-0.2463038mm" },
              { x: "0.4064mm", y: "-0.2463038mm" },
            ]}
            shape="polygon"
          />
          <silkscreenpath
            route={[
              { x: 0.6602730000000037, y: -0.3261614000000037 },
              { x: 0.6602730000000037, y: -0.43185080000000653 },
              { x: -0.6605270000000019, y: -0.43185080000000653 },
              { x: -0.6603999999999814, y: -0.43180000000000973 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -0.6603999999999814, y: 0.4317999999999955 },
              { x: -0.6603999999999814, y: 0.4317999999999955 },
              { x: 0.6604000000000099, y: 0.4317999999999955 },
              { x: 0.6604000000000099, y: 0.3301999999999907 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="-0.000127mm"
            pcbY="1.4866386mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -1.2661269999999973, y: 0.736638599999992 },
              { x: 1.2658730000000133, y: 0.736638599999992 },
              { x: 1.2658730000000133, y: -0.728561400000018 },
              { x: -1.2661269999999973, y: -0.728561400000018 },
              { x: -1.2661269999999973, y: 0.736638599999992 },
            ]}
          />
        </footprint>
      }
      {...restProps}
    />
  )
}
