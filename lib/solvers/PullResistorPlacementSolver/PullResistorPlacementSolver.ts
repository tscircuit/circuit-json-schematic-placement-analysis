import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  PullResistorOnWrongSide,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

export class PullResistorPlacementSolver extends BaseSolver {
  // Ignore small offsets and resistors straddling the signal's horizontal line.
  private static readonly MIN_WRONG_SIDE_GAP = 1.5
  private readonly index: PlacementNetworkIndex
  private readonly resistorIds: string[]
  private readonly issues: SchematicPlacementIssue[]
  private currentIndex = 0

  constructor({
    ctx,
    issues,
  }: { ctx: SolverContext; issues: SchematicPlacementIssue[] }) {
    super()
    this.issues = issues
    this.index = new PlacementNetworkIndex(ctx)
    this.resistorIds = [...this.index.components.values()]
      .filter(
        (component) =>
          component.ftype === "simple_resistor" && component.resistance > 0,
      )
      .map((component) => component.source_component_id)
    this.solved = this.resistorIds.length === 0
  }

  override _step(): void {
    const id = this.resistorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.resistorIds.length
    if (!id) return
    const index = this.index
    const resistor = index.placement(id)
    const nets = index.twoTerminalNets(id)
    if (!resistor || !nets) return
    const rails = nets.filter((net) => index.isRail(net))
    if (rails.length !== 1) return
    const rail = rails[0]!
    // Conflicting power/ground declarations do not establish a pull direction.
    if (index.powerNets.has(rail) && index.groundNets.has(rail)) return
    const pullDirection = index.groundNets.has(rail) ? "down" : "up"
    const signal = nets.find((net) => net !== rail)!
    const signalPorts = index.portsByNet.get(signal) ?? []
    const requiringPorts = signalPorts.filter(
      (port) => port.needs_external_pullup || port.needs_external_pulldown,
    )
    // Shared buses need a branch-based policy, rather than choosing an arbitrary host pin.
    if (requiringPorts.length !== 1) return
    const signalPort = requiringPorts[0]!
    if (signalPort.needs_external_pullup && signalPort.needs_external_pulldown)
      return
    if (
      pullDirection === "up"
        ? !signalPort.needs_external_pullup
        : !signalPort.needs_external_pulldown
    )
      return
    const host = index.placement(signalPort.source_component_id)
    const schematicPin = index.port(signalPort)
    if (!host || !schematicPin || !index.sameLocalScope(host, resistor)) return
    if (
      signalPorts.some((port) => {
        const otherId = port.source_component_id
        if (otherId === id || otherId === signalPort.source_component_id)
          return false
        const type = index.components.get(otherId)?.ftype
        // A local shunt capacitor is fine; other devices or resistor branches make the role ambiguous.
        if (type !== "simple_capacitor") return true
        const capacitorNets = index.twoTerminalNets(otherId)
        const returnNet = capacitorNets?.find((net) => net !== signal)
        if (
          !returnNet ||
          !index.groundNets.has(returnNet) ||
          index.powerNets.has(returnNet)
        )
          return true
        const capacitor = index.placement(otherId)
        return !capacitor || !index.sameLocalScope(host, capacitor)
      })
    )
      return

    const signalSchY = schematicPin.center.y
    const wrongSideGap =
      pullDirection === "up"
        ? signalSchY - (resistor.schY + resistor.height / 2)
        : resistor.schY - resistor.height / 2 - signalSchY
    if (wrongSideGap <= PullResistorPlacementSolver.MIN_WRONG_SIDE_GAP) return
    const preferredSide = pullDirection === "up" ? "above" : "below"
    this.issues.push({
      lineItemType: "PullResistorOnWrongSide",
      resistorSchematicBox: resistor,
      hostSchematicBox: host,
      signalSourcePortId: signalPort.source_port_id,
      signalPinName: signalPort.name,
      signalSchY,
      pullDirection,
      preferredSide,
      wrongSideGap,
      maxRecommendedWrongSideGap:
        PullResistorPlacementSolver.MIN_WRONG_SIDE_GAP,
      message: `consider placing ${resistor.sourceComponentName ?? id} ${preferredSide} ${host.sourceComponentName ?? signalPort.source_component_id}.${signalPort.name} so the pull-${pullDirection} branch reads toward ${pullDirection === "up" ? "power" : "ground"}`,
    })
  }

  static issueToString(issue: PullResistorOnWrongSide): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "hostName", issue.hostSchematicBox.sourceComponentName)
    addAttr(attrs, "signalPin", issue.signalPinName)
    addAttr(attrs, "pullDirection", issue.pullDirection)
    addAttr(attrs, "preferredSide", issue.preferredSide)
    addAttr(attrs, "signalSchY", issue.signalSchY)
    addAttr(attrs, "wrongSideGap", issue.wrongSideGap)
    addAttr(attrs, "message", issue.message)
    return `<PullResistorOnWrongSide ${attrs.join(" ")} />`
  }
}
