import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { createReadingLampLedChain } from "../assets/reading-lamp-led-chain"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("moving only the six LEDs into connected order clears the finding without changing any connection", async () => {
  const before = await createReadingLampLedChain()
  const after = await createReadingLampLedChain(true)
  expectReproRendered(after, 14)
  const beforePorts = before.filter((e) => e.type === "source_port")
  expect(after.filter((e) => e.type === "source_port")).toEqual(beforePorts)
  const beforeNet = getSourceConnectivity(before),
    afterNet = getSourceConnectivity(after)
  for (const a of beforePorts)
    for (const b of beforePorts) {
      expect(afterNet(a.source_port_id) === afterNet(b.source_port_id)).toBe(
        beforeNet(a.source_port_id) === beforeNet(b.source_port_id),
      )
    }
  const unchangedIds = new Set(
    before
      .filter((e) => e.type === "source_component" && e.ftype !== "simple_led")
      .map((e) => (e.type === "source_component" ? e.source_component_id : "")),
  )
  expect(
    after.filter(
      (e) =>
        e.type === "schematic_component" &&
        unchangedIds.has(e.source_component_id ?? ""),
    ),
  ).toEqual(
    before.filter(
      (e) =>
        e.type === "schematic_component" &&
        unchangedIds.has(e.source_component_id ?? ""),
    ),
  )
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1600,
      height: 1400,
      highlightIssues: ["SeriesLedChainNotOrdered"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
