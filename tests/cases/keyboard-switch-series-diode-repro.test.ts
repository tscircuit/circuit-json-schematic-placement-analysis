import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createKeyboardSwitchDiodeRepro } from "../assets/keyboard-switch-series-diodes"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete key-pcb sheet with separated switch series diodes", async () => {
  const circuitJson = await createKeyboardSwitchDiodeRepro()
  expectReproRendered(circuitJson, 92)
  const branches: string[][] = []
  for (let i = 0; i < 12; i++) {
    const sw = `SW${i + 1}`
    const diode = `D${i + 1}`
    const x = 24 + (i % 4) * 7
    const y = 14 - Math.floor(i / 4) * 9
    expect(getReproSchematicComponent(circuitJson, sw).center).toEqual({ x, y })
    const box = getReproSchematicComponent(circuitJson, diode)
    expect(box.center).toEqual({ x: x + 3, y: y - 3 })
    expect(box.symbol_name).toBe("diode_right")
    const cathode = getReproSourcePort(circuitJson, diode, "pin1")
    const anode = getReproSourcePort(circuitJson, diode, "pin2")
    expect(cathode.port_hints).toContain("cathode")
    expect(anode.port_hints).toContain("anode")
    expect(
      circuitJson.filter(
        (e) =>
          e.type === "schematic_port" &&
          [cathode.source_port_id, anode.source_port_id].includes(
            e.source_port_id!,
          ),
      ),
    ).toHaveLength(2)
    branches.push([`${sw}.pin1`, `${diode}.pin2`])
  }
  for (let row = 0; row < 3; row++) {
    branches.push([
      `net.ROW${row}`,
      ...Array.from({ length: 4 }, (_, col) => `D${row * 4 + col + 1}.pin1`),
    ])
  }
  for (let col = 0; col < 4; col++) {
    branches.push([
      `net.COL${col}`,
      ...Array.from({ length: 3 }, (_, row) => `SW${row * 4 + col + 1}.pin2`),
    ])
  }
  expectReproNets(circuitJson, branches)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    ...Array(12).fill("SwitchMatrixDiodeSeparatedFromSwitch"),
    ...Array(2).fill("SchematicBoxInnerLabelCollision"),
    ...Array(9).fill("TwoPinComponentShouldBeVertical"),
    "NetLabelCollision",
    ...Array(3).fill("DecouplingCapacitorsNotCloseTogether"),
    "ResistorSeparatedFromChipPin",
    "RailPathTooSpreadOut",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 2400,
      height: 800,
      issueTypes: ["SwitchMatrixDiodeSeparatedFromSwitch"],
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
