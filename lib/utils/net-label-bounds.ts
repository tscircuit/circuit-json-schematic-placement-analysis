import type { SchematicNetLabel, SchematicText } from "circuit-json"
import { symbols } from "schematic-symbols"
import type { RectBounds } from "./geometry"
import {
  getSymbolTextPolygons,
  polygonBounds,
  widthInEm,
} from "./schematic-text-geometry"

/** Approximate label bounds shared by collision and movement validation. */
export function getNetLabelBounds(label: SchematicNetLabel): RectBounds {
  if (!label.text)
    return {
      left: label.center.x,
      right: label.center.x,
      top: label.center.y,
      bottom: label.center.y,
    }
  const superscript =
    "display_superscript" in label &&
    typeof label.display_superscript === "string"
      ? label.display_superscript
      : ""
  const width =
    0.18 *
    (widthInEm(label.text) +
      0.9 +
      0.06 * label.text.length +
      (superscript ? 0.08 + 0.65 * widthInEm(superscript) : 0))
  const direction = {
    left: { x: 1, y: 0 },
    right: { x: -1, y: 0 },
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
  }[label.anchor_side]
  const anchor = label.anchor_position ?? {
    x: label.center.x - (direction.x * width) / 2,
    y: label.center.y - (direction.y * width) / 2,
  }
  // Power symbols place upright text using their own primitive anchors.
  // anchor_side describes the connection, not the text's rotation.
  const symbol = label.symbol_name
    ? symbols[label.symbol_name as keyof typeof symbols]
    : undefined
  const port = symbol?.ports[0]
  if (symbol && port) {
    const polygons = symbol.primitives.flatMap((primitive) => {
      if (primitive.type !== "text" || primitive.text === "{VAL}") return []
      return getSymbolTextPolygons({
        type: "schematic_text",
        schematic_text_id: label.schematic_net_label_id,
        text: primitive.text === "{REF}" ? label.text : primitive.text,
        position: {
          x: anchor.x + primitive.x - port.x,
          y: anchor.y + primitive.y - port.y,
        },
        anchor: primitive.anchor.replace(
          "middle_",
          "",
        ) as SchematicText["anchor"],
        rotation: 0,
        font_size: 0.18,
        color: "black",
      })
    })
    if (polygons.length) return polygonBounds(polygons)
  }
  // Match the renderer's 0.18 font, arrow/end padding and 0.2 label height.
  // center can be stale after routing; the rendered outline starts at anchor.
  const end = {
    x: anchor.x + direction.x * width,
    y: anchor.y + direction.y * width,
  }
  return {
    left: Math.min(anchor.x, end.x) - (direction.x === 0 ? 0.1 : 0),
    right: Math.max(anchor.x, end.x) + (direction.x === 0 ? 0.1 : 0),
    top: Math.max(anchor.y, end.y) + (direction.y === 0 ? 0.1 : 0),
    bottom: Math.min(anchor.y, end.y) - (direction.y === 0 ? 0.1 : 0),
  }
}
