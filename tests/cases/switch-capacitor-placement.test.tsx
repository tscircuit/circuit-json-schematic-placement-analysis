import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { createElement } from "react"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"

const issueTypes = ["CapacitorSeparatedFromSwitch"] as const
const findings = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes }).getIssues()

test("reports only isolated grounded parallel switch/capacitor pairs, independent of names and drawing axis", async () => {
  for (const vertical of [false, true]) {
    for (const variant of [
      "distant",
      "near",
      "offset",
      "one-net-only",
      "ungrounded",
      "power-signal",
      "second-cap",
      "second-switch",
      "host",
      "obstacle",
      "group",
      "zero-pull",
      "non-power-pull",
      "no-pull",
    ] as const) {
      const circuit = new Circuit()
      circuit.pcbDisabled = true
      const point = (x: number, y: number) =>
        vertical ? { schX: -y, schY: x } : { schX: x, schY: y }
      const cap = (
        <capacitor
          name="other"
          capacitance="100nF"
          {...point(
            variant === "near" || variant === "offset" ? 2 : 10,
            variant === "offset" ? 2 : 0,
          )}
          schRotation={vertical ? 90 : 0}
        />
      )
      const capSelector = variant === "group" ? ".separate > .other" : ".other"
      circuit.add(
        <board schLayout={{ layoutMode: "none" }} routingDisabled>
          <pushbutton
            name="arbitrary"
            {...point(0, 0)}
            schRotation={vertical ? 90 : 0}
          />
          {variant === "group"
            ? createElement("group", { name: "separate" }, cap)
            : cap}
          <net name="neutral" isGroundNet={variant !== "ungrounded"} />
          <net name="otherNet" isPowerNet={variant === "power-signal"} />
          <trace from=".arbitrary > .pin1" to="net.neutral" />
          <trace from={`${capSelector} > .pin1`} to="net.neutral" />
          <trace from=".arbitrary > .pin2" to="net.otherNet" />
          {variant !== "one-net-only" && (
            <trace from={`${capSelector} > .pin2`} to="net.otherNet" />
          )}
          {variant !== "no-pull" && (
            <>
              <net name="supply" isPowerNet={variant !== "non-power-pull"} />
              <resistor
                name="pull"
                resistance={variant === "zero-pull" ? 0 : 5100}
                {...point(5, 0)}
                connections={{ pin1: "net.supply", pin2: "net.otherNet" }}
              />
            </>
          )}
          {variant === "second-cap" && (
            <capacitor
              name="extra"
              capacitance="1nF"
              {...point(10, 4)}
              connections={{ pin1: "net.neutral", pin2: "net.otherNet" }}
            />
          )}
          {variant === "second-switch" && (
            <pushbutton
              name="extra"
              {...point(0, 4)}
              connections={{ pin1: "net.neutral", pin2: "net.otherNet" }}
            />
          )}
          {variant === "host" && (
            <chip
              name="host"
              pinLabels={{ pin1: "a", pin2: "b" }}
              {...point(12, 4)}
              connections={{ pin1: "net.otherNet" }}
            />
          )}
          {variant === "obstacle" && (
            <resistor name="unrelated" resistance="10k" {...point(7, 0)} />
          )}
        </board>,
      )
      await circuit.renderUntilSettled()
      const json = circuit.getCircuitJson()
      expect(
        json.filter((e) => e.type.endsWith("_error")),
        variant,
      ).toEqual([])
      const expected = variant === "distant" || variant === "no-pull" ? 1 : 0
      expect(findings(json), `${vertical}:${variant}`).toHaveLength(expected)
      if (variant === "host") {
        const remote = structuredClone(json)
        const host = remote.find(
          (e) => e.type === "source_component" && e.name === "host",
        )!
        if (host.type !== "source_component") throw new Error("Missing host")
        for (const e of remote)
          if (
            e.type === "schematic_component" &&
            e.source_component_id === host.source_component_id
          )
            e.schematic_sheet_id = "remote-sheet"
        expect(findings(remote)).toHaveLength(1)
      }
      if (variant !== "distant") continue
      expect(analyzeSchematicPlacement(json).getIssues({ issueTypes })).toEqual(
        findings(json),
      )
      const artifacts = createSchematicPlacementIssueArtifacts(json, {
        issueTypes,
      })
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]!.bounds).toBeDefined()
      expect(artifacts[0]!.descriptionXml).toContain(
        "CapacitorSeparatedFromSwitch",
      )
      const renamed = structuredClone(json)
      for (const e of renamed) {
        if (e.type === "source_component" || e.type === "source_net")
          e.name = "unrelated"
        if (e.type === "source_port") {
          e.name = "unrelated"
          e.port_hints = []
        }
        if (e.type === "schematic_net_label") e.text = "unrelated"
      }
      expect(findings(renamed)).toHaveLength(1)
      const capId = json.find(
        (e) => e.type === "source_component" && e.name === "other",
      )!
      if (capId.type !== "source_component")
        throw new Error("Missing capacitor")
      for (const invalid of [
        "missing-port",
        "dnc",
        "missing-placement",
        "scope",
        "unknown-type",
        "dnp",
        "duplicate-placement",
        "duplicate-port",
        "invalid-size",
      ] as const) {
        const changed = structuredClone(json)
        const port = changed.find(
          (e) =>
            e.type === "source_port" &&
            e.source_component_id === capId.source_component_id,
        )!
        const box = changed.find(
          (e) =>
            e.type === "schematic_component" &&
            e.source_component_id === capId.source_component_id,
        )!
        if (port.type !== "source_port" || box.type !== "schematic_component")
          throw new Error("Missing fixture records")
        if (invalid === "missing-port") {
          const index = changed.findIndex(
            (e) =>
              e.type === "schematic_port" &&
              e.source_port_id === port.source_port_id,
          )
          changed.splice(index, 1)
        } else if (invalid === "dnc") port.do_not_connect = true
        else if (invalid === "missing-placement")
          changed.splice(changed.indexOf(box), 1)
        else if (invalid === "scope") box.schematic_sheet_id = "another-sheet"
        else if (invalid === "dnp")
          changed.push({
            type: "pcb_component",
            pcb_component_id: "unpopulated",
            source_component_id: capId.source_component_id,
            center: { x: 0, y: 0 },
            width: 1,
            height: 1,
            rotation: 0,
            layer: "top",
            do_not_place: true,
            obstructs_within_bounds: true,
          })
        else if (invalid === "duplicate-placement")
          changed.push({ ...box, schematic_component_id: "duplicate" })
        else if (invalid === "invalid-size") box.size.width = Number.NaN
        else if (invalid === "duplicate-port") {
          const schPort = changed.find(
            (e) =>
              e.type === "schematic_port" &&
              e.source_port_id === port.source_port_id,
          )!
          if (schPort.type !== "schematic_port") throw new Error("Missing port")
          changed.push({ ...schPort, schematic_port_id: "duplicate" })
        } else {
          const index = changed.findIndex(
            (e) =>
              e.type === "source_component" &&
              e.source_component_id === capId.source_component_id,
          )
          changed[index] = { ...capId, ftype: "simple_chip" }
        }
        expect(findings(changed), invalid).toEqual([])
      }
    }
  }
})
