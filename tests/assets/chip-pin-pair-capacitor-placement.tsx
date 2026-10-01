import { Circuit } from "@tscircuit/core"
import type { ChipProps } from "@tscircuit/props"

export async function createChipPinPairCapacitorPlacement({
  nearPins = false,
  rotation = 0,
  mirrored = false,
  capacitorPosition,
  pinNames = ["A", "B"],
  pinAttributes,
  differentChips = false,
  sharedConnection = false,
}: {
  nearPins?: boolean
  rotation?: number
  mirrored?: boolean
  capacitorPosition?: { x: number; y: number }
  pinNames?: readonly [string, string]
  pinAttributes?: ChipProps["pinAttributes"]
  differentChips?: boolean
  sharedConnection?: boolean
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const position = (x: number, y: number) => {
    const angle = (rotation * Math.PI) / 180
    x *= mirrored ? -1 : 1
    return {
      schX: x * Math.cos(angle) - y * Math.sin(angle),
      schY: x * Math.sin(angle) + y * Math.cos(angle),
    }
  }
  const cap = capacitorPosition ?? (nearPins ? { x: -3, y: 0 } : { x: 4, y: 5 })
  const turns = rotation / 90
  const sides = ["leftSide", "bottomSide", "rightSide", "topSide"] as const
  const pair = (pins: string[], side: (typeof sides)[number]) => ({
    pins: turns >= 2 ? pins.toReversed() : pins,
    direction:
      side === "leftSide" || side === "rightSide"
        ? ("top-to-bottom" as const)
        : ("left-to-right" as const),
  })
  const pairSide = sides[(turns + (mirrored ? 2 : 0)) % 4]!
  const oppositeSide = sides[(turns + (mirrored ? 0 : 2)) % 4]!
  const remainingSide = sides[(turns + 1) % 4]!
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={4}>
      <chip
        name="U1"
        schX={0}
        schY={0}
        schWidth={turns % 2 ? 1.6 : 2}
        schHeight={turns % 2 ? 2 : 1.6}
        pinLabels={{
          pin1: pinNames[0],
          pin2: pinNames[1],
          pin3: "C",
          pin4: "D",
          pin5: "E",
        }}
        pinAttributes={pinAttributes}
        schPinArrangement={{
          [pairSide]: pair(["pin1", "pin2"], pairSide),
          [oppositeSide]: pair(["pin3", "pin4"], oppositeSide),
          [remainingSide]: pair(["pin5"], remainingSide),
        }}
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        {...position(cap.x, cap.y)}
        schRotation={rotation + (nearPins ? 90 : -90)}
      />
      {differentChips && <chip name="U2" pinLabels={{ pin1: "A" }} schX={-6} />}
      {sharedConnection && (
        <resistor name="R1" resistance="10k" schX={-5} schY={3} />
      )}
      <trace name="T1" from=".U1 > .pin2" to=".C1 > .pin1" />
      <trace
        name="T2"
        from={differentChips ? ".U2 > .pin1" : ".U1 > .pin1"}
        to=".C1 > .pin2"
      />
      {sharedConnection && (
        <trace name="T3" from=".R1 > .pin1" to=".C1 > .pin1" />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
