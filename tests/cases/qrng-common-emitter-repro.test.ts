import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { qrngCommonEmitter as circuitJson } from "../assets/qrng-common-emitter"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

// TI Figure 121 places Rc above the collector and Re below the emitter.
// Different base bias; reference for placement, not identical electrical behavior.
// https://www.ti.com/lit/eb/slyy247/slyy247.pdf#page=80
test("records sideways common-emitter stages on the complete published QRNG sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 18)
  expectReproNets(circuitJson, [
    ["Q1.base", "R1B.pin2", "C1.neg"],
    ["Q1.collector", "R1C.pin2", "C2.pos"],
    ["Q2.base", "R2B.pin2", "C2.neg"],
    ["Q2.collector", "R2C.pin2", "C_OUT.pos"],
    ["R1C.pin1", "R2C.pin1", "net.V12"],
    ["R1E.pin2", "R2E.pin2", "net.GND"],
  ])
  const connected = getSourceConnectivity(circuitJson)
  for (const stage of [1, 2]) {
    expect(
      connected(
        getReproSourcePort(circuitJson, `Q${stage}`, "emitter").source_port_id,
      ),
    ).toBe(
      connected(
        getReproSourcePort(circuitJson, `R${stage}E`, "pin1").source_port_id,
      ),
    )
    expect(
      getReproSchematicComponent(circuitJson, `Q${stage}`).symbol_name,
    ).toBe("npn_bipolar_transistor_right")
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssueCounts().TraceCanBeSimplifiedByMovingComponent).toBe(
    0,
  )
  expect(analysis.getIssueCounts().LowSideTransistorNotAlignedWithLoad).toBe(0)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      showFullSchematic: true,
      showOverlay: false,
      width: 2200,
      height: 1600,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
