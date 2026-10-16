import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createSwitchMatrixDiodes } from "../assets/switch-matrix-diodes"

const issueTypes = ["SwitchMatrixBranchesTooSpreadOut"] as const
const analyze = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes })

test("matrix spacing respects occupied space, topology, scale and rotation", async () => {
  const base = { close: true, columnSpacing: 7 }
  const spread = await createSwitchMatrixDiodes(base)
  const original = JSON.stringify(spread)
  const baseline = analyze(spread)
  expect(baseline.getIssues()).toHaveLength(1)
  expect(baseline.getIssueCounts().SwitchMatrixBranchesTooSpreadOut).toBe(1)
  expect(analyzeSchematicPlacement(spread).getIssues({ issueTypes })).toEqual(
    baseline.getIssues(),
  )
  expect(
    analyzeSchematicPlacement(spread, {
      issueTypes: ["SwitchMatrixDiodeSeparatedFromSwitch"],
    }).getIssues(),
  ).toEqual([])
  expect(
    analyzeSchematicPlacement(spread, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  expect(JSON.stringify(spread)).toBe(original)
  const renamed = structuredClone(spread)
  for (const e of renamed) {
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "arbitrary"
      e.port_hints = []
    }
  }
  expect(analyze(renamed).getIssues()).toHaveLength(1)
  for (const vertical of [false, true]) {
    for (const rowSpacing of [3, 4, 12]) {
      const json = await createSwitchMatrixDiodes({
        ...base,
        vertical,
        rowSpacing,
      })
      const issues = analyze(json).getIssues()
      expect(issues).toHaveLength(rowSpacing === 12 ? 1 : 0)
      if (
        issues.length &&
        issues[0]!.lineItemType === "SwitchMatrixBranchesTooSpreadOut"
      )
        expect(issues[0]!.axis).toBe(vertical ? "x" : "y")
    }
  }
  const wide = await createSwitchMatrixDiodes({
    close: true,
    rowSpacing: 3,
    columnSpacing: 18,
  })
  expect(analyze(wide).getIssues()[0]).toMatchObject({ axis: "x" })
  for (const obstacle of ["component", "text", "label"] as const)
    expect(
      analyze(
        await createSwitchMatrixDiodes({ ...base, obstacle }),
      ).getIssues(),
    ).toEqual([])
  expect(
    analyze(
      await createSwitchMatrixDiodes({ ...base, matrices: 2, rowSpacing: 3 }),
    ).getIssues(),
  ).toEqual([])
  expect(
    analyze(
      await createSwitchMatrixDiodes({ ...base, matrices: 2 }),
    ).getIssues(),
  ).toHaveLength(2)
  for (const options of [
    { rows: 1 },
    { columns: 1 },
    { extraBranch: true },
    { close: false },
  ])
    expect(
      analyze(
        await createSwitchMatrixDiodes({ ...base, ...options }),
      ).getIssues(),
    ).toEqual([])

  const reject = (edit: (json: CircuitJson) => void) => {
    const json = structuredClone(spread)
    edit(json)
    expect(analyze(json).getIssues()).toEqual([])
  }
  reject((json) => {
    for (const e of json) if (e.type === "source_port") e.do_not_connect = true
  })
  reject((json) => {
    for (const e of json) if (e.type === "source_net") e.is_power = true
  })
  reject((json) => {
    for (const e of json)
      if (e.type === "schematic_component")
        e.schematic_group_id = e.schematic_component_id
  })
  reject((json) => {
    const diode = json.find(
      (e) => e.type === "source_component" && e.ftype === "simple_diode",
    )!
    Object.assign(diode, { ftype: "simple_chip" })
  })
  // Larger symbols need more than the four-unit minimum clearance allowance.
  reject((json) => {
    for (const e of json)
      if (e.type === "schematic_component") e.size.height = 3
  })
  const compact = await createSwitchMatrixDiodes({ ...base, rowSpacing: 3 })
  // Small offsets in a row are fine: this check does not impose exact alignment.
  for (const e of compact) {
    if (e.type === "schematic_component")
      e.center.y +=
        Number(e.schematic_component_id.split("_").at(-1)) % 2 ? 0.15 : -0.15
  }
  expect(analyze(compact).getIssues()).toEqual([])
})
