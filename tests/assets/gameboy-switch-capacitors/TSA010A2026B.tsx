import type { PushButtonProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
} as const

export const TSA010A2026B = (props: PushButtonProps<typeof pinLabels>) => {
  const { name = "SW1", ...restProps } = props

  return (
    <pushbutton
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C2888420"],
      }}
      manufacturerPartNumber="TSA010A2026B"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-2.200148mm"
            pcbY="0mm"
            width="1.35001mm"
            height="1.999996mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="2.200148mm"
            pcbY="0mm"
            width="1.35001mm"
            height="1.999996mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -1.99999600000001, y: 1.131138200000123 },
              { x: -1.99999600000001, y: 1.4999969999998939 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.9999959999998964, y: -1.1311382000000094 },
              { x: 1.9999959999998964, y: -1.4999970000000076 },
              { x: -1.99999600000001, y: -1.4999970000000076 },
              { x: -1.99999600000001, y: -1.1311382000000094 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.99999600000001, y: 1.4999969999998939 },
              { x: 1.9999959999998964, y: 1.4999969999998939 },
              { x: 1.9999959999998964, y: 1.131138200000123 },
            ]}
          />
          <silkscreencircle pcbX="0mm" pcbY="0mm" radius="0.762mm" />
          <silkscreentext
            text="{NAME}"
            pcbX="0mm"
            pcbY="2.4986mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -3.120200000000068, y: 1.7486000000000104 },
              { x: 3.1201999999999543, y: 1.7486000000000104 },
              { x: 3.1201999999999543, y: -1.774000000000001 },
              { x: -3.120200000000068, y: -1.774000000000001 },
              { x: -3.120200000000068, y: 1.7486000000000104 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C2888420.obj?uuid=f7b3c012650c4dd98a67d3ac9a9d13dc",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C2888420.step?uuid=f7b3c012650c4dd98a67d3ac9a9d13dc",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0, z: -1.5 },
      }}
      {...restProps}
    />
  )
}
