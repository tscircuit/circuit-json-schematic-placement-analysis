import type { CircuitJson } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxTooWideIssue,
  SchematicPinPaddingToEdgeTooLarge,
} from "../../types"
import {
  generateSchematicPinPaddingToEdgeCandidates,
  getSchematicPinPaddingToEdgeTooLargeIssues,
} from "./pin-padding-to-edge"
import {
  generateSchematicBoxWidthSizingCandidates,
  getGenericSchematicBoxTooWideIssues,
  getPinHeaderSchematicBoxTooWideIssues,
} from "./too-wide"

export {
  GENERIC_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
  PIN_HEADER_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
  SCHEMATIC_PIN_PADDING_TO_EDGE_TOO_LARGE_MESSAGE,
  SCHEMATIC_BOX_TOO_WIDE_MESSAGE,
} from "./shared"
export { generateSchematicPinPaddingToEdgeTooLargeIssues } from "./pin-padding-to-edge"
export {
  generateGenericSchematicBoxTooWideIssues,
  generatePinHeaderSchematicBoxTooWideIssues,
} from "./too-wide"

export const generateSchematicBoxSizingIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): Array<SchematicBoxTooWideIssue | SchematicPinPaddingToEdgeTooLarge> => {
  const widthCandidates = generateSchematicBoxWidthSizingCandidates(
    componentPlacements,
    circuitJson,
  )
  const pinPaddingCandidates = generateSchematicPinPaddingToEdgeCandidates(
    componentPlacements,
    circuitJson,
  )

  return [
    ...getPinHeaderSchematicBoxTooWideIssues(widthCandidates),
    ...getGenericSchematicBoxTooWideIssues(widthCandidates),
    ...getSchematicPinPaddingToEdgeTooLargeIssues(pinPaddingCandidates),
  ]
}
