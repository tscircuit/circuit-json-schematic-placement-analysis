import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createCorrectedUsbHubCrystalNetwork(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm" routingDisabled>
      <chip
        name="U13"
        footprint="pinrow3_p2.54"
        pinLabels={{
          pin1: "XTAL1",
          pin2: "XTAL2",
          pin3: "GND",
        }}
        schX={0}
        schY={4}
      />
      <crystal
        name="Y2"
        frequency="24MHz"
        loadCapacitance="12pF"
        pinVariant="four_pin"
        footprint="pinrow4_p2.54"
        schX={0}
        schY={1.2}
      />
      <capacitor
        name="C31"
        capacitance="18pF"
        footprint="0402"
        schX={-2}
        schY={0}
        schOrientation="vertical"
      />
      <capacitor
        name="C32"
        capacitance="18pF"
        footprint="0402"
        schX={2}
        schY={0}
        schOrientation="vertical"
      />
      <resistor
        name="R33"
        resistance="1M"
        footprint="0402"
        schX={0}
        schY={2.4}
      />

      <trace from=".U13 > .XTAL1" to=".R33 > .pin1" schDisplayLabel="XTAL1" />
      <trace from=".R33 > .pin1" to=".Y2 > .pin1" schDisplayLabel="XTAL1" />
      <trace from=".Y2 > .pin1" to=".C31 > .pin1" schDisplayLabel="XTAL1" />
      <trace from=".U13 > .XTAL2" to=".R33 > .pin2" schDisplayLabel="XTAL2" />
      <trace from=".R33 > .pin2" to=".Y2 > .pin3" schDisplayLabel="XTAL2" />
      <trace from=".Y2 > .pin3" to=".C32 > .pin1" schDisplayLabel="XTAL2" />
      <trace from=".Y2 > .pin2" to="net.GND" />
      <trace from=".U13 > .GND" to=".Y2 > .pin4" />
      <trace from=".C31 > .pin2" to="net.GND" />
      <trace from=".C32 > .pin2" to="net.GND" />
      <netlabel
        net="GND"
        connectsTo=".U13 > .GND"
        schX={1.4}
        schY={1.7}
        anchorSide="top"
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  const upperGroundBend = { x: 1.4, y: 4 }

  return circuit
    .getCircuitJson()
    .filter(
      (element) =>
        element.type !== "schematic_trace" ||
        !element.source_trace_id?.startsWith("available-net-orientation-"),
    )
    .map((element) =>
      element.type === "schematic_trace"
        ? {
            ...element,
            junctions: element.junctions.filter(
              (junction) =>
                Math.abs(junction.x - upperGroundBend.x) > 1e-6 ||
                Math.abs(junction.y - upperGroundBend.y) > 1e-6,
            ),
          }
        : element,
    )
}
