import { calculateElbow, type ElbowPoint } from "calculate-elbow/lib"
import type { CircuitJson, SchematicPort } from "circuit-json"

/** Apply a placement change to the existing screenshot repro, then regenerate
 * every wire from the moved pins, shared divider junction, and attached rails.
 * This is a concrete repro fix, not a general-purpose placement optimizer.
 */
export function compactRailPathRepro(input: CircuitJson): CircuitJson {
  const circuit = structuredClone(input)
  // Stable fixture IDs select objects; their displayed names establish no roles.
  const targets = new Map([
    ["sch-series", { x: 5, y: 4 }],
    ["sch-upper", { x: 3, y: 3 }],
    ["sch-lower", { x: 3, y: 1.5 }],
    ["sch-filter", { x: 4.5, y: 1.5 }],
  ])
  for (const element of circuit) {
    if (element.type !== "schematic_component") continue
    const target = targets.get(element.schematic_component_id)
    if (!target) continue
    const delta = {
      x: target.x - element.center.x,
      y: target.y - element.center.y,
    }
    element.center = { ...target }
    for (const port of circuit) {
      if (
        port.type === "schematic_port" &&
        port.schematic_component_id === element.schematic_component_id
      )
        port.center = { x: port.center.x + delta.x, y: port.center.y + delta.y }
    }
  }
  const ports = new Map(
    circuit
      .filter((e): e is SchematicPort => e.type === "schematic_port")
      .map((e) => [e.schematic_port_id, e]),
  )
  const directions = { left: "x-", right: "x+", up: "y+", down: "y-" } as const
  const pin = (id: string): ElbowPoint => {
    const port = ports.get(id)
    if (!port) throw new Error(`Missing repro pin ${id}`)
    return {
      ...port.center,
      facingDirection: port.facing_direction
        ? directions[port.facing_direction]
        : undefined,
    }
  }
  const top = pin("sch-upper-bottom"),
    bottom = pin("sch-lower-top")
  const junction = { x: top.x, y: (top.y + bottom.y) / 2 }
  const rails = new Map<string, ElbowPoint>()
  for (const [labelId, portId] of [
    ["label-lower", "sch-lower-bottom"],
    ["label-filter", "sch-filter-bottom"],
  ]) {
    const port = pin(portId!)
    const label = circuit.find(
      (e) =>
        e.type === "schematic_net_label" &&
        e.schematic_net_label_id === labelId,
    )
    if (label?.type !== "schematic_net_label")
      throw new Error(`Missing repro rail ${labelId}`)
    const anchor = { x: port.x, y: port.y - 0.65 }
    const offset = {
      x: label.center.x - label.anchor_position.x,
      y: label.center.y - label.anchor_position.y,
    }
    label.anchor_position = anchor
    label.center = { x: anchor.x + offset.x, y: anchor.y + offset.y }
    rails.set(labelId!, { ...anchor, facingDirection: "y+" })
  }
  const routes = new Map<string, ElbowPoint[]>([
    ["sense-wire", [pin("sch-host-sense"), pin("sch-series-right")]],
    ["long-input-wire", [pin("sch-series-left"), pin("sch-upper-top")]],
    ["tap-wire", [top, junction, bottom]],
    [
      "filter-wire",
      [{ ...junction, facingDirection: "x+" }, pin("sch-filter-top")],
    ],
    ["rail-wire-lower", [pin("sch-lower-bottom"), rails.get("label-lower")!]],
    [
      "rail-wire-filter",
      [pin("sch-filter-bottom"), rails.get("label-filter")!],
    ],
  ])
  for (const element of circuit) {
    if (element.type === "schematic_trace") {
      const endpoints = routes.get(element.schematic_trace_id)
      if (!endpoints)
        throw new Error(`Unsupported repro trace ${element.schematic_trace_id}`)
      const points = endpoints
        .slice(1)
        .flatMap((end, i) => {
          const route = calculateElbow(endpoints[i]!, end)
          return i === 0 ? route : route.slice(1)
        })
        .filter(
          (p, i, all) =>
            i === 0 || p.x !== all[i - 1]!.x || p.y !== all[i - 1]!.y,
        )
      element.edges = points.slice(1).map((to, i) => ({ from: points[i]!, to }))
      element.junctions =
        element.schematic_trace_id === "tap-wire" ||
        element.schematic_trace_id === "filter-wire"
          ? [{ ...junction }]
          : []
    }
    if (
      element.type === "schematic_text" &&
      element.schematic_text_id === "heading"
    )
      element.position = { x: 3.5, y: -0.55 }
  }
  return circuit
}
