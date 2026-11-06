import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("does not combine local capacitor pairs belonging to different devices on a shared supply", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <net name="SUPPLY" isPowerNet />
      <net name="RETURN" isGroundNet />
      {[0, 14].map((x, i) => (
        <chip
          key={i}
          name={`U${i + 1}`}
          schX={x}
          schY={0}
          schWidth={1.5}
          schHeight={1.5}
          pinLabels={{ pin1: "A", pin2: "B", pin3: "C" }}
          pinAttributes={{
            pin1: { requiresPower: true },
            pin2: { requiresGround: true },
          }}
          schPinArrangement={{
            topSide: ["pin1"],
            bottomSide: ["pin2"],
            rightSide: ["pin3"],
          }}
          connections={{ pin1: "net.SUPPLY", pin2: "net.RETURN" }}
        />
      ))}
      {[0, 14].flatMap((x, i) =>
        [0, 1.4].map((offset, j) => (
          <capacitor
            key={`${i}-${j}`}
            name={`C${i * 2 + j + 1}`}
            capacitance="100nF"
            schX={x + offset}
            schY={3}
            schRotation={270}
            connections={{ pin1: "net.SUPPLY", pin2: "net.RETURN" }}
          />
        )),
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expectReproRendered(circuitJson, 6)
  expectReproNets(circuitJson, [
    [
      "net.SUPPLY",
      "U1.pin1",
      "U2.pin1",
      "C1.pin1",
      "C2.pin1",
      "C3.pin1",
      "C4.pin1",
    ],
    [
      "net.RETURN",
      "U1.pin2",
      "U2.pin2",
      "C1.pin2",
      "C2.pin2",
      "C3.pin2",
      "C4.pin2",
    ],
  ])
  const original = JSON.stringify(circuitJson)
  const issueTypes = ["DecouplingCapacitorsNotCloseTogether"] as const
  const analysis = analyzeSchematicPlacement(circuitJson, { issueTypes })
  expect(analysis.getIssues()).toEqual([])
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes,
      showFullSchematic: true,
      width: 1200,
      height: 400,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
