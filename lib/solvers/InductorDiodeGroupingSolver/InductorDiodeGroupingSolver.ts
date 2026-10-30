import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  InductorDiodeNotGrouped,
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
/** A private inductor/diode/chip junction with a reversed, distant diode branch. */
export class InductorDiodeGroupingSolver extends BaseSolver {
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
    const junction = this.taps[this.currentIndex++]
    this.solved = this.currentIndex >= this.taps.length
    if (!junction) return
    const i = this.index,
      members = i.portsByNet.get(junction)!
    if (
      i.isRail(junction) ||
      members.length !== 3 ||
      new Set(members.map((p) => p.source_component_id)).size !== 3
    )
      return
    const typed = (ftype: string) =>
      members.filter(
        (p) => i.components.get(p.source_component_id)?.ftype === ftype,
      )
    const inductors = typed("simple_inductor"),
      diodes = typed("simple_diode"),
      hosts = typed("simple_chip")
    if (inductors.length !== 1 || diodes.length !== 1 || hosts.length !== 1)
      return
    const lp = inductors[0]!,
      dp = diodes[0]!,
      hp = hosts[0]!
    const l = i.components.get(lp.source_component_id),
      ln = i.twoTerminalNets(lp.source_component_id),
      dn = i.twoTerminalNets(dp.source_component_id)
    if (l?.ftype !== "simple_inductor" || !ln || !dn) return
    const lOuter = ln.find((n) => n !== junction)!,
      dOuter = dn.find((n) => n !== junction)!
    // Only two distinct declared supplies identify this branch. Do not guess from SW/VIN names,
    // or reinterpret grounded flyback/snubber networks, shared junctions or unknown rails.
    if (
      lOuter === dOuter ||
      ![lOuter, dOuter].every((n) => i.powerNets.has(n) && !i.groundNets.has(n))
    )
      return
    const lb = this.validPlacement(lp.source_component_id),
      db = this.validPlacement(dp.source_component_id),
      hb = this.validPlacement(hp.source_component_id)
    if (
      !lb ||
      !db ||
      !hb ||
      !i.sameLocalScope(lb, hb) ||
      !i.sameLocalScope(db, hb) ||
      (i.portsByComponent.get(hp.source_component_id)?.length ?? 0) < 3 ||
      !this.validPort(hp, hb.schematicSheetId)
    )
      return
    for (const [p, b] of [
      [lp, lb],
      [dp, db],
    ] as const)
      if (
        i.portsByComponent
          .get(p.source_component_id)!
          .some((p) => !this.validPort(p, b.schematicSheetId))
      )
        return
    const diodePin = i.port(dp)!,
      inductorPin = i.port(lp)!,
      chipPin = i.port(hp)!,
      u = vectors[diodePin.facing_direction!]
    const axialSize = u[0] ? db.width : db.height
    // The connected diode end faces away from BOTH peers by more than normal symbol spacing.
    // Valid straight chains, compact right-angle junctions and minor offsets remain accepted.
    const minReversedDistance = Math.max(1.5, axialSize)
    const minPinDistance = Math.max(2, 2 * Math.max(db.width, db.height))
    if (
      ![chipPin, inductorPin].every((p) => {
        const dx = p.center.x - diodePin.center.x,
          dy = p.center.y - diodePin.center.y
        return (
          dx * u[0] + dy * u[1] < -minReversedDistance &&
          Math.hypot(dx, dy) > minPinDistance
        )
      })
    )
      return
    this.params.issues.push({
      lineItemType: "InductorDiodeNotGrouped",
      hostSchematicBox: hb,
      inductorSchematicBox: lb,
      diodeSchematicBox: db,
      chipSourcePortId: hp.source_port_id,
      inductorSourcePortId: lp.source_port_id,
      diodeSourcePortId: dp.source_port_id,
      message: `Group ${lb.sourceComponentName || "the inductor"}, ${db.sourceComponentName || "the diode"} and their connected pin on ${hb.sourceComponentName || "the chip"} around a short shared junction. The diode's connected end faces away from both peers, making the branch loop back. Preserve diode polarity, symbols, values and all pin connections; move the parts and reroute the traces with room for labels. A particular horizontal or vertical diode orientation is not required.`,
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
  static issueToString(issue: InductorDiodeNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "inductorName",
      issue.inductorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "diodeName", issue.diodeSchematicBox.sourceComponentName)
    addAttr(attrs, "message", issue.message)
    return `<InductorDiodeNotGrouped ${attrs.join(" ")} />`
  }
}
