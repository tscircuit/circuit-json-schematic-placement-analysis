import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { createElement } from "react"
import type { CircuitJson } from "circuit-json"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

const issueTypes = ["ParallelDiodeCapacitorNotAligned"] as const
const issues = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes }).getIssues()

test("identifies parallel diode/capacitor geometry without inferring electrical roles and skips unsupported cases", async () => {
  for (const rotation of [0, 90, 180, 270])
    for (const kind of [
      "staggered",
      "crossed_connections",
      "different_axes",
      "aligned",
      "offset",
      "distant",
      "overlap",
      "series",
      "shorted",
      "bank",
      "group",
      "zero-capacitance",
      "shared-rails",
      "one-rail",
    ] as const) {
      const circuit = new Circuit()
      circuit.pcbDisabled = true
      const angle = (rotation * Math.PI) / 180
      const point = (x: number, y: number) => ({
        schX: 7 + x * Math.cos(angle) - y * Math.sin(angle),
        schY: 3 + x * Math.sin(angle) + y * Math.cos(angle),
      })
      const separated =
          kind === "staggered" ||
          kind === "shared-rails" ||
          kind === "one-rail",
        reversed = kind === "crossed_connections"
      const capacitor = (
        <capacitor
          name="partB"
          capacitance={kind === "zero-capacitance" ? 0 : 1e-6}
          {...point(
            kind === "distant"
              ? 12
              : separated
                ? 2
                : kind === "offset"
                  ? 0.2
                  : 0,
            kind === "overlap" ? 0 : 2,
          )}
          schRotation={
            rotation + (reversed ? 180 : kind === "different_axes" ? 90 : 0)
          }
        />
      )
      const b = kind === "group" ? ".other > .partB" : ".partB"
      circuit.add(
        <board
          schLayout={{ layoutMode: "none" }}
          schTraceAutoLabelEnabled={false}
        >
          <diode name="partA" {...point(0, 0)} schRotation={rotation} />
          {kind === "group"
            ? createElement("group", { name: "other" }, capacitor)
            : capacitor}
          <trace from=".partA > .pin1" to={`${b} > .pin1`} />
          {kind !== "series" && (
            <trace from=".partA > .pin2" to={`${b} > .pin2`} />
          )}
          {kind === "shorted" && (
            <trace from=".partA > .pin1" to=".partA > .pin2" />
          )}
          {(kind === "shared-rails" || kind === "one-rail") && (
            <>
              <net name="neutralA" isPowerNet />
              <trace from=".partA > .pin1" to="net.neutralA" />
            </>
          )}
          {kind === "shared-rails" && (
            <>
              <net name="neutralB" isGroundNet />
              <trace from=".partA > .pin2" to="net.neutralB" />
            </>
          )}
          {kind === "bank" && (
            <capacitor
              name="third"
              capacitance="2uF"
              {...point(4, 2)}
              connections={{ pin1: ".partA > .pin1", pin2: ".partA > .pin2" }}
            />
          )}
        </board>,
      )
      await circuit.renderUntilSettled()
      const json = circuit.getCircuitJson()
      expect(json.filter((e) => e.type.endsWith("_error"))).toEqual([])
      const expected = [
        "staggered",
        "crossed_connections",
        "different_axes",
        "one-rail",
      ].includes(kind)
      const found = issues(json)
      expect(found, `${rotation}:${kind}`).toHaveLength(expected ? 1 : 0)
      if (!expected) continue
      expect(found[0]).toMatchObject({
        lineItemType: issueTypes[0],
        reason: kind === "one-rail" ? "staggered" : kind,
      })
      expect(analyzeSchematicPlacement(json).getIssues({ issueTypes })).toEqual(
        found,
      )
      if (rotation !== 0 || kind !== "staggered") continue
      const saved = JSON.stringify(json),
        analysis = analyzeSchematicPlacement(json, { issueTypes })
      expect(analysis.getIssueCounts().ParallelDiodeCapacitorNotAligned).toBe(1)
      const artifacts = createSchematicPlacementIssueArtifacts(json, {
        analysis,
        issueTypes,
      })
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]!.bounds).toBeDefined()
      expect(artifacts[0]!.descriptionXml).toContain(issueTypes[0])
      const svg = createIssueReproSnapshot({
        circuitJson: json,
        analysis,
        issueTypes,
        showListingIssueMarkers: true,
        showIssueGeometry: false,
      })
      expect(svg.match(/data-issue-number="1"/g)).toHaveLength(2)
      expect(svg).toContain('data-listing-issue-number="1"')
      expect(JSON.stringify(json)).toBe(saved)
      for (const invalid of [
        "missing-port",
        "duplicate-port",
        "missing-placement",
        "duplicate-placement",
        "different-sheet",
        "unsupported-type",
        "do-not-connect",
        "dnp",
        "invalid-coordinate",
        "invalid-pin-coordinate",
        "invalid-size",
        "invalid-pin-axis",
        "unplaced-third",
        "supply-port-flags",
      ] as const) {
        const altered = structuredClone(json)
        const port = altered.find((e) => e.type === "schematic_port")!,
          source = altered.find((e) => e.type === "source_port")!,
          component = altered.find((e) => e.type === "source_component")!,
          box = altered.find((e) => e.type === "schematic_component")!
        if (invalid === "supply-port-flags") {
          const ps = altered.filter(
            (e) =>
              e.type === "source_port" &&
              e.source_component_id === component.source_component_id,
          )
          if (ps[0]?.type !== "source_port" || ps[1]?.type !== "source_port")
            throw new Error("Missing source pins")
          ps[0].requires_power = true
          ps[1].requires_ground = true
        }
        if (invalid === "missing-port") altered.splice(altered.indexOf(port), 1)
        if (invalid === "duplicate-port")
          altered.push({ ...port, schematic_port_id: "duplicate" })
        if (invalid === "missing-placement")
          altered.splice(altered.indexOf(box), 1)
        if (invalid === "duplicate-placement")
          altered.push({ ...box, schematic_component_id: "duplicate" })
        if (invalid === "different-sheet") box.schematic_sheet_id = "elsewhere"
        if (invalid === "unsupported-type")
          Object.assign(component, { ftype: "simple_chip" })
        if (invalid === "do-not-connect") source.do_not_connect = true
        if (invalid === "invalid-coordinate") box.center.x = Number.NaN
        if (invalid === "invalid-pin-coordinate")
          port.center.x = Number.POSITIVE_INFINITY
        if (invalid === "invalid-size") box.size.width = -1
        if (invalid === "invalid-pin-axis") port.facing_direction = "up"
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
        if (invalid === "unplaced-third") {
          altered.push({ ...component, source_component_id: "unplaced" })
          for (const p of json.filter(
            (e) =>
              e.type === "source_port" &&
              e.source_component_id === component.source_component_id,
          ))
            if (p.type === "source_port")
              altered.push({
                ...p,
                source_component_id: "unplaced",
                source_port_id: p.source_port_id + "-third",
              })
        }
        expect(issues(altered), invalid).toEqual([])
      }
    }
  expect(issues([])).toEqual([])
})
