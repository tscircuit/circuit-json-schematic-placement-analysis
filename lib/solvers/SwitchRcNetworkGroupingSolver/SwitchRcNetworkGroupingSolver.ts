import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  SwitchRcNetworkNotGrouped,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Group a grounded switch, its parallel capacitor and an optional local pull resistor. */
export class SwitchRcNetworkGroupingSolver extends BaseSolver {
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
      let pull: SchematicBoxPlacement | undefined
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
          pull !== undefined
        )
          return false
        pull = box
        networkIds.add(id)
        return true
      })
      // A same-sheet IC, series branch or second switch/capacitor makes the
      // intended local grouping ambiguous. Do not guess its electrical role.
      if (!local) continue
      const switchCapacitorBodyGap = bodyGap(sw, cap)
      const maxRecommendedSwitchCapacitorBodyGap = recommendedGap(sw, cap)
      const capacitorSeparated =
        switchCapacitorBodyGap > maxRecommendedSwitchCapacitorBodyGap
      // A pull may sit beside either end of the local pair. Do not demand an
      // exact row/column or move it just because it is farther from the switch.
      const pullAnchor =
        pull && bodyGap(pull, cap) < bodyGap(pull, sw) ? cap : sw
      const resistorBodyGap = pull ? bodyGap(pull, pullAnchor) : undefined
      const maxRecommendedResistorBodyGap = pull
        ? recommendedGap(pull, pullAnchor)
        : undefined
      const resistorSeparated =
        resistorBodyGap !== undefined &&
        resistorBodyGap > maxRecommendedResistorBodyGap!
      if (!capacitorSeparated && !resistorSeparated) continue
      const separatedPairs = [
        ...(capacitorSeparated ? [[sw, cap] as const] : []),
        ...(resistorSeparated ? [[pullAnchor, pull!] as const] : []),
      ]
      if (
        separatedPairs.some(([a, b]) =>
          ctx.componentPlacements.some(
            (box) =>
              !networkIds.has(box.sourceComponentId ?? "") &&
              box.schematicSheetId === sw.schematicSheetId &&
              between(box, a, b),
          ),
        )
      )
        continue
      const members = [
        sw.sourceComponentName || "the switch",
        cap.sourceComponentName || "the capacitor",
        ...(pull ? [pull.sourceComponentName || "the pull resistor"] : []),
      ]
      const separated = [
        ...(capacitorSeparated
          ? [cap.sourceComponentName || "the capacitor"]
          : []),
        ...(resistorSeparated
          ? [pull!.sourceComponentName || "the pull resistor"]
          : []),
      ]
      issues.push({
        lineItemType: "SwitchRcNetworkNotGrouped",
        switchSchematicBox: sw,
        capacitorSchematicBox: cap,
        resistorSchematicBox: pull,
        switchCapacitorBodyGap,
        maxRecommendedSwitchCapacitorBodyGap,
        resistorBodyGap,
        maxRecommendedResistorBodyGap,
        message: `Group ${members.join(", ")} together; ${separated.join(" and ")} ${separated.length === 1 ? "is" : "are"} too far from the local network. Keep the switch and capacitor as adjacent parallel branches, leave room for labels and wires, and preserve every pin connection.`,
      })
    }
    this.solved = true
  }

  static issueToString(issue: SwitchRcNetworkNotGrouped): string {
    const attrs: string[] = []
    addAttr(attrs, "switchName", issue.switchSchematicBox.sourceComponentName)
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox?.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<SwitchRcNetworkNotGrouped ${attrs.join(" ")} />`
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

function bodyGap(a: SchematicBoxPlacement, b: SchematicBoxPlacement): number {
  return Math.hypot(
    Math.max(0, Math.abs(a.schX - b.schX) - (a.width + b.width) / 2),
    Math.max(0, Math.abs(a.schY - b.schY) - (a.height + b.height) / 2),
  )
}

/** Several symbol widths allow labels and wiring; this is a readability heuristic. */
function recommendedGap(
  a: SchematicBoxPlacement,
  b: SchematicBoxPlacement,
): number {
  return Math.max(4, 2 * Math.max(a.width, a.height, b.width, b.height))
}
