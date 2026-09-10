import { expect, test } from "bun:test"
import { parseSync, type INode } from "svgson"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"

// Compare the ORing power paths with LM74700-Q1 Figure 10-1.
// https://www.ti.com/lit/ds/symlink/lm74700-q1.pdf#page=16
test("records the full input sheet's local trace suggestions without rearranging its ORing branches", () => {
  const circuitJson = getRp2040BldcSheet("power_input")
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(31)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    GenericSchematicBoxTooWide: 2,
    SchematicBoxInnerLabelCollision: 6,
    SchematicPinPaddingToEdgeTooLarge: 26,
    DiodeResistorNotAligned: 1,
    TraceCanBeSimplifiedByMovingComponent: 5,
    NetLabelCollision: 1,
    TwoPinComponentShouldBeVertical: 7,
  })
  // The two ORing suggestions straighten local wires; they don't expose the
  // complete input -> MOSFET -> VIN_SELECTED paths as in the reference.
  expect(
    analysis
      .getIssues()
      .flatMap((issue) =>
        issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent"
          ? [issue.targetComponent.sourceComponentName]
          : [],
      ),
  ).toEqual(["D_PD_VBUS", "R_PD_RESET", "J_BARREL", "U_PD_OR", "U_BARREL_OR"])
  const input = {
    circuitJson,
    analysis,
    showFullSchematic: true,
    width: 1800,
    height: 1200,
  }
  const svg = createIssueOverlaySvg(input)
  const diagnosticRects = (svg: string) =>
    descendants(parseSync(svg)).filter(
      (node) => node.name === "rect" && node.attributes.fill === "#ef444433",
    )
  const rectangles = diagnosticRects(svg)
  expect(rectangles.length).toBeGreaterThan(0)
  expect(
    new Set(
      rectangles.map(({ attributes: a }) =>
        [a.x, a.y, a.width, a.height].join(":"),
      ),
    ).size,
  ).toBe(rectangles.length)
  const paddingIndex = analysis
    .getIssues()
    .findLastIndex(
      (issue) =>
        issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge" &&
        issue.schematicBox.sourceComponentName === "U_PD",
    )
  expect(paddingIndex).toBeGreaterThan(-1)
  expect(
    diagnosticRects(
      createIssueOverlaySvg({ ...input, issueIndex: paddingIndex }),
    ),
  ).toHaveLength(1)

  // Check full, focused, and wide panels in their final display coordinates.
  for (const panel of [
    { showFullSchematic: true, width: 320, height: 240 },
    { showFullSchematic: false, width: 320, height: 240 },
    { showFullSchematic: false, width: 1800, height: 120 },
  ]) {
    const rendered = createIssueOverlaySvg({ ...input, ...panel })
    const root = parseSync(rendered)
    const [left, top, width, height] = (root.attributes.viewBox
      ?.split(" ")
      .map(Number) ?? [0, 0, panel.width, panel.height]) as [
      number,
      number,
      number,
      number,
    ]
    const displayScale = Math.min(panel.width / width, panel.height / height)
    const offsetX = (panel.width - width * displayScale) / 2
    const offsetY = (panel.height - height * displayScale) / 2
    const markers = descendants(root)
      .filter((node) => node.attributes["data-issue-number"])
      .map((node) => {
        const transform = node.attributes.transform!.match(
          /^translate\(([^ ]+) ([^)]+)\) scale\(([^)]+)\)$/,
        )!
        return {
          number: Number(node.attributes["data-issue-number"]),
          x: (Number(transform[1]) - left) * displayScale + offsetX,
          y: (Number(transform[2]) - top) * displayScale + offsetY,
          radius:
            Number(
              node.children.find((child) => child.name === "circle")!.attributes
                .r,
            ) *
            Number(transform[3]) *
            displayScale,
        }
      })
    expect([...new Set(markers.map((marker) => marker.number))]).toEqual(
      Array.from({ length: 48 }, (_, index) => index + 1),
    )
    expect(
      markers.every(
        ({ x, y, radius }) =>
          x - radius >= 0 &&
          x + radius <= panel.width &&
          y - radius >= 0 &&
          y + radius <= panel.height,
      ),
    ).toBe(true)
    expect(
      markers.every((marker, index) =>
        markers
          .slice(index + 1)
          .every(
            (other) =>
              Math.hypot(marker.x - other.x, marker.y - other.y) >=
              marker.radius + other.radius,
          ),
      ),
    ).toBe(true)
  }
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})

function descendants(node: INode): INode[] {
  return [node, ...node.children.flatMap(descendants)]
}
