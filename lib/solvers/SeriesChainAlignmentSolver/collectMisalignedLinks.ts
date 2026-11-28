import type { SchematicPort, SourcePort } from "circuit-json"
import type { SchematicBoxPlacement, SeriesChainNotAligned } from "../../types"

export type ComponentPort = SourcePort & { source_component_id: string }

export interface SeriesLink {
  firstPort: ComponentPort
  secondPort: ComponentPort
  firstPin: SchematicPort
  secondPin: SchematicPort
  dx: number
  dy: number
  pinDistance: number
}

export const directions = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, 1],
  down: [0, -1],
} as const

export function collectMisalignedLinks(
  links: SeriesLink[],
  placements: SchematicBoxPlacement[],
): SeriesChainNotAligned["misalignedConnections"] {
  const firstVec =
    links[0]?.firstPin.facing_direction &&
    directions[links[0].firstPin.facing_direction]
  const chainHorizontal = firstVec ? firstVec[0] !== 0 : undefined
  const signedOffsets = links.map((link) => {
    const dir =
      link.firstPin.facing_direction &&
      directions[link.firstPin.facing_direction]
    return dir ? link.dx * dir[1] - link.dy * dir[0] : 0
  })

  const badIndices = new Set<number>()
  for (let i = 0; i < links.length; i++) {
    const link = links[i]!
    const firstBox = placements[i]!
    const secondBox = placements[i + 1]!
    const compactDistance = Math.max(
      2,
      2 *
        Math.max(
          firstBox.width,
          firstBox.height,
          secondBox.width,
          secondBox.height,
        ),
    )
    if (link.pinDistance <= compactDistance) continue
    const firstDir =
      link.firstPin.facing_direction &&
      directions[link.firstPin.facing_direction]
    const secondDir =
      link.secondPin.facing_direction &&
      directions[link.secondPin.facing_direction]
    const forwardSameAxis = Boolean(
      firstDir &&
        secondDir &&
        (firstDir[0] !== 0) === chainHorizontal &&
        firstDir[0] * secondDir[0] + firstDir[1] * secondDir[1] === -1 &&
        link.dx * firstDir[0] + link.dy * firstDir[1] > 0,
    )
    if (!forwardSameAxis) {
      badIndices.add(i)
      continue
    }
    const prevOffset = i > 0 ? signedOffsets[i - 1]! : 0
    const nextOffset = i + 1 < links.length ? signedOffsets[i + 1]! : 0
    const curOffset = signedOffsets[i]!
    if (
      Math.abs(curOffset) > 0.15 &&
      ((Math.abs(prevOffset) > 0.15 && curOffset * prevOffset < 0) ||
        (Math.abs(nextOffset) > 0.15 && curOffset * nextOffset < 0))
    ) {
      badIndices.add(i)
    }
  }

  return [...badIndices].map((idx) => ({
    firstSourcePortId: links[idx]!.firstPort.source_port_id,
    secondSourcePortId: links[idx]!.secondPort.source_port_id,
    pinDistance: links[idx]!.pinDistance,
  }))
}
