import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  SeriesChainNotAligned,
} from "../../types"
import { addAttr } from "../../utils/format"
import { hasVisibleSchematicConnection } from "../../utils/has-visible-schematic-connection"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"
import {
  type ComponentPort,
  collectMisalignedLinks,
  directions,
  type SeriesLink,
} from "./collectMisalignedLinks"

/** An unbranched 3+ passive series chain should read along a consistent axis. */
export class SeriesChainAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly candidateIds: Set<string>
  private readonly visited = new Set<string>()
  private readonly unpopulated = new Set<string>()

  constructor(
    private readonly solverInput: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(solverInput.ctx)
    for (const element of solverInput.ctx.circuitJson) {
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
      if (element.type === "source_port") {
        const net = this.index.connected(element.source_port_id)
        if (element.requires_ground || element.provides_ground)
          this.index.groundNets.add(net)
        if (
          element.requires_power ||
          element.provides_power ||
          element.requires_voltage !== undefined ||
          element.provides_voltage !== undefined
        )
          this.index.powerNets.add(net)
      }
    }
    for (const element of solverInput.ctx.circuitJson) {
      if (element.type === "pcb_component" && !element.do_not_place)
        this.unpopulated.delete(element.source_component_id)
    }
    this.candidateIds = new Set(
      [...this.index.components.keys()].filter((id) =>
        Boolean(this.validPassive(id)),
      ),
    )
    this.solved = this.candidateIds.size < 3
  }

  override _step(): void {
    const start = [...this.candidateIds].find((id) => !this.visited.has(id))
    if (!start) {
      this.solved = true
      return
    }
    const group = [start]
    this.visited.add(start)
    const adjacency: Array<Set<number>> = [new Set<number>()]

    for (let i = 0; i < group.length; i++) {
      const id = group[i]!
      for (const port of this.index.portsByComponent.get(id) ?? []) {
        const net = this.index.connected(port.source_port_id)
        const peers = this.index.portsByNet.get(net) ?? []
        if (this.index.isRail(net) || peers.length !== 2) continue
        const other = peers.find((peer) => peer.source_component_id !== id)
        if (!other || !this.candidateIds.has(other.source_component_id))
          continue
        const otherId = other.source_component_id
        if (!this.privateSeriesLink([id, otherId])) continue
        let otherIdx = group.indexOf(otherId)
        if (otherIdx === -1) {
          otherIdx = group.length
          this.visited.add(otherId)
          group.push(otherId)
          adjacency.push(new Set<number>())
        }
        adjacency[i]!.add(otherIdx)
        adjacency[otherIdx]!.add(i)
      }
    }
    this.solved = this.visited.size >= this.candidateIds.size
    if (group.length < 3) return
    if (
      !group.some(
        (id) => this.index.components.get(id)?.ftype !== "simple_resistor",
      )
    )
      return

    const endIndices = group
      .map((_, idx) => idx)
      .filter((idx) => adjacency[idx]!.size === 1)
    if (
      endIndices.length !== 2 ||
      adjacency.some((neighbors) => neighbors.size > 2)
    )
      return

    endIndices.sort((leftIdx, rightIdx) =>
      this.comparePlacements(
        this.index.placement(group[leftIdx]!)!,
        this.index.placement(group[rightIdx]!)!,
      ),
    )
    const orderedIndices = [endIndices[0]!]
    while (orderedIndices.length < group.length) {
      const last = orderedIndices.at(-1)!
      const previous = orderedIndices.at(-2)
      const next = [...adjacency[last]!].find((idx) => idx !== previous)
      if (next === undefined || orderedIndices.includes(next)) return
      orderedIndices.push(next)
    }

    const orderedIds = orderedIndices.map((idx) => group[idx]!)
    if (!this.hasDistinctNonRailOuterEnds(orderedIds)) return
    const placements = orderedIds.map((id) => this.index.placement(id)!)
    if (
      placements.some((box) => !this.index.sameLocalScope(placements[0]!, box))
    )
      return

    const links: SeriesLink[] = []
    for (let i = 1; i < orderedIds.length; i++) {
      const firstBox = placements[i - 1]!
      const secondBox = placements[i]!
      if (
        Math.abs(firstBox.schX - secondBox.schX) <
          (firstBox.width + secondBox.width) / 2 &&
        Math.abs(firstBox.schY - secondBox.schY) <
          (firstBox.height + secondBox.height) / 2
      )
        return
      const link = this.privateSeriesLink([orderedIds[i - 1]!, orderedIds[i]!])
      if (!link) return
      links.push(link)
    }

    const misalignedConnections = collectMisalignedLinks(links, placements)
    if (
      misalignedConnections.length === 0 ||
      !links.every((link) =>
        hasVisibleSchematicConnection(
          this.solverInput.ctx.circuitJson,
          this.index,
          link.firstPort,
          link.secondPort,
        ),
      )
    )
      return

    const names = placements
      .map((box) => box.sourceComponentName || "component")
      .join(", ")
    this.solverInput.issues.push({
      lineItemType: "SeriesChainNotAligned",
      chainSchematicBoxes: placements,
      misalignedConnections,
      message: `Align ${names} along a consistent horizontal or vertical axis so their private series path reads end-to-end without bent intermediate orientations. Preserve pin connections, leave room for labels, and reroute affected traces.`,
    })
  }

  private comparePlacements(
    first: SchematicBoxPlacement,
    second: SchematicBoxPlacement,
  ): number {
    return (
      first.schX - second.schX ||
      second.schY - first.schY ||
      (first.sourceComponentName ?? "").localeCompare(
        second.sourceComponentName ?? "",
      )
    )
  }

  private hasDistinctNonRailOuterEnds(orderedIds: string[]): boolean {
    const firstNets = this.index.twoTerminalNets(orderedIds[0]!)
    const secondNets = this.index.twoTerminalNets(orderedIds[1]!)
    const penultimateNets = this.index.twoTerminalNets(orderedIds.at(-2)!)
    const lastNets = this.index.twoTerminalNets(orderedIds.at(-1)!)
    if (!firstNets || !secondNets || !penultimateNets || !lastNets) return false
    const firstOuter = firstNets.find((net) => !secondNets.includes(net))
    const lastOuter = lastNets.find((net) => !penultimateNets.includes(net))
    return Boolean(
      firstOuter &&
        lastOuter &&
        firstOuter !== lastOuter &&
        !this.index.isRail(firstOuter) &&
        !this.index.isRail(lastOuter),
    )
  }

  private privateSeriesLink(pair: [string, string]) {
    const [firstId, secondId] = pair
    const first = this.validPassive(firstId)
    const second = this.validPassive(secondId)
    if (!first || !second || !this.index.sameLocalScope(first.box, second.box))
      return
    const sharedNets = first.nets.filter((net) => second.nets.includes(net))
    if (sharedNets.length !== 1 || this.index.isRail(sharedNets[0]!)) return
    const ports = this.index.portsByNet.get(sharedNets[0]!) ?? []
    if (ports.length !== 2) return
    const firstPort = ports.find((port) => port.source_component_id === firstId)
    const secondPort = ports.find(
      (port) => port.source_component_id === secondId,
    )
    if (!firstPort || !secondPort) return
    const firstPin = this.index.port(firstPort)!
    const secondPin = this.index.port(secondPort)!
    const dx = secondPin.center.x - firstPin.center.x
    const dy = secondPin.center.y - firstPin.center.y
    return {
      firstPort,
      secondPort,
      firstPin,
      secondPin,
      dx,
      dy,
      pinDistance: Math.hypot(dx, dy),
    }
  }

  private validPassive(id: string) {
    const component = this.index.components.get(id)
    const box = this.index.placement(id)
    const nets = this.index.twoTerminalNets(id)
    if (
      !component ||
      this.unpopulated.has(id) ||
      !box ||
      !nets ||
      this.index.isDirectOpAmpFeedback(id)
    )
      return
    const validPassiveType =
      (component.ftype === "simple_resistor" &&
        Number.isFinite(component.resistance) &&
        component.resistance > 0) ||
      (component.ftype === "simple_inductor" &&
        (typeof component.inductance !== "number" ||
          (Number.isFinite(component.inductance) &&
            component.inductance > 0))) ||
      (component.ftype === "simple_capacitor" &&
        Number.isFinite(component.capacitance) &&
        component.capacitance > 0 &&
        !this.index.isLocalFloatingChipCapacitor(id))
    if (
      !validPassiveType ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      return
    const ports = this.index.portsByComponent.get(id)
    if (
      ports?.length !== 2 ||
      ports.some((port) => !this.validPort(port, box.schematicSheetId))
    )
      return
    return { box, nets }
  }

  private validPort(port: ComponentPort, sheetId?: string): boolean {
    const pin = this.index.port(port)
    return Boolean(
      !port.do_not_connect &&
        pin &&
        pin.schematic_sheet_id === sheetId &&
        [pin.center.x, pin.center.y].every(Number.isFinite) &&
        pin.facing_direction &&
        pin.facing_direction in directions,
    )
  }

  static issueToString(issue: SeriesChainNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "chainComponents",
      issue.chainSchematicBoxes
        .map((box) => box.sourceComponentName)
        .filter(Boolean)
        .join(","),
    )
    addAttr(attrs, "misalignedConnections", issue.misalignedConnections.length)
    addAttr(attrs, "message", issue.message)
    return `<SeriesChainNotAligned ${attrs.join(" ")} />`
  }
}
