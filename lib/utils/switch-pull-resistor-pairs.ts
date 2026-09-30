import type { SourcePort } from "circuit-json"
import type { SchematicBoxPlacement } from "../types"
import type { PlacementNetworkIndex } from "./placement-network-index"

interface SwitchPullResistorPair {
  resistor: SchematicBoxPlacement
  switchBox: SchematicBoxPlacement
  signalPort: SourcePort
  signalSchY: number
  pullDirection: "up" | "down"
  horizontalPushbutton: boolean
}

/** A local resistor and two-terminal switch sharing a signal between opposing rails. */
export function getSwitchPullResistorPairs(index: PlacementNetworkIndex) {
  const pairs: SwitchPullResistorPair[] = []
  const isHorizontal = (id: string) => {
    const ports = index.portsByComponent.get(id)
    if (ports?.length !== 2) return false
    const a = index.port(ports[0]!)
    const b = index.port(ports[1]!)
    return (
      !!a &&
      !!b &&
      Math.abs(a.center.y - b.center.y) < 0.01 &&
      Math.abs(a.center.x - b.center.x) > 0.01
    )
  }
  for (const component of index.components.values()) {
    if (component.ftype !== "simple_resistor" || component.resistance <= 0)
      continue
    const id = component.source_component_id
    const nets = index.twoTerminalNets(id)
    if (!nets || nets.filter((net) => index.isRail(net)).length !== 1) continue
    const rail = nets.find((net) => index.isRail(net))!
    if (index.powerNets.has(rail) && index.groundNets.has(rail)) continue
    const signal = nets.find((net) => net !== rail)!
    const peers = index.portsByNet.get(signal) ?? []
    // Signal consumers may share the net, but the resistor/switch pair must be unique.
    const switches = peers.filter((port) => {
      const type = index.components.get(port.source_component_id)?.ftype
      return type === "simple_switch" || type === "simple_push_button"
    })
    if (
      switches.length !== 1 ||
      peers.filter(
        (port) =>
          index.components.get(port.source_component_id)?.ftype ===
          "simple_resistor",
      ).length !== 1
    )
      continue
    const signalPort = switches[0]!
    const switchId = signalPort.source_component_id
    const switchType = index.components.get(switchId)?.ftype
    const switchNets = index.twoTerminalNets(switchId)
    const otherRail = switchNets?.find((net) => net !== signal)
    if (!otherRail) continue
    const pullDirection = index.powerNets.has(rail) ? "up" : "down"
    if (
      pullDirection === "up"
        ? !index.groundNets.has(otherRail) || index.powerNets.has(otherRail)
        : !index.powerNets.has(otherRail) || index.groundNets.has(otherRail)
    )
      continue
    if (
      [id, switchId].some((componentId) =>
        index.portsByComponent
          .get(componentId)
          ?.some((port) => port.do_not_connect),
      )
    )
      continue
    const resistor = index.placement(id)
    const switchBox = index.placement(switchId)
    const pin = index.port(signalPort)
    if (
      !resistor ||
      !switchBox ||
      !pin ||
      !index.sameLocalScope(resistor, switchBox)
    )
      continue
    pairs.push({
      resistor,
      switchBox,
      signalPort,
      signalSchY: pin.center.y,
      pullDirection,
      horizontalPushbutton:
        switchType === "simple_push_button" &&
        isHorizontal(id) &&
        isHorizontal(switchId),
    })
  }
  return pairs
}

/** Horizontal pushbutton pairs are an exception to the usual vertical rail convention. */
export function getHorizontalPushbuttonComponentIds(
  index: PlacementNetworkIndex,
) {
  return new Set(
    getSwitchPullResistorPairs(index).flatMap((pair) =>
      pair.horizontalPushbutton
        ? [pair.resistor.sourceComponentId!, pair.switchBox.sourceComponentId!]
        : [],
    ),
  )
}
