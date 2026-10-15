import type { SchematicPort } from "circuit-json"
import type { SchematicBoxPlacement } from "../../types"
import type { PlacementNetworkIndex } from "../../utils/placement-network-index"

export function getSinglePinAlignmentTarget(
  {
    firstPort,
    secondPort,
    placements: [first, second],
  }: {
    firstPort: SchematicPort
    secondPort: SchematicPort
    placements: [SchematicBoxPlacement, SchematicBoxPlacement]
  },
  index: PlacementNetworkIndex,
): SchematicBoxPlacement | undefined {
  if (!index.sameLocalScope(first, second)) return
  const net = index.connected(firstPort.source_port_id)
  if (
    index.connected(secondPort.source_port_id) !== net ||
    index.portsByNet.get(net)?.length !== 2
  )
    return

  let target = second
  // Prefer moving the component with fewer pins to disturb fewer connections.
  const firstPinCount =
    index.portsByComponent.get(first.sourceComponentId ?? "")?.length ?? 0
  const secondPinCount =
    index.portsByComponent.get(second.sourceComponentId ?? "")?.length ?? 0
  if (firstPinCount < secondPinCount) target = first
  if (Math.abs(firstPort.center.y - secondPort.center.y) > target.height / 2)
    return
  return target
}
