import type { InductorProps } from "@tscircuit/props"

export const XRNR4030_1uH_N = (props: InductorProps) => {
  return (
    <inductor
      supplierPartNumbers={{
        jlcpcb: ["C5289359"],
      }}
      manufacturerPartNumber="XRNR4030-1uH/N"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin2"]}
            pcbX="1.397mm"
            pcbY="0mm"
            width="1.6999966mm"
            height="2.999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="-1.397mm"
            pcbY="0mm"
            width="1.6999966mm"
            height="2.999994mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: 2.049881600000049, y: -1.6801338000000214 },
              { x: 2.049881600000049, y: -2.099995799999988 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 2.049881600000049, y: 2.099995799999874 },
              { x: 2.049881600000049, y: 1.6801337999999078 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -2.050110200000063, y: -1.6801338000000214 },
              { x: -2.050110200000063, y: -2.099995799999988 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -2.050110200000063, y: 2.099995799999874 },
              { x: -2.050110200000063, y: 1.6801337999999078 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -2.050135599999976, y: -2.099995799999988 },
              { x: 2.049856200000022, y: -2.099995799999988 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 2.049881600000049, y: 2.099995799999874 },
              { x: -2.050110200000063, y: 2.099995799999874 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="0.009906mm"
            pcbY="3.1082mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -2.487993999999958, y: 2.3582000000000107 },
              { x: 2.5078059999999596, y: 2.3582000000000107 },
              { x: 2.5078059999999596, y: -2.33280000000002 },
              { x: -2.487993999999958, y: -2.33280000000002 },
              { x: -2.487993999999958, y: 2.3582000000000107 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C5289359.obj?uuid=bc8fd628e0d8499abfd61ccaed5b8cad",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C5289359.step?uuid=bc8fd628e0d8499abfd61ccaed5b8cad",
        pcbRotationOffset: 0,
        modelOriginPosition: {
          x: 0.00013969999997698324,
          y: 0.000012700000070253736,
          z: -0.05,
        },
      }}
      {...props}
    />
  )
}
