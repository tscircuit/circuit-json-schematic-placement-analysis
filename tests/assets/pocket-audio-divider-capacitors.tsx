import React from "react"
import { Circuit } from "@tscircuit/core"
// Real-board functional network extract: https://tscircuit.com/Devesh36/pocket-audio-player?version=1.0.12#schematic
// Release a3d7fc37-f1b7-4951-b34b-b5867fe6c763; source audio-player-board.tsx.
// Published positions, pin-to-net connections, values and native symbols are retained.
// Only the 6 parts in this network are included; the board outside its named
// boundary nets, PCB placement and sheet frames are omitted. This is not a full-board repro.
// The correction changes placement/orientation and allows local direct wires up to
// five schematic units. It never edits generated Circuit JSON or electrical metadata.
function Network({
  after,
  orientationOnly,
  channel,
}: {
  after: boolean
  orientationOnly: boolean
  channel?: "L" | "R"
}) {
  return (
    <>
      {(channel ? [channel] : (["L", "R"] as const)).map((channel, k) => {
        const n = channel === "R" ? 1 : k
        const original = [9.5 + 7 * n, 13 + 7 * n, 6 + 3.5 * n]
        const x = 9.5 + 9 * n
        return (
          <React.Fragment key={channel}>
            <resistor
              name={`R_ATT_${channel}1`}
              schX={after ? x - 2 : original[0]}
              schY={-15}
              resistance="10k"
              footprint="0603"
              connections={{
                pin1: `net.LINE_${channel}`,
                pin2: `net.ATT_${channel}`,
              }}
            />
            <resistor
              name={`R_ATT_${channel}2`}
              schX={after ? x : original[1]}
              schY={after ? -16.5 : -15}
              schRotation={after || orientationOnly ? -90 : 0}
              resistance="10k"
              footprint="0603"
              connections={{ pin1: `net.ATT_${channel}`, pin2: "net.GND" }}
            />
            <capacitor
              name={`C_AMP_${channel}`}
              schX={after ? x + 1.5 : original[2]}
              schY={after ? -15 : -19}
              schOrientation={after ? "pos_left" : "pos_top"}
              capacitance="1uF"
              maxVoltageRating="16V"
              footprint="0603"
              connections={{
                pin1: `net.ATT_${channel}`,
                pin2: `net.AMP_${channel}`,
              }}
            />
          </React.Fragment>
        )
      })}
    </>
  )
}

export async function createPocketAudioDividerCapacitors(
  after = false,
  orientationOnly = false,
  channel?: "L" | "R",
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board
      schLayout={{ layoutMode: "relative" }}
      schMaxTraceDistance={after ? 5 : undefined}
    >
      <Network
        after={after}
        orientationOnly={orientationOnly}
        channel={channel}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
