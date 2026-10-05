import type { CircuitJson } from "circuit-json"
import { getSchematicBoxLabelRects } from "lib/utils/schematic-box-labels"
import { getPinLabelLength } from "lib/utils/schematic-box-resize"

/** Measure separation in the rendered Circuit JSON, independently of the
 * resize solver's proposed dimensions and clearance-constraint calculation. */
export function measureLabelBankGap(circuitJson: CircuitJson): number {
  let smallestGap = Number.POSITIVE_INFINITY
  for (const component of circuitJson) {
    if (component.type !== "schematic_component") continue
    const ports = circuitJson
      .filter((element) => element.type === "schematic_port")
      .filter(
        (port) =>
          port.schematic_component_id === component.schematic_component_id,
      )
    const labels = getSchematicBoxLabelRects(
      {
        positionAnchor: "center",
        schX: component.center.x,
        schY: component.center.y,
        width: component.size.width,
        height: component.size.height,
      },
      ports,
      getPinLabelLength,
    )
    for (let i = 0; i < labels.length; i++) {
      const a = labels[i]!
      for (const b of labels.slice(i + 1)) {
        if (a.side === b.side) continue
        const gap = Math.max(
          a.xMin - b.xMax,
          b.xMin - a.xMax,
          a.yMin - b.yMax,
          b.yMin - a.yMax,
        )
        smallestGap = Math.min(smallestGap, gap)
      }
    }
  }
  return smallestGap
}
