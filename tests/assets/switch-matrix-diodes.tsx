import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"

export async function createSwitchMatrixDiodes({
  rows = 2,
  columns = 2,
  close = false,
  vertical = false,
  reverseDiodes = false,
  extraBranch = false,
}: {
  rows?: number
  columns?: number
  close?: boolean
  vertical?: boolean
  reverseDiodes?: boolean
  extraBranch?: boolean
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const position = (x: number, y: number) =>
    vertical ? { schX: -y, schY: x } : { schX: x, schY: y }
  circuit.add(
    <board>
      {Array.from({ length: rows * columns }, (_, i) => {
        const x = (i % columns) * 18,
          y = -Math.floor(i / columns) * 12
        return (
          <Fragment key={i}>
            <pushbutton
              name={`S${i}`}
              {...position(x, y)}
              schRotation={vertical ? 90 : 0}
              connections={{
                pin1: `.D${i} > .pin1`,
                pin2: `net.B${i % columns}`,
              }}
            />
            <diode
              name={`D${i}`}
              {...position(x + (close ? -2 : 7), y + (close ? 0.6 : -3))}
              schRotation={(vertical ? 90 : 0) + (reverseDiodes ? 180 : 0)}
              connections={{ pin2: `net.A${Math.floor(i / columns)}` }}
            />
            {extraBranch && (
              <resistor
                name={`X${i}`}
                resistance="1k"
                {...position(x - 5, y - 5)}
                connections={{ pin1: `.S${i} > .pin1`, pin2: `net.EXTRA${i}` }}
              />
            )}
          </Fragment>
        )
      })}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
