import type { CircuitJson, SchematicPort, SchematicTrace } from "circuit-json"
import {
  getReproSchematicComponent,
  getReproSourcePort,
} from "../../fixtures/placement-repro-assertions"
import { watchyI2cPullups } from "."

const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y) < 0.00001

function schematicPort(
  { name, pin }: { name: string; pin: string },
  json: CircuitJson,
) {
  const source = getReproSourcePort(json, name, pin)
  const port = json.find(
    (element): element is SchematicPort =>
      element.type === "schematic_port" &&
      element.source_port_id === source.source_port_id,
  )
  if (!port) throw new Error(`Missing schematic port ${name}.${pin}`)
  return port
}

function traceAt(json: CircuitJson, point: { x: number; y: number }) {
  const traces = json.filter(
    (element): element is SchematicTrace =>
      element.type === "schematic_trace" &&
      element.edges.some(
        (edge) => near(edge.from, point) || near(edge.to, point),
      ),
  )
  if (traces.length !== 1)
    throw new Error(`Expected one trace at ${point.x}, ${point.y}`)
  return traces[0]!
}

function traceText(json: CircuitJson, trace: SchematicTrace) {
  const label = json.find(
    (element) =>
      element.type === "schematic_text" &&
      "source_trace_id" in element &&
      element.source_trace_id === trace.source_trace_id,
  )
  if (label?.type !== "schematic_text")
    throw new Error(`Missing label for ${trace.source_trace_id}`)
  return label
}

/** Show the same real Watchy nets as conventional vertical pull-ups. */
export function getGroupedWatchyI2cPullups(): CircuitJson {
  const json = structuredClone(watchyI2cPullups)
  const r18 = getReproSchematicComponent(json, "R18")
  const r20 = getReproSchematicComponent(json, "R20")
  const sda = schematicPort({ name: "R18", pin: "pin1" }, json)
  const r18Power = schematicPort({ name: "R18", pin: "pin2" }, json)
  const scl = schematicPort({ name: "R20", pin: "pin1" }, json)
  const r20Power = schematicPort({ name: "R20", pin: "pin2" }, json)
  const sdaLabelTrace = traceAt(json, sda.center)
  const r18PowerTrace = traceAt(json, r18Power.center)
  const sclTrace = traceAt(json, scl.center)
  const r20PowerTrace = traceAt(json, r20Power.center)
  const sdaLabel = traceText(json, sdaLabelTrace)
  const powerLabel = traceText(json, r20PowerTrace)
  const u6Scl = schematicPort({ name: "U6", pin: "pin12" }, json)
  const u6Power = schematicPort({ name: "U6", pin: "pin3" }, json)

  // Each resistor rises from its signal to a common P3V3 rail.
  for (const [resistor, signal, power, x] of [
    [r18, sda, r18Power, 24.8],
    [r20, scl, r20Power, 26.6],
  ] as const) {
    resistor.center = { x, y: -18 }
    resistor.size = { width: 0.65, height: 0.6 }
    resistor.symbol_name = "boxresistor_up"
    signal.center = { x, y: -18.3 }
    signal.facing_direction = "down"
    power.center = { x, y: -17.7 }
    power.facing_direction = "up"
  }

  sdaLabelTrace.edges = [
    { from: { ...sda.center }, to: { x: sda.center.x, y: -18.9 } },
    { from: { x: sda.center.x, y: -18.9 }, to: { x: 24.2, y: -18.9 } },
  ]
  sdaLabel.position = { x: 24.2, y: -18.84 }

  // Keep the real U6 connections and join both resistor tops at P3V3.
  r18PowerTrace.edges = [
    { from: { ...r18Power.center }, to: { x: r18Power.center.x, y: -17.1 } },
    { from: { x: r18Power.center.x, y: -17.1 }, to: { x: 23.34, y: -17.1 } },
    { from: { x: 23.34, y: -17.1 }, to: { x: 23.34, y: u6Power.center.y } },
    { from: { x: 23.34, y: u6Power.center.y }, to: { ...u6Power.center } },
  ]
  r20PowerTrace.edges = [
    { from: { ...r20Power.center }, to: { x: r20Power.center.x, y: -17.1 } },
    {
      from: { x: r20Power.center.x, y: -17.1 },
      to: { x: r18Power.center.x, y: -17.1 },
    },
  ]
  powerLabel.anchor = "center"
  powerLabel.position = { x: 25.7, y: -17.04 }
  // The published R18 power label sat on its old route below the resistor.
  // The shared top rail now carries the visible P3V3 label.
  const oldPowerLabelIndex = json.findIndex(
    (element) =>
      element.type === "schematic_text" &&
      "source_trace_id" in element &&
      element.source_trace_id === "source_trace_185",
  )
  if (oldPowerLabelIndex < 0) throw new Error("Missing old R18 P3V3 label")
  json.splice(oldPowerLabelIndex, 1)

  sclTrace.edges = [
    { from: { ...u6Scl.center }, to: { x: scl.center.x, y: u6Scl.center.y } },
    { from: { x: scl.center.x, y: u6Scl.center.y }, to: { ...scl.center } },
  ]
  return json
}
