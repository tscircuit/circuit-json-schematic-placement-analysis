import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicTrace, SchematicPort, SourcePort } from "circuit-json"
import type {
  NetLabeledPassiveIsolated,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type ComponentPort = SourcePort & { source_component_id: string }
type Point = { x: number; y: number }
const PASSIVES = new Set([
  "simple_resistor",
  "simple_capacitor",
  "simple_inductor",
])

/** One finding per passive, only when BOTH labeled terminals are remote. */
export class NetLabeledPassiveIsolationSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly passiveIds: string[]
  private readonly excludedNets = new Set<string>()
  private readonly multipleSheets: boolean
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.passiveIds = [...this.index.components.values()]
      .filter((c) => PASSIVES.has(c.ftype))
      .map((c) => c.source_component_id)
    const sheets = new Set<string>()
    for (const e of params.ctx.circuitJson) {
      if (e.type === "source_port" && (e.do_not_connect || hasSupplyRole(e)))
        this.excludedNets.add(this.index.connected(e.source_port_id))
      if ("schematic_sheet_id" in e && e.schematic_sheet_id !== undefined)
        sheets.add(e.schematic_sheet_id)
    }
    this.multipleSheets = sheets.size > 1
    this.solved = this.passiveIds.length === 0
  }

  override _step(): void {
    const id = this.passiveIds[this.currentIndex++]!
    this.solved = this.currentIndex >= this.passiveIds.length
    const nets = this.index.twoTerminalNets(id)
    const passive = this.index.placement(id)
    if (!nets || !passive || !validBox(passive)) return
    const ports = this.index.portsByComponent.get(id)!
    const limit = Math.max(3, 3 * Math.max(passive.width, passive.height))
    const connections = ports.map((port) =>
      this.connection(port, passive, limit),
    )
    const [first, second] = connections
    if (!first || !second) return
    this.params.issues.push({
      lineItemType: "NetLabeledPassiveIsolated",
      passiveComponent: passive,
      connectedComponents: [first.box, second.box],
      passiveSourcePortIds: [
        ports[0]!.source_port_id,
        ports[1]!.source_port_id,
      ],
      connectedSourcePortIds: [
        first.peer.source_port_id,
        second.peer.source_port_id,
      ],
      pinDistances: [first.distance, second.distance],
      maxRecommendedPinDistance: limit,
      message: `${passive.sourceComponentName ?? id} uses net labels on both terminals and is far from both connected pins. Place it near at least one connected pin so its role can be read locally. Preserve connectivity.`,
    })
  }

  private connection(
    port: ComponentPort,
    passive: SchematicBoxPlacement,
    limit: number,
  ) {
    const net = this.index.connected(port.source_port_id)
    if (this.index.isRail(net) || this.excludedNets.has(net)) return
    const members = this.index.portsByNet.get(net)
    if (members?.length !== 2) return
    const peer = members.find(
      (p) => p.source_component_id !== port.source_component_id,
    )
    if (!peer) return
    const box = this.index.placement(peer.source_component_id)
    if (!box || !validBox(box) || !this.index.sameLocalScope(passive, box))
      return
    const pin = this.uniquePin(port, passive)
    const peerPin = this.uniquePin(peer, box)
    if (!pin || !peerPin) return
    const distance = Math.hypot(
      pin.center.x - peerPin.center.x,
      pin.center.y - peerPin.center.y,
    )
    if (distance <= limit || !this.hasLabelStub(port, pin, peerPin, net)) return
    return { box, peer, distance }
  }

  private uniquePin(
    port: ComponentPort,
    box: SchematicBoxPlacement,
  ): SchematicPort | undefined {
    const json = this.params.ctx.circuitJson
    const pins = json.filter(
      (e) =>
        e.type === "schematic_port" && e.source_port_id === port.source_port_id,
    )
    const components = json.filter(
      (e) =>
        e.type === "schematic_component" &&
        e.schematic_component_id === box.schematicComponentId,
    )
    const pin = pins[0]
    const component = components[0]
    if (
      pins.length !== 1 ||
      components.length !== 1 ||
      pin?.type !== "schematic_port" ||
      component?.type !== "schematic_component" ||
      component.source_component_id !== box.sourceComponentId ||
      pin.schematic_component_id !== box.schematicComponentId ||
      component.schematic_sheet_id !== box.schematicSheetId ||
      pin.schematic_sheet_id !== box.schematicSheetId ||
      (this.multipleSheets && box.schematicSheetId === undefined) ||
      !finite(pin.center)
    )
      return
    return pin
  }

  private hasLabelStub(
    port: ComponentPort,
    pin: SchematicPort,
    peer: SchematicPort,
    net: string,
  ): boolean {
    const json = this.params.ctx.circuitJson
    const traces = json.filter(
      (e): e is SchematicTrace =>
        e.type === "schematic_trace" &&
        e.schematic_sheet_id === pin.schematic_sheet_id &&
        e.edges.some((edge) => onSegment(pin.center, edge.from, edge.to)),
    )
    // Only isolated unbranched stubs count. Long visible wires are outside this check.
    if (traces.length > 1) return false
    const trace = traces[0]
    if (
      trace &&
      (trace.junctions?.length ||
        !trace.edges.length ||
        ![trace.edges[0]!.from, trace.edges.at(-1)!.to].some((p) =>
          equal(p, pin.center),
        ) ||
        trace.edges.some(
          (edge, i) =>
            !finite(edge.from) ||
            !finite(edge.to) ||
            onSegment(peer.center, edge.from, edge.to) ||
            (i > 0 && !equal(trace.edges[i - 1]!.to, edge.from)),
        ))
    )
      return false
    if (
      trace &&
      json.some(
        (e) =>
          e.type === "schematic_port" &&
          e.schematic_sheet_id === pin.schematic_sheet_id &&
          e.schematic_port_id !== pin.schematic_port_id &&
          trace.edges.some((edge) => onSegment(e.center, edge.from, edge.to)),
      )
    )
      return false
    const source =
      trace &&
      json.find(
        (e) =>
          e.type === "source_trace" &&
          e.source_trace_id === trace.source_trace_id,
      )
    const ownedStub =
      source?.type === "source_trace" &&
      source.connected_source_port_ids.length === 1 &&
      source.connected_source_port_ids[0] === port.source_port_id &&
      source.connected_source_net_ids.length > 0 &&
      source.connected_source_net_ids.every(
        (id) => this.index.connected(id) === net,
      )
    return json.some((e) => {
      if (
        e.type === "schematic_net_label" &&
        e.schematic_sheet_id === pin.schematic_sheet_id &&
        !e.symbol_name &&
        e.source_net_id &&
        this.index.connected(e.source_net_id) === net
      ) {
        const anchor = e.anchor_position ?? e.center
        return (
          finite(anchor) &&
          (equal(anchor, pin.center) ||
            Boolean(
              ownedStub &&
                trace?.edges.some((edge) =>
                  onSegment(anchor, edge.from, edge.to),
                ),
            ))
        )
      }
      // Museview exports port-to-net labels as trace-owned text. Never match text strings.
      return Boolean(
        ownedStub &&
          e.type === "schematic_text" &&
          e.schematic_sheet_id === pin.schematic_sheet_id &&
          !e.schematic_component_id &&
          "source_trace_id" in e &&
          e.source_trace_id === trace?.source_trace_id,
      )
    })
  }

  static issueToString(issue: NetLabeledPassiveIsolated): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "passiveComponentName",
      issue.passiveComponent.sourceComponentName,
    )
    addAttr(
      attrs,
      "connectedComponentNames",
      issue.connectedComponents.map((c) => c.sourceComponentName).join(", "),
    )
    addAttr(attrs, "pinDistances", issue.pinDistances.join(", "))
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<NetLabeledPassiveIsolated ${attrs.join(" ")} />`
  }
}

function validBox(box: SchematicBoxPlacement): boolean {
  return (
    [box.schX, box.schY, box.width, box.height].every(Number.isFinite) &&
    box.width > 0 &&
    box.height > 0
  )
}
function hasSupplyRole(port: SourcePort): boolean {
  return Boolean(
    port.requires_power ||
      port.provides_power ||
      port.requires_ground ||
      port.provides_ground ||
      port.requires_voltage !== undefined ||
      port.provides_voltage !== undefined,
  )
}
function finite(p: Point): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y)
}
function equal(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= 1e-6
}
function onSegment(p: Point, a: Point, b: Point): boolean {
  return (
    [p, a, b].every(finite) &&
    Math.abs(
      Math.hypot(p.x - a.x, p.y - a.y) +
        Math.hypot(p.x - b.x, p.y - b.y) -
        Math.hypot(a.x - b.x, a.y - b.y),
    ) <= 1e-6
  )
}
