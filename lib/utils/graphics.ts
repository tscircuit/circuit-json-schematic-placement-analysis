import { mergeGraphics } from "graphics-debug"
import type { GraphicsObject } from "graphics-debug"
import type { CircuitJson } from "circuit-json"
import type { Capacitor } from "../solvers/CapacitorOrientationSolver/CapacitorOrientationSolver"

export function mergeGraphicsObjects(
  objects: (GraphicsObject | undefined)[],
): GraphicsObject {
  return objects
    .filter((o): o is GraphicsObject => o !== undefined)
    .reduce((acc, o) => mergeGraphics(acc, o), {} as GraphicsObject)
}

export function highlightPlacement(
  placement: Capacitor,
  color: string,
  label: string,
): GraphicsObject {
  return {
    rects: [
      {
        center: { x: placement.schX, y: placement.schY },
        width: placement.width,
        height: placement.height,
        stroke: color,
        fill: color.replace("0.95", "0.15"),
        label,
      },
    ],
  }
}

export function visualizeCircuitJson(circuitJson: CircuitJson): GraphicsObject {
  const rects = circuitJson
    .filter((el) => el.type === "schematic_box")
    .map((el) => {
      const box = el as Extract<CircuitJson[number], { type: "schematic_box" }>
      return {
        center: { x: box.x, y: box.y },
        width: box.width,
        height: box.height,
        stroke: "hsl(0,0%,60%)",
      }
    })
  return { rects }
}
