import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"

export async function renderParallelLedBranches({
  rotation = 0,
  layout = "inline",
  topology = "parallel",
  count = 3,
}: {
  rotation?: number
  layout?: "inline" | "beside" | "offset" | "staggered" | "overlap" | "bent"
  topology?:
    | "parallel"
    | "shared-rails"
    | "separate-returns"
    | "tapped-junction"
    | "tapped-return"
    | "zero-ohm"
    | "different-group"
    | "shorted"
  count?: number
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const theta = (rotation * Math.PI) / 180
  const point = (x: number, y: number) => ({
    schX: 10 + x * Math.cos(theta) - y * Math.sin(theta),
    schY: 4 + x * Math.sin(theta) + y * Math.cos(theta),
  })
  circuit.add(
    <board
      schLayout={{ layoutMode: "relative" }}
      schTraceAutoLabelEnabled={false}
    >
      <net name="a" isPowerNet />
      <net name="z" isGroundNet={topology === "shared-rails"} />
      {Array.from({ length: count }, (_, i) => {
        const beside = layout === "beside" || layout === "offset"
        const x = beside
          ? layout === "offset"
            ? i * 0.3
            : 0
          : i * (layout === "overlap" ? 1 : 5)
        const y = beside || layout === "staggered" ? i * 3 : 0
        const pair = (
          <Fragment>
            <resistor
              name={`a${i}`}
              resistance={topology === "zero-ohm" && i === 0 ? 0 : 1000}
              {...point(x, y)}
              schRotation={rotation}
              connections={{ pin1: "net.a", pin2: `net.j${i}` }}
            />
            <led
              name={`b${i}`}
              {...point(x + 2, y + (layout === "bent" ? 0.7 : 0))}
              schRotation={rotation}
              connections={{
                anode: `net.j${i}`,
                cathode:
                  topology === "separate-returns"
                    ? `net.z${i}`
                    : topology === "shorted"
                      ? "net.a"
                      : "net.z",
              }}
            />
          </Fragment>
        )
        return topology === "different-group" && i === 0 ? (
          <group key={i} name="separate">
            {pair}
          </group>
        ) : (
          <Fragment key={i}>{pair}</Fragment>
        )
      })}
      <chip
        name="endpoint"
        pinLabels={{ pin1: "unrelated" }}
        {...point(20, 8)}
        connections={{ pin1: "net.z" }}
      />
      {(topology === "tapped-junction" || topology === "tapped-return") && (
        <chip
          name="extra"
          pinLabels={{ pin1: "unrelated" }}
          {...point(23, 8)}
          connections={{
            pin1: topology === "tapped-junction" ? "net.j0" : "net.z",
          }}
        />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
