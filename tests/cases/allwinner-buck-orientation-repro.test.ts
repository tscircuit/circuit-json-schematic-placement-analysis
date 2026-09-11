import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { allwinnerT113CircuitJson as circuitJson } from "../assets/allwinner-t113"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

// Same regulator's reference: TLV62569P, Figure 5 (L1 in the series power path).
// https://www.ti.com/lit/ds/symlink/tlv62569.pdf#page=8
test("records buck orientation findings on the complete published Allwinner schematic", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 175)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const orientation = analysis.getIssues({
    issueTypes: ["TwoPinComponentShouldBeVertical"],
  })
  for (const [id, output, firstCap] of [
    [101, "V3V3_BUCK", 101],
    [102, "V0V9_BUCK", 103],
    [103, "V1V5", 105],
  ] as const) {
    expectReproNets(circuitJson, [
      [`U${id}.SW`, `L${id}.pin1`],
      [`L${id}.pin2`, `C${firstCap + 1}.pin1`, `net.${output}`],
      [`U${id}.GND`, `C${firstCap}.pin2`, `C${firstCap + 1}.pin2`, "net.GND"],
      [`U${id}.VIN`, `C${firstCap}.pin1`, "net.V5"],
    ])
    // Baseline false positive: a horizontal series inductor is told to turn vertical.
    expect(orientation).toContainEqual(
      expect.objectContaining({
        schematicBox: expect.objectContaining({
          sourceComponentName: `L${id}`,
        }),
        deltaSchRotation: 90,
      }),
    )
    for (const cap of [firstCap, firstCap + 1]) {
      const ground = getReproSourcePort(circuitJson, `C${cap}`, "pin2")
      const port = circuitJson.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === ground.source_port_id,
      )
      expect(port).toMatchObject({ facing_direction: "up" })
      // The current rule does not inspect already-vertical components.
      expect(
        orientation.some(
          (issue) =>
            issue.lineItemType === "TwoPinComponentShouldBeVertical" &&
            issue.schematicBox.sourceComponentName === `C${cap}`,
        ),
      ).toBe(false)
    }
  }
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["TwoPinComponentShouldBeVertical"],
      showFullSchematic: true,
      showOverlay: false,
      width: 2400,
      height: 1800,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
