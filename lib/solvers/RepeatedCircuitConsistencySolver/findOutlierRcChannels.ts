import type { SchematicPort, SourcePort } from "circuit-json"
import type { SchematicBoxPlacement } from "../../types"

export type ComponentPort = SourcePort & { source_component_id: string }

export interface RcChannelCandidate {
  scopeKey: string
  signatureKey: string
  inputNet: string
  signalNet: string
  resistorBox: SchematicBoxPlacement
  capacitorBox: SchematicBoxPlacement
  resistorSignalPort: ComponentPort
  capacitorSignalPort: ComponentPort
  resistorSignalPin: SchematicPort
  dx: number
  dy: number
}

export interface OutlierRcChannel {
  outlier: RcChannelCandidate
  consensusCluster: RcChannelCandidate[]
  offsetDeviation: number
}

export function findOutlierRcChannels(
  candidates: RcChannelCandidate[],
): OutlierRcChannel[] {
  const bucketKeys = [
    ...new Set(candidates.map((ch) => `${ch.scopeKey}::${ch.signatureKey}`)),
  ]
  const outliers: OutlierRcChannel[] = []

  for (const bucketKey of bucketKeys) {
    const group = candidates.filter(
      (ch) => `${ch.scopeKey}::${ch.signatureKey}` === bucketKey,
    )
    if (group.length < 3) continue
    const inputNets = new Set(group.map((ch) => ch.inputNet))
    const signalNets = new Set(group.map((ch) => ch.signalNet))
    if (inputNets.size !== group.length || signalNets.size !== group.length)
      continue

    let bestCluster: RcChannelCandidate[] = []
    for (const seed of group) {
      const cluster = group.filter(
        (other) => Math.hypot(other.dx - seed.dx, other.dy - seed.dy) <= 0.25,
      )
      if (cluster.length > bestCluster.length) {
        bestCluster = cluster
      }
    }

    const minConsensusSize = Math.max(2, Math.ceil((group.length * 2) / 3))
    if (
      bestCluster.length < minConsensusSize ||
      bestCluster.length === group.length
    )
      continue

    const consensusDx =
      bestCluster.reduce((sum, ch) => sum + ch.dx, 0) / bestCluster.length
    const consensusDy =
      bestCluster.reduce((sum, ch) => sum + ch.dy, 0) / bestCluster.length
    const inCluster = new Set(bestCluster)

    for (const ch of group) {
      if (inCluster.has(ch)) continue
      const offsetDeviation = Math.hypot(
        ch.dx - consensusDx,
        ch.dy - consensusDy,
      )
      const mirroredDeviation = Math.hypot(
        Math.abs(ch.dx) - Math.abs(consensusDx),
        Math.abs(ch.dy) - Math.abs(consensusDy),
      )
      if (offsetDeviation <= 4 || mirroredDeviation <= 3) continue
      outliers.push({
        outlier: ch,
        consensusCluster: bestCluster,
        offsetDeviation,
      })
    }
  }

  return outliers
}
