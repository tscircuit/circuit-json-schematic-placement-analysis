import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createChargerChipResistor } from "../assets/charger-chip-resistor"
import { createNema14ParallelResistorRepro } from "../assets/nema14-parallel-resistors"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createReadingLampLedChain } from "../assets/reading-lamp-led-chain"

test("ChipPinResistorPlacementSolver recognizes port-declared supply rails and populated pcb_component overrides", async () => {
  const json = structuredClone(await createChargerChipResistor())
  for (const el of json) {
    if (el.type === "source_net") {
      el.is_power = false
      el.is_positive_voltage_source = false
      el.is_ground = false
    }
  }
  const r2Comp = json.find(
    (el): el is Extract<(typeof json)[number], { type: "source_component" }> =>
      el.type === "source_component" && el.name === "R2",
  )
  expect(r2Comp).toBeDefined()
  const vbusPort = json.find(
    (el): el is Extract<(typeof json)[number], { type: "source_port" }> =>
      el.type === "source_port" &&
      el.source_component_id === r2Comp!.source_component_id &&
      el.name === "pin1",
  )
  expect(vbusPort).toBeDefined()
  vbusPort!.provides_power = true

  json.push(
    {
      type: "pcb_component",
      pcb_component_id: "pcb_r2_dnp",
      source_component_id: r2Comp!.source_component_id,
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 1,
      height: 1,
      obstructs_within_bounds: true,
      do_not_place: true,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_r2_pop",
      source_component_id: r2Comp!.source_component_id,
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 1,
      height: 1,
      obstructs_within_bounds: true,
      do_not_place: false,
    },
  )

  const analysis = analyzeSchematicPlacement(json, {
    issueTypes: ["ResistorSeparatedFromChipPin"],
  })
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "ResistorSeparatedFromChipPin",
  ])
})

test("ParallelResistorPlacementSolver treats port-declared rails as rails and ignores unpopulated extra ports on local nodes", async () => {
  const base = await createNema14ParallelResistorRepro()

  // 1) When the shared node is a ground rail declared via source_port flags,
  // the parallel pair spans only rails (VM and GND) and must not be flagged.
  const railPair = structuredClone(base)
  const u3DischPort = railPair.find(
    (el): el is Extract<(typeof railPair)[number], { type: "source_port" }> =>
      el.type === "source_port" && el.name === "DISCH",
  )
  expect(u3DischPort).toBeDefined()
  u3DischPort!.provides_ground = true

  const railAnalysis = analyzeSchematicPlacement(railPair, {
    issueTypes: ["ParallelResistorsDrawnInline"],
  })
  expect(railAnalysis.getIssues()).toEqual([])

  // 2) When an unpopulated third component shares the local non-rail node,
  // it does not suppress the inline parallel resistor warning.
  const withDnpPeer = structuredClone(base)
  withDnpPeer.push(
    {
      type: "source_component",
      source_component_id: "dnp_extra",
      name: "TP_DNP",
      ftype: "simple_test_point",
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: "pcb_dnp_extra",
      source_component_id: "dnp_extra",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 1,
      height: 1,
      obstructs_within_bounds: true,
      do_not_place: true,
    },
    {
      type: "source_port",
      source_port_id: "dnp_extra_p1",
      source_component_id: "dnp_extra",
      name: "pin1",
      subcircuit_connectivity_map_key:
        u3DischPort!.subcircuit_connectivity_map_key,
    },
  )

  const dnpAnalysis = analyzeSchematicPlacement(withDnpPeer, {
    issueTypes: ["ParallelResistorsDrawnInline"],
  })
  expect(dnpAnalysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "ParallelResistorsDrawnInline",
  ])
})

test("SeriesLedChainPlacementSolver rejects chains broken by a port-declared rail node", async () => {
  const json = structuredClone(await createReadingLampLedChain())
  const led3 = json.find(
    (el): el is Extract<(typeof json)[number], { type: "source_component" }> =>
      el.type === "source_component" && el.name === "LED3",
  )
  expect(led3).toBeDefined()
  const led3Cathode = json.find(
    (el): el is Extract<(typeof json)[number], { type: "source_port" }> =>
      el.type === "source_port" &&
      el.source_component_id === led3!.source_component_id &&
      (el.name === "cathode" || el.name === "pin2"),
  )
  expect(led3Cathode).toBeDefined()
  led3Cathode!.provides_ground = true

  const analysis = analyzeSchematicPlacement(json, {
    issueTypes: ["SeriesLedChainNotOrdered"],
  })
  expect(analysis.getIssues()).toEqual([])
})

test("RailPathVisibilitySolver detects port-declared rail labels and skips unpopulated passive bridges", () => {
  const portRailJson = structuredClone(createRailPathRepro({ power: true }))
  for (const el of portRailJson) {
    if (el.type === "source_net") {
      el.is_power = false
      el.is_positive_voltage_source = false
      el.is_ground = false
    }
  }
  const railPort = portRailJson.find(
    (
      el,
    ): el is Extract<(typeof portRailJson)[number], { type: "source_port" }> =>
      el.type === "source_port" && el.source_port_id === "lower-bottom",
  )
  expect(railPort).toBeDefined()
  railPort!.requires_power = true

  const portRailAnalysis = analyzeSchematicPlacement(portRailJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  expect(portRailAnalysis.getIssues()).toHaveLength(1)
  expect(portRailAnalysis.getIssues()[0]).toMatchObject({ railType: "power" })

  // Marking the series bridge resistor as do_not_place breaks the visible path.
  const dnpBridgeJson = structuredClone(portRailJson)
  dnpBridgeJson.push({
    type: "pcb_component",
    pcb_component_id: "pcb_series_dnp",
    source_component_id: "series",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 1,
    height: 1,
    obstructs_within_bounds: true,
    do_not_place: true,
  })
  const dnpBridgeAnalysis = analyzeSchematicPlacement(dnpBridgeJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  expect(dnpBridgeAnalysis.getIssues()).toEqual([])
})
