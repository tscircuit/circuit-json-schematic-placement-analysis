import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import type { CircuitJson } from "circuit-json"

async function render({
  rotation = 0,
  x = 7,
  y = 0,
  ground = true,
  shared = false,
  supply = false,
  resistance = "1k",
} = {}) {
  const a = (rotation * Math.PI) / 180
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <net name="return" isGroundNet={ground} />
      <chip
        name="A7"
        schX={0}
        schY={0}
        schWidth={2}
        schHeight={2}
        pinLabels={{ pin1: "arbitrary", pin2: "other", pin3: "unused" }}
        schPinArrangement={{
          [["leftSide", "bottomSide", "rightSide", "topSide"][rotation / 90]!]:
            [1, 2, 3],
        }}
        pinAttributes={{ pin1: { requiresPower: supply } }}
        connections={{ pin1: "net.branch" }}
      />
      <resistor
        name="X42"
        resistance={resistance}
        schX={x * Math.cos(a) - y * Math.sin(a)}
        schY={x * Math.sin(a) + y * Math.cos(a)}
        connections={{ pin1: "net.branch", pin2: "net.return" }}
      />
      {shared && (
        <capacitor
          name="B9"
          capacitance="1nF"
          schX={-4}
          schY={-3}
          connections={{ pin1: "net.branch", pin2: "net.return" }}
        />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

test("uses connectivity, ground metadata and actual chip pin direction for resistor placement", async () => {
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, {
      issueTypes: ["ResistorSeparatedFromChipPin"],
    }).getIssues()
  for (const rotation of [0, 90, 180, 270]) {
    expect(issues(await render({ rotation }))).toHaveLength(1)
    // Already beside the connected pin, even with an offset or substantial separation.
    expect(issues(await render({ rotation, x: -4, y: 1 }))).toEqual([])
  }
  for (const options of [
    { ground: false },
    { shared: true },
    { supply: true },
    { resistance: "0" },
    { x: 1.5 },
    { x: -10 },
  ]) {
    expect(issues(await render(options))).toEqual([])
  }
  const original = await render()
  const namesRemoved = structuredClone(original)
  for (const e of namesRemoved) {
    if (e.type === "source_port") {
      e.name = "unknown"
      e.port_hints = []
    }
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "unknown"
  }
  expect(issues(namesRemoved)).toHaveLength(1)
  const resistor = original.find(
    (e) => e.type === "source_component" && e.ftype === "simple_resistor",
  )!
  for (const field of ["schematic_sheet_id", "schematic_group_id"] as const) {
    const json = structuredClone(original)
    for (const e of json)
      if (
        e.type === "schematic_component" &&
        resistor.type === "source_component" &&
        e.source_component_id === resistor.source_component_id
      )
        e[field] = "separate"
    expect(issues(json)).toEqual([])
  }
  const incomplete = original.filter((e) => e.type !== "schematic_port")
  expect(issues(incomplete)).toEqual([])
})
