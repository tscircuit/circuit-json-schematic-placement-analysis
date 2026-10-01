import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  CellSenseFilterLadderNotGrouped,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Scattered RC ladders on explicitly named VC0...VCn cell-monitor inputs. */
export class CellSenseFilterLadderPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly hostIds: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.hostIds = [...this.index.components.values()]
      .filter((component) => component.ftype === "simple_chip")
      .map((component) => component.source_component_id)
    this.solved = this.hostIds.length === 0
  }

  override _step(): void {
    const hostId = this.hostIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.hostIds.length
    if (!hostId) return
    const index = this.index
    const host = index.placement(hostId)
    const inputs = this.cellInputs(hostId)
    if (!host || !inputs) return
    const { nets, groundNet, ports } = inputs
    if (ports.some((port) => !this.hasLocalPort(port, host))) return
    const inputNets = new Set(nets)
    const resistorIds: string[] = []
    const capacitorIds = new Set<string>()
    const rawNets = new Set<string>()
    const componentsAtNode: string[][] = []

    for (const [i, net] of nets.entries()) {
      // VC0 may be directly grounded or filtered through its own resistor.
      if (i === 0 && net === groundNet) {
        componentsAtNode.push([])
        continue
      }
      const peers = index.portsByNet.get(net) ?? []
      const resistors = new Set<string>()
      const capacitors = new Set<string>()
      for (const port of peers) {
        if (port.source_component_id === hostId) continue
        const component = index.components.get(port.source_component_id)
        if (component?.ftype === "simple_resistor")
          resistors.add(port.source_component_id)
        else if (component?.ftype === "simple_capacitor")
          capacitors.add(port.source_component_id)
        // Shared inputs, external balancing branches, and unknown devices are
        // outside this simple RC topology; never choose an arbitrary subset.
        else return
      }
      if (resistors.size !== 1) return
      const resistorId = [...resistors][0]!
      const resistor = index.components.get(resistorId)!
      const resistorNets = index.twoTerminalNets(resistorId)
      if (
        resistor.ftype !== "simple_resistor" ||
        !Number.isFinite(resistor.resistance) ||
        resistor.resistance <= 0 ||
        !resistorNets
      )
        return
      const rawNet = resistorNets.find((n) => n !== net)!
      if (
        inputNets.has(rawNet) ||
        rawNets.has(rawNet) ||
        (i === 0 ? rawNet !== groundNet : rawNet === groundNet)
      )
        return
      rawNets.add(rawNet)
      resistorIds.push(resistorId)
      for (const id of capacitors) capacitorIds.add(id)
      componentsAtNode.push([resistorId, ...capacitors])
    }

    // Every cell must have one capacitor to the preceding filtered tap.
    // The lowest cell may instead return to VSS (e.g. TI BQ77915 Fig. 9-11).
    const expectedPairs = nets.slice(1).map((net, i) => [net, nets[i]!])
    if (nets[0] !== groundNet) expectedPairs.push([nets[0]!, groundNet])
    const matchedPairs = new Set<number>()
    for (const id of capacitorIds) {
      const component = index.components.get(id)!
      const ends = index.twoTerminalNets(id)
      if (
        component.ftype !== "simple_capacitor" ||
        !Number.isFinite(component.capacitance) ||
        component.capacitance <= 0 ||
        !ends
      )
        return
      const pairIndex = expectedPairs.findIndex(
        ([a, b], i) =>
          ends.includes(a!) &&
          (ends.includes(b!) || (i === 0 && ends.includes(groundNet))),
      )
      if (pairIndex < 0 || matchedPairs.has(pairIndex)) return
      matchedPairs.add(pairIndex)
    }
    if (matchedPairs.size !== expectedPairs.length) return

    const boxes = new Map<string, SchematicBoxPlacement>()
    for (const id of [...resistorIds, ...capacitorIds]) {
      const box = index.placement(id)
      const componentPorts = index.portsByComponent.get(id) ?? []
      if (
        !box ||
        !index.sameLocalScope(host, box) ||
        componentPorts.some((port) => !this.hasLocalPort(port, host)) ||
        ![box.schX, box.schY, box.width, box.height].every(Number.isFinite)
      )
        return
      boxes.set(id, box)
    }
    // Compare electrically adjacent passive bodies, not distance to the IC or
    // total ladder length. Compact separate blocks and long ordered ladders pass.
    // Six schematic units (or four passive-body dimensions) allow label spacing;
    // this is a conservative readability heuristic, not a PCB spacing rule.
    const maxRecommendedBodyGap = Math.max(
      6,
      ...[...boxes.values()].map((box) => 4 * Math.max(box.width, box.height)),
    )
    let maxConnectedBodyGap = 0
    for (const ids of componentsAtNode)
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++)
          maxConnectedBodyGap = Math.max(
            maxConnectedBodyGap,
            bodyGap(boxes.get(ids[i]!)!, boxes.get(ids[j]!)!),
          )
    if (maxConnectedBodyGap <= maxRecommendedBodyGap) return
    const resistorSchematicBoxes = resistorIds.map((id) => boxes.get(id)!)
    const capacitorSchematicBoxes = [...capacitorIds].map(
      (id) => boxes.get(id)!,
    )
    const monitorComponentName = host.sourceComponentName ?? hostId
    this.params.issues.push({
      lineItemType: "CellSenseFilterLadderNotGrouped",
      monitorComponentName,
      monitorSourceComponentId: hostId,
      resistorSchematicBoxes,
      capacitorSchematicBoxes,
      maxConnectedBodyGap,
      maxRecommendedBodyGap,
      message: `Group the cell-input resistors and capacitors for ${monitorComponentName} into a readable filter ladder so neighboring cell taps can be followed together. A separate labeled block is fine; preserve all pin connections, leave room for annotations, and reroute affected traces.`,
    })
  }

  private cellInputs(hostId: string) {
    const index = this.index
    const ports = index.portsByComponent.get(hostId) ?? []
    const cells = new Map<number, SourcePort>()
    for (const port of ports) {
      const roles = new Set(
        hints(port).flatMap((hint) => {
          const match = /^VC(\d+)$/.exec(hint)
          return match ? [Number(match[1])] : []
        }),
      )
      if (roles.size > 1) return
      if (roles.size === 0) continue
      const number = [...roles][0]!
      if (cells.has(number) || port.do_not_connect) return
      cells.set(number, port)
    }
    const ordered = [...cells].sort(([a], [b]) => a - b)
    if (ordered.length < 4 || ordered.some(([n], i) => n !== i)) return
    const grounds = ports.filter((p) => hints(p).includes("VSS"))
    if (grounds.length !== 1 || grounds[0]!.do_not_connect) return
    const groundNet = index.connected(grounds[0]!.source_port_id)
    const nets: string[] = []
    let tiedTopInputs = false
    for (const [, port] of ordered) {
      const net = index.connected(port.source_port_id)
      if (net === nets.at(-1)) {
        tiedTopInputs = true
        continue
      }
      // Unused upper inputs may be tied to the highest active cell. A short
      // between lower inputs is ambiguous and must not create a false ladder.
      if (tiedTopInputs || nets.includes(net)) return
      nets.push(net)
    }
    if (nets.length < 4 || nets.slice(1).includes(groundNet)) return
    return { nets, groundNet, ports: [...cells.values(), grounds[0]!] }
  }

  private hasLocalPort(port: SourcePort, host: SchematicBoxPlacement) {
    if (!port.source_component_id || port.do_not_connect) return false
    const pin = this.index.port({
      ...port,
      source_component_id: port.source_component_id,
    })
    return Boolean(pin && pin.schematic_sheet_id === host.schematicSheetId)
  }

  static issueToString(issue: CellSenseFilterLadderNotGrouped): string {
    const attrs: string[] = []
    addAttr(attrs, "monitorComponentName", issue.monitorComponentName)
    addAttr(
      attrs,
      "filterResistors",
      issue.resistorSchematicBoxes.map(name).join(","),
    )
    addAttr(
      attrs,
      "filterCapacitors",
      issue.capacitorSchematicBoxes.map(name).join(","),
    )
    addAttr(attrs, "maxConnectedBodyGap", issue.maxConnectedBodyGap)
    addAttr(attrs, "maxRecommendedBodyGap", issue.maxRecommendedBodyGap)
    addAttr(attrs, "message", issue.message)
    return `<CellSenseFilterLadderNotGrouped ${attrs.join(" ")} />`
  }
}

function hints(port: SourcePort): string[] {
  return [port.name, ...(port.port_hints ?? [])].map((s) =>
    s.toUpperCase().replace(/[\s_]/g, ""),
  )
}

function name(box: SchematicBoxPlacement): string {
  return box.sourceComponentName ?? box.sourceComponentId ?? ""
}

function bodyGap(a: SchematicBoxPlacement, b: SchematicBoxPlacement): number {
  return Math.hypot(
    Math.max(0, Math.abs(a.schX - b.schX) - (a.width + b.width) / 2),
    Math.max(0, Math.abs(a.schY - b.schY) - (a.height + b.height) / 2),
  )
}
