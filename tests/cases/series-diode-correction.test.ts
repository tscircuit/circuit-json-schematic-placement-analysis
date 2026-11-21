import { expect, test } from "bun:test"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
import { PlacementNetworkIndex } from "lib/utils/placement-network-index"
import { buildSolverContext } from "lib/utils/placements"
import { hasVisibleSchematicConnection } from "lib/utils/has-visible-schematic-connection"
import { createPowerFaultSeriesDiodes } from "../assets/power-fault-series-diodes"

test("corrects series-diode with unchanged connectivity, symbols and zero remaining findings", async () => {
  const before = await createPowerFaultSeriesDiodes(),
    after = await createPowerFaultSeriesDiodes(true)
  expectReproRendered(before, 3)
  expectReproRendered(after, 3)
  expect(
    after.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
      ].includes(e.type),
    ),
  ).toEqual(
    before.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
      ].includes(e.type),
    ),
  )
  const beforeAnalysis = analyzeSchematicPlacement(before),
    afterAnalysis = analyzeSchematicPlacement(after)
  expect(afterAnalysis.getIssues()).toEqual([])
  const issues = beforeAnalysis.getIssues({
    issueTypes: ["SeriesDiodesNotAligned"],
  })
  expect(issues).toHaveLength(1)
  const index = new PlacementNetworkIndex(buildSolverContext(after))
  const connectedPort = (name: string, pin: string) => {
    const p = port(after, name, pin)
    if (!p.source_component_id) throw new Error("Missing port component")
    return { ...p, source_component_id: p.source_component_id }
  }
  expect(box(after, "J1").port_arrangement).toEqual(
    box(before, "J1").port_arrangement,
  )
  expect(box(after, "J1").port_labels).toEqual(box(before, "J1").port_labels)
  for (const name of ["D302", "D303"])
    expect(box(after, name).symbol_name).toMatch(/^zener_diode_/)
  expect(
    hasVisibleSchematicConnection(
      after,
      index,
      connectedPort("D302", "pin2"),
      connectedPort("D303", "pin2"),
    ),
  ).toBe(true)
  expect(
    createPlacementComparisonSvg({
      subject: "complete input clamp",
      backgroundColor: "#f5f1ed",
      panelHeight: 780,
      before: { circuitJson: before, analysis: beforeAnalysis },
      after: { circuitJson: after, analysis: afterAnalysis },
      issues,
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: () =>
        "D302 / D303: private series connection folds back around the pair.",
      afterDiagnostic:
        "Opposing Zeners form one straight branch. Cathode-to-cathode polarity is unchanged.\nComplete three-part clamp: 0 reported issues.",
      note: "Published power-fault-detector input-clamp extract. The ADC and RC stages are outside this comparison.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    stackSvgsVertically(
      [
        renderIssueOverlay({
          circuitJson: after,
          analysis: afterAnalysis,
          showFullSchematic: true,
          showOverlay: false,
          width: 1400,
          height: 850,
        }).svg,
        createAnalyzerTextSvg(
          "Complete 3-component extract.\nFull analysis of the displayed network: 0 reported issues.",
          1400,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-network")
})
