import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { createElement } from "react"
import type { CircuitJson } from "circuit-json"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

const issueTypes = ["ParallelResistorsDrawnInline"] as const
const issues = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes }).getIssues()

test("reports inline parallel resistor pairs using typed connectivity and accepts readable or ambiguous layouts", async () => {
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
      "zero-ohm",
      "group",
      "shared-rails",
      "shared-node",
    ] as const) {
      const circuit = new Circuit()
      circuit.pcbDisabled = true
      const point = (x: number, y: number) =>
        vertical ? { schX: -y, schY: x } : { schX: x, schY: y }
      const rotation = vertical ? 90 : 0
      const readable = variant === "side-by-side" || variant === "offset"
      const second = (
        <resistor
          name="other"
          resistance={variant === "zero-ohm" ? 0 : 2000}
          {...point(
            variant === "overlap"
              ? 0
              : readable
                ? variant === "offset"
                  ? 0.4
                  : 0
                : 2,
            readable ? 2 : 0,
          )}
          schRotation={rotation + (variant === "reversed-pins" ? 180 : 0)}
        />
      )
      const b = variant === "group" ? ".section > .other" : ".other"
      circuit.add(
        <board
          schLayout={{ layoutMode: "none" }}
          schTraceAutoLabelEnabled={false}
        >
          <resistor
            name="arbitrary"
            resistance={1000}
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
            <resistor
              name="third"
              resistance="3k"
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
      const expected =
        variant === "inline" || variant === "reversed-pins" ? 1 : 0
      expect(reports, `${vertical}:${variant}`).toHaveLength(expected)
      expect(analyzeSchematicPlacement(json).getIssues({ issueTypes })).toEqual(
        reports,
      )
      if (variant !== "inline") continue
      const saved = JSON.stringify(json)
      const analysis = analyzeSchematicPlacement(json, { issueTypes })
      expect(analysis.getIssueCounts().ParallelResistorsDrawnInline).toBe(1)
      const artifacts = createSchematicPlacementIssueArtifacts(json, {
        analysis,
        issueTypes,
      })
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]!.bounds).toBeDefined()
      expect(artifacts[0]!.descriptionXml).toContain(
        "ParallelResistorsDrawnInline",
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
      ] as const) {
        const altered = structuredClone(json)
        const port = altered.find((e) => e.type === "schematic_port")!
        const source = altered.find((e) => e.type === "source_port")!
        const component = altered.find((e) => e.type === "source_component")!
        const box = altered.find((e) => e.type === "schematic_component")!
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
        expect(issues(altered), invalid).toEqual([])
      }
    }
  }
  expect(issues([])).toEqual([])
})
