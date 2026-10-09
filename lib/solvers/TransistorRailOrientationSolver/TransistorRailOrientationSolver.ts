import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  SchematicPlacementIssue,
  TransistorHasIncorrectRailOrientation,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type ComponentPort = SourcePort & { source_component_id: string }
const opposite = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
} as const

/** Orient a native BJT's opposing resistor-fed positive/ground branches vertically. */
export class TransistorRailOrientationSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly positiveNets = new Set<string>()
  private readonly groundNets = new Set<string>()
  private readonly unpopulated = new Set<string>()
  private readonly transistorIds: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.groundNets = new Set(this.index.groundNets)
    for (const e of params.ctx.circuitJson) {
      if (e.type === "source_net" && e.is_positive_voltage_source)
        this.positiveNets.add(this.index.connected(e.source_net_id))
      if (e.type === "source_port" && (e.requires_ground || e.provides_ground))
        this.groundNets.add(this.index.connected(e.source_port_id))
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
    }
    this.transistorIds = [...this.index.components.values()]
      .filter(
        (c) =>
          c.ftype === "simple_transistor" &&
          (c.transistor_type === "npn" || c.transistor_type === "pnp"),
      )
      .map((c) => c.source_component_id)
    this.solved = this.transistorIds.length === 0
  }

  override _step(): void {
    const id = this.transistorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.transistorIds.length
    if (!id) return
    const index = this.index
    const box = this.validPlacement(id)
    const ports = index.portsByComponent.get(id)
    if (
      !box ||
      ports?.length !== 3 ||
      ports.some((p) => p.do_not_connect || !this.validPort(p))
    )
      return
    const nets = ports.map((p) => index.connected(p.source_port_id))
    if (
      new Set(nets).size !== 3 ||
      nets.some((n) => index.isRail(n) || this.groundNets.has(n))
    )
      return
    const branches = ports.flatMap((p) => this.resistorBranches(p))
    const pairs = branches.flatMap((supply) =>
      supply.kind !== "positive"
        ? []
        : branches.flatMap((ground) => {
            if (
              ground.kind !== "ground" ||
              ground.pin.source_port_id === supply.pin.source_port_id
            )
              return []
            if (
              opposite[supply.geometry.facing_direction!] !==
              ground.geometry.facing_direction
            )
              return []
            return [{ supply, ground }]
          }),
    )
    if (pairs.length !== 1) return
    const { supply, ground } = pairs[0]!
    const facing = supply.geometry.facing_direction!
    const vertical = facing === "up" || facing === "down"
    const dx = supply.geometry.center.x - ground.geometry.center.x
    const dy = supply.geometry.center.y - ground.geometry.center.y
    const along = vertical ? dy : dx
    const across = vertical ? dx : dy
    const sign = facing === "up" || facing === "right" ? 1 : -1
    if (Math.abs(across) > 0.01 || along * sign <= 0.01) return
    if (facing === "up") return
    const third = ports.find(
      (p) =>
        p.source_port_id !== supply.pin.source_port_id &&
        p.source_port_id !== ground.pin.source_port_id,
    )!
    const thirdFacing = this.validPort(third)!.facing_direction!
    if (thirdFacing === facing || thirdFacing === opposite[facing]) return
    const deltaSchRotation = ({ right: 90, down: 180, left: 270 } as const)[
      facing
    ]
    this.params.issues.push({
      lineItemType: "TransistorHasIncorrectRailOrientation",
      transistorSchematicBox: box,
      supplyResistorSchematicBox: supply.box,
      groundResistorSchematicBox: ground.box,
      supplyConnectedSourcePortId: supply.pin.source_port_id,
      groundConnectedSourcePortId: ground.pin.source_port_id,
      deltaSchRotation,
      message: `Rotate ${box.sourceComponentName || "the transistor"} by ${deltaSchRotation}° so its pin connected through ${supply.box.sourceComponentName || "the supply resistor"} to the positive supply faces up and its pin connected through ${ground.box.sourceComponentName || "the ground resistor"} to ground faces down. Arrange these resistor branches above and below it, preserve all pin connections, and reroute affected traces.`,
    })
  }

  private resistorBranches(pin: ComponentPort) {
    const index = this.index
    const host = index.placement(pin.source_component_id)!
    const geometry = this.validPort(pin)!
    const net = index.connected(pin.source_port_id)
    return (index.portsByNet.get(net) ?? []).flatMap((p) => {
      const c = index.components.get(p.source_component_id)
      if (
        c?.ftype !== "simple_resistor" ||
        !Number.isFinite(c.resistance) ||
        c.resistance <= 0
      )
        return []
      const box = this.validPlacement(c.source_component_id)
      const nets = index.twoTerminalNets(c.source_component_id)
      const ports = index.portsByComponent.get(c.source_component_id)
      if (
        !box ||
        !nets ||
        !ports ||
        !index.sameLocalScope(host, box) ||
        ports.some((p) => p.do_not_connect || !this.validPort(p))
      )
        return []
      const other = nets.find((n) => n !== net)!
      const positive = this.positiveNets.has(other)
      const ground = this.groundNets.has(other)
      if (positive === ground || (ground && index.powerNets.has(other)))
        return []
      return [
        {
          pin,
          geometry,
          box,
          kind: positive ? ("positive" as const) : ("ground" as const),
        },
      ]
    })
  }

  private validPlacement(id: string) {
    if (this.unpopulated.has(id)) return
    const box = this.index.placement(id)
    if (
      !box ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      return
    return box
  }

  private validPort(p: ComponentPort) {
    const placed = this.index.placement(p.source_component_id)
    const geometry = this.index.port(p)
    if (
      !placed ||
      !geometry ||
      geometry.schematic_sheet_id !== placed.schematicSheetId ||
      !Number.isFinite(geometry.center.x) ||
      !Number.isFinite(geometry.center.y) ||
      !geometry.facing_direction ||
      !(geometry.facing_direction in opposite)
    )
      return
    return geometry
  }

  static issueToString(issue: TransistorHasIncorrectRailOrientation): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "transistorName",
      issue.transistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "supplyResistorName",
      issue.supplyResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "groundResistorName",
      issue.groundResistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "deltaSchRotation", issue.deltaSchRotation)
    addAttr(attrs, "message", issue.message)
    return `<TransistorHasIncorrectRailOrientation ${attrs.join(" ")} />`
  }
}
