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
    for (const pair of getSwitchPullResistorPairs(index)) {
      const { resistor, switchBox, signalPort, signalSchY, pullDirection } =
        pair
      if (pair.horizontalPushbutton) continue
      // With an IC on the signal, the pull resistor may belong beside that IC,
      // not beside a remote switch. Leave its position to the host-pin rule.
      const signal = index.connected(signalPort.source_port_id)
      if (index.portsByNet.get(signal)?.length !== 2) continue
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
