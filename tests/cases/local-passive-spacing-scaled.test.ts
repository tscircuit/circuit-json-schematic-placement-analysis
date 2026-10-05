import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import {
  createLocalPassiveSpacingFixture,
  getLocalSpacingComponent,
  inspectLocalPassiveSpacing,
} from "../fixtures/local-passive-spacing-fixture"

test("scales the spacing allowance to the largest eligible passive symbol", () => {
  const fixture = (distance: number): CircuitJson => {
    const json = createLocalPassiveSpacingFixture(distance)
    getLocalSpacingComponent(json, "passive").size = { width: 2, height: 1 }
    const host = json.find(
      (e) => e.type === "source_component" && e.source_component_id === "host",
    )!
    Object.assign(host, { ftype: "simple_inductor", inductance: 0.000001 })
    json.push({
      type: "source_port",
      source_port_id: "host_other",
      source_component_id: "host",
      name: "other",
      port_hints: [],
    })
    getLocalSpacingComponent(json, "host").size = { width: 3, height: 1 }
    return json
  }
  expect(
    inspectLocalPassiveSpacing(fixture(9), import.meta.path, "boundary"),
  ).toEqual([])
  expect(
    inspectLocalPassiveSpacing(fixture(9.01), import.meta.path, "over"),
  ).toMatchObject([{ pinDistance: 9.01, maxRecommendedPinDistance: 9 }])
})
