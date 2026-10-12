import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["OUT1"],
  pin2: ["VPCC"],
  pin3: ["SEL"],
  pin4: ["PROG2"],
  pin5: ["THERM"],
  pin6: ["PG"],
  pin7: ["STAT2"],
  pin8: ["STAT1_LBO"],
  pin9: ["TE"],
  pin10: ["VSS1"],
  pin11: ["VSS2"],
  pin12: ["PROG3"],
  pin13: ["PROG1"],
  pin14: ["VBAT1"],
  pin15: ["VBAT2"],
  pin16: ["VBAT_SENSE"],
  pin17: ["CE"],
  pin18: ["IN1"],
  pin19: ["IN2"],
  pin20: ["OUT2"],
  pin21: ["PAD"],
} as const

export const MCP73871T_2CCI_ML = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={{
        IN1: { requiresPower: true },
        IN2: { requiresPower: true },
        OUT1: { providesPower: true },
        OUT2: { providesPower: true },
        VBAT1: { providesPower: true },
        VBAT2: { providesPower: true },
        VSS1: { requiresGround: true },
        VSS2: { requiresGround: true },
        PAD: { requiresGround: true },
      }}
      supplierPartNumbers={{
        jlcpcb: ["C511310"],
      }}
      manufacturerPartNumber="MCP73871T_2CCI_ML"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-0.999998mm"
            pcbY="-1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-0.499872mm"
            pcbY="-1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="0mm"
            pcbY="-1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="0.500126mm"
            pcbY="-1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="0.999998mm"
            pcbY="-1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="1.90754mm"
            pcbY="-0.999998mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="1.90754mm"
            pcbY="-0.500126mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="1.90754mm"
            pcbY="0mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="1.90754mm"
            pcbY="0.499872mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin10"]}
            pcbX="1.90754mm"
            pcbY="0.999998mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin11"]}
            pcbX="0.999998mm"
            pcbY="1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin12"]}
            pcbX="0.500126mm"
            pcbY="1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin13"]}
            pcbX="0mm"
            pcbY="1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin14"]}
            pcbX="-0.499872mm"
            pcbY="1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin15"]}
            pcbX="-0.999998mm"
            pcbY="1.90754mm"
            width="0.2800096mm"
            height="0.6649974mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin16"]}
            pcbX="-1.90754mm"
            pcbY="0.999998mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin17"]}
            pcbX="-1.90754mm"
            pcbY="0.499872mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin18"]}
            pcbX="-1.90754mm"
            pcbY="0mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin19"]}
            pcbX="-1.90754mm"
            pcbY="-0.500126mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin20"]}
            pcbX="-1.90754mm"
            pcbY="-0.999998mm"
            width="0.6649974mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin21"]}
            pcbX="0mm"
            pcbY="0mm"
            width="2.6999946mm"
            height="2.6999946mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -2.0761960000000954, y: 1.3305027999999766 },
              { x: -2.0761960000000954, y: 2.0761959999999817 },
              { x: -1.3305027999999766, y: 2.0761959999999817 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 2.0761959999999817, y: 1.3305027999999766 },
              { x: 2.0761959999999817, y: 2.0761959999999817 },
              { x: 1.3305027999998629, y: 2.0761959999999817 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -2.0761960000000954, y: -1.3305027999999766 },
              { x: -2.0761960000000954, y: -2.076195999999868 },
              { x: -1.3305027999999766, y: -2.076195999999868 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 2.0761959999999817, y: -1.3305027999999766 },
              { x: 2.0761959999999817, y: -2.076195999999868 },
              { x: 1.3305027999998629, y: -2.076195999999868 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -0.9250680000000102, y: -2.5399999999999636 },
              { x: -0.9276211778361585, y: -2.5593933110494618 },
              { x: -0.935106716494488, y: -2.577464999999961 },
              { x: -0.9470144888857703, y: -2.592983511114312 },
              { x: -0.9625330000001213, y: -2.6048912835054807 },
              { x: -0.9806046889505069, y: -2.61237682216381 },
              { x: -0.999998000000005, y: -2.614930000000072 },
              { x: -1.0193913110495032, y: -2.61237682216381 },
              { x: -1.0374630000000025, y: -2.6048912835054807 },
              { x: -1.0529815111143535, y: -2.592983511114312 },
              { x: -1.0648892835056358, y: -2.577464999999961 },
              { x: -1.0723748221639653, y: -2.5593933110494618 },
              { x: -1.0749280000001136, y: -2.5399999999999636 },
              { x: -1.0723748221639653, y: -2.5206066889504655 },
              { x: -1.0648892835056358, y: -2.50253500000008 },
              { x: -1.0529815111143535, y: -2.487016488885729 },
              { x: -1.0374630000000025, y: -2.4751087164944465 },
              { x: -1.0193913110495032, y: -2.467623177836117 },
              { x: -0.999998000000005, y: -2.465069999999969 },
              { x: -0.9806046889505069, y: -2.467623177836117 },
              { x: -0.9625330000001213, y: -2.4751087164944465 },
              { x: -0.9470144888857703, y: -2.487016488885729 },
              { x: -0.935106716494488, y: -2.50253500000008 },
              { x: -0.9276211778361585, y: -2.5206066889504655 },
              { x: -0.9250680000000102, y: -2.5399999999999636 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="-3.1mm"
            pcbY="3.5mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -2.485200000000077, y: 2.485200000000077 },
              { x: 2.4851999999998498, y: 2.485200000000077 },
              { x: 2.4851999999998498, y: -2.8661999999999352 },
              { x: -2.485200000000077, y: -2.8661999999999352 },
              { x: -2.485200000000077, y: 2.485200000000077 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C511310.obj?uuid=944af057ae8c4b3488c42a326ffe13e4",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C511310.step?uuid=944af057ae8c4b3488c42a326ffe13e4",
        pcbRotationOffset: 90,
        modelOriginPosition: {
          x: -0.000012700000070253736,
          y: 0.000012699999842880061,
          z: 0.01,
        },
      }}
      {...props}
    />
  )
}
