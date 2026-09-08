import type { CircuitJson } from "circuit-json"

export function parseReproCircuitJson(text: string): CircuitJson {
  const json: unknown = JSON.parse(text)
  if (!Array.isArray(json)) throw new Error("Expected a Circuit JSON array.")
  for (const [index, element] of json.entries()) {
    if (
      !element ||
      typeof element !== "object" ||
      typeof element.type !== "string"
    ) {
      throw new Error(
        `Invalid Circuit JSON element at index ${index}: expected an object with a type.`,
      )
    }
  }
  if (!json.some((element) => element.type === "schematic_component")) {
    throw new Error("No schematic components found in this export.")
  }
  // Preserve historical exports (including string pin numbers) supported by the
  // analyzer/renderer but rejected by the current schema. The caller must analyze
  // and render before selecting the import, and surface any failures to the user.
  return json as CircuitJson
}
