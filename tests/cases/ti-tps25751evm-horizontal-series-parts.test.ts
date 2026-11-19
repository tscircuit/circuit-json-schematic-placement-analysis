import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createTiTps25751EvmBootstrapCapacitor,
  createTiTps25751EvmVpwrOptionResistor,
} from "../assets/ti-tps25751evm-horizontal-series-parts"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts TI TPS25751EVM horizontal bootstrap capacitor and VPWR option resistor", async () => {
  for (const { create, snapshot } of [
    {
      create: createTiTps25751EvmBootstrapCapacitor,
      snapshot: "bootstrap-capacitor",
    },
    {
      create: createTiTps25751EvmVpwrOptionResistor,
      snapshot: "vpwr-option-resistor",
    },
  ]) {
    const circuitJson = await create()
    expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["TwoPinComponentShouldBeVertical"],
    })
    // C64 links U10.CBOOT to the SW node and R112 links two supply nodes in
    // series; TI draws both horizontally, so neither is a vertical shunt.
    expect(analysis.getIssues()).toEqual([])
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson,
        analysis,
        highlightIssues: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, snapshot)
  }
})
