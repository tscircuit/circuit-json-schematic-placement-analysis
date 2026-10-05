import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createLocalPassiveSpacingFixture,
  getLocalSpacingComponent,
  inspectLocalPassiveSpacing,
} from "../fixtures/local-passive-spacing-fixture"

test("skips ambiguous placements, duplicated or missing ports, and nonfinite geometry", () => {
  const guards: Record<string, (json: CircuitJson) => void> = {
    "duplicate-placement": (json) => {
      json.push({
        ...getLocalSpacingComponent(json, "passive"),
        schematic_component_id: "duplicate",
      })
    },
    "duplicate-port": (json) => {
      const pin = json.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === "passive_signal",
      )!
      json.push({
        ...pin,
        schematic_port_id: "duplicate",
      } as CircuitJson[number])
    },
    "missing-port": (json) => {
      json.splice(
        json.findIndex(
          (e) =>
            e.type === "schematic_port" &&
            e.source_port_id === "passive_signal",
        ),
        1,
      )
    },
    "wrong-component-port": (json) => {
      for (const e of json)
        if (
          e.type === "schematic_port" &&
          e.source_port_id === "passive_signal"
        )
          e.schematic_component_id = "sch_host"
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = createLocalPassiveSpacingFixture()
    mutate(json)
    expect(inspectLocalPassiveSpacing(json, import.meta.path, name)).toEqual([])
  }
  for (const nonfinite of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const pin = createLocalPassiveSpacingFixture()
    for (const e of pin)
      if (e.type === "schematic_port" && e.source_port_id === "passive_signal")
        e.center.x = nonfinite
    expect(
      analyzeSchematicPlacement(pin, {
        issueTypes: ["LocalPassiveConnectionTooLong"],
      }).getIssues(),
    ).toEqual([])
    const box = createLocalPassiveSpacingFixture()
    getLocalSpacingComponent(box, "passive").size.width = nonfinite
    expect(
      analyzeSchematicPlacement(box, {
        issueTypes: ["LocalPassiveConnectionTooLong"],
      }).getIssues(),
    ).toEqual([])
  }
})
