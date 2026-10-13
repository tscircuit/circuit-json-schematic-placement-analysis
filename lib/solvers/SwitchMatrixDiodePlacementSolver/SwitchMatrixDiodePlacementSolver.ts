import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  SwitchMatrixDiodeSeparatedFromSwitch,
  SwitchMatrixBranchesTooSpreadOut,
} from "../../types"
import { addAttr } from "../../utils/format"
import { centeredRect, type RectBounds } from "../../utils/geometry"
import { getNetLabelBounds } from "../../utils/net-label-bounds"
import {
  getSchematicTextPolygons,
  polygonBounds,
} from "../../utils/schematic-text-geometry"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Branch = {
  switchBox: SchematicBoxPlacement
  diodeBox: SchematicBoxPlacement
  switchPort: SourcePort & { source_component_id: string }
  diodePort: SourcePort & { source_component_id: string }
  switchBus: string
  diodeBus: string
}

/** Keep series diodes beside their switches and repeated matrix branches compact. */
export class SwitchMatrixDiodePlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly branches: Branch[]
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
    for (const element of params.ctx.circuitJson) {
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
      if (element.type !== "source_port") continue
      const net = this.index.connected(element.source_port_id)
      if (element.requires_ground || element.provides_ground)
        this.index.groundNets.add(net)
      if (
        element.requires_power ||
        element.provides_power ||
        element.requires_voltage !== undefined ||
        element.provides_voltage !== undefined
      )
        this.index.powerNets.add(net)
    }
    const candidates = this.findBranches()
    // A matrix needs branches sharing each external bus, not merely one bank
    // of switches or an isolated switch/diode. Neither bus needs a name or role.
    this.branches = candidates.filter((branch) => {
      const peers = candidates.filter((other) =>
        this.index.sameLocalScope(branch.switchBox, other.switchBox),
      )
      return (
        peers.some(
          (other) =>
            other.switchBus === branch.switchBus &&
            other.diodeBus !== branch.diodeBus,
        ) &&
        peers.some(
          (other) =>
            other.diodeBus === branch.diodeBus &&
            other.switchBus !== branch.switchBus,
        )
      )
    })
    this.solved = this.branches.length === 0
  }

  override _step(): void {
    if (this.currentIndex === this.branches.length) {
      this.findMatrixSpacingIssues()
      this.solved = true
      return
    }
    const branch = this.branches[this.currentIndex++]!
    const { connectedPinDistance, maxRecommendedPinDistance, overlapping } =
      this.pairGeometry(branch)
    if (overlapping || connectedPinDistance <= maxRecommendedPinDistance) return
    const s = branch.switchBox,
      d = branch.diodeBox
    this.params.issues.push({
      lineItemType: "SwitchMatrixDiodeSeparatedFromSwitch",
      switchSchematicBox: s,
      diodeSchematicBox: d,
      switchSourcePortId: branch.switchPort.source_port_id,
      diodeSourcePortId: branch.diodePort.source_port_id,
      connectedPinDistance,
      maxRecommendedPinDistance,
      message: `Place ${d.sourceComponentName || "the series diode"} beside ${s.sourceComponentName || "its switch"} so their private matrix connection is short and easy to follow. Preserve diode polarity and all pin connections, leave room for labels and shared bus connections, and reroute affected traces. Exact alignment is not required.`,
    })
  }

  private pairGeometry(branch: Branch) {
    const s = branch.switchBox,
      d = branch.diodeBox
    const first = this.index.port(branch.switchPort)!,
      second = this.index.port(branch.diodePort)!
    return {
      overlapping:
        Math.abs(s.schX - d.schX) < (s.width + d.width) / 2 &&
        Math.abs(s.schY - d.schY) < (s.height + d.height) / 2,
      connectedPinDistance: Math.hypot(
        first.center.x - second.center.x,
        first.center.y - second.center.y,
      ),
      // Schematic readability allowances, not electrical or PCB limits.
      maxRecommendedPinDistance: Math.max(
        4,
        3 * Math.max(s.width, s.height, d.width, d.height),
      ),
    }
  }

  private findMatrixSpacingIssues() {
    const remaining = new Set(this.branches)
    while (remaining.size) {
      const matrix = [remaining.values().next().value!]
      remaining.delete(matrix[0]!)
      for (const branch of matrix) {
        for (const other of remaining) {
          if (
            this.index.sameLocalScope(branch.switchBox, other.switchBox) &&
            (branch.switchBus === other.switchBus ||
              branch.diodeBus === other.diodeBus)
          ) {
            matrix.push(other)
            remaining.delete(other)
          }
        }
      }
      // First fix each pair. A spread-out pair does not yet define a compact
      // branch envelope from which to measure spacing between rows/columns.
      if (
        matrix.some((branch) => {
          const g = this.pairGeometry(branch)
          return (
            g.overlapping ||
            g.connectedPinDistance > g.maxRecommendedPinDistance
          )
        })
      )
        continue
      const switchBuses = new Set(matrix.map((b) => b.switchBus))
      const diodeBuses = new Set(matrix.map((b) => b.diodeBus))
      // Restrict this heuristic to complete rectangular matrices. Missing keys,
      // duplicated bus pairs and folded/ambiguous layouts need separate evidence.
      if (
        switchBuses.size < 2 ||
        diodeBuses.size < 2 ||
        matrix.length !== switchBuses.size * diodeBuses.size ||
        [...switchBuses].some((bus) => diodeBuses.has(bus)) ||
        matrix.some((a, i) =>
          matrix
            .slice(i + 1)
            .some(
              (b) => a.switchBus === b.switchBus && a.diodeBus === b.diodeBus,
            ),
        )
      )
        continue
      const boxes = matrix.flatMap((b) => [b.switchBox, b.diodeBox])
      const bounds = (items: SchematicBoxPlacement[]): RectBounds => ({
        left: Math.min(...items.map((b) => b.schX - b.width / 2)),
        right: Math.max(...items.map((b) => b.schX + b.width / 2)),
        bottom: Math.min(...items.map((b) => b.schY - b.height / 2)),
        top: Math.max(...items.map((b) => b.schY + b.height / 2)),
      })
      const occupied = this.occupiedBounds(boxes[0]!.schematicSheetId)
      let largest: SwitchMatrixBranchesTooSpreadOut | undefined
      for (const axis of ["x", "y"] as const) {
        const low = axis === "x" ? "left" : "bottom"
        const high = axis === "x" ? "right" : "top"
        const crossLow = axis === "x" ? "bottom" : "left"
        const crossHigh = axis === "x" ? "top" : "right"
        const maxRecommendedEmptyGap = Math.max(
          4,
          3 *
            Math.max(...boxes.map((b) => (axis === "x" ? b.width : b.height))),
        )
        for (const busKey of ["switchBus", "diodeBus"] as const) {
          const groups = [...new Set(matrix.map((b) => b[busKey]))]
            .map((bus) =>
              bounds(
                matrix
                  .filter((b) => b[busKey] === bus)
                  .flatMap((b) => [b.switchBox, b.diodeBox]),
              ),
            )
            .sort((a, b) => a[low] - b[low])
          // The bus groups must form distinct spatial bands on this axis.
          if (groups.some((b, i) => i > 0 && b[low] < groups[i - 1]![high]))
            continue
          for (let i = 1; i < groups.length; i++) {
            const a = groups[i - 1]!,
              b = groups[i]!
            if (
              Math.min(a[crossHigh], b[crossHigh]) <=
              Math.max(a[crossLow], b[crossLow])
            )
              continue
            const start = a[high],
              end = b[low]
            // Reserve intervening components, ports and labels anywhere across
            // the two bands, including circuitry outside the matrix itself.
            const intervals = occupied
              .filter(
                (r) =>
                  r[crossHigh] >= Math.min(a[crossLow], b[crossLow]) &&
                  r[crossLow] <= Math.max(a[crossHigh], b[crossHigh]) &&
                  r[high] > start &&
                  r[low] < end,
              )
              .map(
                (r) =>
                  [Math.max(start, r[low]), Math.min(end, r[high])] as const,
              )
              .sort((a, b) => a[0] - b[0])
            let cursor = start,
              emptyGap = 0
            for (const [from, to] of [...intervals, [end, end] as const]) {
              emptyGap = Math.max(emptyGap, from - cursor)
              cursor = Math.max(cursor, to)
            }
            if (
              emptyGap <= maxRecommendedEmptyGap ||
              (largest &&
                emptyGap / maxRecommendedEmptyGap <=
                  largest.emptyGap / largest.maxRecommendedEmptyGap)
            )
              continue
            largest = {
              lineItemType: "SwitchMatrixBranchesTooSpreadOut",
              branchSchematicBoxes: boxes,
              axis,
              emptyGap,
              maxRecommendedEmptyGap,
              message: `Bring the connected switch/diode ${axis === "x" ? "columns" : "rows"} closer together by reducing the unused space between them. Keep room for symbols, labels and intervening circuitry; preserve all pin connections and reroute the shared buses. Exact alignment and equal spacing are not required.`,
            }
          }
        }
      }
      if (largest) this.params.issues.push(largest)
    }
  }

  private occupiedBounds(sheetId: string | undefined): RectBounds[] {
    const result: RectBounds[] = []
    const componentSheets = new Map(
      this.params.ctx.componentPlacements.map((p) => [
        p.schematicComponentId,
        p.schematicSheetId,
      ]),
    )
    for (const e of this.params.ctx.circuitJson) {
      let rects: RectBounds[] = []
      if (e.type === "schematic_component" && e.schematic_sheet_id === sheetId)
        rects = [
          centeredRect(e.center.x, e.center.y, e.size.width, e.size.height),
        ]
      if (e.type === "schematic_port" && e.schematic_sheet_id === sheetId)
        rects = [centeredRect(e.center.x, e.center.y, 0, 0)]
      if (e.type === "schematic_net_label" && e.schematic_sheet_id === sheetId)
        rects = [getNetLabelBounds(e)]
      if (
        e.type === "schematic_text" &&
        (e.schematic_sheet_id ??
          componentSheets.get(e.schematic_component_id)) === sheetId
      )
        rects = getSchematicTextPolygons(e).map((p) => polygonBounds([p]))
      for (const r of rects) {
        if (!Object.values(r).every(Number.isFinite)) continue
        // Retain clearance around occupied geometry; shorten/reroute matrix
        // wires rather than treating their current length as required space.
        result.push({
          left: r.left - 0.5,
          right: r.right + 0.5,
          bottom: r.bottom - 0.5,
          top: r.top + 0.5,
        })
      }
    }
    return result
  }

  private findBranches(): Branch[] {
    const index = this.index
    const result: Branch[] = []
    for (const component of index.components.values()) {
      if (
        component.ftype !== "simple_push_button" &&
        component.ftype !== "simple_switch"
      )
        continue
      const id = component.source_component_id
      const sw = this.localPart(id)
      if (!sw) continue
      const pairs = sw.ports.flatMap((switchPort) => {
        const privateNet = index.connected(switchPort.source_port_id)
        const members = index.portsByNet.get(privateNet) ?? []
        if (members.length !== 2) return []
        const diodePort = members.find((p) => p.source_component_id !== id)
        if (
          !diodePort ||
          index.components.get(diodePort.source_component_id)?.ftype !==
            "simple_diode"
        )
          return []
        const diode = this.localPart(diodePort.source_component_id)
        if (!diode || !index.sameLocalScope(sw.box, diode.box)) return []
        const switchBus = sw.nets.find((net) => net !== privateNet)!
        const diodeBus = diode.nets.find((net) => net !== privateNet)!
        if (
          switchBus === diodeBus ||
          [privateNet, switchBus, diodeBus].some((net) => index.isRail(net)) ||
          [switchBus, diodeBus].some(
            (net) => (index.portsByNet.get(net)?.length ?? 0) < 2,
          )
        )
          return []
        return [
          {
            switchBox: sw.box,
            diodeBox: diode.box,
            switchPort,
            diodePort,
            switchBus,
            diodeBus,
          },
        ]
      })
      // Diodes on both switch ends do not identify a unique local pair.
      if (pairs.length === 1) result.push(pairs[0]!)
    }
    return result
  }

  private localPart(id: string) {
    const index = this.index
    const box = index.placement(id)
    const ports = index.portsByComponent.get(id)
    const nets = index.twoTerminalNets(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      ports?.length !== 2 ||
      !nets ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0 ||
      ports.some((port) => {
        const pin = index.port(port)
        return (
          port.do_not_connect ||
          !pin ||
          pin.schematic_sheet_id !== box.schematicSheetId ||
          !Number.isFinite(pin.center.x) ||
          !Number.isFinite(pin.center.y)
        )
      })
    )
      return
    return { box, ports, nets }
  }

  static issueToString(
    issue:
      | SwitchMatrixDiodeSeparatedFromSwitch
      | SwitchMatrixBranchesTooSpreadOut,
  ): string {
    const attrs: string[] = []
    if (issue.lineItemType === "SwitchMatrixBranchesTooSpreadOut") {
      addAttr(attrs, "axis", issue.axis)
      addAttr(attrs, "emptyGap", issue.emptyGap)
      addAttr(attrs, "maxRecommendedEmptyGap", issue.maxRecommendedEmptyGap)
      addAttr(attrs, "message", issue.message)
      return `<SwitchMatrixBranchesTooSpreadOut ${attrs.join(" ")} />`
    }
    addAttr(attrs, "switchName", issue.switchSchematicBox.sourceComponentName)
    addAttr(attrs, "diodeName", issue.diodeSchematicBox.sourceComponentName)
    addAttr(attrs, "connectedPinDistance", issue.connectedPinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<SwitchMatrixDiodeSeparatedFromSwitch ${attrs.join(" ")} />`
  }
}
