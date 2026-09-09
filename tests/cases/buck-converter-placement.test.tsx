import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { getTrellisCoreSheetCircuitJson } from "../assets/trellis-core"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

async function createBuck({
  scattered = false,
  boost = false,
  sharedFeedback = false,
  width = 1.6,
  bootstrapY = 2.5,
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const outputX = width / 2 + 2
  const feedbackX = outputX + (scattered ? 9 : 0)
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="VIN" isPowerNet />
      <net name="VOUT" isPowerNet />
      <net name="GND" isGroundNet />
      <chip
        name="U1"
        schX={0}
        schY={0}
        schWidth={width}
        schHeight={2}
        pinLabels={{
          pin1: "VIN",
          pin2: "SW",
          pin3: "FB",
          pin4: "BOOT",
          pin5: "GND",
        }}
        schPinArrangement={{
          leftSide: [1],
          rightSide: [2, 3],
          topSide: [4],
          bottomSide: [5],
        }}
      />
      <inductor name="L1" inductance="10uH" schX={outputX} schY={1} />
      <diode name="D1" schX={outputX - 1} schY={-1} schRotation={90} />
      <capacitor name="C_BOOT" capacitance="100nF" schX={0} schY={bootstrapY} />
      <resistor
        name="R_TOP"
        resistance="100k"
        schX={feedbackX}
        schY={-2.2}
        schRotation={90}
      />
      <resistor
        name="R_BOTTOM"
        resistance="10k"
        schX={feedbackX}
        schY={-3.8}
        schRotation={90}
      />
      <trace from=".U1 > .VIN" to="net.VIN" />
      <trace from=".U1 > .GND" to="net.GND" />
      <trace from=".U1 > .SW" to=".L1 > .pin1" />
      <trace from=".L1 > .pin2" to={boost ? "net.VIN" : "net.VOUT"} />
      <trace from=".U1 > .SW" to=".D1 > .cathode" />
      <trace from=".D1 > .anode" to="net.GND" />
      <trace from=".U1 > .BOOT" to=".C_BOOT > .pin1" />
      <trace from=".U1 > .SW" to=".C_BOOT > .pin2" />
      <trace from="net.VOUT" to=".R_TOP > .pin2" />
      <trace from=".R_TOP > .pin1" to=".U1 > .FB" />
      <trace from=".R_BOTTOM > .pin2" to=".U1 > .FB" />
      <trace from=".R_BOTTOM > .pin1" to="net.GND" />
      {scattered && (
        <>
          <capacitor
            name="C_REMOTE"
            capacitance="100nF"
            schX={15}
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
            schX={15}
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
  expectReproRendered(compact, 6)
  expectReproNets(compact, [
    ["U1.SW", "L1.pin1", "D1.cathode", "C_BOOT.pin2"],
    ["U1.FB", "R_TOP.pin1", "R_BOTTOM.pin2"],
    ["L1.pin2", "R_TOP.pin2", "net.VOUT"],
  ])
  expect(findings(compact)).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson: compact,
      analysis: analyzeSchematicPlacement(compact),
      issueTypes: ["BuckConverterNetworkNotGrouped"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  const scattered = await createBuck({ scattered: true })
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
