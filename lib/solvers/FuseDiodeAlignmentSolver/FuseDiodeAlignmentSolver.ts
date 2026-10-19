import { BaseSolver } from "@tscircuit/solver-utils"
import type { FuseDiodeNotAligned, SchematicPlacementIssue } from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

const direction = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, 1],
  down: [0, -1],
} as const

/** A typed fuse and diode with one private shared junction should read as one series path. */
export class FuseDiodeAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly fuseIds: string[]
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
    for (const element of params.ctx.circuitJson)
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
    this.fuseIds = [...this.index.components.values()]
      .filter((c) => c.ftype === "simple_fuse")
      .map((c) => c.source_component_id)
    this.solved = this.fuseIds.length === 0
  }

  override _step(): void {
    const fuseId = this.fuseIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.fuseIds.length
    if (!fuseId || this.unpopulated.has(fuseId)) return
    const index = this.index
    const fuse = index.placement(fuseId)
    const fuseNets = index.twoTerminalNets(fuseId)
    if (!fuse || !fuseNets) return
    for (const net of fuseNets) {
      const members = index.portsByNet.get(net) ?? []
      if (members.length !== 2) continue
      const diodePort = members.find((p) => p.source_component_id !== fuseId)
      const fusePort = members.find((p) => p.source_component_id === fuseId)
      if (!diodePort || !fusePort) continue
      const diodeId = diodePort.source_component_id
      if (
        index.components.get(diodeId)?.ftype !== "simple_diode" ||
        this.unpopulated.has(diodeId)
      )
        continue
      const diode = index.placement(diodeId)
      const diodeNets = index.twoTerminalNets(diodeId)
      if (!diode || !diodeNets || !index.sameLocalScope(fuse, diode)) continue
      // Two shared nodes describe parallel parts, not a series junction.
      if (diodeNets.filter((n) => fuseNets.includes(n)).length !== 1) continue
      const ports = [
        ...index.portsByComponent.get(fuseId)!,
        ...index.portsByComponent.get(diodeId)!,
      ]
      if (ports.some((p) => p.do_not_connect)) continue
      if (
        [fuse, diode].some(
          (b) =>
            ![b.schX, b.schY, b.width, b.height].every(Number.isFinite) ||
            b.width <= 0 ||
            b.height <= 0,
        )
      )
        continue
      if (
        ports.some((p) => {
          const pin = index.port(p)
          return (
            !pin ||
            pin.schematic_sheet_id !== fuse.schematicSheetId ||
            ![pin.center.x, pin.center.y].every(Number.isFinite)
          )
        })
      )
        continue
      // Overlapping bodies need the overlap diagnostic before judging their alignment.
      if (
        Math.abs(fuse.schX - diode.schX) < (fuse.width + diode.width) / 2 &&
        Math.abs(fuse.schY - diode.schY) < (fuse.height + diode.height) / 2
      )
        continue
      const a = index.port(fusePort)!,
        b = index.port(diodePort)!
      const av = a.facing_direction && direction[a.facing_direction]
      const bv = b.facing_direction && direction[b.facing_direction]
      if (!av || !bv) continue
      const dx = b.center.x - a.center.x,
        dy = b.center.y - a.center.y
      if (Math.hypot(dx, dy) < 0.3) continue
      const opposite = av[0] * bv[0] + av[1] * bv[1] === -1
      const axisOffset = Math.abs(dx * av[1] - dy * av[0])
      const toward = dx * av[0] + dy * av[1] > 0
      // Tolerance allows small symbol-origin offsets; either horizontal or vertical is valid.
      if (opposite && toward && axisOffset <= 0.15) continue
      this.params.issues.push({
        lineItemType: "FuseDiodeNotAligned",
        fuseSchematicBox: fuse,
        diodeSchematicBox: diode,
        fuseSourcePortId: fusePort.source_port_id,
        diodeSourcePortId: diodePort.source_port_id,
        message: `Align ${fuse.sourceComponentName || "fuse"} and ${diode.sourceComponentName || "diode"} so their connected pins face each other along one straight path. Preserve pin connections and diode polarity, leave room for labels, and reroute the trace.`,
      })
    }
  }

  static issueToString(issue: FuseDiodeNotAligned): string {
    const attrs: string[] = []
    addAttr(attrs, "fuseName", issue.fuseSchematicBox.sourceComponentName)
    addAttr(attrs, "diodeName", issue.diodeSchematicBox.sourceComponentName)
    addAttr(attrs, "message", issue.message)
    return `<FuseDiodeNotAligned ${attrs.join(" ")} />`
  }
}
