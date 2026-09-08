import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createTwoPinPowerGroundCircuitJson } from "../assets/two-pin-component-power-ground"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

function getFlipIssues(circuitJson: CircuitJson) {
  return analyzeSchematicPlacement(circuitJson)
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
    .filter((issue) => issue.lineItemType === "TwoPinComponentCouldBeFlipped")
}

test("preserves two-pin components connected to power or ground on either pin", async () => {
  let snapshotCircuit: CircuitJson | undefined
  for (const componentKind of ["capacitor", "resistor"] as const) {
    for (const rail of ["ground", "power"] as const) {
      for (const railPin of [1, 2] as const) {
        const circuitJson = await createTwoPinPowerGroundCircuitJson({
          componentKind,
          rail,
          railPin,
        })
        expect(getFlipIssues(circuitJson)).toHaveLength(0)

        // The same geometry is eligible when that connection is a signal.
        // Even a misleading name must not override explicit classification.
        const signalCircuit = structuredClone(circuitJson)
        const net = signalCircuit.find((e) => e.type === "source_net")!
        net.name = "GND"
        net.is_ground = false
        net.is_power = false
        net.is_positive_voltage_source = false
        expect(getFlipIssues(signalCircuit)).toHaveLength(1)

        // An unrelated supply must not suppress a signal recommendation;
        // electrically joining it through a net alias must suppress it.
        const aliasedCircuit = structuredClone(signalCircuit)
        aliasedCircuit.push({
          ...net,
          source_net_id: "separate-rail",
          subcircuit_connectivity_map_key: undefined,
          is_power: true,
        })
        expect(getFlipIssues(aliasedCircuit)).toHaveLength(1)
        aliasedCircuit.push({
          type: "source_trace",
          source_trace_id: "rail-alias",
          connected_source_port_ids: [],
          connected_source_net_ids: [net.source_net_id, "separate-rail"],
        })
        expect(getFlipIssues(aliasedCircuit)).toHaveLength(0)

        // Either representation of electrical connectivity must suffice.
        for (const representation of ["source-traces", "keys"] as const) {
          const input = structuredClone(circuitJson).filter(
            (e) => representation !== "keys" || e.type !== "source_trace",
          )
          if (representation === "source-traces") {
            for (const element of input) {
              if ("subcircuit_connectivity_map_key" in element)
                delete element.subcircuit_connectivity_map_key
            }
          }
          expect(getFlipIssues(input)).toHaveLength(0)
        }

        // Pin attributes also identify rails without a classified source net.
        const trace = signalCircuit
          .filter((e) => e.type === "source_trace")
          .find((e) => e.connected_source_net_ids.includes(net.source_net_id))!
        const railPort = signalCircuit.find(
          (e) =>
            e.type === "source_port" &&
            trace.connected_source_port_ids.includes(e.source_port_id),
        )!
        for (const attribute of [
          "provides_power",
          "requires_power",
          "provides_ground",
          "requires_ground",
        ] as const) {
          const input = signalCircuit.map((e) =>
            e === railPort ? { ...e, [attribute]: true } : e,
          )
          expect(getFlipIssues(input)).toHaveLength(0)
        }

        // Older producers may only set this supply flag.
        net.is_positive_voltage_source = true
        expect(getFlipIssues(signalCircuit)).toHaveLength(0)

        if (
          railPin === 2 &&
          componentKind === "capacitor" &&
          rail === "ground"
        ) {
          snapshotCircuit = circuitJson
        }
      }
    }
  }
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson: snapshotCircuit! }),
  ).toMatchSvgSnapshot(import.meta.path)
})
