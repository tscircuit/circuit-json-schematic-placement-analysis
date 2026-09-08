import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { wirelessMouseControllerSheetCircuitJson } from "../assets/wireless-mouse-controller-sheet"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { parseSync, type INode } from "svgson"

test("reproduces the complete wireless mouse controller sheet layout", () => {
  const analysis = analyzeSchematicPlacement(
    wirelessMouseControllerSheetCircuitJson,
  )

  const crystalPlacementIssue = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
    .find(
      (issue) => issue.lineItemType === "CrystalNotCenteredOverLoadCapacitors",
    )

  expect(crystalPlacementIssue).toMatchObject({
    lineItemType: "CrystalNotCenteredOverLoadCapacitors",
    crystalSchematicBox: { sourceComponentName: "X_HF_32M" },
    firstLoadCapacitorSchematicBox: {
      sourceComponentName: "C_HF_XC1",
    },
    secondLoadCapacitorSchematicBox: {
      sourceComponentName: "C_HF_XC2",
    },
    deltaSchX: 4.5,
    deltaSchY: -1.7,
    newSchX: -5.5,
    newSchY: -7.7,
  })

  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson: wirelessMouseControllerSheetCircuitJson,
    analysis,
    width: 1800,
    height: 1100,
    highlightIssues: ["CrystalNotCenteredOverLoadCapacitors"],
  })
  const descendants = (node: INode): INode[] => [
    node,
    ...node.children.flatMap(descendants),
  ]
  const nodes = descendants(parseSync(svg))
  // Symbol bounds come from the rendered capacitor, not the wider placement box.
  for (const componentId of [
    "schematic_component_28",
    "schematic_component_29",
  ]) {
    const component = nodes.find(
      (node) => node.attributes["data-schematic-component-id"] === componentId,
    )
    const body = component?.children.find((node) =>
      node.attributes.class?.includes("sch-component-overlay"),
    )
    const highlight = nodes.find(
      (node) => node.attributes["data-highlight-component-id"] === componentId,
    )
    expect(body).toBeDefined()
    expect(highlight).toBeDefined()
    for (const key of ["x", "y", "width", "height"])
      expect(highlight!.attributes[key]).toBe(body!.attributes[key])
  }
  const markers = nodes.filter(
    (node) => node.attributes.class === "issue-marker",
  )
  expect(markers).toHaveLength(3)
  expect(
    markers.map(
      (node) =>
        node.children.find((child) => child.name === "text")?.children[0]
          ?.value,
    ),
  ).toEqual(["1", "1", "1"])
  expect(svg).toContain('data-listing-issue-number="1"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
