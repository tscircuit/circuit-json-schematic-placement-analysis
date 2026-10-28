import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  InductorCapacitorNotGrouped,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"
const vectors = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, 1],
  down: [0, -1],
} as const
/** A shunt capacitor behind the opposite inductor end obscures their shared node. */
export class InductorCapacitorGroupingSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly unpopulated = new Set<string>()
  private readonly inductors: string[]
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
        const n = this.index.connected(e.source_port_id)
        if (e.requires_ground || e.provides_ground) this.index.groundNets.add(n)
        if (
          e.requires_power ||
          e.provides_power ||
          e.requires_voltage !== undefined ||
          e.provides_voltage !== undefined
        )
          this.index.powerNets.add(n)
      }
    }
    this.inductors = [...this.index.components.values()]
      .filter((c) => c.ftype === "simple_inductor")
      .map((c) => c.source_component_id)
    this.solved = this.inductors.length === 0
  }
  override _step(): void {
    const id = this.inductors[this.currentIndex++]
    this.solved = this.currentIndex >= this.inductors.length
    if (!id) return
    const i = this.index,
      l = i.components.get(id),
      ns = i.twoTerminalNets(id),
      box = this.validPlacement(id, 2)
    if (
      l?.ftype !== "simple_inductor" ||
      !ns ||
      !box ||
      ns.some((n) => i.isRail(n))
    )
      return
    const branches = ns.map((n) =>
      (i.portsByNet.get(n) ?? []).filter((p) => {
        const c = i.components.get(p.source_component_id),
          cn = i.twoTerminalNets(p.source_component_id)
        return (
          c?.ftype === "simple_capacitor" &&
          cn?.some((m) => m !== n && i.groundNets.has(m))
        )
      }),
    )
    // Leave C-L-C networks to PiFilterPlacementSolver. Do not choose a capacitor
    // from a bank, or guess which inductor owns a shared matching network.
    if (branches.filter((ps) => ps.length === 0).length !== 1) return
    const k = branches.findIndex((ps) => ps.length === 1)
    if (k < 0) return
    const n = ns[k]!,
      peer = branches[k]![0]!,
      c = i.components.get(peer.source_component_id)
    const cb = this.validPlacement(peer.source_component_id, 2)
    if (
      c?.ftype !== "simple_capacitor" ||
      !Number.isFinite(c.capacitance) ||
      c.capacitance <= 0 ||
      !cb ||
      !i.sameLocalScope(box, cb)
    )
      return
    if (
      ns.some((n) =>
        (i.portsByNet.get(n) ?? []).some(
          (p) =>
            p.source_component_id !== id &&
            i.components.get(p.source_component_id)?.ftype ===
              "simple_inductor",
        ),
      )
    )
      return
    const sourcePort = i.portsByComponent
      .get(id)!
      .find((p) => i.connected(p.source_port_id) === n)!
    const lp = i.port(sourcePort)!,
      cp = i.port(peer)!,
      u = vectors[lp.facing_direction!]
    const horizontal = u[0] !== 0
    const along = (cb.schX - box.schX) * u[0] + (cb.schY - box.schY) * u[1]
    const half =
      (horizontal ? box.width + cb.width : box.height + cb.height) / 2
    const distance = Math.hypot(
      cp.center.x - lp.center.x,
      cp.center.y - lp.center.y,
    )
    // Only a clear reversal beyond the OTHER end qualifies, not a small stagger.
    if (
      along >= -half - 0.2 ||
      distance <=
        Math.max(2, 2 * Math.max(box.width, box.height, cb.width, cb.height))
    )
      return
    this.params.issues.push({
      lineItemType: "InductorCapacitorNotGrouped",
      inductorSchematicBox: box,
      capacitorSchematicBox: cb,
      inductorSourcePortId: sourcePort.source_port_id,
      capacitorSourcePortId: peer.source_port_id,
      message: `Place ${cb.sourceComponentName || "the capacitor"} beside the end of ${box.sourceComponentName || "the inductor"} to which it connects, with a short branch from their shared node to ground. It is currently behind the opposite end. Preserve values, symbols and pin connections, leave room for labels, and reroute affected traces.`,
    })
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

  static issueToString(issue: InductorCapacitorNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "inductorName",
      issue.inductorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<InductorCapacitorNotGrouped ${attrs.join(" ")} />`
  }
}
