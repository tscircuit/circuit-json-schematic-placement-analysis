import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  DecouplingCapacitorsNotCloseTogether,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

interface CapacitorBank {
  power: string
  ground: string
  capacitors: SchematicBoxPlacement[]
}

export class DecouplingCapacitorGroupingSolver extends BaseSolver {
  // Schematic readability heuristic, measured between component bounds.
  // Larger symbols get proportionally more room; PCB distances do not apply.
  private static readonly MIN_BODY_GAP = 4
  private readonly banks: CapacitorBank[] = []
  private readonly netNames = new Map<string, string>()
  private bankIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const index = new PlacementNetworkIndex(params.ctx)
    const powerNets = new Set(index.powerNets)
    const groundNets = new Set(index.groundNets)
    for (const element of params.ctx.circuitJson) {
      if (element.type === "source_net") {
        const net = index.connected(element.source_net_id)
        if (!this.netNames.has(net)) this.netNames.set(net, element.name)
      }
    }
    // A supply can be identified by a chip pin even without a named source_net.
    for (const ports of index.portsByComponent.values()) {
      for (const port of ports) {
        if (port.do_not_connect) continue
        const net = index.connected(port.source_port_id)
        if (port.provides_power || port.requires_power) powerNets.add(net)
        if (port.provides_ground || port.requires_ground) groundNets.add(net)
        if (
          (powerNets.has(net) || groundNets.has(net)) &&
          !this.netNames.has(net)
        )
          this.netNames.set(net, port.name)
      }
    }
    for (const component of index.components.values()) {
      if (component.ftype !== "simple_capacitor") continue
      const id = component.source_component_id
      const placement = index.placement(id)
      const nets = index.twoTerminalNets(id)
      const ports = index.portsByComponent.get(id)
      if (
        !placement ||
        !nets ||
        !ports ||
        ports.some((port) => {
          const schematicPort = index.port(port)
          return (
            port.do_not_connect ||
            !schematicPort ||
            schematicPort.schematic_sheet_id !== placement.schematicSheetId
          )
        })
      )
        continue
      const power = nets.find(
        (net) => powerNets.has(net) && !groundNets.has(net),
      )
      const ground = nets.find(
        (net) => groundNets.has(net) && !powerNets.has(net),
      )
      // Signal filters, series capacitors, and ambiguous rails are not decouplers.
      if (!power || !ground) continue
      const bank = this.banks.find(
        (candidate) =>
          candidate.power === power &&
          candidate.ground === ground &&
          index.sameLocalScope(candidate.capacitors[0]!, placement),
      )
      if (bank) bank.capacitors.push(placement)
      else this.banks.push({ power, ground, capacitors: [placement] })
    }
    this.solved = this.banks.length === 0
  }

  override _step(): void {
    const bank = this.banks[this.bankIndex++]!
    this.solved = this.bankIndex >= this.banks.length
    if (bank.capacitors.length < 2) return
    const maxRecommendedBodyGap = Math.max(
      DecouplingCapacitorGroupingSolver.MIN_BODY_GAP,
      ...bank.capacitors.map((box) => 3 * Math.max(box.width, box.height)),
    )
    let maxBodyGap = 0
    let first = bank.capacitors[0]!
    let second = bank.capacitors[1]!
    for (let i = 0; i < bank.capacitors.length; i++) {
      for (const b of bank.capacitors.slice(i + 1)) {
        const a = bank.capacitors[i]!
        const gap = Math.hypot(
          Math.max(0, Math.abs(a.schX - b.schX) - (a.width + b.width) / 2),
          Math.max(0, Math.abs(a.schY - b.schY) - (a.height + b.height) / 2),
        )
        if (gap > maxBodyGap) {
          maxBodyGap = gap
          first = a
          second = b
        }
      }
    }
    if (maxBodyGap <= maxRecommendedBodyGap + 1e-6) return
    const railName = this.netNames.get(bank.power) ?? bank.power
    const groundName = this.netNames.get(bank.ground) ?? bank.ground
    // One report per bank, with the farthest pair as evidence and all members
    // as context. This avoids a separate warning for every distant pair.
    this.params.issues.push({
      lineItemType: "DecouplingCapacitorsNotCloseTogether",
      railName,
      groundName,
      firstCapacitorSchematicBox: first,
      secondCapacitorSchematicBox: second,
      capacitorSchematicBoxes: bank.capacitors,
      maxBodyGap,
      maxRecommendedBodyGap,
      message: `Group the decoupling capacitors between ${railName} and ${groundName} closer together in this schematic block. Preserve their net connections.`,
    })
  }

  static issueToString(issue: DecouplingCapacitorsNotCloseTogether): string {
    const attrs: string[] = []
    addAttr(attrs, "rail", issue.railName)
    addAttr(attrs, "ground", issue.groundName)
    addAttr(
      attrs,
      "firstCapacitorName",
      issue.firstCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondCapacitorName",
      issue.secondCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "capacitorNames",
      issue.capacitorSchematicBoxes
        .map((box) => box.sourceComponentName ?? box.schematicComponentId)
        .join(", "),
    )
    addAttr(attrs, "maxBodyGap", issue.maxBodyGap)
    addAttr(attrs, "maxRecommendedBodyGap", issue.maxRecommendedBodyGap)
    addAttr(attrs, "message", issue.message)
    return `<DecouplingCapacitorsNotCloseTogether ${attrs.join(" ")} />`
  }
}
