import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPlacementIssue } from "../../types"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import { getSwitchPullResistorPairs } from "../../utils/switch-pull-resistor-pairs"
import type { SolverContext } from "../SolverContext"

/** Recognize switch pull branches without requiring IC pull-pin metadata. */
export class SwitchPullResistorPlacementSolver extends BaseSolver {
  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
  }

  override _step(): void {
    const index = new PlacementNetworkIndex(this.params.ctx)
    const unpopulated = new Set<string>()
    for (const e of this.params.ctx.circuitJson) {
      if (e.type === "pcb_component" && e.do_not_place)
        unpopulated.add(e.source_component_id)
      if (e.type !== "source_port" || e.do_not_connect) continue
      const net = index.connected(e.source_port_id)
      if (!net) continue
      if (e.requires_ground || e.provides_ground) index.groundNets.add(net)
      if (
        e.requires_power ||
        e.provides_power ||
        e.requires_voltage !== undefined ||
        e.provides_voltage !== undefined
      )
        index.powerNets.add(net)
    }
    for (const e of this.params.ctx.circuitJson)
      if (e.type === "pcb_component" && !e.do_not_place)
        unpopulated.delete(e.source_component_id)

    for (const pair of getSwitchPullResistorPairs(index, unpopulated)) {
      const { resistor, switchBox, signalPort, signalSchY, pullDirection } =
        pair
      if (pair.horizontalPushbutton) continue
      // With an IC on the signal, the pull resistor may belong beside that IC,
      // not beside a remote switch. Leave its position to the host-pin rule.
      const signal = index.connected(signalPort.source_port_id)
      const populatedPeers = (index.portsByNet.get(signal) ?? []).filter(
        (p) => !unpopulated.has(p.source_component_id),
      )
      if (populatedPeers.length !== 2) continue
      // Explicit pin requirements are handled by PullResistorPlacementSolver.
      if (
        signalPort.needs_external_pullup ||
        signalPort.needs_external_pulldown
      )
        continue
      const wrongSideGap =
        pullDirection === "up"
          ? signalSchY - (resistor.schY + resistor.height / 2)
          : resistor.schY - resistor.height / 2 - signalSchY
      if (wrongSideGap <= 1.5) continue
      const preferredSide = pullDirection === "up" ? "above" : "below"
      this.params.issues.push({
        lineItemType: "PullResistorOnWrongSide",
        resistorSchematicBox: resistor,
        hostSchematicBox: switchBox,
        signalSourcePortId: signalPort.source_port_id,
        signalPinName: signalPort.name,
        signalSchY,
        pullDirection,
        preferredSide,
        wrongSideGap,
        maxRecommendedWrongSideGap: 1.5,
        message: `place ${resistor.sourceComponentName} ${preferredSide} ${switchBox.sourceComponentName} so the pull-${pullDirection} branch reads toward ${pullDirection === "up" ? "power" : "ground"}`,
      })
    }
    this.solved = true
  }
}
