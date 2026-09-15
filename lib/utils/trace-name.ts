import type { CircuitJson, SchematicTrace } from "circuit-json"

/** Human-readable trace identity for reports; IDs remain available for lookup. */
export function getTraceName(
  circuitJson: CircuitJson,
  trace: SchematicTrace,
): string {
  const sourceTrace = circuitJson.find(
    (e) =>
      e.type === "source_trace" && e.source_trace_id === trace.source_trace_id,
  )
  if (sourceTrace?.type === "source_trace" && sourceTrace.name)
    return sourceTrace.name
  const first = trace.edges[0]
  const last = trace.edges.at(-1)
  const endpointName = (point: { x: number; y: number }, id?: string) => {
    const ports = circuitJson.filter(
      (e) =>
        e.type === "schematic_port" &&
        e.schematic_sheet_id === trace.schematic_sheet_id &&
        (id
          ? e.schematic_port_id === id
          : Math.hypot(e.center.x - point.x, e.center.y - point.y) <= 0.01),
    )
    if (ports.length !== 1 || ports[0]?.type !== "schematic_port") return
    const port = ports[0]
    const sourcePort = circuitJson.find(
      (e) =>
        e.type === "source_port" && e.source_port_id === port.source_port_id,
    )
    const component = circuitJson.find(
      (e) =>
        e.type === "schematic_component" &&
        e.schematic_component_id === port.schematic_component_id,
    )
    const sourceComponentId =
      sourcePort?.type === "source_port"
        ? sourcePort.source_component_id
        : component?.type === "schematic_component"
          ? component.source_component_id
          : undefined
    const sourceComponent = circuitJson.find(
      (e) =>
        e.type === "source_component" &&
        e.source_component_id === sourceComponentId,
    )
    if (sourceComponent?.type !== "source_component" || !sourceComponent.name)
      return
    const pin =
      sourcePort?.type === "source_port" && sourcePort.name
        ? sourcePort.name
        : port.pin_number !== undefined
          ? `pin${port.pin_number}`
          : port.display_pin_label
    return pin ? `${sourceComponent.name}.${pin}` : sourceComponent.name
  }
  const from = first && endpointName(first.from, first.from_schematic_port_id)
  const to = last && endpointName(last.to, last.to_schematic_port_id)
  if (from && to) return `${from} to ${to}`
  return (
    (sourceTrace?.type === "source_trace" && sourceTrace.display_name) ||
    from ||
    to ||
    "trace"
  )
}
