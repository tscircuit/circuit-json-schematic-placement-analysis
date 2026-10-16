import { Circuit } from "@tscircuit/core"

// Complete Clock sheet from Devesh36/pocket-audio-player v1.0.12.
// https://tscircuit.com/Devesh36/pocket-audio-player?version=1.0.12
// Extracted from audio-player-board.tsx, imports/RP2040.tsx and
// imports/ABM8_272_T3.tsx. The MCU is represented by its two-pin Clock-sheet
// projection, retaining its pin numbers, arrangement, dimensions and placement.
// Other sheets, unused MCU pins, PCB and CAD definitions are omitted.
type Placement = { schX: number; schY: number; schRotation?: number }
export type ClockPlacements = Partial<
  Record<"R_XOUT" | "C_XIN" | "C_XOUT", Placement>
>

export default function PocketAudioClock({
  placements = {},
}: {
  placements?: ClockPlacements
}) {
  return (
    <board schLayout={{ layoutMode: "relative" }}>
      <schematicsheet name="Clock" displayName="Clock">
        <schematicsection name="Clock" displayName="Clock" />
      </schematicsheet>
      <chip
        name="U1"
        manufacturerPartNumber="RP2040"
        schX={31}
        schY={23}
        schWidth={3}
        schHeight={0.8}
        schSheetName="Clock"
        schSectionName="Clock"
        schPinArrangement={{ rightSide: ["pin20", "pin21"], leftSide: [] }}
        showPinAliases
        pinLabels={{ pin20: ["XIN"], pin21: ["XOUT"] }}
        pinAttributes={{
          pin20: { isInput: true, mustBeConnected: true },
          pin21: { isOutput: true, mustBeConnected: true },
        }}
      />
      <crystal
        name="Y1"
        frequency="12MHz"
        loadCapacitance="10pF"
        pinVariant="four_pin"
        pinAttributes={{
          pin2: { requiresGround: true },
          pin4: { requiresGround: true },
        }}
        manufacturerPartNumber="ABM8-272-T3"
        supplierPartNumbers={{ jlcpcb: ["C20625731"] }}
        schX={38}
        schY={23}
        schSectionName="Clock"
        schSheetName="Clock"
      />
      <resistor
        name="R_XOUT"
        resistance="1k"
        schX={31}
        schY={15}
        schSectionName="Clock"
        schSheetName="Clock"
        connections={{ pin1: "net.XOUT", pin2: "net.XTAL_OUT" }}
        {...placements.R_XOUT}
      />
      <capacitor
        name="C_XIN"
        capacitance="15pF"
        maxVoltageRating="16V"
        schX={34.5}
        schY={15}
        schSectionName="Clock"
        schSheetName="Clock"
        schOrientation="pos_top"
        connections={{ pin1: "net.XIN", pin2: "net.GND" }}
        {...placements.C_XIN}
      />
      <capacitor
        name="C_XOUT"
        capacitance="15pF"
        maxVoltageRating="16V"
        schX={38}
        schY={15}
        schSectionName="Clock"
        schSheetName="Clock"
        schOrientation="pos_top"
        connections={{ pin1: "net.XTAL_OUT", pin2: "net.GND" }}
        {...placements.C_XOUT}
      />
      {[2, 4].map((pin) => (
        <group key={pin} schSheetName="Clock">
          <trace from={`.Y1 > .pin${pin}`} to="net.GND" schDisplayLabel="GND" />
        </group>
      ))}
      <group schSheetName="Clock">
        <trace name="XTAL_INPUT" from=".U1 > .XIN" to=".Y1 > .pin1" />
      </group>
      <group schSheetName="Clock">
        <trace name="XTAL_OUTPUT" from=".U1 > .XOUT" to=".R_XOUT > .pin1" />
      </group>
      <group schSheetName="Clock">
        <trace
          name="XTAL_RETURN"
          from=".R_XOUT > .pin2"
          to=".Y1 > .pin3"
          schDisplayLabel="XTAL_OUT"
        />
      </group>
      <group schSheetName="Clock">
        <trace
          name="XTAL_CIN"
          from=".Y1 > .pin1"
          to=".C_XIN > .pin1"
          schDisplayLabel="XIN"
        />
      </group>
      <group schSheetName="Clock">
        <trace
          name="XTAL_COUT"
          from=".Y1 > .pin3"
          to=".C_XOUT > .pin1"
          schDisplayLabel="XTAL_OUT"
        />
      </group>
    </board>
  )
}

export async function createPocketAudioClock(placements: ClockPlacements = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<PocketAudioClock placements={placements} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
