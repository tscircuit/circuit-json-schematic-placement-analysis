import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { createElement } from "react"
import type { CircuitJson } from "circuit-json"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

const issueTypes = ["ParallelCapacitorsDrawnInline"] as const
const issues = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes }).getIssues()

test("reports inline parallel capacitor pairs using typed connectivity and accepts readable or ambiguous layouts", async () => {
  for (const vertical of [false, true]) {
    for (const variant of [
      "inline",
      "reversed-pins",
      "side-by-side",
      "offset",
      "overlap",
      "series",
      "shorted",
      "bank",
      "zero-capacitance",
      "group",
      "shared-rails",
      "shared-node",
      "distant",
      "different-axis",
    ] as const) {
      const circuit = new Circuit()
      circuit.pcbDisabled = true
      const point = (x: number, y: number) =>
        vertical ? { schX: -y, schY: x } : { schX: x, schY: y }
      const rotation = vertical ? 90 : 0
      const readable = variant === "side-by-side" || variant === "offset"
      const second = (
        <capacitor
          name="other"
          capacitance={variant === "zero-capacitance" ? 0 : 2e-6}
          {...point(
            variant === "overlap"
              ? 0
              : readable
                ? variant === "offset"
                  ? 0.4
                  : 0
                : variant === "distant"
                  ? 12
                  : 1.5,
            readable ? 2 : 0,
          )}
          schRotation={
            rotation +
            (variant === "reversed-pins"
              ? 180
              : variant === "different-axis"
                ? 90
                : 0)
          }
        />
      )
      const b = variant === "group" ? ".section > .other" : ".other"
      circuit.add(
        <board
          schLayout={{ layoutMode: "none" }}
          schTraceAutoLabelEnabled={false}
        >
          <capacitor
            name="arbitrary"
            capacitance={1e-6}
            {...point(0, 0)}
            schRotation={rotation}
          />
          {variant === "group"
            ? createElement("group", { name: "section" }, second)
            : second}
          <trace from=".arbitrary > .pin1" to={`${b} > .pin1`} />
          {variant !== "series" && (
            <trace from=".arbitrary > .pin2" to={`${b} > .pin2`} />
          )}
          {variant === "shorted" && (
            <trace from=".arbitrary > .pin1" to=".arbitrary > .pin2" />
          )}
          {variant === "bank" && (
            <capacitor
              name="third"
              capacitance="3uF"
              schX={5}
              schY={5}
              connections={{
                pin1: ".arbitrary > .pin1",
                pin2: ".arbitrary > .pin2",
              }}
            />
          )}
          {variant === "shared-rails" && (
            <>
              <net name="neutralA" isPowerNet />
              <net name="neutralB" isGroundNet />
              <trace from=".arbitrary > .pin1" to="net.neutralA" />
              <trace from=".arbitrary > .pin2" to="net.neutralB" />
            </>
          )}
          {variant === "shared-node" && (
            <>
              <net name="neutral" isPowerNet />
              <trace from=".arbitrary > .pin1" to="net.neutral" />
              <chip
                name="host"
                pinLabels={{ pin1: "a", pin2: "b" }}
                schX={8}
                schY={5}
                connections={{
                  pin1: ".arbitrary > .pin2",
                  pin2: ".arbitrary > .pin2",
                }}
              />
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
      const reports = issues(json)
      const expected = [
        "inline",
        "reversed-pins",
        "shared-rails",
        "shared-node",
        "bank",
      ].includes(variant)
        ? 1
        : 0
      expect(reports, `${vertical}:${variant}`).toHaveLength(expected)
      expect(analyzeSchematicPlacement(json).getIssues({ issueTypes })).toEqual(
        reports,
      )
      if (variant !== "inline") continue
      const saved = JSON.stringify(json)
      const analysis = analyzeSchematicPlacement(json, { issueTypes })
      expect(analysis.getIssueCounts().ParallelCapacitorsDrawnInline).toBe(1)
      const artifacts = createSchematicPlacementIssueArtifacts(json, {
        analysis,
        issueTypes,
      })
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]!.bounds).toBeDefined()
      expect(artifacts[0]!.descriptionXml).toContain(
        "ParallelCapacitorsDrawnInline",
      )
      const svg = createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        analysis,
        highlightIssues: [...issueTypes],
      })
      expect(svg.match(/class="issue-marker"/g)).toHaveLength(2)
      expect(svg).toContain('data-listing-issue-number="1"')
      expect(JSON.stringify(json)).toBe(saved)
      // Names and hints are irrelevant after the electrical graph is constructed.
      const renamed = structuredClone(json)
      for (const e of renamed) {
        if (e.type === "source_component" || e.type === "source_net")
          e.name = "unrelated"
        if (e.type === "source_port") {
          e.name = "no role"
          e.port_hints = []
        }
        if (e.type === "schematic_net_label") e.text = "unrelated"
      }
      expect(issues(renamed)).toHaveLength(1)
      for (const invalid of [
        "missing-port",
        "duplicate-port",
        "duplicate-placement",
        "missing-placement",
        "different-sheet",
        "unsupported-type",
        "dnp",
        "do-not-connect",
        "invalid-coordinate",
        "invalid-pin-coordinate",
        "invalid-size",
        "invalid-pin-axis",
        "unplaced-third",
      ] as const) {
        const altered = structuredClone(json)
        const port = altered.find((e) => e.type === "schematic_port")!
        const source = altered.find((e) => e.type === "source_port")!
        const component = altered.find((e) => e.type === "source_component")!
        const box = altered.find((e) => e.type === "schematic_component")!
        if (invalid === "invalid-coordinate") box.center.x = Number.NaN
        if (invalid === "invalid-pin-coordinate")
          port.center.x = Number.POSITIVE_INFINITY
        if (invalid === "invalid-size") box.size.width = -1
        if (invalid === "invalid-pin-axis") {
          const otherPort = altered.find(
            (e) =>
              e.type === "schematic_port" &&
              e.schematic_component_id === port.schematic_component_id &&
              e !== port,
          )
          if (otherPort?.type !== "schematic_port")
            throw new Error("Missing second port")
          port.facing_direction = otherPort.facing_direction
        }
        if (invalid === "unplaced-third") {
          const thirdId = "unplaced-third"
          altered.push({ ...component, source_component_id: thirdId })
          for (const pin of json.filter(
            (e) =>
              e.type === "source_port" &&
              e.source_component_id === component.source_component_id,
          )) {
            if (pin.type !== "source_port") continue
            altered.push({
              ...pin,
              source_component_id: thirdId,
              source_port_id: `${pin.source_port_id}-third`,
            })
          }
        }
        if (invalid === "missing-port") altered.splice(altered.indexOf(port), 1)
        if (invalid === "duplicate-port")
          altered.push({ ...port, schematic_port_id: "duplicate" })
        if (invalid === "duplicate-placement")
          altered.push({ ...box, schematic_component_id: "duplicate" })
        if (invalid === "missing-placement")
          altered.splice(altered.indexOf(box), 1)
        if (invalid === "different-sheet")
          box.schematic_sheet_id = "other-sheet"
        if (invalid === "unsupported-type")
          Object.assign(component, { ftype: "simple_chip" })
        if (invalid === "do-not-connect") source.do_not_connect = true
        if (invalid === "dnp")
          altered.push({
            type: "pcb_component",
            pcb_component_id: "unpopulated",
            source_component_id: component.source_component_id,
            center: { x: 0, y: 0 },
            width: 1,
            height: 1,
            rotation: 0,
            layer: "top",
            do_not_place: true,
            obstructs_within_bounds: true,
          })
        expect(issues(altered), invalid).toHaveLength(
          invalid === "unplaced-third" ? 1 : 0,
        )
      }
    }
  }
  expect(issues([])).toEqual([])
})
