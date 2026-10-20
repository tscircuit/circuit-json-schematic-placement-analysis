import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"
import { createMq135Potentiometer } from "../assets/mq135-potentiometer"
const electrical = (j: CircuitJson) =>
  j.filter((e) => e.type.startsWith("source_"))
test("corrects potentiometer control with unchanged connectivity and no remaining findings", async () => {
  const before = await createMq135Potentiometer(),
    after = await createMq135Potentiometer(true)
  expectReproRendered(before, 1)
  expectReproRendered(after, 1)
  expect(electrical(after)).toEqual(electrical(before))
  const analysis = analyzeSchematicPlacement(before),
    corrected = analyzeSchematicPlacement(after)
  expect(corrected.getIssues()).toEqual([])
  const issues = analysis.getIssues({
    issueTypes: ["PotentiometerHasIncorrectRailOrientation"],
  })
  expect(issues).toHaveLength(1)
  const p = (pin: string) => {
    const id = getReproSourcePort(after, "RV1", pin).source_port_id
    const port = after.find(
      (e) => e.type === "schematic_port" && e.source_port_id === id,
    )
    if (port?.type !== "schematic_port") throw new Error("Missing terminal")
    return port
  }
  expect(p("pin1").facing_direction).toBe("up")
  expect(p("pin3").facing_direction).toBe("down")
  expect(p("pin1").center.y).toBeGreaterThan(p("pin3").center.y)
  expect(p("pin2").facing_direction).toBe("left")

  expect(
    createPlacementComparisonSvg({
      subject: "potentiometer control",
      backgroundColor: "#f5f1ed",
      before: { circuitJson: before, analysis },
      after: { circuitJson: after, analysis: corrected },
      issues,
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: () =>
        "RV1: positive supply and ground terminals are side by side.",
      afterDiagnostic:
        "Positive supply above, ground below, third terminal at the side.\nComplete extracted control: 0 reported issues.",
      note: "MQ135 RV1 extract. Same native potentiometer, value and three pin connections; only schematic rotation changes.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    stackSvgsVertically(
      [
        renderIssueOverlay({
          circuitJson: after,
          analysis: corrected,
          showFullSchematic: true,
          showOverlay: false,
          width: 1400,
          height: 850,
        }).svg,
        createAnalyzerTextSvg(
          "Complete 1-component extract.\nFull analysis of the extracted circuit: 0 reported issues.",
          1400,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-network")
})
