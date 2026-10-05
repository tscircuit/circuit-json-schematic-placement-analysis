import { expect, test } from "bun:test"
import type { SourcePort } from "circuit-json"
import {
  createLocalPassiveSpacingFixture,
  getLocalSpacingPort,
  inspectLocalPassiveSpacing,
} from "../fixtures/local-passive-spacing-fixture"

test("excludes rails and disconnected pins using explicit metadata anywhere on the net", () => {
  const roles: Partial<SourcePort>[] = [
    { requires_power: true },
    { provides_power: true },
    { requires_ground: true },
    { provides_ground: true },
    { requires_voltage: 0 },
    { provides_voltage: 3.3 },
    { do_not_connect: true },
  ]
  for (const [i, role] of roles.entries()) {
    const json = createLocalPassiveSpacingFixture()
    Object.assign(
      getLocalSpacingPort(json, i % 2 === 0 ? "host_signal" : "passive_signal"),
      role,
    )
    expect(
      inspectLocalPassiveSpacing(json, import.meta.path, `port-${i}`),
    ).toEqual([])
  }
  for (const role of [
    { is_ground: true },
    { is_power: true },
    { is_positive_voltage_source: true },
  ]) {
    const json = createLocalPassiveSpacingFixture()
    json.push(
      {
        type: "source_net",
        source_net_id: "rail",
        name: "arbitrary",
        member_source_group_ids: [],
        ...role,
      },
      {
        type: "source_trace",
        source_trace_id: "rail_link",
        connected_source_port_ids: ["host_signal"],
        connected_source_net_ids: ["rail"],
      },
    )
    expect(
      inspectLocalPassiveSpacing(json, import.meta.path, Object.keys(role)[0]),
    ).toEqual([])
  }
  const json = createLocalPassiveSpacingFixture()
  json.push(
    {
      type: "source_port",
      source_port_id: "external_supply",
      name: "external",
      port_hints: [],
      provides_power: true,
    },
    {
      type: "source_trace",
      source_trace_id: "external_link",
      connected_source_port_ids: ["host_signal", "external_supply"],
      connected_source_net_ids: [],
    },
  )
  expect(
    inspectLocalPassiveSpacing(json, import.meta.path, "noncomponent-port"),
  ).toEqual([])
})
