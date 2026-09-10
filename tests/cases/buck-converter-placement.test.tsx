import { expect, test } from "bun:test"
import { Fragment } from "react"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { getTrellisCoreSheetCircuitJson } from "../assets/trellis-core"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

// TI LMR16020 Figure 22 and sections 8.2.2.1–8.2.2.7:
// https://www.ti.com/lit/ds/symlink/lmr16020.pdf#page=19
async function createBuck({
  scattered = false,
  boost = false,
  sharedFeedback = false,
  width = 3,
  bootstrapY = 3,
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const right = width / 2
  const left = -width / 2
  const feedbackX = right + 6 + (scattered ? 9 : 0)
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={3}>
      <net name="VIN" isPowerNet />
      <net name="VOUT" isPowerNet />
      <net name="GND" isGroundNet />
      <chip
        name="U1"
        manufacturerPartNumber="LMR16020PDDAR"
        schX={0}
        schY={0}
        schWidth={width}
        schHeight={6.8}
        schPinStyle={{
          pin2: { bottomMargin: 1.8 },
          pin3: { bottomMargin: 1.8 },
          pin6: { bottomMargin: 1.8 },
          pin7: { topMargin: 1.8 },
          pin5: { topMargin: 1.8 },
          pin8: { topMargin: 1.8 },
        }}
        pinLabels={{
          pin1: "BOOT",
          pin2: "VIN",
          pin3: "EN",
          pin4: "RT_SYNC",
          pin5: "FB",
          pin6: "PGOOD",
          pin7: "GND",
          pin8: "SW",
          pin9: "EP",
        }}
        schPinArrangement={{
          leftSide: { pins: [2, 3, 6, 4], direction: "top-to-bottom" },
          rightSide: { pins: [1, 8, 5, 7], direction: "top-to-bottom" },
          bottomSide: [9],
        }}
        noConnect={["EN"]}
      />
      <inductor name="L1" inductance="10uH" schX={right + 2.8} schY={1} />
      <diode name="D1" schottky schX={right + 1.5} schY={0} schRotation={90} />
      <capacitor
        name="C_BOOT"
        capacitance="100nF"
        schX={right + 1}
        schY={bootstrapY}
      />
      {(
        [
          ["C_IN1", "2.2uF", left - 4.2, 2],
          ["C_IN2", "2.2uF", left - 2.8, 2],
          ["C_IN_HF", "100nF", left - 1.4, 2],
          ["C_OUT1", "33uF", right + 3, 0],
          ["C_OUT2", "33uF", right + 4.5, 0],
        ] as const
      ).map(([name, capacitance, x, y]) => (
        <capacitor
          key={name}
          name={name}
          capacitance={capacitance}
          schX={x}
          schY={y}
          schRotation={90}
        />
      ))}
      <resistor
        name="R_TOP"
        resistance="100k"
        schX={feedbackX}
        schY={-0.45}
        schRotation={90}
      />
      <resistor
        name="R_BOTTOM"
        resistance="17.8k"
        schX={feedbackX}
        schY={-1.55}
        schRotation={90}
      />
      <resistor
        name="R_T"
        resistance="41.2k"
        schX={left - 1.4}
        schY={-4}
        schRotation={90}
      />
      <resistor
        name="R_PG"
        resistance="100k"
        schX={left - 2.2}
        schY={-0.45}
        schRotation={90}
      />
      <trace from=".U1 > .VIN" to=".C_IN_HF > .pin2" />
      <trace from=".C_IN_HF > .pin2" to=".C_IN2 > .pin2" />
      <trace from=".C_IN2 > .pin2" to=".C_IN1 > .pin2" />
      <netlabel
        net="VIN"
        connectsTo=".C_IN1 > .pin2"
        schX={left - 4.2}
        schY={3}
      />
      {(
        [
          ["C_IN1", left - 4.2],
          ["C_IN2", left - 2.8],
          ["C_IN_HF", left - 1.4],
        ] as const
      ).map(([name, x]) => (
        <Fragment key={name}>
          <netlabel
            net="GND"
            connectsTo={`.${name} > .pin1`}
            schX={x}
            schY={1}
          />
        </Fragment>
      ))}
      <trace from=".U1 > .SW" to=".L1 > .pin1" />
      <trace from=".U1 > .SW" to=".D1 > .cathode" />
      <trace from=".U1 > .BOOT" to=".C_BOOT > .pin1" />
      <trace from=".U1 > .SW" to=".C_BOOT > .pin2" />
      <trace from=".L1 > .pin2" to=".C_OUT1 > .pin2" />
      <trace from=".C_OUT1 > .pin2" to=".C_OUT2 > .pin2" />
      <trace from=".C_OUT2 > .pin2" to=".R_TOP > .pin2" />
      <netlabel
        net={boost ? "VIN" : "VOUT"}
        connectsTo=".L1 > .pin2"
        schX={right + 6}
        schY={1}
      />
      <trace from=".D1 > .anode" to=".C_OUT1 > .pin1" />
      <trace from=".C_OUT1 > .pin1" to=".C_OUT2 > .pin1" />
      <netlabel
        net="GND"
        connectsTo=".C_OUT2 > .pin1"
        schX={right + 4.5}
        schY={-0.6}
      />
      <netlabel
        net="FB"
        connectsTo={[".U1 > .FB", ".R_TOP > .pin1", ".R_BOTTOM > .pin2"]}
        schX={feedbackX}
        schY={-1}
        anchorSide="left"
      />
      <netlabel
        net="GND"
        connectsTo={[".R_BOTTOM > .pin1", ".U1 > .GND"]}
        schX={feedbackX}
        schY={-3}
      />
      <netlabel net="GND" connectsTo=".U1 > .EP" schX={0} schY={-4.2} />
      <trace from=".U1 > .pin4" to=".R_T > .pin2" />
      <netlabel
        net="GND"
        connectsTo=".R_T > .pin1"
        schX={left - 1.4}
        schY={-5}
      />
      <trace from=".U1 > .PGOOD" to=".R_PG > .pin1" />
      <netlabel
        net="PG"
        connectsTo=".R_PG > .pin1"
        schX={left - 3.6}
        schY={-1}
        anchorSide="right"
      />
      <netlabel
        net="VOUT"
        connectsTo=".R_PG > .pin2"
        schX={left - 2.2}
        schY={0.4}
      />
      {scattered && (
        <>
          <capacitor
            name="C_REMOTE"
            capacitance="100nF"
            schX={20}
            schY={-5}
            schRotation={90}
          />
          <trace from=".C_REMOTE > .pin1" to="net.GND" />
          <trace from=".C_REMOTE > .pin2" to="net.VOUT" />
        </>
      )}
      {sharedFeedback && (
        <>
          <chip
            name="U2"
            schX={20}
            schY={0}
            pinLabels={{ pin1: "FB" }}
            schPinArrangement={{ leftSide: [1] }}
          />
          <trace from=".U2 > .FB" to=".U1 > .FB" />
        </>
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

const findings = (json: CircuitJson) =>
  analyzeSchematicPlacement(json)
    .getIssues()
    .filter((issue) => issue.lineItemType === "BuckConverterNetworkNotGrouped")

test("groups only an identified buck network and accepts local parts beside a large regulator", async () => {
  const compact = await createBuck()
  expectReproRendered(compact, 13)
  const expectedNets = [
    ["U1.SW", "L1.pin1", "D1.cathode", "C_BOOT.pin2"],
    ["U1.FB", "R_TOP.pin1", "R_BOTTOM.pin2"],
    [
      "L1.pin2",
      "R_TOP.pin2",
      "C_OUT1.pin2",
      "C_OUT2.pin2",
      "R_PG.pin2",
      "net.VOUT",
    ],
    [
      "U1.GND",
      "U1.pin7",
      "U1.EP",
      "U1.pin9",
      "D1.anode",
      "R_BOTTOM.pin1",
      "R_T.pin1",
      "C_IN1.pin1",
      "C_IN2.pin1",
      "C_IN_HF.pin1",
      "C_OUT1.pin1",
      "C_OUT2.pin1",
      "net.GND",
    ],
    ["U1.VIN", "C_IN1.pin2", "C_IN2.pin2", "C_IN_HF.pin2", "net.VIN"],
    ["U1.BOOT", "C_BOOT.pin1"],
    ["U1.pin4", "R_T.pin2"],
    ["U1.PGOOD", "R_PG.pin1", "net.PG"],
  ]
  expectReproNets(compact, expectedNets)
  const groundPort = getReproSourcePort(compact, "U1", "GND")
  expect(
    compact.find(
      (element) =>
        element.type === "schematic_port" &&
        element.source_port_id === groundPort.source_port_id,
    ),
  ).toMatchObject({ pin_number: 7, facing_direction: "right" })
  expect(findings(compact)).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson: compact,
      analysis: analyzeSchematicPlacement(compact),
      issueTypes: ["BuckConverterNetworkNotGrouped"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  const scattered = await createBuck({ scattered: true })
  expectReproNets(scattered, expectedNets)
  const before = JSON.stringify(scattered)
  const issues = findings(scattered)
  expect(JSON.stringify(scattered)).toBe(before)
  expect(issues).toHaveLength(1)
  expect(
    issues[0]!.distantComponents.map(
      (part) => part.schematicBox.sourceComponentName,
    ),
  ).toEqual(["R_TOP", "R_BOTTOM"])
  expect(
    issues[0]!.supportNetworkComponents.map((part) => part.sourceComponentName),
  ).not.toContain("C_REMOTE")
  expect(
    findings(await createBuck({ bootstrapY: 12 }))[0]!.distantComponents.map(
      (part) => part.role,
    ),
  ).toEqual(["bootstrap_capacitor"])
  for (const sheet of [
    "power",
    "cpu-core",
    "cpu-io",
    "storage",
    "usb",
  ] as const) {
    expect(findings(getTrellisCoreSheetCircuitJson(sheet))).toEqual([])
  }
  for (const options of [
    { scattered: true, boost: true },
    { scattered: true, sharedFeedback: true },
    { width: 18 },
  ]) {
    expect(findings(await createBuck(options))).toEqual([])
  }
  for (const field of ["schematic_sheet_id", "schematic_group_id"] as const) {
    const separated = structuredClone(scattered)
    const sourceId = separated.find(
      (e) => e.type === "source_component" && e.name === "R_TOP",
    )!
    if (sourceId.type !== "source_component")
      throw new Error("Missing resistor")
    const part = separated.find(
      (e) =>
        e.type === "schematic_component" &&
        e.source_component_id === sourceId.source_component_id,
    )!
    if (part.type !== "schematic_component")
      throw new Error("Missing placement")
    part[field] = "separate-block"
    expect(findings(separated)).toEqual([])
  }
})
