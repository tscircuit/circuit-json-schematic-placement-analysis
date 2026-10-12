import type { DiodeProps } from "@tscircuit/props"

export const A_1N4148W = (props: DiodeProps) => {
  const { name = "D1", ...restProps } = props

  return (
    <diode
      name={name}
      pinLabels={{ pin1: ["cathode", "neg"], pin2: ["anode", "pos"] }}
      supplierPartNumbers={{
        jlcpcb: ["C81598"],
      }}
      manufacturerPartNumber="A_1N4148W"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin2"]}
            pcbX="1.734947mm"
            pcbY="0mm"
            width="1.0999978mm"
            height="0.999998mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="-1.734947mm"
            pcbY="0mm"
            width="1.0999978mm"
            height="0.999998mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -1.3761720000001105, y: -0.926337999999987 },
              { x: 1.3762735999998768, y: -0.926337999999987 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.3761720000001105, y: 0.9261348000001135 },
              { x: 1.3762735999998768, y: 0.9261348000001135 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.3762735999998768, y: 0.9261348000001135 },
              { x: 1.3762735999998768, y: 0.7330948000001172 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.3762735999998768, y: -0.926337999999987 },
              { x: 1.3762735999998768, y: -0.733297999999877 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -0.9167368000000806, y: 0.876122200000168 },
              { x: -0.9167368000000806, y: -0.8763254000000416 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="-0.007747mm"
            pcbY="1.9906mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -2.5437469999999394, y: 1.2406000000000859 },
              { x: 2.5282530000000634, y: 1.2406000000000859 },
              { x: 2.5282530000000634, y: -1.2660000000000764 },
              { x: -2.5437469999999394, y: -1.2660000000000764 },
              { x: -2.5437469999999394, y: 1.2406000000000859 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C81598.obj?uuid=114f2449d65947c2a2476b7fb75383eb",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C81598.step?uuid=114f2449d65947c2a2476b7fb75383eb",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0, z: 0 },
      }}
      {...restProps}
    />
  )
}
