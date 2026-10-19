import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  SeriesRcBranchNotGrouped,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type ComponentPort = SourcePort & { source_component_id: string }

/** A private R–C series branch with one capacitor across its outer nodes. */
export class SeriesRcBranchGroupingSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly resistorIds: string[]
  private readonly capacitorsByNets = new Map<string, string[]>()
  private readonly unpopulated = new Set<string>()
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const index = (this.index = new PlacementNetworkIndex(params.ctx))
    for (const e of params.ctx.circuitJson) {
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
      if (e.type !== "source_port") continue
      const net = index.connected(e.source_port_id)
      if (
        e.requires_power ||
        e.provides_power ||
        e.requires_voltage !== undefined ||
        e.provides_voltage !== undefined
      )
        index.powerNets.add(net)
      if (e.requires_ground || e.provides_ground) index.groundNets.add(net)
    }
    this.resistorIds = []
    for (const c of index.components.values()) {
      if (c.ftype === "simple_resistor")
        this.resistorIds.push(c.source_component_id)
      if (c.ftype !== "simple_capacitor") continue
      const nets = index.twoTerminalNets(c.source_component_id)
      if (!nets) continue
      const key = netKey(nets),
        bank = this.capacitorsByNets.get(key) ?? []
      // Include unplaced members when deciding whether the parallel branch is unique.
      bank.push(c.source_component_id)
      this.capacitorsByNets.set(key, bank)
    }
    this.solved = this.resistorIds.length === 0
  }

  override _step(): void {
    const id = this.resistorIds[this.currentIndex++]!
    this.solved = this.currentIndex >= this.resistorIds.length
    const resistor = this.part(id)
    if (!resistor) return
    const pairs = resistor.ports.flatMap((port) => {
      const pair = this.branchAt(port)
      return pair ? [pair] : []
    })
    for (const { capacitor, parallel, resistorPort, capacitorPort } of pairs) {
      const r = resistor.box,
        c = capacitor.box
      if (
        !this.index.sameLocalScope(r, c) ||
        !this.index.sameLocalScope(r, parallel.box)
      )
        continue
      if (
        Math.abs(r.schX - c.schX) < (r.width + c.width) / 2 &&
        Math.abs(r.schY - c.schY) < (r.height + c.height) / 2
      )
        continue
      const a = this.index.port(resistorPort)!,
        b = this.index.port(capacitorPort)!
      const sharedPinDistance = Math.hypot(
        a.center.x - b.center.x,
        a.center.y - b.center.y,
      )
      // Readability allowance in schematic units, not a PCB/electrical distance limit.
      const maxRecommendedSharedPinDistance = Math.max(
        4,
        3 * Math.max(r.width, r.height, c.width, c.height),
      )
      if (sharedPinDistance <= maxRecommendedSharedPinDistance) continue
      this.params.issues.push({
        lineItemType: "SeriesRcBranchNotGrouped",
        resistorSchematicBox: r,
        capacitorSchematicBox: c,
        parallelCapacitorSchematicBox: parallel.box,
        resistorSourcePortId: resistorPort.source_port_id,
        capacitorSourcePortId: capacitorPort.source_port_id,
        sharedPinDistance,
        maxRecommendedSharedPinDistance,
        message: `Group ${r.sourceComponentName || "the resistor"} and ${c.sourceComponentName || "the series capacitor"} at their private shared node so this series branch is easy to follow beside the parallel capacitor. Preserve pin connections, leave room for labels, and reroute the wires; exact alignment is not required.`,
      })
    }
  }

  private branchAt(resistorPort: ComponentPort) {
    const index = this.index,
      joint = index.connected(resistorPort.source_port_id)
    const peers = index.portsByNet.get(joint)
    if (index.isRail(joint) || peers?.length !== 2) return
    const capacitorPort = peers.find(
      (p) => p.source_component_id !== resistorPort.source_component_id,
    )
    if (
      !capacitorPort ||
      index.components.get(capacitorPort.source_component_id)?.ftype !==
        "simple_capacitor"
    )
      return
    const capacitor = this.part(capacitorPort.source_component_id)
    if (!capacitor) return
    const rOuter = index
      .twoTerminalNets(resistorPort.source_component_id)
      ?.find((n) => n !== joint)
    const cOuter = index
      .twoTerminalNets(capacitorPort.source_component_id)
      ?.find((n) => n !== joint)
    if (
      !rOuter ||
      !cOuter ||
      rOuter === cOuter ||
      [rOuter, cOuter].every((n) => index.isRail(n))
    )
      return
    const candidates = this.capacitorsByNets.get(netKey([rOuter, cOuter]))
    if (candidates?.length !== 1) return
    const parallel = this.part(candidates[0]!)
    if (!parallel) return
    return { capacitor, parallel, resistorPort, capacitorPort }
  }

  private part(id: string) {
    const index = this.index,
      component = index.components.get(id),
      box = index.placement(id),
      ports = index.portsByComponent.get(id)
    const value =
      component?.ftype === "simple_resistor"
        ? component.resistance
        : component?.ftype === "simple_capacitor"
          ? component.capacitance
          : undefined
    if (
      value === undefined ||
      !Number.isFinite(value) ||
      value <= 0 ||
      !box ||
      ports?.length !== 2 ||
      this.unpopulated.has(id) ||
      !index.twoTerminalNets(id) ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      return
    const pins = ports.map((p) => index.port(p))
    if (
      ports.some((p) => p.do_not_connect) ||
      pins.some(
        (p) =>
          !p ||
          p.schematic_sheet_id !== box.schematicSheetId ||
          !Number.isFinite(p.center.x) ||
          !Number.isFinite(p.center.y),
      )
    )
      return
    if (
      Math.hypot(
        pins[0]!.center.x - pins[1]!.center.x,
        pins[0]!.center.y - pins[1]!.center.y,
      ) < 0.01
    )
      return
    return { box, ports }
  }

  static issueToString(issue: SeriesRcBranchNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "parallelCapacitorName",
      issue.parallelCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "sharedPinDistance", issue.sharedPinDistance)
    addAttr(
      attrs,
      "maxRecommendedSharedPinDistance",
      issue.maxRecommendedSharedPinDistance,
    )
    addAttr(attrs, "message", issue.message)
    return `<SeriesRcBranchNotGrouped ${attrs.join(" ")} />`
  }
}

function netKey(nets: string[]) {
  return JSON.stringify(nets.toSorted())
}
