import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"
import {
  AO3400ASymbol,
  B5819W_SLSymbol,
  DTC114EU3HZGT106Symbol,
  HYG_8503ASymbol,
  LTST_C19HE1WTSymbol,
} from "./nema23-status-symbols"

// Complete status sheet from imrishabh18/nema-23-stepper-controller v1.2.5.
// https://tscircuit.com/imrishabh18/nema-23-stepper-controller?version=1.2.5
// Freeze the published component positions in TSX; this repo regenerates traces.
// The off-sheet USB supply connection is represented by its original VBUS net.
export default function Nema23Status() {
  const rgb = { schSheetName: "status", schSectionName: "rgb" }
  const alarm = { schSheetName: "status", schSectionName: "alarm" }
  return (
    <board
      schSheetName="status"
      schTraceAutoLabelEnabled
      schMaxTraceDistance={10}
    >
      <schematicsheet
        name="status"
        displayName="RGB status and audible alarm"
        sheetIndex={14}
      >
        <schematicsection
          name="rgb"
          displayName="Status LED — displays firmware-selected states"
        />
        <schematicsection
          name="alarm"
          displayName="Alarm — switches the buzzer from a PWM signal"
        />
      </schematicsheet>
      <chip
        name="D_STATUS"
        manufacturerPartNumber="LTST-C19HE1WT"
        schX={2.0075}
        schY={-23.7}
        {...rgb}
        connections={{ pin4: "net.VBUS" }}
      >
        <LTST_C19HE1WTSymbol name="D_STATUS" x={2.0075} y={-23.7} />
      </chip>
      {(
        [
          ["R", -1.3575, -27.3, -32.1],
          ["G", 5.6025, -26.6, -27.7],
          ["B", 5.5525, -30.2, -36.5],
        ] as const
      ).map(([color, resistorX, resistorY, transistorY]) => (
        <Fragment key={color}>
          <chip
            name={`Q_STATUS_${color}`}
            manufacturerPartNumber="DTC114EU3HZGT106"
            schX={2.4975}
            schY={transistorY}
            {...rgb}
            connections={{ pin2: `net.LED_${color}`, pin1: "net.GND" }}
          >
            <DTC114EU3HZGT106Symbol
              name={`Q_STATUS_${color}`}
              x={2.4975}
              y={transistorY}
            />
          </chip>
          <resistor
            name={`R_STATUS_${color}`}
            resistance="1k"
            schOrientation="vertical"
            schX={resistorX}
            schY={resistorY}
            {...rgb}
            connections={{
              pin1: `.D_STATUS > .${color}_NEG`,
              pin2: `.Q_STATUS_${color} > .C`,
            }}
          />
        </Fragment>
      ))}
      <chip
        name="BZ1"
        manufacturerPartNumber="HYG-8503A"
        schX={16.3125}
        schY={-28.16}
        {...alarm}
        noConnect={["NC1", "NC2"]}
        connections={{ pin1: "net.V3V3", pin2: "net.BUZZER_SINK" }}
      >
        <HYG_8503ASymbol name="BZ1" x={16.3125} y={-28.16} />
      </chip>
      <chip
        name="Q_BUZZER"
        manufacturerPartNumber="AO3400A"
        schX={13.4325}
        schY={-28.66}
        {...alarm}
        connections={{
          pin3: "net.BUZZER_SINK",
          pin2: "net.GND",
          pin1: "net.BUZZER_GATE",
        }}
      >
        <AO3400ASymbol name="Q_BUZZER" x={13.4325} y={-28.66} />
      </chip>
      <chip
        name="D_BUZZER"
        manufacturerPartNumber="B5819W-SL"
        schX={18.8925}
        schY={-28.06}
        {...alarm}
        connections={{ pin2: "net.BUZZER_SINK", pin1: "net.V3V3" }}
      >
        <B5819W_SLSymbol name="D_BUZZER" x={18.8925} y={-28.06} />
      </chip>
      <resistor
        name="R_BUZZER_GATE"
        resistance="100"
        schX={10.3525}
        schY={-28.66}
        {...alarm}
        connections={{ pin1: "net.BUZZER_PWM", pin2: "net.BUZZER_GATE" }}
      />
      <resistor
        name="R_BUZZER_PD"
        resistance="100k"
        schOrientation="vertical"
        schX={12.439166666666663}
        schY={-32.36}
        {...alarm}
        connections={{ pin1: "net.BUZZER_GATE", pin2: "net.GND" }}
      />
      <capacitor
        name="C_BUZZER"
        capacitance="10uF"
        schOrientation="vertical"
        schX={16.066666666666663}
        schY={-32.44}
        {...alarm}
        connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
      />
    </board>
  )
}

export async function createNema23Status() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Nema23Status />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
