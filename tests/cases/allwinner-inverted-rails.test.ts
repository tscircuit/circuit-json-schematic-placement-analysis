import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { allwinnerT113CircuitJson as circuitJson } from "../assets/allwinner-t113"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getReproSourcePort } from "../fixtures/placement-repro-assertions"

test("identifies inverted positive-supply capacitors in the unchanged Allwinner schematic", () => {
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["TwoPinComponentHasInvertedRails"],
  })
  // Review the full design's count, not just the six buck capacitors.
  expect(issues).toHaveLength(47)
  expect(
    analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["TwoPinComponentHasInvertedRails"],
    }).getIssues(),
  ).toEqual(issues)
  for (const issue of issues) {
    if (issue.lineItemType !== "TwoPinComponentHasInvertedRails")
      throw new Error("Expected rail-facing issue")
    const source = circuitJson.find(
      (e) =>
        e.type === "source_component" &&
        e.source_component_id === issue.schematicBox.sourceComponentId,
    )
    expect(source).toMatchObject({ ftype: "simple_capacitor" })
    if (source?.type !== "source_component")
      throw new Error("Missing capacitor")
    const positive = getReproSourcePort(circuitJson, source.name!, "pin1")
    const ground = getReproSourcePort(circuitJson, source.name!, "pin2")
    const net = (key: string | undefined) =>
      circuitJson.find(
        (e) =>
          e.type === "source_net" && e.subcircuit_connectivity_map_key === key,
      )
    expect(net(positive.subcircuit_connectivity_map_key)).toMatchObject({
      is_positive_voltage_source: true,
    })
    expect(net(ground.subcircuit_connectivity_map_key)).toMatchObject({
      is_ground: true,
    })
    expect(issue.railSourcePortId).toBe(positive.source_port_id)
    expect(issue.deltaSchRotation).toBe(180)
  }
  for (let cap = 101; cap <= 106; cap++) {
    expect(issues).toContainEqual(
      expect.objectContaining({
        schematicBox: expect.objectContaining({
          sourceComponentName: `C${cap}`,
        }),
      }),
    )
  }
  // Render only the two reviewed views, retaining the complete source data and
  // original issue numbers. The other 45 findings are checked above.
  const allIssues = analysis.getIssues()
  for (const name of ["C101", "C102"]) {
    const issueIndex = allIssues.findIndex(
      (issue) =>
        issue.lineItemType === "TwoPinComponentHasInvertedRails" &&
        issue.schematicBox.sourceComponentName === name,
    )
    expect(issueIndex).toBeGreaterThanOrEqual(0)
    const schematicSvg = createIssueOverlaySvg({
      circuitJson,
      analysis,
      issueIndex,
      width: 900,
      height: 400,
    })
    const descriptionXml = analysis.schematicIssuesToString(
      allIssues[issueIndex]!,
    )
    expect(schematicSvg).toContain(`data-issue-index="${issueIndex}"`)
    expect(descriptionXml).toContain('deltaSchRotation="180"')
    const snapshot = stackSvgsVertically(
      [
        // Nest the cropped SVG so stacking preserves its viewport.
        `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="400">${schematicSvg}</svg>`,
        createAnalyzerTextSvg(descriptionXml, 900),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, "")
    expect(snapshot).toMatchSvgSnapshot(import.meta.path, name)
  }
  expect(JSON.stringify(circuitJson)).toBe(original)
})
