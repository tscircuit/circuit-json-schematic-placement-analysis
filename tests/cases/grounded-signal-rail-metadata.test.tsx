import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"

const analyze = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, {
    issueTypes: ["TwoPinComponentHasInvertedRails"],
  })
async function build(
  kind: "resistor" | "capacitor" | "diode",
  after = false,
  groundPin = 2,
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const props = {
    name: "X1",
    footprint: "0805",
    schRotation: (groundPin === 2 ? 90 : -90) + (after ? 180 : 0),
    connections:
      groundPin === 2
        ? { pin1: "net.SIGNAL", pin2: "net.RETURN" }
        : { pin1: "net.RETURN", pin2: "net.SIGNAL" },
  }
  circuit.add(
    <board schLayout={{ layoutMode: "relative" }}>
      {kind === "resistor" ? (
        <resistor {...props} resistance="10k" />
      ) : kind === "capacitor" ? (
        <capacitor {...props} capacitance="100nF" />
      ) : (
        <diode {...props} />
      )}
      <net name="RETURN" isGroundNet />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
test("uses typed ground evidence for passive shunts on either pin and skips supply or uncertain branches", async () => {
  for (const kind of ["resistor", "capacitor", "diode"] as const)
    for (const groundPin of [1, 2]) {
      const before = await build(kind, false, groundPin),
        after = await build(kind, true, groundPin)
      const analysis = analyze(before),
        corrected = analyze(after)
      expect(analysis.getIssues()).toMatchObject([
        {
          lineItemType: "TwoPinComponentHasInvertedRails",
          railType: "ground",
          deltaSchRotation: 180,
          suggestedRailFacingDirection: "down",
        },
      ])
      expect(corrected.getIssues()).toEqual([])
      expect(
        before.filter(
          (e) => e.type.startsWith("source_") && !e.type.endsWith("_warning"),
        ),
      ).toEqual(
        after.filter(
          (e) => e.type.startsWith("source_") && !e.type.endsWith("_warning"),
        ),
      )
      expect(
        createPlacementComparisonSvg({
          subject: `grounded ${kind}, pin ${groundPin}`,
          before: { circuitJson: before, analysis },
          after: { circuitJson: after, analysis: corrected },
          issues: analysis.getIssues(),
          panelHeight: 450,
          beforeDiagnostic: () => "Ground faces up.",
          afterDiagnostic: "Ground faces down; original connections preserved.",
          note: "Typed-metadata control; no electrical role inferred from labels.",
        }),
      ).toMatchSvgSnapshot(import.meta.path, `${kind}-pin${groundPin}`)
    }
  const original = await build("capacitor")
  const renamed = original.map((e, i) =>
    e.type === "source_net" ||
    e.type === "source_port" ||
    e.type === "source_component"
      ? {
          ...e,
          name: `opaque_${i}`,
          ...(e.type === "source_port" ? { port_hints: [] } : {}),
        }
      : e,
  )
  expect(analyze(renamed).getIssues()).toHaveLength(1)
  const controls: Record<string, CircuitJson> = {
    "name alone is insufficient": original.map((e) =>
      e.type === "source_net" ? { ...e, is_ground: false } : e,
    ),
    "both pins grounded": original.map((e) =>
      e.type === "source_net" ? { ...e, is_ground: true } : e,
    ),
    "contradictory rail": original.map((e) =>
      e.type === "source_net" && e.is_ground ? { ...e, is_power: true } : e,
    ),
    "supply instead of signal": original.map((e) =>
      e.type === "source_net" && !e.is_ground ? { ...e, is_power: true } : e,
    ),
    "negative supply declaration": original.map((e) =>
      e.type === "source_port" && e.pin_number === 1
        ? { ...e, provides_voltage: -5 }
        : e,
    ),
    "supply pin": original.map((e) =>
      e.type === "source_port" && e.pin_number === 1
        ? { ...e, requires_power: true }
        : e,
    ),
    "do not connect": original.map((e) =>
      e.type === "source_port" ? { ...e, do_not_connect: true } : e,
    ),
    "missing geometry": original.filter((e) => e.type !== "schematic_port"),
    connector: original.map((e) =>
      e.type === "source_component"
        ? { ...e, ftype: "simple_pin_header", pin_count: 2, gender: "male" }
        : e,
    ),
  }
  for (const [name, json] of Object.entries(controls))
    expect(analyze(json).getIssues(), name).toEqual([])
  const pinTyped = original.map((e) =>
    e.type === "source_net"
      ? { ...e, is_ground: false }
      : e.type === "source_port" && e.pin_number === 2
        ? { ...e, requires_ground: true }
        : e,
  )
  expect(analyze(pinTyped).getIssues()).toHaveLength(1)
  const copy = structuredClone(original)
  analyze(original)
  expect(original).toEqual(copy)
})
