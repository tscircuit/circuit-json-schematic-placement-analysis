import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  BuckConverterNetworkNotGrouped,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Member = {
  schematicBox: SchematicBoxPlacement
  role: BuckConverterNetworkNotGrouped["distantComponents"][number]["role"]
  pin: SourcePort & { source_component_id: string }
}

export class BuckConverterNetworkPlacementSolver extends BaseSolver {
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
    for (const ports of index.portsByComponent.values()) {
      for (const port of ports) {
        if (port.provides_ground || port.requires_ground)
          index.groundNets.add(index.connected(port.source_port_id))
      }
    }
    const partsBetween = (type: string, a: string, b: string) =>
      [
        ...new Set(
          (index.portsByNet.get(a) ?? []).map((p) => p.source_component_id),
        ),
      ].filter((id) => {
        const nets = index.twoTerminalNets(id)
        return (
          index.components.get(id)?.ftype === type &&
          a !== b &&
          nets?.includes(a) &&
          nets.includes(b)
        )
      })

    for (const [id, component] of index.components) {
      if (component.ftype !== "simple_chip") continue
      const host = index.placement(id)
      const ports = index.portsByComponent.get(id) ?? []
      const named = (names: string[]) => {
        const matches = ports.filter(
          (p) =>
            !p.do_not_connect &&
            [p.name, ...(p.port_hints ?? [])].some((name) =>
              names.includes(name.toUpperCase()),
            ),
        )
        return matches.length === 1 ? matches[0] : undefined
      }
      const sw = named(["SW", "LX", "PH"])
      const fb = named(["FB", "VFB", "VSENSE"])
      const vin = named(["VIN", "PVIN"])
      if (!host || !sw || !fb || !vin || !index.port(sw) || !index.port(fb))
        continue
      const swNet = index.connected(sw.source_port_id)
      const fbNet = index.connected(fb.source_port_id)
      const vinNet = index.connected(vin.source_port_id)
      if (
        new Set([swNet, fbNet, vinNet]).size !== 3 ||
        index.isRail(swNet) ||
        index.isRail(fbNet)
      )
        continue
      // A shared sense/switch node has no unambiguous single regulator owner.
      if (
        [swNet, fbNet].some((net) =>
          (index.portsByNet.get(net) ?? []).some(
            (p) =>
              p.source_component_id !== id &&
              index.components.get(p.source_component_id)?.ftype ===
                "simple_chip",
          ),
        )
      )
        continue
      const inductors = [
        ...new Set(
          (index.portsByNet.get(swNet) ?? []).map((p) => p.source_component_id),
        ),
      ].filter(
        (partId) =>
          index.components.get(partId)?.ftype === "simple_inductor" &&
          index.twoTerminalNets(partId),
      )
      if (inductors.length !== 1) continue
      const inductorId = inductors[0]!
      const outputNet = index
        .twoTerminalNets(inductorId)!
        .find((net) => net !== swNet)!
      if (
        outputNet === vinNet ||
        outputNet === fbNet ||
        index.groundNets.has(outputNet)
      )
        continue
      const upper = partsBetween("simple_resistor", outputNet, fbNet)
      const lower = [...index.groundNets].flatMap((ground) =>
        partsBetween("simple_resistor", fbNet, ground),
      )
      if (upper.length !== 1 || lower.length !== 1) continue
      const lowerNets = index.twoTerminalNets(lower[0]!)!
      const groundNet = lowerNets.find((net) => net !== fbNet)!
      const hostUsesGround = ports.some(
        (p) => index.connected(p.source_port_id) === groundNet,
      )
      if (!hostUsesGround) continue

      const members: Member[] = []
      const add = (
        partId: string,
        role: Member["role"],
        pin: Member["pin"],
      ) => {
        const placement = index.placement(partId)
        if (!placement || !index.sameLocalScope(host, placement)) return false
        members.push({ schematicBox: placement, role, pin })
        return true
      }
      if (
        !add(inductorId, "output_inductor", sw) ||
        !add(upper[0]!, "feedback_resistor", fb) ||
        !add(lower[0]!, "feedback_resistor", fb)
      )
        continue
      const boot = named(["BOOT", "BST"])
      if (boot && index.port(boot)) {
        const caps = partsBetween(
          "simple_capacitor",
          index.connected(boot.source_port_id),
          swNet,
        )
        if (caps.length === 1) add(caps[0]!, "bootstrap_capacitor", boot)
      }
      const diodes = partsBetween("simple_diode", swNet, groundNet)
      if (diodes.length === 1) add(diodes[0]!, "catch_diode", sw)
      // Rail-to-ground capacitors can serve other loads. Do not infer ownership
      // from a shared VIN/VOUT rail or pull distant decouplers into this network.
      const distantComponents = members.flatMap(
        ({ schematicBox: box, role, pin }) => {
          const position = index.port(pin)!.center
          const distance = Math.hypot(
            Math.max(0, Math.abs(box.schX - position.x) - box.width / 2),
            Math.max(0, Math.abs(box.schY - position.y) - box.height / 2),
          )
          // Schematic readability, measured from the relevant pin, not PCB distance.
          const limit = Math.max(6, 3 * Math.max(box.width, box.height))
          return distance > limit
            ? [
                {
                  schematicBox: box,
                  role,
                  regulatorSourcePortId: pin.source_port_id,
                  regulatorPinName: pin.name,
                  distanceFromRegulatorPin: Math.round(distance * 100) / 100,
                  maxRecommendedDistance: limit,
                },
              ]
            : []
        },
      )
      if (distantComponents.length === 0) continue
      const hostName = host.sourceComponentName ?? host.schematicComponentId
      const targets = distantComponents.map(
        (part) =>
          `${part.schematicBox.sourceComponentName ?? part.schematicBox.schematicComponentId} near ${hostName}.${part.regulatorPinName}`,
      )
      this.params.issues.push({
        lineItemType: "BuckConverterNetworkNotGrouped",
        regulatorSchematicBox: host,
        supportNetworkComponents: members.map((m) => m.schematicBox),
        distantComponents,
        message: `Group ${targets.join("; ")} so the buck converter's switching and feedback connections can be read together. Preserve all net connections.`,
      })
    }
    this.solved = true
  }

  static issueToString(issue: BuckConverterNetworkNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "regulatorComponentName",
      issue.regulatorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "supportNetworkComponents",
      issue.supportNetworkComponents
        .map((p) => p.sourceComponentName ?? p.schematicComponentId)
        .join(","),
    )
    addAttr(
      attrs,
      "distantComponents",
      issue.distantComponents
        .map(
          (p) =>
            p.schematicBox.sourceComponentName ??
            p.schematicBox.schematicComponentId,
        )
        .join(","),
    )
    addAttr(attrs, "message", issue.message)
    return `<BuckConverterNetworkNotGrouped ${attrs.join(" ")} />`
  }
}
