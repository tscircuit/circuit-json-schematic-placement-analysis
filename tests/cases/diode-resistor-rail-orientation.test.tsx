import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { expectReproNets } from "../fixtures/placement-repro-assertions"

test("orients private diode/resistor rail branches in either order and skips other topologies", async () => {
  for (const vertical of [false, true]) {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board schTraceAutoLabelEnabled schMaxTraceDistance={4}>
        <net name="HIGH" isPowerNet />
        <net name="LOW" isGroundNet />
        <net name="OUTPUT" isPowerNet />
        {(
          [
            "diode-first",
            "resistor-first",
            "parallel",
            "branched",
            "supply-feed",
          ] as const
        ).map((kind, i) => {
          const x = (i % 3) * 7
          const y = -Math.floor(i / 3) * 7
          const supported = i < 2
          const rotation = supported && vertical ? 270 : 0
          const upper = `A${i}`
          const lower = `B${i}`
          const lowerOuter =
            kind === "parallel"
              ? "net.HIGH"
              : kind === "supply-feed"
                ? "net.OUTPUT"
                : "net.LOW"
          return (
            <Fragment key={kind}>
              <schematictext
                text={kind}
                schX={x}
                schY={y + 1.5}
                fontSize={0.3}
              />
              {kind === "resistor-first" ? (
                <>
                  <resistor
                    name={upper}
                    resistance="330"
                    schX={x}
                    schY={y}
                    schRotation={rotation}
                  />
                  <led
                    name={lower}
                    schX={x}
                    schY={y - 3}
                    schRotation={rotation}
                  />
                </>
              ) : (
                <>
                  <diode
                    name={upper}
                    schX={x}
                    schY={y}
                    schRotation={rotation}
                  />
                  <resistor
                    name={lower}
                    resistance="1k"
                    schX={x}
                    schY={y - 3}
                    schRotation={rotation}
                  />
                </>
              )}
              <trace from={`.${upper} > .pin1`} to="net.HIGH" />
              <trace from={`.${upper} > .pin2`} to={`.${lower} > .pin1`} />
              <trace from={`.${lower} > .pin2`} to={lowerOuter} />
              {kind === "branched" && (
                <>
                  <chip
                    name="LOAD"
                    schX={x + 3}
                    schY={y - 1.5}
                    pinLabels={{ pin1: "A" }}
                  />
                  <trace from={`.${upper} > .pin2`} to=".LOAD > .pin1" />
                </>
              )}
            </Fragment>
          )
        })}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    expectReproNets(circuitJson, [
      ["A0.pin2", "B0.pin1"],
      ["A1.pin2", "B1.pin1"],
      ["A2.pin1", "B2.pin2", "net.HIGH"],
      ["A2.pin2", "B2.pin1"],
      ["A3.pin2", "B3.pin1", "LOAD.A"],
      ["A4.pin2", "B4.pin1"],
      ["B4.pin2", "net.OUTPUT"],
    ])
    const issueTypes = ["TwoPinComponentShouldBeVertical"] as const
    const analysis = analyzeSchematicPlacement(circuitJson, { issueTypes })
    const issues = analysis.getIssues()
    expect(issues).toHaveLength(vertical ? 0 : 4)
    if (!vertical) {
      for (const name of ["A0", "A1", "B0", "B1"]) {
        expect(issues).toContainEqual(
          expect.objectContaining({
            schematicBox: expect.objectContaining({
              sourceComponentName: name,
            }),
            railType: name === "A0" || name === "A1" ? "power" : "ground",
            suggestedRailFacingDirection:
              name === "A0" || name === "A1" ? "up" : "down",
            deltaSchRotation: -90,
          }),
        )
      }
    }
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        issueTypes,
        showFullSchematic: true,
        width: 1200,
        height: 700,
      }),
    ).toMatchSvgSnapshot(import.meta.path, vertical ? "vertical" : "horizontal")
  }
})
