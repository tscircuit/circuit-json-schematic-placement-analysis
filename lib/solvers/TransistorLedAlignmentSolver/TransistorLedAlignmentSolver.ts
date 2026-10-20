import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  TransistorLedNotAligned,
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

/** Align a separated LED/transistor pair in an explicit rail-to-rail indicator branch. */
export class TransistorLedAlignmentSolver extends BaseSolver {
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
    const lp = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype === "simple_led",
    )
    const tp = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_transistor",
    )
    if (!lp || !tp) return
    const transistor = index.components.get(tp.source_component_id)
    if (
      transistor?.ftype !== "simple_transistor" ||
      !["npn", "pnp"].includes(transistor.transistor_type)
    )
      return
    const lb = this.validPlacement(lp.source_component_id, 2),
      tb = this.validPlacement(tp.source_component_id, 3)
    if (
      !lb ||
      !tb ||
      !index.sameLocalScope(lb, tb) ||
      !index.twoTerminalNets(lp.source_component_id)
    )
      return
    const transistorNets = index.portsByComponent
      .get(tp.source_component_id)!
      .map((p) => index.connected(p.source_port_id))
    if (new Set(transistorNets).size !== 3) return
    const otherLedPort = index.portsByComponent
      .get(lp.source_component_id)!
      .find((p) => p !== lp)!
    const resistorNet = index.connected(otherLedPort.source_port_id)
    if (index.isRail(resistorNet)) return
    const members = index.portsByNet.get(resistorNet)
    if (members?.length !== 2) return
    const rp = members.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_resistor",
    )
    if (!rp) return
    const resistor = index.components.get(rp.source_component_id),
      rb = this.validPlacement(rp.source_component_id, 2)
    const resistorNets = index.twoTerminalNets(rp.source_component_id)
    if (
      resistor?.ftype !== "simple_resistor" ||
      !Number.isFinite(resistor.resistance) ||
      resistor.resistance <= 0 ||
      !rb ||
      !index.sameLocalScope(lb, rb) ||
      !resistorNets
    )
      return
    const rail = resistorNets.find((n) => n !== resistorNet)!
    // Require a resistor/LED branch between opposing declared rails. Neither
    // transistor terminal names nor physical pin numbers identify its role.
    const transistorRails = transistorNets.filter((n) => index.isRail(n))
    if (
      transistorRails.length !== 1 ||
      !index.isRail(rail) ||
      transistorNets.includes(rail) ||
      transistorNets.includes(resistorNet)
    )
      return
    const transistorRail = transistorRails[0]!
    if (
      [rail, transistorRail].some(
        (n) => index.powerNets.has(n) && index.groundNets.has(n),
      )
    )
      return
    if (
      !(index.groundNets.has(rail) && index.powerNets.has(transistorRail)) &&
      !(index.powerNets.has(rail) && index.groundNets.has(transistorRail))
    )
      return
    if (!this.isSeparated(lb, tb, lp, tp)) return
    this.params.issues.push({
      lineItemType: "TransistorLedNotAligned",
      transistorSchematicBox: tb,
      ledSchematicBox: lb,
      transistorSourcePortId: tp.source_port_id,
      ledSourcePortId: lp.source_port_id,
      message: `Align ${lb.sourceComponentName || "the LED"} with its connected terminal on ${tb.sourceComponentName || "the transistor"} so their separated connection reads along a straight wire. Preserve every pin connection and LED/transistor polarity, leave room for labels and neighboring parts, and reroute affected traces.`,
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

  static issueToString(issue: TransistorLedNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "transistorName",
      issue.transistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "ledName", issue.ledSchematicBox.sourceComponentName)
    addAttr(attrs, "message", issue.message)
    return `<TransistorLedNotAligned ${attrs.join(" ")} />`
  }
}
