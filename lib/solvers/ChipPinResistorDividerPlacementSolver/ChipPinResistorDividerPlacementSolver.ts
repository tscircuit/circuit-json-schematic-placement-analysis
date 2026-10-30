import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  ResistorDividerSeparatedFromChip,
  SchematicPlacementIssue,
} from "../../types"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import { addAttr } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

const vectors = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, 1],
  down: [0, -1],
} as const
/** A private supply-to-ground divider whose tap wraps around its receiving chip. */
export class ChipPinResistorDividerPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly taps: string[]
  private readonly unpopulated = new Set<string>()
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
      if (e.type !== "source_port") continue
      const net = this.index.connected(e.source_port_id)
      if (e.requires_ground || e.provides_ground) this.index.groundNets.add(net)
      if (
        e.requires_power ||
        e.provides_power ||
        e.requires_voltage !== undefined ||
        e.provides_voltage !== undefined
      )
        this.index.powerNets.add(net)
    }
    this.taps = [...this.index.portsByNet.keys()]
    this.solved = this.taps.length === 0
  }
  override _step(): void {
    const tap = this.taps[this.currentIndex++]
    this.solved = this.currentIndex >= this.taps.length
    if (!tap) return
    const i = this.index,
      members = i.portsByNet.get(tap)!
    // Exactly one chip pin and two resistor pins: skip shared taps, filters and buses.
    if (i.isRail(tap) || members.length !== 3) return
    const resistors = members.filter(
      (p) =>
        i.components.get(p.source_component_id)?.ftype === "simple_resistor",
    )
    const hosts = members.filter(
      (p) => i.components.get(p.source_component_id)?.ftype === "simple_chip",
    )
    if (
      resistors.length !== 2 ||
      hosts.length !== 1 ||
      new Set(members.map((p) => p.source_component_id)).size !== 3
    )
      return
    const hostPort = hosts[0]!,
      host = this.validPlacement(hostPort.source_component_id)
    if (
      !host ||
      (i.portsByComponent.get(hostPort.source_component_id)?.length ?? 0) < 3 ||
      !this.validPort(hostPort, host.schematicSheetId)
    )
      return
    const branches = resistors.map((p) => {
      const id = p.source_component_id,
        c = i.components.get(id),
        nets = i.twoTerminalNets(id),
        box = this.validPlacement(id)
      if (
        c?.ftype !== "simple_resistor" ||
        !Number.isFinite(c.resistance) ||
        c.resistance <= 0 ||
        !nets ||
        !box ||
        !i.sameLocalScope(host, box) ||
        i.portsByComponent
          .get(id)!
          .some((p) => !this.validPort(p, box.schematicSheetId))
      )
        return
      return { box, port: p, outer: nets.find((n) => n !== tap)! }
    })
    const first = branches[0],
      second = branches[1]
    if (!first || !second || first.outer === second.outer) return
    const power = (n: string) => i.powerNets.has(n) && !i.groundNets.has(n)
    const ground = (n: string) => i.groundNets.has(n) && !i.powerNets.has(n)
    const supply =
      power(first.outer) && ground(second.outer)
        ? first
        : power(second.outer) && ground(first.outer)
          ? second
          : undefined
    if (!supply) return
    const returnBranch = supply === first ? second : first
    const pin = i.port(hostPort)!,
      u = vectors[pin.facing_direction!],
      horizontal = u[0] !== 0
    // Only the opposite side qualifies. A stagger or distant same-side layout is not this issue.
    if (
      ![first, second].every(({ box, port }) => {
        const along =
          (box.schX - host.schX) * u[0] + (box.schY - host.schY) * u[1]
        const halfBodies =
          (horizontal ? box.width + host.width : box.height + host.height) / 2
        const p = i.port(port)!
        const distance = Math.hypot(
          p.center.x - pin.center.x,
          p.center.y - pin.center.y,
        )
        return (
          along < -halfBodies - 0.2 &&
          distance > Math.max(3, 2 * Math.max(box.width, box.height))
        )
      })
    )
      return
    this.params.issues.push({
      lineItemType: "ResistorDividerSeparatedFromChip",
      hostSchematicBox: host,
      supplyResistorSchematicBox: supply.box,
      groundResistorSchematicBox: returnBranch.box,
      chipSourcePortId: hostPort.source_port_id,
      supplyTapSourcePortId: supply.port.source_port_id,
      groundTapSourcePortId: returnBranch.port.source_port_id,
      message: `Place the divider ${supply.box.sourceComponentName || "supply resistor"} / ${returnBranch.box.sourceComponentName || "ground resistor"} beside its connected pin on the ${pin.facing_direction} side of ${host.sourceComponentName || "chip"}. Both resistors are beyond the opposite chip edge. Keep supply above ground and make the tap connection direct, preserving values, symbols and all pin connections. Leave room for labels and reroute affected traces.`,
    })
  }
  private validPlacement(id: string) {
    const box = this.index.placement(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      return
    return box
  }
  private validPort(
    p: SourcePort & { source_component_id: string },
    sheet?: string,
  ) {
    const pin = this.index.port(p)
    return (
      !p.do_not_connect &&
      pin &&
      pin.schematic_sheet_id === sheet &&
      [pin.center.x, pin.center.y].every(Number.isFinite) &&
      pin.facing_direction &&
      pin.facing_direction in vectors
    )
  }
  static issueToString(issue: ResistorDividerSeparatedFromChip): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
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
    addAttr(attrs, "message", issue.message)
    return `<ResistorDividerSeparatedFromChip ${attrs.join(" ")} />`
  }
}
