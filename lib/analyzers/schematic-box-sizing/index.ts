import type { CircuitJson } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPinPaddingToEdgeTooLarge,
  SchematicBoxTooWide,
} from "../../types"
import {
  generateSchematicPinPaddingToEdgeCandidates,
  getSchematicPinPaddingToEdgeTooLargeIssues,
} from "./pin-padding-to-edge"
import {
  generateSchematicBoxWidthSizingCandidates,
  getSchematicBoxTooWideForChipIssues,
  getSchematicBoxTooWideForPinHeaderIssues,
} from "./too-wide"

export {
  CHIP_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
  PIN_HEADER_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
  SCHEMATIC_PIN_PADDING_TO_EDGE_TOO_LARGE_MESSAGE,
  SCHEMATIC_BOX_TOO_WIDE_MESSAGE,
} from "./shared"
export { generateSchematicPinPaddingToEdgeTooLargeIssues } from "./pin-padding-to-edge"
export {
  generateSchematicBoxTooWideForChipIssues,
  generateSchematicBoxTooWideForPinHeaderIssues,
} from "./too-wide"

export const generateSchematicBoxSizingIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): Array<SchematicBoxTooWide | SchematicPinPaddingToEdgeTooLarge> => {
  const widthCandidates = generateSchematicBoxWidthSizingCandidates(
    componentPlacements,
    circuitJson,
  )
  const pinPaddingCandidates = generateSchematicPinPaddingToEdgeCandidates(
    componentPlacements,
    circuitJson,
  )

  return [
    ...getSchematicBoxTooWideForPinHeaderIssues(widthCandidates),
    ...getSchematicBoxTooWideForChipIssues(widthCandidates),
    ...getSchematicPinPaddingToEdgeTooLargeIssues(pinPaddingCandidates),
  ]
}
