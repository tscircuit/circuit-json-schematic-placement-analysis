import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { createElement, Fragment } from "react"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

const issueTypes = ["ParallelDiodeResistorNotAligned"] as const

test("recognizes local parallel diode/resistor layouts from connectivity and accepts tidy rows and columns", async () => {
  for (const vertical of [false, true]) {
    for (const tidy of [false, true]) {
      const circuit = new Circuit()
      circuit.pcbDisabled = true
      circuit.add(
        <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
          {["staggered", "crossed_connections", "different_axes"].map(
            (kind, i) => {
              const origin = i * 7
              const point = (x: number, y: number) =>
                vertical
                  ? { schX: origin - y, schY: x }
                  : { schX: origin + x, schY: y }
              const rotate = vertical ? 90 : 0
              return (
                <Fragment key={kind}>
                  <schematictext
                    text={kind}
                    schX={origin}
                    schY={4}
                    fontSize={0.25}
                  />
                  <diode name={`A${i}`} {...point(0, 0)} schRotation={rotate} />
                  <resistor
                    name={`B${i}`}
                    resistance="10k"
                    {...point(!tidy && kind === "staggered" ? 3 : 0.1, 2)}
                    schRotation={
                      rotate +
                      (!tidy && kind === "crossed_connections"
                        ? 180
                        : !tidy && kind === "different_axes"
                          ? 90
                          : 0)
                    }
                  />
                  <trace from={`.A${i} > .anode`} to={`.B${i} > .pin1`} />
                  <trace from={`.A${i} > .cathode`} to={`.B${i} > .pin2`} />
                </Fragment>
              )
            },
          )}
        </board>,
      )
      await circuit.renderUntilSettled()
      const circuitJson = circuit.getCircuitJson()
      expectReproRendered(circuitJson, 6)
      const original = JSON.stringify(circuitJson)
      for (let i = 0; i < 3; i++) {
        expectReproNets(circuitJson, [
          [`A${i}.anode`, `B${i}.pin1`],
          [`A${i}.cathode`, `B${i}.pin2`],
        ])
      }
      const analysis = analyzeSchematicPlacement(circuitJson, { issueTypes })
      const issues = analysis.getIssues()
      expect(issues).toHaveLength(tidy ? 0 : 3)
      if (!tidy) {
        expect(issues).toMatchObject([
          { reason: "staggered" },
          { reason: "crossed_connections" },
          { reason: "different_axes" },
        ])
      }
      // Integration: selective and default execution agree on this issue type.
      expect(
        analyzeSchematicPlacement(circuitJson).getIssues({ issueTypes }),
      ).toEqual(issues)
      expect(analysis.getIssueCounts().ParallelDiodeResistorNotAligned).toBe(
        issues.length,
      )
      const artifacts = createSchematicPlacementIssueArtifacts(circuitJson, {
        analysis,
        issueTypes,
      })
      expect(artifacts).toHaveLength(issues.length)
      for (const artifact of artifacts) {
        expect(artifact.bounds).toBeDefined()
        expect(artifact.descriptionXml).toContain(
          "ParallelDiodeResistorNotAligned",
        )
        expect(artifact.content).toContain("data-issue-index=")
      }
      expect(
        createIssueReproSnapshot({
          circuitJson,
          analysis,
          issueTypes,
          showFullSchematic: true,
          width: 1500,
          height: 550,
        }),
      ).toMatchSvgSnapshot(
        import.meta.path,
        `${vertical ? "vertical" : "horizontal"}-${tidy ? "tidy" : "misaligned"}`,
      )
      expect(JSON.stringify(circuitJson)).toBe(original)
    }
  }

  // Native TSX guard cases: no edits to compiled Circuit JSON.
  for (const variant of [
    "series",
    "shared-rail",
    "group",
    "subcircuit",
    "ambiguous",
    "shorted",
    "overlap",
    "named-nets",
    "led",
  ] as const) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    const scoped = variant === "group" || variant === "subcircuit"
    const a =
      variant === "led" ? (
        <led name="partA" schX={0} schY={0} />
      ) : (
        <diode name="partA" schX={0} schY={0} />
      )
    const b = (
      <resistor
        name="partB"
        resistance="1k"
        schX={variant === "overlap" ? 0 : 3}
        schY={variant === "overlap" ? 0 : 2}
      />
    )
    const prefixA = scoped ? ".blockA > " : ""
    const prefixB = scoped ? ".blockB > " : ""
    const pinA = `${prefixA}.partA`
    const pinB = `${prefixB}.partB`
    circuit.add(
      <board
        schTraceAutoLabelEnabled={variant === "named-nets"}
        schMaxTraceDistance={variant === "named-nets" ? 0 : 100}
      >
        {scoped ? createElement(variant, { name: "blockA" }, a) : a}
        {scoped ? createElement(variant, { name: "blockB" }, b) : b}
        {variant === "named-nets" ? (
          <>
            <trace from={`${pinA} > .anode`} to="net.GROUND_LOOKING_NAME" />
            <trace from={`${pinB} > .pin1`} to="net.GROUND_LOOKING_NAME" />
            <trace from={`${pinA} > .cathode`} to="net.SUPPLY_LOOKING_NAME" />
            <trace from={`${pinB} > .pin2`} to="net.SUPPLY_LOOKING_NAME" />
          </>
        ) : (
          <>
            <trace from={`${pinA} > .anode`} to={`${pinB} > .pin1`} />
            {variant !== "series" && variant !== "shared-rail" && (
              <trace from={`${pinA} > .cathode`} to={`${pinB} > .pin2`} />
            )}
          </>
        )}
        {variant === "shared-rail" && (
          <>
            <net name="arbitrary" isPowerNet />
            <chip name="consumer" pinLabels={{ pin1: "arbitrary" }} />
            <trace from={`${pinA} > .anode`} to="net.arbitrary" />
            <trace from=".consumer > .pin1" to="net.arbitrary" />
          </>
        )}
        {variant === "ambiguous" && (
          <resistor
            name="partC"
            resistance="2k"
            schX={5}
            schY={-2}
            connections={{ pin1: ".partA > .anode", pin2: ".partA > .cathode" }}
          />
        )}
        {variant === "shorted" && (
          <trace from={`${pinA} > .anode`} to={`${pinA} > .cathode`} />
        )}
      </board>,
    )
    await circuit.renderUntilSettled()
    const json = circuit.getCircuitJson()
    expect(json.filter((element) => element.type.endsWith("_error"))).toEqual(
      [],
    )
    expect(
      json.filter((element) => element.type === "schematic_component"),
    ).toHaveLength(variant === "ambiguous" || variant === "shared-rail" ? 3 : 2)
    const analysis = analyzeSchematicPlacement(json, { issueTypes })
    expect(analysis.getIssues(), variant).toHaveLength(
      variant === "named-nets" || variant === "led" ? 1 : 0,
    )
    if (scoped || variant === "named-nets" || variant === "led") {
      expectReproNets(json, [
        ["partA.anode", "partB.pin1"],
        ["partA.cathode", "partB.pin2"],
      ])
    }
  }
})
