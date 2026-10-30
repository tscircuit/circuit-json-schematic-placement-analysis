import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["SW"],
  pin2: ["GND"],
  pin3: ["FB"],
  pin4: ["EN"],
  pin5: ["VIN"],
  pin6: ["OC"],
} as const

const pinAttributes = {
  pin2: { requiresGround: true },
  pin5: { requiresPower: true },
} as const

export const MT3608L = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C2932326"],
      }}
      manufacturerPartNumber="MT3608L"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin6"]}
            pcbX="-0.94996mm"
            pcbY="1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="0mm"
            pcbY="1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="0.94996mm"
            pcbY="1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="0.94996mm"
            pcbY="-1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="0mm"
            pcbY="-1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="-0.94996mm"
            pcbY="-1.149096mm"
            width="0.532003mm"
            height="1.072007mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: 1.5390876000000162, y: -0.889228600000024 },
              { x: 1.5390876000000162, y: 0.8891270000000304 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.5392908000000034, y: -0.889228600000024 },
              { x: -1.5392908000000034, y: 0.8891270000000304 },
            ]}
          />
          <silkscreencircle
            pcbX="-1.668272mm"
            pcbY="-1.301496mm"
            radius="0.150114mm"
          />
          <silkscreentext
            text="{NAME}"
            pcbX="-0.141478mm"
            pcbY="2.686052mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -1.700085999999942, y: 1.9350995000000921 },
              { x: 1.6999082000000953, y: 1.9350995000000921 },
              { x: 1.6999082000000953, y: -1.9350994999999784 },
              { x: -1.700085999999942, y: -1.9350994999999784 },
              { x: -1.700085999999942, y: 1.9350995000000921 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C2932326.obj?uuid=a19b744a89f24031b7cd0a367b10a37e",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C2932326.step?uuid=a19b744a89f24031b7cd0a367b10a37e",
        pcbRotationOffset: 0,
        modelOriginPosition: {
          x: 0.00008889999992334197,
          y: 0.00005079999993995443,
          z: -0.6,
        },
      }}
      {...props}
    />
  )
}
