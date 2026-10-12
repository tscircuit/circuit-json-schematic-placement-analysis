import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createSwitchMatrixDiodes } from "../assets/switch-matrix-diodes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("switch matrix grouping requires unambiguous typed branches and accepts nearby pairs in either orientation", async () => {
  const data = await createSwitchMatrixDiodes()
  const issues = (c: CircuitJson) =>
    analyzeSchematicPlacement(c, {
      issueTypes: ["SwitchMatrixDiodeSeparatedFromSwitch"],
    }).getIssues()
  const original = JSON.stringify(data)
  const baseline = issues(data)
  expect(baseline).toHaveLength(4)
  expect(
    analyzeSchematicPlacement(data).getIssues({
      issueTypes: ["SwitchMatrixDiodeSeparatedFromSwitch"],
    }),
  ).toEqual(baseline)
  expect(
    analyzeSchematicPlacement(data, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  expect(
    analyzeSchematicPlacement(data).getIssues({
      issueTypes: ["SwitchMatrixDiodeSeparatedFromSwitch"],
      schematicSheetId: "elsewhere",
    }),
  ).toEqual([])
  expect(JSON.stringify(data)).toBe(original)
  const renamed = structuredClone(data)
  for (const e of renamed) {
    if (e.type === "source_component") e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "arbitrary"
      e.port_hints = []
    }
    if (e.type === "source_net") e.name = "arbitrary"
    if (e.type === "schematic_net_label") e.text = "arbitrary"
  }
  expect(issues(renamed)).toHaveLength(4)
  for (const vertical of [false, true]) {
    for (const reverseDiodes of [false, true]) {
      expect(
        issues(
          await createSwitchMatrixDiodes({
            close: true,
            vertical,
            reverseDiodes,
          }),
        ),
      ).toEqual([])
      expect(
        issues(await createSwitchMatrixDiodes({ vertical, reverseDiodes })),
      ).toHaveLength(4)
    }
  }
  expect(issues(await createSwitchMatrixDiodes({ rows: 1 }))).toEqual([])
  expect(issues(await createSwitchMatrixDiodes({ columns: 1 }))).toEqual([])
  expect(issues(await createSwitchMatrixDiodes({ extraBranch: true }))).toEqual(
    [],
  )
  const reject = (edit: (c: CircuitJson) => void) => {
    const copy = structuredClone(data)
    edit(copy)
    expect(issues(copy)).toEqual([])
  }
  reject((c) => {
    for (const e of c)
      if (e.type === "source_component" && e.ftype === "simple_diode")
        Object.assign(e, { ftype: "simple_chip" })
  })
  reject((c) => {
    for (const e of c)
      if (e.type === "source_component" && e.ftype === "simple_push_button")
        Object.assign(e, { ftype: "simple_chip" })
  })
  reject((c) => {
    for (const e of c) if (e.type === "source_net") e.is_ground = true
  })
  for (const field of [
    "requires_power",
    "provides_ground",
    "do_not_connect",
  ] as const) {
    reject((c) => {
      for (let i = 0; i < 4; i++)
        getReproSourcePort(c, `D${i}`, "pin1")[field] = true
    })
  }
  reject((c) => {
    for (let i = 0; i < 4; i++)
      getReproSchematicComponent(c, `D${i}`).schematic_sheet_id =
        "different-sheet"
  })
  reject((c) => {
    for (let i = 0; i < 4; i++)
      getReproSchematicComponent(c, `D${i}`).schematic_group_id =
        "different-group"
  })
  reject((c) => {
    for (let i = 0; i < 4; i++)
      getReproSchematicComponent(c, `D${i}`).center.x = Number.NaN
  })
  reject((c) => {
    for (let i = 0; i < 4; i++) {
      const b = getReproSchematicComponent(c, `D${i}`)
      c.push({ ...b, schematic_component_id: `duplicate-${i}` })
    }
  })
  reject((c) => {
    for (let i = 0; i < 4; i++) {
      const port = getReproSourcePort(c, `D${i}`, "pin1")
      const schematic = c.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === port.source_port_id,
      )
      if (schematic?.type === "schematic_port")
        c.push({ ...schematic, schematic_port_id: `duplicate-${i}` })
    }
  })
  reject((c) => {
    for (let i = 0; i < 4; i++) {
      const b = getReproSchematicComponent(c, `D${i}`)
      c.push(
        pcb_component.parse({
          type: "pcb_component",
          pcb_component_id: `unpopulated-${i}`,
          source_component_id: b.source_component_id,
          center: { x: 0, y: 0 },
          width: 1,
          height: 1,
          rotation: 0,
          layer: "top",
          do_not_place: true,
        }),
      )
    }
  })
  const svg = createSchematicAnalysisFixtureSvg({
    circuitJson: data,
    highlightIssues: ["SwitchMatrixDiodeSeparatedFromSwitch"],
  })
  expect([...svg.matchAll(/class="issue-marker"/g)]).toHaveLength(8)
  expect([...svg.matchAll(/data-listing-issue-number=/g)]).toHaveLength(4)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
