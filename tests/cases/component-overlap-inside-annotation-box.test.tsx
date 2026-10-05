import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { buildSolverContext } from "lib/utils/placements"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("still detects real component overlaps inside nested solid and dashed annotation boxes", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <schematicbox
        schX={0}
        schY={0}
        width={8}
        height={6}
        strokeStyle="solid"
      />
      <schematicbox
        schX={0}
        schY={0}
        width={4}
        height={3}
        strokeStyle="dashed"
      />
      <resistor name="R1" resistance="1k" schX={0} schY={0} />
      <resistor name="R2" resistance="2k" schX={0.2} schY={0.1} />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((element) => element.type === "schematic_box"),
  ).toHaveLength(2)
  expect(buildSolverContext(circuitJson).componentPlacements).toHaveLength(2)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const overlaps = analysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "ComponentOverlap")
  expect(overlaps).toHaveLength(1)
  expect(overlaps[0]).toMatchObject({
    firstComponent: { sourceComponentName: "R1" },
    secondComponent: { sourceComponentName: "R2" },
  })
  await expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["ComponentOverlap"],
      showFullSchematic: true,
      showOverlay: false,
      width: 1000,
      height: 600,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
