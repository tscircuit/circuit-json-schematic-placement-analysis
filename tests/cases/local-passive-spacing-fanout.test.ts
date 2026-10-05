import { expect, test } from "bun:test"
import {
  createLocalPassiveSpacingFixture,
  inspectLocalPassiveSpacing,
} from "../fixtures/local-passive-spacing-fixture"

test("requires a two-member signal net and a two-terminal passive with distinct nets", () => {
  const fanout = createLocalPassiveSpacingFixture()
  fanout.push(
    {
      type: "source_component",
      source_component_id: "remote",
      ftype: "simple_chip",
      name: "J1",
    },
    {
      type: "source_port",
      source_port_id: "remote_signal",
      source_component_id: "remote",
      name: "other",
      port_hints: [],
    },
    {
      type: "source_trace",
      source_trace_id: "fanout",
      connected_source_port_ids: ["host_signal", "remote_signal"],
      connected_source_net_ids: [],
    },
  )
  expect(
    inspectLocalPassiveSpacing(fanout, import.meta.path, "fanout"),
  ).toEqual([])
  const extraTerminal = createLocalPassiveSpacingFixture()
  extraTerminal.push({
    type: "source_port",
    source_port_id: "passive_extra",
    source_component_id: "passive",
    name: "other",
    port_hints: [],
  })
  expect(
    inspectLocalPassiveSpacing(
      extraTerminal,
      import.meta.path,
      "third-terminal",
    ),
  ).toEqual([])
  const shorted = createLocalPassiveSpacingFixture()
  shorted.push({
    type: "source_trace",
    source_trace_id: "shorted",
    connected_source_port_ids: ["passive_signal", "passive_other"],
    connected_source_net_ids: [],
  })
  expect(
    inspectLocalPassiveSpacing(shorted, import.meta.path, "shorted"),
  ).toEqual([])
  const untyped = createLocalPassiveSpacingFixture()
  for (const e of untyped)
    if (e.type === "source_component" && e.source_component_id === "passive")
      Object.assign(e, { ftype: "simple_chip" })
  expect(
    inspectLocalPassiveSpacing(untyped, import.meta.path, "no-typed-passive"),
  ).toEqual([])
})
