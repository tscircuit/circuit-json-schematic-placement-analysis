import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { expectReproNets } from "../fixtures/placement-repro-assertions"

test("accepts the TI BQ25798 reference bank but reports the same bank spread apart", async () => {
  // TI SLUUCB5E, p. 19, Fig. 4-5, SYS bypass bank C18-C23:
  // https://www.ti.com/lit/ug/sluucb5e/sluucb5e.pdf#page=19
  // Measured PDF vector geometry: adjacent centres ~20.34 pt, plate width
  // ~6.51 pt (pitch/plate-width ~3.12). The native capacitor plate is 0.32004
  // units wide, giving ~1.0 centre pitch, and its placement bounds are 0.9 wide.
  // This is a scaled native-TSX excerpt of the six populated parallel caps,
  // not a PCB distance or a spacing requirement stated by TI. Net names do
  // not establish roles: the supply/return metadata below does.
  for (const [variant, pitch, expectedCount] of [
    ["ti-sys-bank", 1, 0],
    ["spread-apart", 2, 1],
  ] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board>
        <net name="SYS" isPowerNet />
        <net name="PGND" isGroundNet />
        {Array.from({ length: 6 }, (_, i) => (
          <capacitor
            key={i}
            name={`C${18 + i}`}
            capacitance={i === 0 ? "100nF" : "10uF"}
            schX={(i - 2.5) * pitch}
            schY={0}
            schRotation={270}
            connections={{ pin1: "net.SYS", pin2: "net.PGND" }}
          />
        ))}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    const names = Array.from({ length: 6 }, (_, i) => `C${18 + i}`)
    expectReproNets(circuitJson, [
      ["net.SYS", ...names.map((name) => `${name}.pin1`)],
      ["net.PGND", ...names.map((name) => `${name}.pin2`)],
    ])
    const placements = circuitJson.filter(
      (element) => element.type === "schematic_component",
    )
    expect(placements.map((component) => component.size.width)).toEqual(
      Array(6).fill(0.9),
    )
    // Even the compact, published row exceeds the old whole-bank limit.
    // Adding tightly spaced members must not create a warning by itself.
    expect(
      placements[5]!.center.x - placements[0]!.center.x - 0.9,
    ).toBeGreaterThan(4)
    const original = JSON.stringify(circuitJson)
    const issueTypes = ["DecouplingCapacitorsNotCloseTogether"] as const
    const analysis = analyzeSchematicPlacement(circuitJson, { issueTypes })
    const issues = analysis.getIssues()
    expect(issues).toHaveLength(expectedCount)
    if (expectedCount) {
      expect(issues[0]).toMatchObject({
        maxBodyGap: 1.1,
        maxRecommendedBodyGap: 1,
        capacitorSchematicBoxes: names.map((sourceComponentName) => ({
          sourceComponentName,
        })),
      })
    }
    expect(JSON.stringify(circuitJson)).toBe(original)
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        issueTypes,
        showFullSchematic: true,
        showOverlay: true,
        showListingIssueMarkers: true,
        width: 1200,
        height: 400,
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
  }
})
