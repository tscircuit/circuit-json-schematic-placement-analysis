import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  SchematicPlacementIssue,
  SeriesLedChainNotOrdered,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Find remote, backward-facing links in an unbranched chain of native LEDs. */
export class SeriesLedChainPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly ledIds: Set<string>
  private readonly visited = new Set<string>()
  private readonly unpopulated = new Set<string>()

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.ledIds = new Set(
      [...this.index.components.values()]
        .filter((c) => c.ftype === "simple_led")
        .map((c) => c.source_component_id),
    )
    for (const e of params.ctx.circuitJson)
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
    this.solved = this.ledIds.size === 0
  }

  override _step(): void {
    const start = [...this.ledIds].find((id) => !this.visited.has(id))
    if (!start) {
      this.solved = true
      return
    }
    const group = [start]
    this.visited.add(start)
    // Include shared junctions here, so an ambiguous bank is rejected as a whole,
    // rather than accidentally treating one of its branches as an isolated chain.
    const neighbors = new Map<string, Set<string>>()
    for (let i = 0; i < group.length; i++) {
      const id = group[i]!
      const adjacent = new Set<string>()
      for (const port of this.index.portsByComponent.get(id) ?? []) {
        for (const other of this.index.portsByNet.get(
          this.index.connected(port.source_port_id),
        ) ?? []) {
          const otherId = other.source_component_id
          if (otherId === id || !this.ledIds.has(otherId)) continue
          adjacent.add(otherId)
          if (!this.visited.has(otherId)) {
            this.visited.add(otherId)
            group.push(otherId)
          }
        }
      }
      neighbors.set(id, adjacent)
    }
    this.solved = this.visited.size === this.ledIds.size
    if (group.length < 3) return
    const ends = group.filter((id) => neighbors.get(id)!.size === 1)
    if (ends.length !== 2 || group.some((id) => neighbors.get(id)!.size > 2))
      return

    const ordered = [ends.sort()[0]!]
    while (ordered.length < group.length) {
      const last = ordered.at(-1)!
      const previous = ordered.at(-2)
      const next = [...neighbors.get(last)!].find((id) => id !== previous)
      if (!next || ordered.includes(next)) return
      ordered.push(next)
    }
    const boxes = ordered.map((id) => this.index.placement(id))
    if (boxes.some((box) => !box)) return
    const placements = boxes.filter((box) => box !== undefined)
    if (
      placements.some(
        (box) =>
          !this.index.sameLocalScope(placements[0]!, box) ||
          ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
          box.width <= 0 ||
          box.height <= 0,
      )
    )
      return
    for (const id of ordered) {
      const ports = this.index.portsByComponent.get(id) ?? []
      if (
        this.unpopulated.has(id) ||
        !this.index.twoTerminalNets(id) ||
        ports.some((p) => p.do_not_connect)
      )
        return
      const placement = this.index.placement(id)!
      for (const port of ports) {
        const pin = this.index.port(port)
        if (
          !pin ||
          pin.schematic_sheet_id !== placement.schematicSheetId ||
          !Number.isFinite(pin.center.x) ||
          !Number.isFinite(pin.center.y) ||
          !pin.facing_direction
        )
          return
      }
    }

    const backtrackingConnections: SeriesLedChainNotOrdered["backtrackingConnections"] =
      []
    for (let i = 1; i < ordered.length; i++) {
      const aId = ordered[i - 1]!,
        bId = ordered[i]!
      const aNets = this.index.twoTerminalNets(aId)!
      const common = this.index
        .twoTerminalNets(bId)!
        .filter((net) => aNets.includes(net))
      if (common.length !== 1 || this.index.isRail(common[0]!)) return
      const ports = this.index.portsByNet.get(common[0]!) ?? []
      if (ports.length !== 2) return
      const aSource = ports.find((p) => p.source_component_id === aId)!
      const bSource = ports.find((p) => p.source_component_id === bId)!
      const a = this.index.port(aSource)!,
        b = this.index.port(bSource)!
      const dx = b.center.x - a.center.x,
        dy = b.center.y - a.center.y
      const pinDistance = Math.hypot(dx, dy)
      const span = Math.max(
        placements[i - 1]!.width,
        placements[i - 1]!.height,
        placements[i]!.width,
        placements[i]!.height,
      )
      // Ordinary spacing and nearby turns are allowed. Report only a remote link
      // that goes behind at least one connected pin by more than a symbol's size.
      // This permits horizontal, vertical and readable folded strings.
      if (
        pinDistance > Math.max(4, 3 * span) &&
        (outwardDistance(a, dx, dy) < -span ||
          outwardDistance(b, -dx, -dy) < -span)
      ) {
        backtrackingConnections.push({
          firstSourcePortId: aSource.source_port_id,
          secondSourcePortId: bSource.source_port_id,
          pinDistance,
        })
      }
    }
    if (!backtrackingConnections.length) return
    const names = placements
      .map((box) => box.sourceComponentName || "LED")
      .join(", ")
    this.params.issues.push({
      lineItemType: "SeriesLedChainNotOrdered",
      ledSchematicBoxes: placements,
      backtrackingConnections,
      message: `Arrange ${names} in their connected series order so adjacent LEDs do not require long connections behind their pins. Move or rotate the symbols while preserving anode/cathode connections; allow space for labels and reroute affected traces. A horizontal, vertical, or clearly connected folded chain is acceptable.`,
    })
  }

  static issueToString(issue: SeriesLedChainNotOrdered): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "ledComponents",
      issue.ledSchematicBoxes.map((box) => box.sourceComponentName).join(","),
    )
    addAttr(
      attrs,
      "backtrackingConnections",
      issue.backtrackingConnections.length,
    )
    addAttr(
      attrs,
      "maxPinDistance",
      Math.max(
        ...issue.backtrackingConnections.map((link) => link.pinDistance),
      ),
    )
    addAttr(attrs, "message", issue.message)
    return `<SeriesLedChainNotOrdered ${attrs.join(" ")} />`
  }
}

function outwardDistance(pin: SchematicPort, dx: number, dy: number): number {
  switch (pin.facing_direction) {
    case "left":
      return -dx
    case "right":
      return dx
    case "up":
      return dy
    case "down":
      return -dy
    default:
      return 0
  }
}
