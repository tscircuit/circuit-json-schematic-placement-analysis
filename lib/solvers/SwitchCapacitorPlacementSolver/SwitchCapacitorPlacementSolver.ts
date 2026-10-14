import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  CapacitorSeparatedFromSwitch,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Keep an unambiguous local capacitor across a grounded switch near that switch. */
export class SwitchCapacitorPlacementSolver extends BaseSolver {
  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
  }

  override _step(): void {
    const { ctx, issues } = this.params
    const index = new PlacementNetworkIndex(ctx)
    const excluded = new Set(
      ctx.circuitJson.flatMap((e) =>
        e.type === "pcb_component" && e.do_not_place
          ? [e.source_component_id]
          : [],
      ),
    )
    const usable = (id: string) => {
      const box = index.placement(id)
      const ports = index.portsByComponent.get(id)
      return box &&
        [box.schX, box.schY, box.width, box.height].every(Number.isFinite) &&
        box.width > 0 &&
        box.height > 0 &&
        !excluded.has(id) &&
        ports?.length === 2 &&
        ports.every((port) => {
          const pin = index.port(port)
          return (
            !port.do_not_connect &&
            pin &&
            pin.schematic_sheet_id === box.schematicSheetId
          )
        })
        ? box
        : undefined
    }
    for (const component of index.components.values()) {
      if (
        component.ftype !== "simple_push_button" &&
        component.ftype !== "simple_switch"
      )
        continue
      const switchId = component.source_component_id
      const nets = index.twoTerminalNets(switchId)
      const sw = usable(switchId)
      if (
        !sw ||
        !nets ||
        nets.filter((net) => index.groundNets.has(net)).length !== 1
      )
        continue
      const signal = nets.find((net) => !index.groundNets.has(net))!
      if (nets.some((net) => index.powerNets.has(net))) continue
      const peers = index.portsByNet.get(signal) ?? []
      // Count every electrical candidate, including unplaced and excluded parts.
      const switches = peers.filter((p) => {
        const type = index.components.get(p.source_component_id)?.ftype
        return type === "simple_switch" || type === "simple_push_button"
      })
      const caps = peers.filter(
        (p) =>
          index.components.get(p.source_component_id)?.ftype ===
          "simple_capacitor",
      )
      if (switches.length !== 1 || caps.length !== 1) continue
      const capId = caps[0]!.source_component_id
      const capNets = index.twoTerminalNets(capId)
      const cap = usable(capId)
      if (
        !cap ||
        !capNets?.every((net) => nets.includes(net)) ||
        !index.sameLocalScope(sw, cap)
      )
        continue
      const networkIds = new Set([switchId, capId])
      let pullCount = 0
      const local = peers.every((port) => {
        if (networkIds.has(port.source_component_id)) return true
        if (port.do_not_connect) return false
        const id = port.source_component_id
        const box = index.placement(id)
        if (!box) return false
        // Other-sheet signal consumers do not compete for this sheet's placement.
        if (box.schematicSheetId !== sw.schematicSheetId) return true
        const part = index.components.get(id)
        const resistorNets = index.twoTerminalNets(id)
        const supply = resistorNets?.find((net) => net !== signal)
        if (
          part?.ftype !== "simple_resistor" ||
          !Number.isFinite(part.resistance) ||
          part.resistance <= 0 ||
          !usable(id) ||
          !index.sameLocalScope(sw, box) ||
          !supply ||
          !index.powerNets.has(supply) ||
          index.groundNets.has(supply) ||
          ++pullCount > 1
        )
          return false
        networkIds.add(id)
        return true
      })
      // A same-sheet IC, series branch or second switch/capacitor makes the
      // intended local grouping ambiguous. Do not guess its electrical role.
      if (!local) continue
      const gapX = Math.max(
        0,
        Math.abs(sw.schX - cap.schX) - (sw.width + cap.width) / 2,
      )
      const gapY = Math.max(
        0,
        Math.abs(sw.schY - cap.schY) - (sw.height + cap.height) / 2,
      )
      const bodyGap = Math.hypot(gapX, gapY)
      // Allow several symbol widths for labels and wiring; this is a readability
      // heuristic, not an electrical spacing limit or an exact coordinate rule.
      const maxRecommendedBodyGap = Math.max(
        4,
        2 * Math.max(sw.width, sw.height, cap.width, cap.height),
      )
      if (bodyGap <= maxRecommendedBodyGap) continue
      if (
        ctx.componentPlacements.some(
          (box) =>
            !networkIds.has(box.sourceComponentId ?? "") &&
            box.schematicSheetId === sw.schematicSheetId &&
            between(box, sw, cap),
        )
      )
        continue
      issues.push({
        lineItemType: "CapacitorSeparatedFromSwitch",
        switchSchematicBox: sw,
        capacitorSchematicBox: cap,
        bodyGap,
        maxRecommendedBodyGap,
        message: `Place ${cap.sourceComponentName || "the capacitor"} beside ${sw.sourceComponentName || "the switch"} so their two shared nets read as adjacent parallel branches. Leave room for labels and connecting wires; preserve both pin connections.`,
      })
    }
    this.solved = true
  }

  static issueToString(issue: CapacitorSeparatedFromSwitch): string {
    const attrs: string[] = []
    addAttr(attrs, "switchName", issue.switchSchematicBox.sourceComponentName)
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<CapacitorSeparatedFromSwitch ${attrs.join(" ")} />`
  }
}

/** Skip when unrelated bodies occupy the rectangle between the two symbols. */
function between(
  box: SchematicBoxPlacement,
  a: SchematicBoxPlacement,
  b: SchematicBoxPlacement,
): boolean {
  return (
    box.schX + box.width / 2 > Math.min(a.schX, b.schX) &&
    box.schX - box.width / 2 < Math.max(a.schX, b.schX) + 0.01 &&
    box.schY + box.height / 2 > Math.min(a.schY, b.schY) &&
    box.schY - box.height / 2 < Math.max(a.schY, b.schY) + 0.01
  )
}
