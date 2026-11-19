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
import { createPeltierDifferentialFilter } from "../assets/peltier-differential-filter"

test("corrects differential-rc-filter with unchanged connectivity, symbols and zero remaining findings", async () => {
  const before = await createPeltierDifferentialFilter(),
    after = await createPeltierDifferentialFilter(true)
  expectReproRendered(before, 4)
  expectReproRendered(after, 4)
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
    issueTypes: ["DifferentialRcFilterNotAligned"],
  })
  expect(issues).toHaveLength(1)
  const index = new PlacementNetworkIndex(buildSolverContext(after))
  const connectedPort = (name: string, pin: string) => {
    const p = port(after, name, pin)
    if (!p.source_component_id) throw new Error("Missing port component")
    return { ...p, source_component_id: p.source_component_id }
  }
  expect(box(after, "U_DRIVER").port_arrangement).toEqual(
    box(before, "U_DRIVER").port_arrangement,
  )
  expect(box(after, "U_DRIVER").port_labels).toEqual(
    box(before, "U_DRIVER").port_labels,
  )
  const chipPins = (j: typeof before) =>
    j
      .filter(
        (e) =>
          e.type === "schematic_port" &&
          e.schematic_component_id ===
            box(j, "U_DRIVER").schematic_component_id,
      )
      .map((e) =>
        e.type === "schematic_port"
          ? [
              e.pin_number,
              e.display_pin_label,
              e.side_of_component,
              e.center.y,
              e.side_of_component === "top" || e.side_of_component === "bottom"
                ? e.center.x
                : null,
            ]
          : null,
      )
  expect(chipPins(after)).toEqual(chipPins(before))
  for (const [r, p] of [
    ["R_ISP_FILTER", "pin12"],
    ["R_ISN_FILTER", "pin13"],
  ] as const)
    expect(
      hasVisibleSchematicConnection(
        after,
        index,
        connectedPort(r, "pin2"),
        connectedPort("U_DRIVER", p),
      ),
    ).toBe(true)
  for (const [r, p] of [
    ["R_ISP_FILTER", "pin1"],
    ["R_ISN_FILTER", "pin2"],
  ] as const)
    expect(
      hasVisibleSchematicConnection(
        after,
        index,
        connectedPort(r, "pin2"),
        connectedPort("C_CURRENT_FILTER", p),
      ),
    ).toBe(true)
  expect(
    createPlacementComparisonSvg({
      subject: "complete differential RC filter",
      backgroundColor: "#f5f1ed",
      panelHeight: 780,
      before: { circuitJson: before, analysis: beforeAnalysis },
      after: { circuitJson: after, analysis: afterAnalysis },
      issues,
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: () =>
        "R_ISP_FILTER / R_ISN_FILTER: paired filter branches point in different directions.",
      afterDiagnostic:
        "Parallel filter branches; capacitor bridges the chip-side nodes.\nIC box trimmed without changing pin sides or rows. Complete extract: 0 reported issues.",
      note: "Published TPS55289 filter extract. The before also has two IC box-size findings; the after fixes those too.",
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
          "Complete 4-component extract.\nFull analysis of the displayed network: 0 reported issues.",
          1400,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-network")
})
