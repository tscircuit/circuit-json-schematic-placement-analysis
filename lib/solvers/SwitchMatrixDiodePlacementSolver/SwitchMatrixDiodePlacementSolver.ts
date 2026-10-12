import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  SwitchMatrixDiodeSeparatedFromSwitch,
} from "../../types"
import { addAttr } from "../../utils/format"
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

/** A discrete series diode belongs beside its switch in a repeated matrix branch. */
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
    const branch = this.branches[this.currentIndex++]!
    this.solved = this.currentIndex >= this.branches.length
    const s = branch.switchBox,
      d = branch.diodeBox
    // Overlap is a separate diagnostic, not evidence of a separated pair.
    if (
      Math.abs(s.schX - d.schX) < (s.width + d.width) / 2 &&
      Math.abs(s.schY - d.schY) < (s.height + d.height) / 2
    )
      return
    const first = this.index.port(branch.switchPort)!,
      second = this.index.port(branch.diodePort)!
    const connectedPinDistance = Math.hypot(
      first.center.x - second.center.x,
      first.center.y - second.center.y,
    )
    // A schematic readability allowance, not an electrical or PCB limit.
    const maxRecommendedPinDistance = Math.max(
      4,
      3 * Math.max(s.width, s.height, d.width, d.height),
    )
    if (connectedPinDistance <= maxRecommendedPinDistance) return
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

  static issueToString(issue: SwitchMatrixDiodeSeparatedFromSwitch): string {
    const attrs: string[] = []
    addAttr(attrs, "switchName", issue.switchSchematicBox.sourceComponentName)
    addAttr(attrs, "diodeName", issue.diodeSchematicBox.sourceComponentName)
    addAttr(attrs, "connectedPinDistance", issue.connectedPinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<SwitchMatrixDiodeSeparatedFromSwitch ${attrs.join(" ")} />`
  }
}
