import type { ChipProps } from "@tscircuit/props"

const pinLabels = { pin1: ["pin1"], pin2: ["pin2"], pin3: ["pin3"] } as const

export const JstSwdSide = ({
  uartSilkscreenLabels,
  ...props
}: ChipProps & {
  uartSilkscreenLabels?: readonly [string, string, string]
}) => {
  return (
    <connector
      standard="jst_sh"
      pinCount={3}
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C160403"],
      }}
      manufacturerPartNumber="SM03B-SRSS-TB(LF)(SN)"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-1.000125mm"
            pcbY="2.0500086mm"
            width="0.5999988mm"
            height="1.5500096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="0.000127mm"
            pcbY="2.0500086mm"
            width="0.5999988mm"
            height="1.5500096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="1.000125mm"
            pcbY="2.0500086mm"
            width="0.5999988mm"
            height="1.5500096mm"
            shape="rect"
          />
          <smtpad
            portHints={[]}
            pcbX="2.300097mm"
            pcbY="-1.8250154mm"
            width="1.499997mm"
            height="1.999996mm"
            shape="rect"
          />
          <smtpad
            portHints={[]}
            pcbX="-2.300097mm"
            pcbY="-1.8250154mm"
            width="1.499997mm"
            height="1.999996mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -2.5000203999999258, y: 1.725015600000006 },
              { x: -1.5311373999998068, y: 1.725015600000006 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.5311374000000342, y: 1.725015600000006 },
              { x: 2.499918800000046, y: 1.725015600000006 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 2.499918800000046, y: 1.725015600000006 },
              { x: 2.499918800000046, y: -0.5938519999999698 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -2.3697691999999506, y: 1.725015600000006 },
              { x: -2.5000203999999258, y: 1.725015600000006 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -2.5000203999999258, y: 1.725015600000006 },
              { x: -2.5000203999999258, y: -0.5938519999999698 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.318844199999944, y: -2.524963200000002 },
              { x: 1.3188696000000846, y: -2.524963200000002 },
            ]}
          />
          <silkscreencircle
            pcbX="-1.999869mm"
            pcbY="2.1124926mm"
            radius="0.31623mm"
          />
          <silkscreentext
            text="{NAME}"
            pcbX="0.004191mm"
            pcbY={uartSilkscreenLabels ? 5.2 : 3.8374086}
            anchorAlignment="center"
            fontSize="1mm"
          />
          {uartSilkscreenLabels && (
            <silkscreentext
              text={uartSilkscreenLabels[0]}
              pcbX={-1}
              pcbY={4.0}
              fontSize={0.5}
            />
          )}
          {uartSilkscreenLabels && (
            <silkscreentext
              text={uartSilkscreenLabels[1]}
              pcbX={0}
              pcbY={4.0}
              fontSize={0.5}
            />
          )}
          {uartSilkscreenLabels && (
            <silkscreentext
              text={uartSilkscreenLabels[2]}
              pcbX={1}
              pcbY={4.0}
              fontSize={0.5}
            />
          )}
          <courtyardoutline
            outline={[
              { x: -3.2938089999998965, y: 3.0874086000000034 },
              { x: 3.302191000000107, y: 3.0874086000000034 },
              { x: 3.302191000000107, y: -3.051391399999943 },
              { x: -3.2938089999998965, y: -3.051391399999943 },
              { x: -3.2938089999998965, y: 3.0874086000000034 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C160403.obj?uuid=65828f37d6e7448b8cbc0db14b6c48c4",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C160403.step?uuid=65828f37d6e7448b8cbc0db14b6c48c4",
        pcbRotationOffset: 0,
        modelOriginPosition: {
          x: 1.0000761999999668,
          y: 0.3445008999999346,
          z: -0.01,
        },
      }}
      {...props}
    />
  )
}
