import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { renderRp2040InputSymbol } from "../assets/rp2040-bldc-controller/input-symbols"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

type Drawing = Extract<
  CircuitJson[number],
  {
    type:
      | "schematic_path"
      | "schematic_line"
      | "schematic_rect"
      | "schematic_circle"
      | "schematic_arc"
      | "schematic_box"
  }
>

test("resize eligibility follows drawing ownership, not connector standards", async () => {
  const plain = await renderRp2040InputSymbol("J_PD", { width: 8, height: 8 })
  const component = plain.find(
    (element) => element.type === "schematic_component",
  )!
  const { x, y } = component.center
  const shapes: Drawing[] = [
    {
      type: "schematic_path",
      schematic_path_id: "art_path",
      points: [
        { x: x - 1, y },
        { x: x + 1, y },
      ],
      stroke_width: 0.02,
      is_dashed: false,
    },
    {
      type: "schematic_line",
      schematic_line_id: "art_line",
      x1: x - 1,
      y1: y,
      x2: x + 1,
      y2: y,
      stroke_width: 0.02,
      color: "#800000",
      is_dashed: false,
    },
    {
      type: "schematic_rect",
      schematic_rect_id: "art_rect",
      center: { x, y },
      width: 2,
      height: 1,
      rotation: 0,
      stroke_width: 0.02,
      color: "#800000",
      is_filled: false,
      is_dashed: false,
    },
    {
      type: "schematic_circle",
      schematic_circle_id: "art_circle",
      center: { x, y },
      radius: 0.5,
      stroke_width: 0.02,
      color: "#800000",
      is_filled: false,
      is_dashed: false,
    },
    {
      type: "schematic_arc",
      schematic_arc_id: "art_arc",
      center: { x, y },
      radius: 0.5,
      start_angle_degrees: 0,
      end_angle_degrees: 180,
      direction: "counterclockwise",
      stroke_width: 0.02,
      color: "#800000",
      is_dashed: false,
    },
    { type: "schematic_box", x, y, width: 2, height: 1, is_dashed: false },
  ]
  const issueTypes = [
    "GenericSchematicBoxTooWide",
    "SchematicPinPaddingToEdgeTooLarge",
  ] as const
  const analyze = (circuitJson: CircuitJson) =>
    analyzeSchematicPlacement(circuitJson, { issueTypes: [...issueTypes] })
  const expected = analyze(plain).getIssues()
  expect(expected).toHaveLength(2)
  const snapshot = (circuitJson: CircuitJson) =>
    createIssueReproSnapshot({
      circuitJson,
      analysis: analyze(circuitJson),
      width: 1200,
      height: 500,
      showFullSchematic: true,
      showOverlay: false,
    })
  // The same plain box remains eligible even when its source describes USB-C.
  const tagged: CircuitJson = plain.map((element) =>
    element.type === "source_component"
      ? { ...element, ftype: "simple_connector", standard: "usb_c" }
      : element,
  )
  expect(analyze(tagged).getIssues()).toEqual(expected)
  const snapshots = [snapshot(tagged)]
  for (const shape of shapes) {
    // An annotation in the same place does not belong to this component.
    const unrelated = [...plain, shape]
    expect(analyze(unrelated).getIssues()).toEqual(expected)
    const otherOwner: CircuitJson = [
      ...plain,
      { ...shape, schematic_component_id: "another_component" },
    ]
    expect(analyze(otherOwner).getIssues()).toEqual(expected)
    const owned: CircuitJson = [
      ...plain,
      {
        ...shape,
        schematic_component_id: component.schematic_component_id,
      },
    ]
    expect(analyze(owned).getIssues()).toHaveLength(0)
    snapshots.push(snapshot(owned))
  }
  await expect(
    stackSvgsVertically(snapshots, { normalizeSize: false, gap: 0 }),
  ).toMatchSvgSnapshot(import.meta.path)
})
