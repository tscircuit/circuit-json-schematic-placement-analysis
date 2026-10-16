import type { InductorProps } from "@tscircuit/props"

export const SRN3015_1R5Y = (props: Omit<InductorProps, "inductance">) => {
  return (
    <inductor
      inductance="1.5uH"
      supplierPartNumbers={{
        jlcpcb: ["C2041714"],
      }}
      manufacturerPartNumber="SRN3015-1R5Y"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="1.327912mm"
            pcbY="0mm"
            width="1.499997mm"
            height="3.3200086mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-1.327912mm"
            pcbY="0mm"
            width="1.499997mm"
            height="3.3200086mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -1.5240000000001146, y: 1.9049999999999727 },
              { x: 1.5239999999998872, y: 1.9049999999999727 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.5240000000001146, y: 1.8911315999999943 },
              { x: -1.5240000000001146, y: 1.9049999999999727 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.5240000000001146, y: -1.9049999999999727 },
              { x: -1.5240000000001146, y: -1.8911569999999074 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.5239999999998872, y: -1.8911569999999074 },
              { x: 1.5239999999998872, y: -1.9049999999999727 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.5239999999998872, y: 1.9049999999999727 },
              { x: 1.5239999999998872, y: 1.8911315999999943 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.5240000000001146, y: -1.9049999999999727 },
              { x: 1.5239999999998872, y: -1.9049999999999727 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="0mm"
            pcbY="2.905mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -2.3327999999999065, y: 2.1549999999999727 },
              { x: 2.3327999999999065, y: 2.1549999999999727 },
              { x: 2.3327999999999065, y: -2.1549999999999727 },
              { x: -2.3327999999999065, y: -2.1549999999999727 },
              { x: -2.3327999999999065, y: 2.1549999999999727 },
            ]}
          />
        </footprint>
      }
      {...props}
    />
  )
}
