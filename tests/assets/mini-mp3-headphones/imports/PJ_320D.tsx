import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"],
  pin4: ["pin4"],
} as const

export const PJ_320D = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C431535"],
      }}
      manufacturerPartNumber="PJ-320D"
      footprint={
        <footprint>
          <hole pcbX="-5.07495175mm" pcbY="-0.000127mm" diameter="0.999998mm" />
          <hole pcbX="1.92503425mm" pcbY="-0.000127mm" diameter="0.999998mm" />
          <smtpad
            portHints={["pin2"]}
            pcbX="-3.57508175mm"
            pcbY="3.499993mm"
            width="1.499997mm"
            height="2.999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="-0.57508775mm"
            pcbY="3.499993mm"
            width="1.499997mm"
            height="2.999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="3.42490425mm"
            pcbY="3.499993mm"
            width="1.499997mm"
            height="2.999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="4.82495225mm"
            pcbY="-3.499993mm"
            width="1.499997mm"
            height="2.999994mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -6.774948350000159, y: -3.0001210000000356 },
              { x: 3.843724849999944, y: -3.0001210000000356 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 5.3250274499998795, y: 2.9998670000001084 },
              { x: 5.3250274499998795, y: -1.768856000000028 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 4.405928449999919, y: 2.9998670000001084 },
              { x: 5.3250274499998795, y: 2.9998670000001084 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 0.4059364499998992, y: 2.9998670000001084 },
              { x: 2.4436514499999475, y: 2.9998670000001084 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -2.594057550000116, y: 2.9998670000001084 },
              { x: -1.5563405500001863, y: 2.9998670000001084 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -6.774948350000159, y: 2.9998670000001084 },
              { x: -4.5563345500002015, y: 2.9998670000001084 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -8.775198350000096, y: -2.499994999999899 },
              { x: -6.775202350000086, y: -2.499994999999899 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -6.775202350000086, y: 2.499944199999959 },
              { x: -8.775198350000096, y: 2.499944199999959 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -8.775198350000096, y: 2.499944199999959 },
              { x: -8.775198350000096, y: -2.5001220000001467 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -6.774948350000159, y: 2.9998670000001084 },
              { x: -6.774948350000159, y: -3.0001210000000356 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="-1.59413575mm"
            pcbY="6.005197mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -9.025045949999935, y: 5.249990000000025 },
              { x: 5.824950749999971, y: 5.249990000000025 },
              { x: 5.824950749999971, y: -5.249989999999912 },
              { x: -9.025045949999935, y: -5.249989999999912 },
              { x: -9.025045949999935, y: 5.249990000000025 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C431535.obj?uuid=7178d96b87ee4d73a30dddb4c856adc2",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C431535.step?uuid=7178d96b87ee4d73a30dddb4c856adc2",
        pcbRotationOffset: 0,
        modelOriginPosition: {
          x: 7.275060049999911,
          y: 0,
          z: -2.5500011000000002,
        },
      }}
      {...props}
    />
  )
}
