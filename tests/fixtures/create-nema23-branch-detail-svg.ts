import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { createAnalyzerTextSvg } from "./create-schematic-analysis-fixture-svg"

/** A camera crop of the full, unmodified circuit render; no elements or findings
 * are removed. Both views use the same X bounds and scale for comparison. */
export function createNema23BranchDetailSvg(
  circuitJson: CircuitJson,
  bottom: number,
) {
  const width = 1000
  const bounds = { left: -4.6, right: 8.8, top: -21.35, bottom }
  const height =
    (width * (bounds.top - bounds.bottom)) / (bounds.right - bounds.left)
  const svg = convertCircuitJsonToSchematicSvg(circuitJson, { width, height })
  const matrix = svg.match(/data-real-to-screen-transform="matrix\(([^)]+)\)"/)
  if (!matrix) throw new Error("Missing schematic render transform")
  const [a, b, c, d, e, f] = matrix[1]!.split(/[\s,]+/).map(Number)
  const points = [bounds.left, bounds.right].flatMap((x) =>
    [bounds.top, bounds.bottom].map((y) => ({
      x: a! * x + c! * y + e!,
      y: b! * x + d! * y + f!,
    })),
  )
  const left = Math.min(...points.map((p) => p.x))
  const top = Math.min(...points.map((p) => p.y))
  const right = Math.max(...points.map((p) => p.x))
  const lower = Math.max(...points.map((p) => p.y))
  const cropped = svg.replace(/^<svg\b[^>]*>/, (root) =>
    root
      .replace(/\sviewBox="[^"]*"/, "")
      .replace(
        />$/,
        ` viewBox="${left} ${top} ${right - left} ${lower - top}">`,
      ),
  )
  return stackSvgsVertically(
    [
      cropped,
      createAnalyzerTextSvg(
        analyzeSchematicPlacement(circuitJson).toString(),
        width,
      ),
    ],
    { normalizeSize: false, gap: 0 },
  ).replace(/[ \t]+$/gm, "")
}
