import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  FourPinCrystalPatternMismatch,
  CrystalPatternPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import { addAttr } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

/** The four-component reference pattern: four-pin crystal, two loads and one series resistor. */
export class FourPinCrystalPatternSolver extends BaseSolver {
  constructor(
    private readonly input: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
  }

  override _step() {
    const { ctx, issues } = this.input
    const index = new PlacementNetworkIndex(ctx)
    for (const component of index.components.values()) {
      if (component.ftype !== "simple_crystal") continue
      const id = component.source_component_id
      const ports = index.portsByComponent.get(id) ?? []
      if (ports.length !== 4) continue
      const ground = ports.filter((p) =>
        index.groundNets.has(index.connected(p.source_port_id)),
      )
      const signals = ports.filter((p) => !ground.includes(p))
      if (ground.length !== 2 || signals.length !== 2) continue
      const groundNet = index.connected(ground[0]!.source_port_id)
      if (index.connected(ground[1]!.source_port_id) !== groundNet) continue
      const signalNets = signals.map((p) => index.connected(p.source_port_id))
      if (signalNets[0] === signalNets[1]) continue
      const loads = signalNets.map((net) =>
        [...index.components.values()].filter((c) => {
          if (c.ftype !== "simple_capacitor") return false
          const nets = index.twoTerminalNets(c.source_component_id)
          return nets?.includes(net) && nets.includes(groundNet)
        }),
      )
      if (loads.some((c) => c.length !== 1) || loads[0]![0] === loads[1]![0])
        continue
      const resistors = [...index.components.values()].filter((c) => {
        if (c.ftype !== "simple_resistor") return false
        const nets = index.twoTerminalNets(c.source_component_id)
        // A resistor across the crystal is feedback, not the reference's series resistor.
        return (
          nets &&
          nets.filter((n) => signalNets.includes(n)).length === 1 &&
          !nets.some((n) => index.isRail(n))
        )
      })
      if (resistors.length !== 1) continue
      const resistor = resistors[0]!
      const resistorNets = index.twoTerminalNets(resistor.source_component_id)!
      const bottomIndex = signalNets.findIndex((n) => resistorNets.includes(n))
      const topIndex = 1 - bottomIndex
      const crystal = index.placement(id)
      const ids = [
        id,
        loads[topIndex]![0]!.source_component_id,
        loads[bottomIndex]![0]!.source_component_id,
        resistor.source_component_id,
      ]
      const placements = ids.map((id) => index.placement(id))
      if (
        !crystal ||
        placements.some(
          (p) => !p || p.schematicSheetId !== crystal.schematicSheetId,
        )
      )
        continue
      if (
        ids.some((id) =>
          (index.portsByComponent.get(id) ?? []).some((p) => !index.port(p)),
        )
      )
        continue
      const x = crystal.schX,
        y = crystal.schY
      // Dimensions are a local reference template, not PCB placement constraints.
      const halfHeight = Math.max(
        0.6,
        Math.max(crystal.width, crystal.height) / 2,
      )
      const span = halfHeight + 1
      const left =
        x - Math.max(2, placements[1]!.width + 1, placements[2]!.width + 1)
      const right = x + Math.max(2, placements[3]!.width + 1)
      const portTarget = (p: SourcePort, px: number, py: number) => ({
        sourcePortId: p.source_port_id,
        pinNumber: p.pin_number,
        newSchX: round(px),
        newSchY: round(py),
      })
      const top = signals[topIndex]!,
        bottom = signals[bottomIndex]!
      const a = index.port(top)!,
        b = index.port(bottom)!
      const crystalRotation = angleDelta(
        90 -
          (Math.atan2(a.center.y - b.center.y, a.center.x - b.center.x) * 180) /
            Math.PI,
      )
      const radians = (crystalRotation * Math.PI) / 180
      const rotatedPin = (p: (typeof ports)[number]) => {
        const current = index.port(p)!.center
        const dx = current.x - x,
          dy = current.y - y
        return portTarget(
          p,
          x + dx * Math.cos(radians) - dy * Math.sin(radians),
          y + dx * Math.sin(radians) + dy * Math.cos(radians),
        )
      }
      const targets: CrystalPatternPlacement[] = [
        {
          schematicBox: crystal,
          newSchX: x,
          newSchY: y,
          deltaSchRotation: crystalRotation,
          // Preserve the existing four-sided symbol by rigidly rotating all pins.
          pins: [
            top,
            bottom,
            ...ground.toSorted(
              (a, b) => (a.pin_number ?? 0) - (b.pin_number ?? 0),
            ),
          ].map(rotatedPin),
        },
      ]
      const addPassive = (
        componentId: string,
        cx: number,
        cy: number,
        rightNet: string,
      ) => {
        const pp = index.portsByComponent.get(componentId)!
        const rightPort = pp.find(
          (p) => index.connected(p.source_port_id) === rightNet,
        )!
        const leftPort = pp.find((p) => p !== rightPort)!
        const rp = index.port(rightPort)!,
          lp = index.port(leftPort)!
        const halfWidth =
          Math.hypot(rp.center.x - lp.center.x, rp.center.y - lp.center.y) / 2
        targets.push({
          schematicBox: index.placement(componentId)!,
          newSchX: round(cx),
          newSchY: round(cy),
          deltaSchRotation: angleDelta(
            (-Math.atan2(rp.center.y - lp.center.y, rp.center.x - lp.center.x) *
              180) /
              Math.PI,
          ),
          pins: [
            portTarget(leftPort, cx - halfWidth, cy),
            portTarget(rightPort, cx + halfWidth, cy),
          ],
        })
      }
      addPassive(ids[1]!, left, y + span, signalNets[topIndex]!)
      addPassive(ids[2]!, left, y - span, signalNets[bottomIndex]!)
      addPassive(
        ids[3]!,
        right,
        y - span,
        resistorNets.find((n) => !signalNets.includes(n))!,
      )
      // Accept the suggested pattern on re-analysis, with normal coordinate tolerance.
      const matches = targets.every(
        (t) =>
          Math.abs(t.newSchX - t.schematicBox.schX) <= 0.1 &&
          Math.abs(t.newSchY - t.schematicBox.schY) <= 0.1 &&
          Math.abs(t.deltaSchRotation) <= 1 &&
          t.pins.every((p) => {
            const actual = index.port(
              index.portsByComponent
                .get(t.schematicBox.sourceComponentId!)!
                .find((s) => s.source_port_id === p.sourcePortId)!,
            )!
            return (
              Math.abs(actual.center.x - p.newSchX) <= 0.1 &&
              Math.abs(actual.center.y - p.newSchY) <= 0.1
            )
          }),
      )
      if (matches) continue
      const moves = targets.map(
        (t) =>
          `${t.schematicBox.sourceComponentName ?? t.schematicBox.sourceComponentId}: schX=${t.newSchX}, schY=${t.newSchY}, rotate by ${t.deltaSchRotation} degrees`,
      )
      const pinInstructions = targets[0]!.pins
        .map(
          (p) =>
            `pin ${p.pinNumber ?? p.sourcePortId} at (${p.newSchX}, ${p.newSchY})`,
        )
        .join("; ")
      issues.push({
        lineItemType: "FourPinCrystalPatternMismatch",
        crystalSchematicBox: crystal,
        suggestedPlacements: targets,
        message: `Arrange the four-pin crystal vertically, both load capacitors horizontally to its left (one above and one below), and the series resistor horizontally to its lower right. ${moves.join("; ")}. Crystal ${pinInstructions}. Keep the grounded case pins on opposite sides of the crystal, each connected to GND. Connect the capacitor ground ends to a left-hand ground bus, capacitor signal ends to the corresponding top/bottom crystal signals, and the resistor from the bottom signal toward the external oscillator connection. Rotations are relative to the current symbols; positive is counterclockwise.`,
      })
    }
    this.solved = true
  }

  static issueToString(issue: FourPinCrystalPatternMismatch): string {
    const attrs: string[] = []
    addAttr(attrs, "crystalName", issue.crystalSchematicBox.sourceComponentName)
    addAttr(attrs, "message", issue.message)
    return `<FourPinCrystalPatternMismatch ${attrs.join(" ")} />`
  }
}
const round = (n: number) => Math.round(n * 100) / 100
const angleDelta = (n: number) => round(((((n + 180) % 360) + 360) % 360) - 180)
