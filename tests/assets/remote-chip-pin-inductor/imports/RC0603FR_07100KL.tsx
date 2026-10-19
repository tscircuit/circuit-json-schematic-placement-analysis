import type { ResistorProps } from "@tscircuit/props"

export const RC0603FR_07100KL = (props: Omit<ResistorProps, "resistance">) => {
  const { name = "R1", ...restProps } = props

  return (
    <resistor
      name={name}
      resistance="100kohm"
      supplierPartNumbers={{
        jlcpcb: ["C14675"],
      }}
      manufacturerPartNumber="RC0603FR-07100KL"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin2"]}
            pcbX="0.753364mm"
            pcbY="0mm"
            width="0.8064754mm"
            height="0.8640064mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="-0.753364mm"
            pcbY="0mm"
            width="0.8064754mm"
            height="0.8640064mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: 0.42621199999996406, y: -0.6606031999999686 },
              { x: 1.3850873999999749, y: -0.6606031999999686 },
              { x: 1.3850873999999749, y: 0.6606031999999686 },
              { x: 0.42621199999996406, y: 0.6606031999999686 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -0.42621200000007775, y: -0.6606031999999686 },
              { x: -1.3850874000000886, y: -0.6606031999999686 },
              { x: -1.3850874000000886, y: 0.6606031999999686 },
              { x: -0.42621200000007775, y: 0.6606031999999686 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="-0.0127mm"
            pcbY="1.6604mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -1.4066016999998965, y: 0.6820032000000538 },
              { x: 1.4066016999997828, y: 0.6820032000000538 },
              { x: 1.4066016999997828, y: -0.6820032000000538 },
              { x: -1.4066016999998965, y: -0.6820032000000538 },
              { x: -1.4066016999998965, y: 0.6820032000000538 },
            ]}
          />
        </footprint>
      }
      {...restProps}
    />
  )
}
