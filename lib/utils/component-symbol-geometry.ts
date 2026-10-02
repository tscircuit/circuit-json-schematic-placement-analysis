import { cju } from "@tscircuit/circuit-json-util"
import type { CircuitJson, SchematicText } from "circuit-json"
import { symbols } from "schematic-symbols"
import type { RectBounds } from "./geometry"
import { polygonBounds } from "./schematic-text-geometry"

/** The renderer expands {REF}/{VAL} without creating schematic_text records.
 * Match its angular port pairing and uniform scale/translation, including
 * scaled symbols. Symbol text stays upright and uses a fixed 0.18 font size.
 */
export function getComponentSymbolGeometry(
  circuitJson: CircuitJson,
): Map<string, { texts: SchematicText[]; bounds?: RectBounds }> {
  const geometry = new Map<
    string,
    { texts: SchematicText[]; bounds?: RectBounds }
  >()
  const db = cju(circuitJson)
  for (const component of db.schematic_component.list()) {
    if (component.is_box_with_pins === false || !component.symbol_name) continue
    const symbol = symbols[component.symbol_name as keyof typeof symbols]
    if (!symbol) continue
    const ports = db.schematic_port.list({
      schematic_component_id: component.schematic_component_id,
    })
    const angle = (p: { x: number; y: number }, c: { x: number; y: number }) =>
      Math.atan2(p.y - c.y, p.x - c.x)
    const available = [...symbol.ports].sort(
      (a, b) => angle(a, symbol.center) - angle(b, symbol.center),
    )
    const matches = ports
      .sort(
        (a, b) =>
          angle(a.center, component.center) - angle(b.center, component.center),
      )
      .flatMap((port) => {
        const a = angle(port.center, component.center)
        const candidates = available
          .map((p, i) => {
            const delta = Math.abs(a - angle(p, symbol.center))
            return { p, i, delta: Math.min(delta, 2 * Math.PI - delta) }
          })
          .sort((a, b) => a.delta - b.delta)
        const best = candidates[0]
        if (!best || best.delta >= Math.PI / 4) return []
        available.splice(best.i, 1)
        return [{ real: port.center, symbol: best.p }]
      })
    const first = matches[0]
    if (!first) continue
    const second = matches[1] ?? {
      real: component.center,
      symbol: symbol.center,
    }
    const distance = Math.hypot(
      first.symbol.x - second.symbol.x,
      first.symbol.y - second.symbol.y,
    )
    const scale =
      Math.hypot(first.real.x - second.real.x, first.real.y - second.real.y) /
      distance
    if (!Number.isFinite(scale) || scale <= 0) continue
    const source = component.source_component_id
      ? db.source_component.get(component.source_component_id)
      : undefined
    const transform = (p: { x: number; y: number }) => ({
      x: second.real.x + scale * (p.x - second.symbol.x),
      y: second.real.y + scale * (p.y - second.symbol.y),
    })
    const texts: SchematicText[] = []
    for (const [i, primitive] of symbol.primitives.entries()) {
      if (primitive.type !== "text") continue
      const text =
        primitive.text === "{REF}"
          ? (source?.display_name ?? source?.name)
          : primitive.text === "{VAL}"
            ? component.symbol_display_value
            : undefined
      if (!text) continue
      texts.push({
        type: "schematic_text",
        schematic_text_id: `${component.schematic_component_id}:symbol-text:${i}`,
        schematic_component_id: component.schematic_component_id,
        schematic_sheet_id: component.schematic_sheet_id,
        text,
        position: transform(primitive),
        anchor: primitive.anchor.replace(
          "middle_",
          "",
        ) as SchematicText["anchor"],
        rotation: 0,
        font_size: 0.18,
        color: "black",
      })
    }
    const points = symbol.primitives.flatMap((p) =>
      p.type === "path" ? p.points.map(transform) : [],
    )
    geometry.set(component.schematic_component_id, {
      texts,
      // Only substitute a body bound when all body primitives are paths.
      // Component size can include empty space reserved for reference text.
      bounds:
        points.length &&
        symbol.primitives.every((p) => p.type === "path" || p.type === "text")
          ? polygonBounds([points])
          : undefined,
    })
  }
  return geometry
}
