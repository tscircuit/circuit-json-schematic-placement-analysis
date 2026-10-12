import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["FB"],
  pin2: ["EN"],
  pin3: ["VIN"],
  pin4: ["GND"],
  pin5: ["SW"],
  pin6: ["VOUT"],
} as const

export const TPS61023DRLR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={{
        VIN: { requiresPower: true },
        VOUT: { providesPower: true },
        GND: { requiresGround: true },
      }}
      supplierPartNumbers={{
        jlcpcb: ["C919459"],
      }}
      manufacturerPartNumber="TPS61023DRLR"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin5"]}
            pcbX="-0.7499858mm"
            pcbY="-0.000127mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="0.7499858mm"
            pcbY="-0.000127mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="0.7499858mm"
            pcbY="0.499999mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1"]}
            pcbX="0.7499858mm"
            pcbY="-0.499999mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="-0.7499858mm"
            pcbY="0.499999mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="-0.7499858mm"
            pcbY="-0.499999mm"
            width="0.5999988mm"
            height="0.2999994mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -0.4751578000000052, y: -0.7874762000000004 },
              { x: 0.4748021999999992, y: -0.7874762000000004 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -0.4751578000000052, y: 0.7873237999999958 },
              { x: 0.4748021999999992, y: 0.7873237999999958 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 0.9000489999999957, y: -0.9300209999999964 },
              { x: 0.8980064577310571, y: -0.9455356488396234 },
              { x: 0.8920180268044504, y: -0.9599929999999972 },
              { x: 0.8824918088914444, y: -0.9724078088914467 },
              { x: 0.8700770000000091, y: -0.9819340268044527 },
              { x: 0.8556196488396068, y: -0.9879224577310737 },
              { x: 0.8401049999999941, y: -0.989964999999998 },
              { x: 0.8245903511603672, y: -0.9879224577310737 },
              { x: 0.8101329999999933, y: -0.9819340268044527 },
              { x: 0.7977181911085438, y: -0.9724078088914467 },
              { x: 0.7881919731955236, y: -0.9599929999999972 },
              { x: 0.7822035422689169, y: -0.9455356488396234 },
              { x: 0.7801610000000068, y: -0.9300209999999964 },
              { x: 0.7822035422689169, y: -0.9145063511603837 },
              { x: 0.7881919731955236, y: -0.9000489999999957 },
              { x: 0.7977181911085438, y: -0.8876341911085603 },
              { x: 0.8101329999999933, y: -0.8781079731955401 },
              { x: 0.8245903511603672, y: -0.8721195422689334 },
              { x: 0.8401049999999941, y: -0.8700769999999949 },
              { x: 0.8556196488396068, y: -0.8721195422689334 },
              { x: 0.8700770000000091, y: -0.8781079731955401 },
              { x: 0.8824918088914444, y: -0.8876341911085603 },
              { x: 0.8920180268044504, y: -0.9000489999999957 },
              { x: 0.8980064577310571, y: -0.9145063511603837 },
              { x: 0.9000489999999957, y: -0.9300209999999964 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="0.016383mm"
            pcbY="1.834517mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -1.2877170000000007, y: 1.0845170000000053 },
              { x: 1.3204829999999959, y: 1.0845170000000053 },
              { x: 1.3204829999999959, y: -1.2442829999999958 },
              { x: -1.2877170000000007, y: -1.2442829999999958 },
              { x: -1.2877170000000007, y: 1.0845170000000053 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C919459.obj?uuid=ec2270bac0544bf5afe06b24e8356512",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C919459.step?uuid=ec2270bac0544bf5afe06b24e8356512",
        pcbRotationOffset: 180,
        modelOriginPosition: {
          x: -0.00005079999999679785,
          y: 0.029921200000003978,
          z: 0,
        },
      }}
      {...props}
    />
  )
}
