import { BaseSolver } from "@tscircuit/solver-utils"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import type {
  CircuitJson,
  SchematicNetLabel,
  SourceNet,
  SourcePort,
} from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import type {
  DecouplingCapacitorsNotCloseTogether,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import {
  highlightPlacement,
  mergeGraphicsObjects,
  visualizeCircuitJson,
} from "../../utils/graphics"
import type { SolverContext } from "../SolverContext"

interface DecouplingCapacitorInfo {
  sourceComponentId: string
  sourceComponentName: string
  railName: string
  schematicSheetId?: string
  schematicBox: SchematicBoxPlacement
}

export class DecouplingCapacitorsDistanceSolver extends BaseSolver {
  public static readonly MAX_ALLOWED_DISTANCE = 4.0

  private readonly ctx: SolverContext
  private readonly out: SchematicPlacementIssue[]
  private readonly issuesToEmit: DecouplingCapacitorsNotCloseTogether[] = []
  private currentIndex = 0

  constructor({
    ctx,
    issues: out,
  }: {
    ctx: SolverContext
    issues: SchematicPlacementIssue[]
  }) {
    super()
    this.ctx = ctx
    this.out = out
    this.issuesToEmit = this.findDecouplingDistanceIssues()
    this.solved = this.issuesToEmit.length === 0
  }

  override _step(): void {
    const issue = this.issuesToEmit[this.currentIndex]
    if (!issue) {
      this.solved = true
      return
    }
    this.currentIndex += 1
    this.solved = this.currentIndex >= this.issuesToEmit.length
    this.out.push(issue)
  }

  override visualize(): GraphicsObject {
    const issue = this.issuesToEmit[Math.max(0, this.currentIndex - 1)]
    return mergeGraphicsObjects([
      visualizeCircuitJson(this.ctx.circuitJson),
      issue
        ? highlightPlacement(
            issue.firstCapacitorSchematicBox,
            "hsl(0, 100%, 50%, 0.95)",
            "decouplingCapacitorsNotClose1",
          )
        : undefined,
      issue
        ? highlightPlacement(
            issue.secondCapacitorSchematicBox,
            "hsl(30, 100%, 50%, 0.95)",
            "decouplingCapacitorsNotClose2",
          )
        : undefined,
    ])
  }

  private findDecouplingDistanceIssues(): DecouplingCapacitorsNotCloseTogether[] {
    const { circuitJson, componentPlacements } = this.ctx

    const connMap = getFullConnectivityMapFromCircuitJson(circuitJson)
    const sourceNetById = new Map<string, SourceNet>()
    const netLabelById = new Map<string, SchematicNetLabel>()
    for (const el of circuitJson) {
      if (el.type === "source_net") {
        sourceNetById.set(el.source_net_id, el)
      } else if (el.type === "schematic_net_label") {
        netLabelById.set(el.schematic_net_label_id, el)
      }
    }

    const getNetInfoForPortId = (
      portId: string,
      portSubcircuitKey?: string,
    ): { name: string; isGround: boolean } | undefined => {
      const netId = connMap.getNetConnectedToId(portId)
      if (netId) {
        for (const cid of connMap.getIdsConnectedToNet(netId)) {
          const sn = sourceNetById.get(cid)
          if (sn?.name) {
            return {
              name: sn.name,
              isGround: Boolean(
                sn.is_ground || sn.name.toLowerCase() === "gnd",
              ),
            }
          }
          const nl = netLabelById.get(cid)
          if (nl?.text) {
            return {
              name: nl.text,
              isGround: nl.text.toLowerCase() === "gnd",
            }
          }
        }
      }

      if (portSubcircuitKey) {
        for (const sn of sourceNetById.values()) {
          if (
            sn.subcircuit_connectivity_map_key === portSubcircuitKey &&
            sn.name
          ) {
            return {
              name: sn.name,
              isGround: Boolean(
                sn.is_ground || sn.name.toLowerCase() === "gnd",
              ),
            }
          }
        }
      }

      return undefined
    }

    const portsByComponentId = new Map<string, SourcePort[]>()
    for (const el of circuitJson) {
      if (el.type === "source_port" && el.source_component_id) {
        const list = portsByComponentId.get(el.source_component_id) ?? []
        list.push(el)
        portsByComponentId.set(el.source_component_id, list)
      }
    }

    const placementByComponentId = new Map<string, SchematicBoxPlacement>()
    for (const p of componentPlacements) {
      if (p.sourceComponentId) {
        placementByComponentId.set(p.sourceComponentId, p)
      }
    }

    const decouplingCaps: DecouplingCapacitorInfo[] = []
    for (const el of circuitJson) {
      if (el.type !== "source_component" || el.ftype !== "simple_capacitor") {
        continue
      }
      const ports = portsByComponentId.get(el.source_component_id) ?? []
      if (ports.length !== 2) continue

      const net1 = getNetInfoForPortId(
        ports[0]!.source_port_id,
        ports[0]!.subcircuit_connectivity_map_key,
      )
      const net2 = getNetInfoForPortId(
        ports[1]!.source_port_id,
        ports[1]!.subcircuit_connectivity_map_key,
      )
      if (!net1 || !net2) continue

      let railName: string | undefined
      if (net1.isGround && !net2.isGround) {
        railName = net2.name
      } else if (net2.isGround && !net1.isGround) {
        railName = net1.name
      }
      if (!railName) continue

      const placement = placementByComponentId.get(el.source_component_id)
      if (!placement) continue

      decouplingCaps.push({
        sourceComponentId: el.source_component_id,
        sourceComponentName: el.name,
        railName,
        schematicSheetId: placement.schematicSheetId,
        schematicBox: placement,
      })
    }

    // Group capacitors by sheet and rail
    const groups = new Map<string, DecouplingCapacitorInfo[]>()
    for (const cap of decouplingCaps) {
      const key = `${cap.schematicSheetId ?? ""}:${cap.railName}`
      const list = groups.get(key) ?? []
      list.push(cap)
      groups.set(key, list)
    }

    const issues: DecouplingCapacitorsNotCloseTogether[] = []

    for (const group of groups.values()) {
      if (group.length < 2) continue

      // Cluster capacitors using connected components: an edge exists if distance <= MAX_ALLOWED_DISTANCE
      const n = group.length
      const adj: number[][] = Array.from({ length: n }, () => [])

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const capA = group[i]!
          const capB = group[j]!
          const dist = Math.hypot(
            capA.schematicBox.schX - capB.schematicBox.schX,
            capA.schematicBox.schY - capB.schematicBox.schY,
          )
          if (dist <= DecouplingCapacitorsDistanceSolver.MAX_ALLOWED_DISTANCE) {
            adj[i]!.push(j)
            adj[j]!.push(i)
          }
        }
      }

      // Find connected components
      const visited = new Array<boolean>(n).fill(false)
      const clusters: number[][] = []

      for (let i = 0; i < n; i++) {
        if (visited[i]) continue
        const cluster: number[] = []
        const queue: number[] = [i]
        visited[i] = true

        while (queue.length > 0) {
          const u = queue.shift()!
          cluster.push(u)
          for (const v of adj[u]!) {
            if (!visited[v]) {
              visited[v] = true
              queue.push(v)
            }
          }
        }
        clusters.push(cluster)
      }

      if (clusters.length <= 1) continue

      // For pairs of disconnected clusters, find the closest representative pair
      for (let ci = 0; ci < clusters.length; ci++) {
        for (let cj = ci + 1; cj < clusters.length; cj++) {
          let bestDist = Infinity
          let bestPair:
            | [DecouplingCapacitorInfo, DecouplingCapacitorInfo]
            | null = null

          for (const u of clusters[ci]!) {
            for (const v of clusters[cj]!) {
              const capA = group[u]!
              const capB = group[v]!
              const dist = Math.hypot(
                capA.schematicBox.schX - capB.schematicBox.schX,
                capA.schematicBox.schY - capB.schematicBox.schY,
              )
              if (dist < bestDist) {
                bestDist = dist
                bestPair = [capA, capB]
              }
            }
          }

          if (bestPair) {
            const [capA, capB] = bestPair
            // Sort by component name for deterministic output (e.g. C1 then C2)
            const [firstCap, secondCap] =
              capA.sourceComponentName.localeCompare(
                capB.sourceComponentName,
              ) <= 0
                ? [capA, capB]
                : [capB, capA]

            issues.push({
              lineItemType: "DecouplingCapacitorsNotCloseTogether",
              railName: firstCap.railName,
              firstCapacitorSchematicBox: firstCap.schematicBox,
              secondCapacitorSchematicBox: secondCap.schematicBox,
              message: `Decoupling capacitors ${firstCap.sourceComponentName} and ${secondCap.sourceComponentName} on rail "${firstCap.railName}" are placed far apart (${bestDist.toFixed(2)} units)`,
            })
          }
        }
      }
    }

    return issues
  }

  static issueToString(issue: DecouplingCapacitorsNotCloseTogether): string {
    const attrs: string[] = []
    addAttr(attrs, "rail", issue.railName)
    addAttr(
      attrs,
      "firstCapacitorName",
      issue.firstCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondCapacitorName",
      issue.secondCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message, { escape: false })
    return `<DecouplingCapacitorsNotCloseTogether ${attrs.join(" ")} />`
  }
}
