import type { CircuitJson, SchematicComponent } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPinSpacingIssue,
  SchematicPinSpacingTooLarge,
  SchematicPinSpacingTooSmall,
} from "../types"

export const TARGET_SCHEMATIC_PIN_SPACING = 0.2
export const SCHEMATIC_PIN_SPACING_TOO_LARGE_MESSAGE = `Decrease schematic pin spacing to ${TARGET_SCHEMATIC_PIN_SPACING}`
export const SCHEMATIC_PIN_SPACING_TOO_SMALL_MESSAGE = `Increase schematic pin spacing to ${TARGET_SCHEMATIC_PIN_SPACING}`

interface SchematicPinSpacingCandidate {
  schematicBox: SchematicBoxPlacement
  measuredSpacing: number
}

const isSchematicComponent = (
  element: CircuitJson[number],
): element is SchematicComponent => element.type === "schematic_component"

const getSchematicComponentById = (
  circuitJson: CircuitJson,
): Map<string, SchematicComponent> =>
  new Map(
    circuitJson
      .filter(isSchematicComponent)
      .map((schematicComponent) => [
        schematicComponent.schematic_component_id,
        schematicComponent,
      ]),
  )

const getPlacementBySchematicComponentId = (
  componentPlacements: SchematicBoxPlacement[],
): Map<string, SchematicBoxPlacement> =>
  new Map(
    componentPlacements
      .filter((placement) => placement.schematicComponentId)
      .map((placement) => [placement.schematicComponentId!, placement]),
  )

const getSchematicComponentPinSpacing = (
  schematicBox: SchematicBoxPlacement,
  schematicComponentById: Map<string, SchematicComponent>,
): number | null => {
  if (!schematicBox.schematicComponentId) return null

  const schematicComponent = schematicComponentById.get(
    schematicBox.schematicComponentId,
  )

  return typeof schematicComponent?.pin_spacing === "number"
    ? schematicComponent.pin_spacing
    : null
}

const createSchematicPinSpacingTooLargeIssue = (
  candidate: SchematicPinSpacingCandidate,
): SchematicPinSpacingTooLarge => ({
  lineItemType: "SchematicPinSpacingTooLarge",
  schematicBox: candidate.schematicBox,
  measuredSpacing: candidate.measuredSpacing,
  maxAllowedSpacing: TARGET_SCHEMATIC_PIN_SPACING,
  message: SCHEMATIC_PIN_SPACING_TOO_LARGE_MESSAGE,
})

const createSchematicPinSpacingTooSmallIssue = (
  candidate: SchematicPinSpacingCandidate,
): SchematicPinSpacingTooSmall => ({
  lineItemType: "SchematicPinSpacingTooSmall",
  schematicBox: candidate.schematicBox,
  measuredSpacing: candidate.measuredSpacing,
  minAllowedSpacing: TARGET_SCHEMATIC_PIN_SPACING,
  message: SCHEMATIC_PIN_SPACING_TOO_SMALL_MESSAGE,
})

export const generateSchematicPinSpacingCandidates = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicPinSpacingCandidate[] => {
  const placementBySchematicComponentId =
    getPlacementBySchematicComponentId(componentPlacements)
  const schematicComponentById = getSchematicComponentById(circuitJson)

  return componentPlacements.flatMap((schematicBox) => {
    const schematicComponentId = schematicBox.schematicComponentId
    if (!schematicComponentId) return []
    if (!placementBySchematicComponentId.has(schematicComponentId)) return []

    const measuredSpacing = getSchematicComponentPinSpacing(
      schematicBox,
      schematicComponentById,
    )
    if (measuredSpacing === null) return []

    return [{ schematicBox, measuredSpacing }]
  })
}

export const getSchematicPinSpacingIssues = (
  candidates: SchematicPinSpacingCandidate[],
): SchematicPinSpacingIssue[] => {
  const issues: SchematicPinSpacingIssue[] = []

  for (const candidate of candidates) {
    if (candidate.measuredSpacing > TARGET_SCHEMATIC_PIN_SPACING) {
      issues.push(createSchematicPinSpacingTooLargeIssue(candidate))
      continue
    }

    if (candidate.measuredSpacing < TARGET_SCHEMATIC_PIN_SPACING) {
      issues.push(createSchematicPinSpacingTooSmallIssue(candidate))
    }
  }

  return issues
}

export const generateSchematicPinSpacingIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicPinSpacingIssue[] =>
  getSchematicPinSpacingIssues(
    generateSchematicPinSpacingCandidates(componentPlacements, circuitJson),
  )
