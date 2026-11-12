import type { SourcePort } from "circuit-json"
import type { PlacementNetworkIndex } from "./placement-network-index"

type ComponentPort = SourcePort & { source_component_id: string }

/** Two independent resistor inputs, with a capacitor across their private chip-side nodes. */
export function getDifferentialRcFilters(index: PlacementNetworkIndex) {
  const isRail = (net: string) =>
    index.isRail(net) ||
    (index.portsByNet.get(net) ?? []).some(
      (p) =>
        p.requires_power ||
        p.provides_power ||
        p.requires_ground ||
        p.provides_ground ||
        p.requires_voltage !== undefined ||
        p.provides_voltage !== undefined,
    )
  const branch = (net: string, capacitorId: string) => {
    const ports = (index.portsByNet.get(net) ?? []).filter(
      (p) =>
        !(
          index.components.get(p.source_component_id)?.ftype ===
            "simple_test_point" &&
          index.portsByComponent.get(p.source_component_id)?.length === 1
        ),
    )
    if (ports.length !== 3 || ports.some((p) => p.do_not_connect)) return
    const resistor = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_resistor",
    )
    const host = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype === "simple_chip",
    )
    if (
      !resistor ||
      !host ||
      !ports.some((p) => p.source_component_id === capacitorId)
    )
      return
    const component = index.components.get(resistor.source_component_id)
    const resistorNets = index.twoTerminalNets(resistor.source_component_id)
    if (
      component?.ftype !== "simple_resistor" ||
      !Number.isFinite(component.resistance) ||
      component.resistance <= 0 ||
      !resistorNets ||
      index.portsByComponent
        .get(resistor.source_component_id)
        ?.some((p) => p.do_not_connect)
    )
      return
    return {
      net,
      resistor,
      host,
      outerNet: resistorNets.find((n) => n !== net)!,
    }
  }
  const filters: {
    capacitorId: string
    capacitorPorts: [ComponentPort, ComponentPort]
    branches: [
      NonNullable<ReturnType<typeof branch>>,
      NonNullable<ReturnType<typeof branch>>,
    ]
  }[] = []
  for (const capacitor of index.components.values()) {
    if (
      capacitor.ftype !== "simple_capacitor" ||
      !Number.isFinite(capacitor.capacitance) ||
      capacitor.capacitance <= 0
    )
      continue
    const id = capacitor.source_component_id,
      nets = index.twoTerminalNets(id)
    if (!nets || nets.some(isRail)) continue
    const first = branch(nets[0], id),
      second = branch(nets[1], id)
    if (
      !first ||
      !second ||
      first.host.source_component_id !== second.host.source_component_id ||
      first.resistor.source_component_id ===
        second.resistor.source_component_id ||
      first.outerNet === second.outerNet ||
      nets.includes(first.outerNet) ||
      nets.includes(second.outerNet)
    )
      continue
    const host = index.placement(first.host.source_component_id)
    if (
      !host ||
      [
        id,
        first.resistor.source_component_id,
        second.resistor.source_component_id,
      ].some((componentId) => {
        const box = index.placement(componentId)
        return !box || !index.sameLocalScope(host, box)
      })
    )
      continue
    filters.push({
      capacitorId: id,
      capacitorPorts: index.portsByComponent.get(id)! as [
        ComponentPort,
        ComponentPort,
      ],
      branches: [first, second],
    })
  }
  return filters
}
