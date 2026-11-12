import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPeltierDifferentialFilter } from "../assets/peltier-differential-filter"
import { getReproSourcePort as port } from "../fixtures/placement-repro-assertions"

test("a supply-fed differential filter keeps parallel branches without exempting ordinary pull-ups", async () => {
  const corrected = await createPeltierDifferentialFilter(true)
  const supply = corrected.find(
    (e) => e.type === "source_net" && e.name === "TEC_POS",
  )
  expect(supply?.type === "source_net" && supply.is_power).toBe(true)
  expect(
    supply?.type === "source_net" && supply.is_positive_voltage_source,
  ).toBe(true)
  const orientation = (j: typeof corrected) =>
    analyzeSchematicPlacement(j, {
      issueTypes: [
        "TwoPinComponentShouldBeVertical",
        "TwoPinComponentHasInvertedRails",
      ],
    }).getIssues()
  expect(orientation(corrected)).toEqual([])
  // Without a bridging capacitor this is an ordinary supply-to-chip resistor.
  const ordinary = structuredClone(corrected)
  const capacitorId = port(
    ordinary,
    "C_CURRENT_FILTER",
    "pin1",
  ).source_component_id
  const capacitorPortIds = new Set(
    ordinary.flatMap((e) =>
      e.type === "source_port" && e.source_component_id === capacitorId
        ? [e.source_port_id]
        : [],
    ),
  )
  const filtered = ordinary.filter(
    (e) =>
      !("source_component_id" in e && e.source_component_id === capacitorId),
  )
  for (const e of filtered)
    if (e.type === "source_trace")
      e.connected_source_port_ids = e.connected_source_port_ids.filter(
        (id) => !capacitorPortIds.has(id),
      )
  expect(orientation(filtered)).toEqual([
    expect.objectContaining({
      lineItemType: "TwoPinComponentShouldBeVertical",
      schematicBox: expect.objectContaining({
        sourceComponentName: "R_ISN_FILTER",
      }),
    }),
  ])
  // Grounding either inner node also removes the differential-filter exemption.
  const grounded = structuredClone(corrected)
  port(grounded, "U_DRIVER", "pin12").requires_ground = true
  expect(
    orientation(grounded).some(
      (i) =>
        i.lineItemType === "TwoPinComponentShouldBeVertical" &&
        i.schematicBox.sourceComponentName === "R_ISN_FILTER",
    ),
  ).toBe(true)
})
