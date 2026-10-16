import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"

export async function createSwitchMatrixDiodes({
  rows = 2,
  columns = 2,
  close = false,
  vertical = false,
  reverseDiodes = false,
  extraBranch = false,
  rowSpacing = 12,
  columnSpacing = 18,
  matrices = 1,
  obstacle,
}: {
  rows?: number
  columns?: number
  close?: boolean
  vertical?: boolean
  reverseDiodes?: boolean
  extraBranch?: boolean
  rowSpacing?: number
  columnSpacing?: number
  matrices?: number
  obstacle?: "component" | "text" | "label"
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const position = (x: number, y: number) =>
    vertical ? { schX: -y, schY: x } : { schX: x, schY: y }
  circuit.add(
    <board>
      {Array.from({ length: rows * columns * matrices }, (_, i) => {
        const matrix = Math.floor(i / (rows * columns))
        const row = Math.floor((i % (rows * columns)) / columns)
        const busPrefix = matrix === 0 ? "" : `M${matrix}_`
        const x = (i % columns) * columnSpacing + matrix * 60,
          y = -row * rowSpacing
        return (
          <Fragment key={i}>
            <pushbutton
              name={`S${i}`}
              {...position(x, y)}
              schRotation={vertical ? 90 : 0}
              connections={{
                pin1: `.D${i} > .pin1`,
                pin2: `net.${busPrefix}B${i % columns}`,
              }}
            />
            <diode
              name={`D${i}`}
              {...position(x + (close ? -2 : 7), y + (close ? 0.6 : -3))}
              schRotation={(vertical ? 90 : 0) + (reverseDiodes ? 180 : 0)}
              connections={{ pin2: `net.${busPrefix}A${row}` }}
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
      {obstacle === "component" && (
        <chip
          name="intervening"
          schX={columnSpacing / 2}
          schY={-rowSpacing / 2}
          schWidth={2}
          schHeight={rowSpacing - 4}
          pinLabels={{ pin1: "A", pin2: "B" }}
        />
      )}
      {obstacle === "label" && (
        <netlabel
          net="LONG_ANNOTATION_THAT_RESERVES_VERTICAL_SPACE_123456"
          schX={1}
          schY={-10}
          anchorSide="bottom"
        />
      )}
      {obstacle === "text" && (
        <schematictext
          text={Array.from({ length: 13 }, () => "Room for annotation").join(
            "\n",
          )}
          schX={0}
          schY={0}
          anchor="top_left"
          fontSize={0.5}
        />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
