import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  ResistorConnectorNotAligned,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"
const vectors = {
  up: [0, 1],
  down: [0, -1],
  left: [-1, 0],
  right: [1, 0],
} as const

/** Align a long, private resistor connection; compact bends remain valid. */
export class ResistorConnectorAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly unpopulated = new Set<string>()
  private readonly nets: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    for (const e of params.ctx.circuitJson) {
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
      if (e.type === "source_port") {
        const net = this.index.connected(e.source_port_id)
        if (e.requires_ground || e.provides_ground)
          this.index.groundNets.add(net)
        if (
          e.requires_power ||
          e.provides_power ||
          e.requires_voltage !== undefined ||
          e.provides_voltage !== undefined
        )
          this.index.powerNets.add(net)
      }
    }
    this.nets = [...this.index.portsByNet.keys()]
    this.solved = this.nets.length === 0
  }

  override _step(): void {
    const net = this.nets[this.currentIndex++]
    this.solved = this.currentIndex >= this.nets.length
    if (!net) return
    const index = this.index,
      ports = index.portsByNet.get(net)!
    if (index.isRail(net) || ports.length !== 2) return
    const rp = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_resistor",
    )
    const cp = ports.find((p) =>
      ["simple_connector", "simple_pin_header"].includes(
        index.components.get(p.source_component_id)?.ftype ?? "",
      ),
    )
    if (!rp || !cp) return
    const rb = this.validPlacement(rp.source_component_id, 2)
    const peerPorts = index.portsByComponent.get(cp.source_component_id)
    if (!peerPorts?.length) return
    const cb = this.validPlacement(cp.source_component_id, peerPorts.length)
    const resistorNets = index.twoTerminalNets(rp.source_component_id)
    if (!rb || !cb || !index.sameLocalScope(rb, cb) || !resistorNets) return
    // Pull-up/down resistors belong to rail placement, not a series signal path.
    if (resistorNets.some((n) => index.isRail(n))) return
    if (!this.isSeparated(rb, cb, rp, cp)) return
    this.params.issues.push({
      lineItemType: "ResistorConnectorNotAligned",
      resistorSchematicBox: rb,
      connectorSchematicBox: cb,
      resistorSourcePortId: rp.source_port_id,
      connectorSourcePortId: cp.source_port_id,
      message: `Align ${rb.sourceComponentName || "the resistor"} with its connected terminal on ${cb.sourceComponentName || "the connector"}, facing their pins toward each other along a straight wire. Preserve connector pin order, resistor value and all connections, leave room for labels and neighboring parts, and reroute affected traces.`,
    })
  }
  private isSeparated(
    a: NonNullable<ReturnType<PlacementNetworkIndex["placement"]>>,
    b: NonNullable<ReturnType<PlacementNetworkIndex["placement"]>>,
    ap: SourcePort & { source_component_id: string },
    bp: SourcePort & { source_component_id: string },
  ) {
    // Colliding bodies need collision correction first; short bends are acceptable.
    if (
      Math.abs(a.schX - b.schX) < (a.width + b.width) / 2 &&
      Math.abs(a.schY - b.schY) < (a.height + b.height) / 2
    )
      return false
    const p = this.index.port(ap)!,
      q = this.index.port(bp)!,
      pv = vectors[p.facing_direction!],
      qv = vectors[q.facing_direction!]
    const dx = q.center.x - p.center.x,
      dy = q.center.y - p.center.y
    const compactDistance = Math.max(2, 2 * Math.max(a.width, a.height))
    if (Math.hypot(dx, dy) <= compactDistance) return false
    // Opposed pins on the correct side may fan out to staggered resistors.
    // Connector pitch alone must not force resistor bodies/labels into a row.
    return !(
      pv[0] * qv[0] + pv[1] * qv[1] === -1 && dx * pv[0] + dy * pv[1] > 0
    )
  }
  private validPlacement(id: string, pinCount: number) {
    const box = this.index.placement(id),
      ports = this.index.portsByComponent.get(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      ports?.length !== pinCount ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0 ||
      ports.some((p) => !this.validPort(p, box.schematicSheetId))
    )
      return
    return box
  }

  private validPort(
    p: SourcePort & { source_component_id: string },
    sheetId?: string,
  ) {
    const geometry = this.index.port(p)
    return (
      !p.do_not_connect &&
      geometry &&
      geometry.schematic_sheet_id === sheetId &&
      [geometry.center.x, geometry.center.y].every(Number.isFinite) &&
      geometry.facing_direction &&
      geometry.facing_direction in vectors
    )
  }

  static issueToString(issue: ResistorConnectorNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "connectorName",
      issue.connectorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<ResistorConnectorNotAligned ${attrs.join(" ")} />`
  }
}
