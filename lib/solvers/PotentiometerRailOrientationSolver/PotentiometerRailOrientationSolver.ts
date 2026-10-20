import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  PotentiometerHasIncorrectRailOrientation,
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

/** Extend the power-above-ground convention to three-terminal potentiometers. */
export class PotentiometerRailOrientationSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly positive = new Set<string>()
  private readonly unpopulated = new Set<string>()
  private readonly ids: string[]
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
      if (e.type === "source_net" && e.is_positive_voltage_source)
        this.positive.add(this.index.connected(e.source_net_id))
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
    this.ids = [...this.index.components.values()]
      .filter((c) => c.ftype === "simple_potentiometer")
      .map((c) => c.source_component_id)
    this.solved = this.ids.length === 0
  }

  override _step(): void {
    const id = this.ids[this.currentIndex++]
    this.solved = this.currentIndex >= this.ids.length
    if (!id || this.unpopulated.has(id)) return
    const index = this.index,
      component = index.components.get(id),
      box = index.placement(id),
      ports = index.portsByComponent.get(id)
    if (
      component?.ftype !== "simple_potentiometer" ||
      !Number.isFinite(component.max_resistance) ||
      component.max_resistance <= 0 ||
      !box ||
      ports?.length !== 3
    )
      return
    if (
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0 ||
      ports.some((p) => !this.validPort(p, box.schematicSheetId))
    )
      return
    const nets = ports.map((p) => index.connected(p.source_port_id))
    // A rheostat, shorted wiper, or contradictory rail declarations are not this pattern.
    if (
      new Set(nets).size !== 3 ||
      nets.some((n) => index.powerNets.has(n) && index.groundNets.has(n))
    )
      return
    const supplies = ports.filter((p) =>
      this.positive.has(index.connected(p.source_port_id)),
    )
    const grounds = ports.filter((p) =>
      index.groundNets.has(index.connected(p.source_port_id)),
    )
    if (supplies.length !== 1 || grounds.length !== 1) return
    const supply = supplies[0]!,
      ground = grounds[0]!,
      third = ports.find((p) => p !== supply && p !== ground)!
    if (index.isRail(index.connected(third.source_port_id))) return
    const p = index.port(supply)!,
      g = index.port(ground)!,
      w = index.port(third)!
    const pv = vectors[p.facing_direction!],
      gv = vectors[g.facing_direction!],
      wv = vectors[w.facing_direction!]
    // Geometry establishes the opposing rail pair and the perpendicular third terminal.
    if (
      pv[0] !== -gv[0] ||
      pv[1] !== -gv[1] ||
      pv[0] * wv[0] + pv[1] * wv[1] !== 0
    )
      return
    const dx = p.center.x - g.center.x,
      dy = p.center.y - g.center.y
    if (
      Math.abs(dx * pv[1] - dy * pv[0]) > 0.01 ||
      dx * pv[0] + dy * pv[1] <= 0.01
    )
      return
    if (p.facing_direction === "up") return
    const deltaSchRotation = ({ right: 90, down: 180, left: 270 } as const)[
      p.facing_direction! as "right" | "down" | "left"
    ]
    this.params.issues.push({
      lineItemType: "PotentiometerHasIncorrectRailOrientation",
      schematicBox: box,
      supplySourcePortId: supply.source_port_id,
      groundSourcePortId: ground.source_port_id,
      deltaSchRotation,
      message: `Rotate ${box.sourceComponentName || "the potentiometer"} by ${deltaSchRotation}° so its positive-supply terminal faces up and its ground terminal faces down, with the third terminal at the side. Preserve all pin connections and reroute attached traces.`,
    })
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

  static issueToString(
    issue: PotentiometerHasIncorrectRailOrientation,
  ): string {
    const attrs: string[] = []
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "deltaSchRotation", issue.deltaSchRotation)
    addAttr(attrs, "message", issue.message)
    return `<PotentiometerHasIncorrectRailOrientation ${attrs.join(" ")} />`
  }
}
