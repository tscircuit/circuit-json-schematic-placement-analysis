import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  FuseConnectorNotAligned,
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

/** Align a private fuse connection to a grounded two-pin header. */
export class FuseConnectorAlignmentSolver extends BaseSolver {
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
    if (index.groundNets.has(net) || ports.length !== 2) return
    const fp = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype === "simple_fuse",
    )
    const cp = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_pin_header",
    )
    if (!fp || !cp) return
    const fb = this.validPlacement(fp.source_component_id, 2),
      cb = this.validPlacement(cp.source_component_id, 2)
    const fuseNets = index.twoTerminalNets(fp.source_component_id),
      connectorNets = index.twoTerminalNets(cp.source_component_id)
    if (
      !fb ||
      !cb ||
      !index.sameLocalScope(fb, cb) ||
      !fuseNets ||
      !connectorNets
    )
      return
    // One private fused connection plus one explicitly grounded connector pin.
    // Do not infer a supply role from the connector's labels or pin numbers.
    const ground = connectorNets.find((n) => n !== net)!
    if (
      !index.groundNets.has(ground) ||
      index.powerNets.has(ground) ||
      fuseNets.some((n) => index.groundNets.has(n))
    )
      return
    if (!this.isSeparated(fb, cb, fp, cp)) return
    this.params.issues.push({
      lineItemType: "FuseConnectorNotAligned",
      fuseSchematicBox: fb,
      connectorSchematicBox: cb,
      fuseSourcePortId: fp.source_port_id,
      connectorSourcePortId: cp.source_port_id,
      message: `Align ${fb.sourceComponentName || "the fuse"} with its connected terminal on ${cb.sourceComponentName || "the connector"}, facing their pins toward each other along a straight wire. Preserve connector pin order and all connections, leave room for labels and neighboring parts, and reroute affected traces.`,
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
    return !(
      pv[0] * qv[0] + pv[1] * qv[1] === -1 &&
      dx * pv[0] + dy * pv[1] > 0 &&
      Math.abs(dx * pv[1] - dy * pv[0]) <= 0.15
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

  static issueToString(issue: FuseConnectorNotAligned): string {
    const attrs: string[] = []
    addAttr(attrs, "fuseName", issue.fuseSchematicBox.sourceComponentName)
    addAttr(
      attrs,
      "connectorName",
      issue.connectorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<FuseConnectorNotAligned ${attrs.join(" ")} />`
  }
}
