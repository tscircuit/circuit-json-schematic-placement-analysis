import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort, SourcePort } from "circuit-json"
import type {
  ParallelLedBranchesDrawnInline,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type Axis = "x" | "y"
type Port = SourcePort & { source_component_id: string }
interface Branch {
  resistorId: string
  ledId: string
  ports: Port[]
  nets: [string, string]
  valid: boolean
  resistor?: SchematicBoxPlacement
  led?: SchematicBoxPlacement
  geometry?: {
    axis: Axis
    low: number
    high: number
    cross: number
    thickness: number
  }
}

/** Parallel resistor/LED paths drawn end-to-end hide their shared end nodes. */
export class ParallelLedBranchPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly banks: Branch[][]
  private bankIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const index = (this.index = new PlacementNetworkIndex(params.ctx))
    const excluded = new Set(
      params.ctx.circuitJson.flatMap((e) =>
        e.type === "pcb_component" && e.do_not_place
          ? [e.source_component_id]
          : [],
      ),
    )
    // Explicit port flags also identify rails when no source_net has rail metadata.
    for (const ports of index.portsByComponent.values())
      for (const port of ports) {
        const net = index.connected(port.source_port_id)
        if (port.requires_power || port.provides_power) index.powerNets.add(net)
        if (port.requires_ground || port.provides_ground)
          index.groundNets.add(net)
      }
    const banks = new Map<string, Branch[]>()
    for (const component of index.components.values()) {
      if (component.ftype !== "simple_resistor") continue
      const resistorId = component.source_component_id
      const resistorPorts = index.portsByComponent.get(resistorId)
      if (resistorPorts?.length !== 2) continue
      for (const joint of resistorPorts) {
        const junctionNet = index.connected(joint.source_port_id)
        const junction = index.portsByNet.get(junctionNet)
        if (index.isRail(junctionNet) || junction?.length !== 2) continue
        const ledPort = junction.find(
          (p) => p.source_component_id !== resistorId,
        )
        const ledComponent =
          ledPort && index.components.get(ledPort.source_component_id)
        if (!ledPort || ledComponent?.ftype !== "simple_led") continue
        const ledId = ledComponent.source_component_id
        const ledPorts = index.portsByComponent.get(ledId)
        if (ledPorts?.length !== 2) continue
        const resistorOuter = resistorPorts.find((p) => p !== joint)!
        const ledOuter = ledPorts.find((p) => p !== ledPort)!
        const nets: [string, string] = [
          index.connected(resistorOuter.source_port_id),
          index.connected(ledOuter.source_port_id),
        ]
        if (nets[0] === nets[1] || nets.includes(junctionNet)) continue
        const branch: Branch = {
          resistorId,
          ledId,
          nets,
          ports: [...resistorPorts, ...ledPorts],
          resistor: index.placement(resistorId),
          led: index.placement(ledId),
          valid:
            Number.isFinite(component.resistance) &&
            component.resistance > 0 &&
            !excluded.has(resistorId) &&
            !excluded.has(ledId),
        }
        // Retain unsupported members so a partial bank never masquerades as a complete one.
        const key = JSON.stringify([...nets].sort())
        const bank = banks.get(key) ?? []
        bank.push(branch)
        banks.set(key, bank)
        branch.geometry = branchGeometry(index, branch)
      }
    }
    this.banks = [...banks.values()]
    this.solved = this.banks.length === 0
  }

  override _step(): void {
    const bank = this.banks[this.bankIndex++]!
    this.solved = this.bankIndex >= this.banks.length
    if (
      bank.length < 3 ||
      bank.some((b) => !b.valid || !b.geometry || !b.resistor || !b.led)
    )
      return
    const first = bank[0]!
    if (
      bank.some((b) => !this.index.sameLocalScope(first.resistor!, b.resistor!))
    )
      return
    const ids = new Set(bank.flatMap((b) => [b.resistorId, b.ledId]))
    // A private non-rail return may include one local terminal. Supply rails alone
    // must not combine unrelated indicator branches across a sheet.
    const localReturn = first.nets.some((net) => {
      if (this.index.isRail(net)) return false
      const others = (this.index.portsByNet.get(net) ?? []).filter(
        (p) => !ids.has(p.source_component_id),
      )
      return (
        others.length <= 1 &&
        others.every((port) => {
          const placement = this.index.placement(port.source_component_id)
          return (
            placement && this.index.sameLocalScope(first.resistor!, placement)
          )
        })
      )
    })
    if (!localReturn) return
    const inline = bank.some((a, i) =>
      bank.slice(i + 1).some((b) => {
        const p = a.geometry!,
          q = b.geometry!
        if (
          p.axis !== q.axis ||
          Math.abs(p.cross - q.cross) >= (p.thickness + q.thickness) / 2
        )
          return false
        // Overlapping spans and ordinary offsets are accepted; detect separated
        // end-to-end paths in the same row/column, not exact-coordinate differences.
        return Math.min(p.high, q.high) - Math.max(p.low, q.low) < -0.1
      }),
    )
    if (!inline) return
    this.params.issues.push({
      lineItemType: "ParallelLedBranchesDrawnInline",
      branchSchematicBoxes: bank.flatMap((b) => [b.resistor!, b.led!]),
      branchCount: bank.length,
      message: `Draw these ${bank.length} parallel resistor/LED branches beside each other, with their shared end nodes at corresponding ends, rather than end-to-end in the same row or column. Preserve every pin connection and LED polarity, leave room for labels, and reroute the affected wires.`,
    })
  }

  static issueToString(issue: ParallelLedBranchesDrawnInline): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "componentNames",
      issue.branchSchematicBoxes
        .map((b) => b.sourceComponentName)
        .filter(Boolean)
        .join(", "),
    )
    addAttr(attrs, "branchCount", issue.branchCount)
    addAttr(attrs, "message", issue.message)
    return `<ParallelLedBranchesDrawnInline ${attrs.join(" ")} />`
  }
}

function branchGeometry(
  index: PlacementNetworkIndex,
  branch: Branch,
): Branch["geometry"] {
  const { resistor, led, ports } = branch
  if (
    !resistor ||
    !led ||
    !index.sameLocalScope(resistor, led) ||
    ports.some((p) => p.do_not_connect)
  )
    return
  if (
    [resistor, led].some(
      (b) =>
        ![b.schX, b.schY, b.width, b.height].every(Number.isFinite) ||
        b.width <= 0 ||
        b.height <= 0,
    )
  )
    return
  const pins = ports.map((p) => index.port(p))
  if (
    pins.some(
      (p) =>
        !p ||
        p.schematic_sheet_id !== resistor.schematicSheetId ||
        !Number.isFinite(p.center.x) ||
        !Number.isFinite(p.center.y),
    )
  )
    return
  const [a, b, c, d] = pins as [
    SchematicPort,
    SchematicPort,
    SchematicPort,
    SchematicPort,
  ]
  const axis = pinAxis(a, b)
  if (!axis || pinAxis(c, d) !== axis) return
  const crossAxis = axis === "x" ? "y" : "x"
  const cross = pins.map((p) => p!.center[crossAxis])
  if (Math.max(...cross) - Math.min(...cross) > 0.01) return
  const rSpan = [a.center[axis], b.center[axis]],
    lSpan = [c.center[axis], d.center[axis]]
  if (
    Math.min(Math.max(...rSpan), Math.max(...lSpan)) -
      Math.max(Math.min(...rSpan), Math.min(...lSpan)) >
    0.01
  )
    return
  const values = pins.map((p) => p!.center[axis])
  return {
    axis,
    low: Math.min(...values),
    high: Math.max(...values),
    cross: cross[0]!,
    thickness: Math.max(
      axis === "x" ? resistor.height : resistor.width,
      axis === "x" ? led.height : led.width,
    ),
  }
}

function pinAxis(a: SchematicPort, b: SchematicPort): Axis | undefined {
  const directions = new Set([a.facing_direction, b.facing_direction])
  if (
    directions.has("left") &&
    directions.has("right") &&
    Math.abs(a.center.y - b.center.y) < 0.01 &&
    Math.abs(a.center.x - b.center.x) > 0.01
  )
    return "x"
  if (
    directions.has("up") &&
    directions.has("down") &&
    Math.abs(a.center.x - b.center.x) < 0.01 &&
    Math.abs(a.center.y - b.center.y) > 0.01
  )
    return "y"
}
