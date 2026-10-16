import type { LedProps } from "@tscircuit/props"

export const SK6812MINI_E = (props: LedProps) => {
  const { name = "LED1", ...restProps } = props

  return (
    <led
      name={name}
      supplierPartNumbers={{
        jlcpcb: ["C5149201"],
      }}
      manufacturerPartNumber="SK6812MINI_E"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin3"]}
            pcbX="2.699893mm"
            pcbY="0.725043mm"
            width="1.6999966mm"
            height="0.7999984mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="2.699893mm"
            pcbY="-0.725043mm"
            width="1.6999966mm"
            height="0.7999984mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="-2.699893mm"
            pcbY="-0.725043mm"
            width="1.6999966mm"
            height="0.7999984mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-2.699893mm"
            pcbY="0.725043mm"
            width="1.6999966mm"
            height="0.7999984mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: 1.8500852000001942, y: -1.7000474000000168 },
              { x: -1.8499581999998327, y: -1.7000474000000168 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.8499581999998327, y: -1.3561313999999811 },
              { x: -1.8499581999998327, y: -1.7000474000000168 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.8499581999998327, y: 0.09382760000005419 },
              { x: -1.8499581999998327, y: -0.09395459999996092 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.8499581999998327, y: 1.5999714000000722 },
              { x: -1.8499581999998327, y: 1.3560806000000412 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.8500852000001942, y: -1.3561313999999811 },
              { x: 1.8500852000001942, y: -1.7000474000000168 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.8500852000001942, y: 0.09382760000005419 },
              { x: 1.8500852000001942, y: -0.09395459999996092 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.8500852000001942, y: 1.5999714000000722 },
              { x: 1.8500852000001942, y: 1.3560806000000412 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.8499581999998327, y: 1.5999714000000722 },
              { x: 1.8500852000001942, y: 1.5999714000000722 },
            ]}
          />
          {/* NAME sits east of the body: the spot above it lands in the MX stem hole
    (Ø4mm, local y≈+4.7) and the spot below is the per-key cap. The EasyEDA
    "GND" label was dropped — it clipped the hotswap socket pad and the pad
    numbering (1=GND 2=DIN 3=VDD 4=DOUT) is documented at the use sites. */}
          <silkscreentext
            text="{NAME}"
            pcbX="-6.2mm"
            pcbY="0mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -5.210492999999815, y: 1.8617569999998977 },
              { x: 3.7985070000001997, y: 1.8617569999998977 },
              { x: 3.7985070000001997, y: -2.016443000000095 },
              { x: -5.210492999999815, y: -2.016443000000095 },
              { x: -5.210492999999815, y: 1.8617569999998977 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C5149201.obj?uuid=1fdd18f600ee4914bff270f177ea42a0",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C5149201.step?uuid=1fdd18f600ee4914bff270f177ea42a0",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0, z: 0.000003399999999986747 },
      }}
      {...restProps}
    />
  )
}
