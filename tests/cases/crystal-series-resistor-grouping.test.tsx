import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

const issueTypes = ["CrystalSeriesResistorNotGrouped"] as const
const issues = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes }).getIssues()

test("groups typed crystal series resistors independent of names and orientation, skipping ambiguous networks", async () => {
  for (const fourPin of [false, true])
    for (const vertical of [false, true]) {
      for (const variant of [
        "separated",
        "nearby",
        "offset",
        "other-arm",
        "no-load-caps",
        "extra-branch",
        "other-chip",
        "parallel-resistor",
        "rail",
        "zero-resistor",
        "different-group",
      ] as const) {
        const point = (x: number, y: number) =>
          vertical ? { schX: -y, schY: x } : { schX: x, schY: y }
        const crystalSide =
          variant === "other-arm" ? "pin1" : fourPin ? "pin3" : "pin2"
        const otherSide =
          variant === "other-arm" ? (fourPin ? "pin3" : "pin2") : "pin1"
        const resistor = (
          <resistor
            name="b"
            resistance={variant === "zero-resistor" ? 0 : 1000}
            {...point(
              variant === "nearby" || variant === "offset" ? 2 : 9,
              variant === "offset" ? 1 : -1,
            )}
            schRotation={vertical ? 90 : 0}
          />
        )
        const r = variant === "different-group" ? ".nested > .b" : ".b"
        const circuit = new Circuit()
        circuit.pcbDisabled = true
        circuit.add(
          <board schLayout={{ layoutMode: "none" }}>
            <crystal
              name="a"
              frequency="12MHz"
              loadCapacitance="10pF"
              pinVariant={fourPin ? "four_pin" : "two_pin"}
              {...point(0, 0)}
              schRotation={vertical ? 90 : 0}
              pinAttributes={
                fourPin
                  ? {
                      pin2: { requiresGround: true },
                      pin4: { requiresGround: true },
                    }
                  : {}
              }
            />
            {variant === "different-group" ? (
              <group name="nested">{resistor}</group>
            ) : (
              resistor
            )}
            <chip
              name="c"
              pinLabels={{ pin1: "a", pin2: "b" }}
              {...point(-5, 0)}
            />
            <net name="neutral" isGroundNet />
            {fourPin && (
              <>
                <trace from=".a > .pin2" to="net.neutral" />
                <trace from=".a > .pin4" to="net.neutral" />
              </>
            )}
            <trace from={`.a > .${crystalSide}`} to={`${r} > .pin1`} />
            <trace from={`${r} > .pin2`} to=".c > .pin1" />
            {variant === "other-chip" ? (
              <>
                <chip name="d" pinLabels={{ pin1: "a" }} {...point(-5, 5)} />
                <trace from={`.a > .${otherSide}`} to=".d > .pin1" />
              </>
            ) : (
              <trace from={`.a > .${otherSide}`} to=".c > .pin2" />
            )}
            {variant !== "no-load-caps" && (
              <>
                <capacitor
                  name="e"
                  capacitance="15pF"
                  {...point(-2, -3)}
                  connections={{
                    pin1: `.a > .${otherSide}`,
                    pin2: "net.neutral",
                  }}
                />
                <capacitor
                  name="f"
                  capacitance="15pF"
                  {...point(2, -3)}
                  connections={{
                    pin1: `.a > .${crystalSide}`,
                    pin2: "net.neutral",
                  }}
                />
              </>
            )}
            {variant === "extra-branch" && (
              <chip
                name="g"
                pinLabels={{ pin1: "x" }}
                {...point(5, 5)}
                connections={{ pin1: `.a > .${crystalSide}` }}
              />
            )}
            {variant === "parallel-resistor" && (
              <resistor
                name="h"
                resistance="2k"
                {...point(5, 5)}
                connections={{ pin1: `${r} > .pin1`, pin2: `${r} > .pin2` }}
              />
            )}
            {variant === "rail" && (
              <>
                <net name="supply" isPowerNet />
                <trace from={`${r} > .pin2`} to="net.supply" />
              </>
            )}
          </board>,
        )
        await circuit.renderUntilSettled()
        const json = circuit.getCircuitJson()
        expect(
          json.filter((e) => e.type.endsWith("_error")),
          variant,
        ).toEqual([])
        const expected = ["separated", "other-arm", "no-load-caps"].includes(
          variant,
        )
          ? 1
          : 0
        const reports = issues(json)
        expect(reports, `${fourPin}:${vertical}:${variant}`).toHaveLength(
          expected,
        )
        expect(
          analyzeSchematicPlacement(json).getIssues({ issueTypes }),
        ).toEqual(reports)
        if (variant !== "separated") continue
        const saved = JSON.stringify(json)
        const analysis = analyzeSchematicPlacement(json, { issueTypes })
        expect(analysis.getIssueCounts().CrystalSeriesResistorNotGrouped).toBe(
          1,
        )
        const artifacts = createSchematicPlacementIssueArtifacts(json, {
          analysis,
          issueTypes,
        })
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0]!.bounds).toBeDefined()
        expect(artifacts[0]!.descriptionXml).toContain(
          "CrystalSeriesResistorNotGrouped",
        )
        const svg = createSchematicAnalysisFixtureSvg({
          circuitJson: json,
          analysis,
          highlightIssues: [...issueTypes],
        })
        expect(svg.match(/class="issue-marker"/g)).toHaveLength(2)
        expect(svg).toContain('data-listing-issue-number="1"')
        expect(JSON.stringify(json)).toBe(saved)
        const renamed = structuredClone(json)
        for (const e of renamed) {
          if (e.type === "source_component" || e.type === "source_net")
            e.name = "anonymous"
          if (e.type === "source_port") {
            e.name = "anonymous"
            e.port_hints = []
          }
          if (e.type === "schematic_net_label") e.text = "anonymous"
        }
        expect(issues(renamed)).toHaveLength(1)
        for (const invalid of [
          "unknown-crystal",
          "unknown-resistor",
          "invalid-frequency",
          "invalid-resistance",
          "dnc",
          "dnp",
          "chip-dnp",
          "missing-pin",
          "duplicate-pin",
          "missing-box",
          "duplicate-box",
          "other-sheet",
          "invalid-geometry",
          "invalid-pin",
          "missing-ground",
          "power-pin",
        ] as const) {
          if (invalid === "missing-ground" && !fourPin) continue
          const copy = structuredClone(json)
          const crystal = copy
            .filter((e) => e.type === "source_component")
            .find((e) => e.name === "a")!
          const resistor = copy
            .filter((e) => e.type === "source_component")
            .find((e) => e.name === "b")!
          const chip = copy
            .filter((e) => e.type === "source_component")
            .find((e) => e.name === "c")!
          const box = copy
            .filter((e) => e.type === "schematic_component")
            .find(
              (e) => e.source_component_id === resistor.source_component_id,
            )!
          const port = copy
            .filter((e) => e.type === "source_port")
            .find(
              (e) => e.source_component_id === resistor.source_component_id,
            )!
          const pin = copy
            .filter((e) => e.type === "schematic_port")
            .find((e) => e.source_port_id === port.source_port_id)!
          if (invalid === "unknown-crystal")
            Object.assign(crystal, { ftype: "simple_chip" })
          if (invalid === "unknown-resistor")
            Object.assign(resistor, { ftype: "simple_chip" })
          if (invalid === "invalid-frequency")
            Object.assign(crystal, { frequency: Number.NaN })
          if (invalid === "invalid-resistance")
            Object.assign(resistor, { resistance: Number.POSITIVE_INFINITY })
          if (invalid === "dnc") port.do_not_connect = true
          if (invalid === "dnp" || invalid === "chip-dnp")
            copy.push({
              type: "pcb_component",
              pcb_component_id: "unpopulated",
              source_component_id:
                invalid === "dnp"
                  ? resistor.source_component_id
                  : chip.source_component_id,
              center: { x: 0, y: 0 },
              width: 1,
              height: 1,
              rotation: 0,
              layer: "top",
              do_not_place: true,
              obstructs_within_bounds: true,
            })
          if (invalid === "missing-pin") copy.splice(copy.indexOf(pin), 1)
          if (invalid === "duplicate-pin")
            copy.push({ ...pin, schematic_port_id: "duplicate" })
          if (invalid === "missing-box") copy.splice(copy.indexOf(box), 1)
          if (invalid === "duplicate-box")
            copy.push({ ...box, schematic_component_id: "duplicate" })
          if (invalid === "other-sheet") box.schematic_sheet_id = "other"
          if (invalid === "invalid-geometry") box.size.width = -1
          if (invalid === "invalid-pin") pin.center.x = Number.NaN
          if (invalid === "power-pin") port.requires_power = true
          if (invalid === "missing-ground")
            for (const e of copy) {
              if (e.type === "source_net") delete e.is_ground
              if (e.type === "source_port") {
                delete e.requires_ground
                delete e.provides_ground
              }
            }
          expect(issues(copy), invalid).toEqual([])
        }
      }
    }
  expect(issues([])).toEqual([])
})
