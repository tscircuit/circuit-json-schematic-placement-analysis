import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  DifferentialRcFilterNotAligned,
  SchematicPlacementIssue,
} from "../../types"
import { getDifferentialRcFilters } from "../../utils/differential-rc-filters"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import { hasVisibleSchematicConnection } from "../../utils/has-visible-schematic-connection"
import type { SolverContext } from "../SolverContext"

type ComponentPort = SourcePort & { source_component_id: string }
const directions = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, 1],
  down: [0, -1],
} as const

/** Paired resistor branches feeding one chip, with a capacitor across their chip-side nodes. */
export class DifferentialRcFilterAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly filters: ReturnType<typeof getDifferentialRcFilters>
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
    }
    this.filters = getDifferentialRcFilters(this.index)
    this.solved = this.filters.length === 0
  }
  override _step(): void {
    const filter = this.filters[this.currentIndex++]
    this.solved = this.currentIndex >= this.filters.length
    if (!filter) return
    const index = this.index,
      capBox = this.validPlacement(filter.capacitorId)
    const [first, second] = filter.branches
    const host = this.validPlacement(first.host.source_component_id)
    const firstBox = this.validPlacement(first.resistor.source_component_id),
      secondBox = this.validPlacement(second.resistor.source_component_id)
    if (!capBox || !host || !firstBox || !secondBox) return
    if (filter.capacitorPorts.some((p) => !this.validPort(p))) return
    for (const b of filter.branches) {
      if (
        !this.validPort(b.host) ||
        index.portsByComponent
          .get(b.resistor.source_component_id)!
          .some((p) => !this.validPort(p))
      )
        return
      const capPort = filter.capacitorPorts.find(
        (p) => index.connected(p.source_port_id) === b.net,
      )!
      if (
        !hasVisibleSchematicConnection(
          this.params.ctx.circuitJson,
          index,
          b.resistor,
          b.host,
        ) ||
        !hasVisibleSchematicConnection(
          this.params.ctx.circuitJson,
          index,
          capPort,
          b.resistor,
        )
      )
        return
    }
    const boxes = [host, capBox, firstBox, secondBox]
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++) {
        const x = boxes[a]!,
          y = boxes[b]!
        if (
          Math.abs(x.schX - y.schX) < (x.width + y.width) / 2 &&
          Math.abs(x.schY - y.schY) < (x.height + y.height) / 2
        )
          return
      }
    const hp = [index.port(first.host)!, index.port(second.host)!],
      rp = [index.port(first.resistor)!, index.port(second.resistor)!]
    if (
      !hp[0]!.facing_direction ||
      hp[0]!.facing_direction !== hp[1]!.facing_direction
    )
      return
    const direction = directions[hp[0]!.facing_direction]
    // Permit bent chip leads and small stagger; no prescribed position or exact pin rows.
    const faceHost = rp.every((p, k) => {
      const facing = p.facing_direction && directions[p.facing_direction]
      return (
        facing &&
        facing[0] * direction[0] + facing[1] * direction[1] === -1 &&
        (p.center.x - hp[k]!.center.x) * direction[0] +
          (p.center.y - hp[k]!.center.y) * direction[1] >
          0
      )
    })
    const columnOffset = Math.abs(
      (rp[0]!.center.x - rp[1]!.center.x) * direction[0] +
        (rp[0]!.center.y - rp[1]!.center.y) * direction[1],
    )
    if (faceHost && columnOffset <= 0.5) return
    this.params.issues.push({
      lineItemType: "DifferentialRcFilterNotAligned",
      hostSchematicBox: host,
      capacitorSchematicBox: capBox,
      resistorSchematicBoxes: [firstBox, secondBox],
      hostSourcePortIds: [
        first.host.source_port_id,
        second.host.source_port_id,
      ],
      resistorSourcePortIds: [
        first.resistor.source_port_id,
        second.resistor.source_port_id,
      ],
      message: `Align ${firstBox.sourceComponentName || "the first resistor"} and ${secondBox.sourceComponentName || "the second resistor"} as matching branches facing ${host.sourceComponentName || "the chip"}, with ${capBox.sourceComponentName || "the capacitor"} bridging their chip-side nodes. Preserve all pin connections, component values and chip pin arrangement; leave room for labels and reroute the wires. Exact alignment with the chip pin rows is not required.`,
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
  private validPort(p: ComponentPort) {
    const pin = this.index.port(p),
      box = this.index.placement(p.source_component_id)
    return (
      !p.do_not_connect &&
      pin &&
      box &&
      pin.schematic_sheet_id === box.schematicSheetId &&
      [pin.center.x, pin.center.y].every(Number.isFinite) &&
      !!pin.facing_direction
    )
  }
  static issueToString(issue: DifferentialRcFilterNotAligned): string {
    const attrs: string[] = []
    addAttr(attrs, "chipName", issue.hostSchematicBox.sourceComponentName)
    addAttr(
      attrs,
      "resistorNames",
      issue.resistorSchematicBoxes.map((b) => b.sourceComponentName).join(","),
    )
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<DifferentialRcFilterNotAligned ${attrs.join(" ")} />`
  }
}
