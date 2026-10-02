import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import published from "../assets/rp2040-motor-driver.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// imrishabh18/rp2040-motor-controller@1.0.42, motor_driver sheet.
// Literal exported records: preserve this sheet's source connections and their
// endpoints, plus its schematic geometry, routing, labels, and section text.
const circuitJson = published as unknown as CircuitJson

test("reports the motor-driver sheet's overlapping rail labels and component annotations", async () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 19)
  expect(
    circuitJson.filter((element) => element.type === "schematic_sheet"),
  ).toEqual([
    expect.objectContaining({
      name: "motor_driver",
      sheet_width: 297,
      sheet_height: 210,
    }),
  ])
  expect(
    circuitJson.filter((element) => element.type === "schematic_trace"),
  ).toHaveLength(26)
  expect(getReproSchematicComponent(circuitJson, "DRIVER").center).toEqual({
    x: 2.58,
    y: -11.72,
  })

  const analysis = analyzeSchematicPlacement(circuitJson)
  const textIssues = analysis.getIssues({
    issueTypes: ["SchematicTextCollision"],
  })
  expect(textIssues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        text: "R_PD_ENABLE_PU",
        collidingObject: expect.objectContaining({
          type: "net_label",
          text: "PD_GOOD",
        }),
        suggestedMove: undefined,
      }),
      expect.objectContaining({
        text: "C_DRV_3V3",
        collidingObject: expect.objectContaining({
          type: "net_label",
          text: "DRIVER_ENABLE_N",
        }),
        suggestedMove: undefined,
      }),
      expect.objectContaining({
        text: "R_DRV_REF_TOP",
        collidingObject: expect.objectContaining({
          type: "net_label",
          text: "V3V3",
        }),
      }),
      expect.objectContaining({
        text: "DRIVER",
        collidingObject: expect.objectContaining({ type: "trace" }),
        suggestedMove: undefined,
      }),
    ]),
  )
  const labelIssues = analysis.getIssues({ issueTypes: ["NetLabelCollision"] })
  expect(textIssues).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        text: "R_DRV_REF_BOTTOM",
        collidingObject: expect.objectContaining({ text: "V3V3" }),
      }),
    ]),
  )
  expect(labelIssues).toEqual([
    expect.objectContaining({
      pairs: [{ comp1Name: "DRIVER", comp2Name: "DRIVER" }],
      moves: [],
    }),
  ])
  // The literal export has no positive-supply declaration for PD_VDD/DRV_3V3.
  // Collision detection must not invent electrical roles from their text.
  expect(
    analysis.getIssues({ issueTypes: ["TwoPinComponentHasInvertedRails"] }),
  ).toEqual([])

  // Exercise a single component too: detection must not depend on a second
  // component or fabricate a whole-component move for its two overlapping labels.
  const isolated = circuitJson.filter(
    (e) =>
      (e.type === "source_component" &&
        e.source_component_id === "source_component_40") ||
      (e.type === "schematic_component" &&
        e.schematic_component_id === "schematic_component_40") ||
      (e.type === "schematic_port" &&
        ["schematic_port_172", "schematic_port_173"].includes(
          e.schematic_port_id,
        )) ||
      (e.type === "schematic_net_label" &&
        ["schematic_net_label_2052", "schematic_net_label_2053"].includes(
          e.schematic_net_label_id,
        )),
  )
  const labelsOnly = { issueTypes: ["NetLabelCollision"] as const }
  expect(
    analyzeSchematicPlacement(isolated, labelsOnly).getIssues(),
  ).toHaveLength(1)
  const firstLabel = isolated.find((e) => e.type === "schematic_net_label")!
  if (firstLabel.type !== "schematic_net_label")
    throw new Error("Missing label")
  expect(
    analyzeSchematicPlacement(
      [
        ...isolated.filter((e) => e.type !== "schematic_net_label"),
        firstLabel,
        { ...firstLabel, schematic_net_label_id: "duplicate" },
      ],
      labelsOnly,
    ).getIssues(),
  ).toEqual([])
  for (const change of ["separate", "other sheet"] as const) {
    const clear = isolated.map((e) => {
      if (
        e.type !== "schematic_net_label" ||
        e.schematic_net_label_id !== "schematic_net_label_2053"
      )
        return e
      return change === "other sheet"
        ? { ...e, schematic_sheet_id: "other_sheet" }
        : {
            ...e,
            center: { x: 20, y: e.center.y },
            anchor_position: { x: 20, y: e.anchor_position!.y },
          }
    })
    expect(
      analyzeSchematicPlacement(clear, labelsOnly).getIssues(),
      change,
    ).toEqual([])
  }
  await expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_2",
      showFullSchematic: true,
      showOverlay: true,
      showListingIssueMarkers: true,
      width: 1800,
      height: 1300,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
