import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"

type Position = [number, number, number]
async function render({
  positions = [
    [0, 0, 0],
    [5, 0, 0],
    [10, 0, 0],
    [0, 3, 0],
  ] as Position[],
  rotation = 0,
  topology = "series",
}: {
  positions?: Position[]
  rotation?: number
  topology?: "series" | "parallel" | "loop" | "tap"
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const a = (rotation * Math.PI) / 180
  circuit.add(
    <board>
      {positions.map(([x, y, angle], i) => (
        <led
          key={i}
          name={`A${i}`}
          schX={x * Math.cos(a) - y * Math.sin(a)}
          schY={x * Math.sin(a) + y * Math.cos(a)}
          schRotation={angle + rotation}
          connections={{
            anode: `net.junction_${topology === "parallel" ? 0 : i}`,
            cathode: `net.junction_${topology === "parallel" ? 1 : topology === "loop" ? (i + 1) % positions.length : i + 1}`,
          }}
        />
      ))}
      {topology === "tap" && (
        <resistor
          name="B"
          resistance="1k"
          schX={-5}
          schY={-4}
          connections={{ pin1: "net.junction_2", pin2: "net.return" }}
        />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

test("finds remote backward LED links by typed connectivity and accepts readable or ambiguous arrangements", async () => {
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, {
      issueTypes: ["SeriesLedChainNotOrdered"],
    }).getIssues()
  for (const rotation of [0, 90, 180, 270]) {
    expect(issues(await render({ rotation }))).toHaveLength(1)
    for (const positions of [
      [
        [0, 0, 0],
        [3, 0.2, 0],
        [6, 0, 0],
        [9, 0.2, 0],
      ],
      [
        [0, 0, -90],
        [0, -3, -90],
        [0, -6, -90],
        [0, -9, -90],
      ],
      [
        [0, 0, 0],
        [3, 0, 0],
        [3, -3, 180],
        [0, -3, 180],
      ],
      // Wide but properly ordered spacing is not itself a finding.
      [
        [0, 0, 0],
        [10, 0, 0],
        [20, 0, 0],
        [30, 0, 0],
      ],
      // Small backward offsets do not justify a chain advisory.
      [
        [0, 0, 0],
        [2, 0, 0],
        [2.5, 2, 0],
        [1, 2, 180],
      ],
    ] as Position[][])
      expect(issues(await render({ rotation, positions }))).toEqual([])
  }
  for (const topology of ["parallel", "loop", "tap"] as const) {
    expect(issues(await render({ topology }))).toEqual([])
  }
  expect(
    issues(
      await render({
        positions: [
          [0, 0, 0],
          [-10, 0, 0],
        ],
      }),
    ),
  ).toEqual([])
  const original = await render()
  const untouched = JSON.stringify(original)
  expect(issues(original)).toHaveLength(1)
  expect(JSON.stringify(original)).toBe(untouched)
  const renamed = structuredClone(original)
  for (const e of renamed) {
    if (e.type === "source_port") {
      e.name = "unknown"
      e.port_hints = []
    }
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "unknown"
  }
  expect(issues(renamed)).toHaveLength(1)
  expect(issues([...original].reverse())).toEqual(issues(original))
  const id = original.find(
    (e) => e.type === "source_component",
  )!.source_component_id
  for (const field of ["schematic_sheet_id", "schematic_group_id"] as const) {
    const json = structuredClone(original)
    for (const e of json)
      if (e.type === "schematic_component" && e.source_component_id === id)
        e[field] = "elsewhere"
    expect(issues(json)).toEqual([])
  }
  expect(issues(original.filter((e) => e.type !== "schematic_port"))).toEqual(
    [],
  )
  const ambiguous = structuredClone(original)
  for (const e of ambiguous)
    if (e.type === "source_component")
      Object.assign(e, { ftype: "simple_chip" })
  expect(issues(ambiguous)).toEqual([])
  const noConnect = structuredClone(original)
  const port = noConnect.find((e) => e.type === "source_port")!
  port.do_not_connect = true
  expect(issues(noConnect)).toEqual([])
})
