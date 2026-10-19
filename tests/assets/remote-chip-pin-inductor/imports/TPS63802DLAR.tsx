import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["EN"],
  pin2: ["MODE"],
  pin3: ["AGND"],
  pin4: ["FB"],
  pin5: ["PG"],
  pin6: ["VOUT"],
  pin7: ["L2"],
  pin8: ["GND"],
  pin9: ["L1"],
  pin10: ["VIN"],
} as const

const pinAttributes = {
  pin3: { requiresGround: true },
  pin8: { requiresGround: true },
  pin10: { requiresPower: true },
} as const

export const TPS63802DLAR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C2845237"],
      }}
      manufacturerPartNumber="TPS63802DLAR"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin10"]}
            pcbX="0.74994135mm"
            pcbY="0.999998mm"
            width="0.8999982mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="0.74994135mm"
            pcbY="0.499872mm"
            width="0.8999982mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="0.55004335mm"
            pcbY="0mm"
            width="1.2999974mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="0.74994135mm"
            pcbY="-0.500126mm"
            width="0.8999982mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="0.74994135mm"
            pcbY="-0.999998mm"
            width="0.8999982mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="-0.90004265mm"
            pcbY="-0.999998mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="-0.90004265mm"
            pcbY="-0.500126mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="-0.90004265mm"
            pcbY="0mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-0.90004265mm"
            pcbY="0.499872mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="-0.90004265mm"
            pcbY="0.999998mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: 1.0680255500000158, y: 1.330121800000029 },
              { x: 1.0680255500000158, y: 1.5240000000001146 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.0909744500000897, y: -1.330121800000029 },
              { x: -1.0909744500000897, y: -1.5239999999998872 },
              { x: 1.0680255500000158, y: -1.5239999999998872 },
              { x: 1.0680255500000158, y: -1.330121800000029 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.0680255500000158, y: 1.5240000000001146 },
              { x: -1.0909744500000897, y: 1.5240000000001146 },
              { x: -1.0909744500000897, y: 1.330121800000029 },
            ]}
          />
          <silkscreencircle
            pcbX="-1.39712065mm"
            pcbY="1.524mm"
            radius="0.100076mm"
          />
          <silkscreentext
            text="{NAME}"
            pcbX="-0.14972665mm"
            pcbY="2.63576mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -1.7459266500000012, y: 1.8857600000000048 },
              { x: 1.4464733499999056, y: 1.8857600000000048 },
              { x: 1.4464733499999056, y: -1.7638399999999592 },
              { x: -1.7459266500000012, y: -1.7638399999999592 },
              { x: -1.7459266500000012, y: 1.8857600000000048 },
            ]}
          />
        </footprint>
      }
      {...props}
    />
  )
}
