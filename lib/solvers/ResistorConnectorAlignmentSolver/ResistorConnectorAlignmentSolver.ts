import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  ResistorConnectorNotAligned,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"
import { hasVisibleSchematicConnection } from "../../utils/has-visible-schematic-connection"
const vectors = {
  up: [0, 1],
  down: [0, -1],
  left: [-1, 0],
  right: [1, 0],
} as const

/** Align a long, private resistor connection; compact bends remain valid. */
export class ResistorConnectorAlignmentSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly unpopulated = new Set<string>()
  private readonly nets: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    for (const e of params.ctx.circuitJson) {
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
      if (e.type === "source_port") {
        const net = this.index.connected(e.source_port_id)
        if (e.requires_ground || e.provides_ground)
          this.index.groundNets.add(net)
        if (
          e.requires_power ||
          e.provides_power ||
          e.requires_voltage !== undefined ||
          e.provides_voltage !== undefined
        )
          this.index.powerNets.add(net)
      }
    }
    this.nets = [...this.index.portsByNet.keys()]
    this.solved = this.nets.length === 0
  }

  override _step(): void {
    const net = this.nets[this.currentIndex++]
    this.solved = this.currentIndex >= this.nets.length
    if (!net) return
    const index = this.index,
      ports = index.portsByNet.get(net)!
    if (ports.length !== 2) return
    const rp = ports.find(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_resistor",
    )
    const cp = ports.find((p) =>
      ["simple_connector", "simple_pin_header"].includes(
        index.components.get(p.source_component_id)?.ftype ?? "",
      ),
    )
    if (!rp || !cp) return
    const rb = this.validPlacement({ id: rp.source_component_id, pinCount: 2 })
    const peerPorts = index.portsByComponent.get(cp.source_component_id)
    if (!peerPorts?.length) return
    const cb = this.validPlacement({
      id: cp.source_component_id,
      pinCount: peerPorts.length,
      connectedPort: cp,
    })
    const resistorNets = index.twoTerminalNets(rp.source_component_id)
    if (!rb || !cb || !index.sameLocalScope(rb, cb) || !resistorNets) return
    // A visible detour around the body is geometric, regardless of either net's role.
    const behindConnector =
      this.isBehindConnector({ resistor: rb, connector: cb, rp, cp }) &&
      !this.crossesSectionDivider(cb, rb) &&
      hasVisibleSchematicConnection(this.params.ctx.circuitJson, index, cp, rp)
    // Preserve the existing alignment rule, including its label-only connections.
    if (
      !behindConnector &&
      (resistorNets.some((n) => index.isRail(n)) ||
        !this.isSeparated({ a: rb, b: cb, ap: rp, bp: cp }))
    )
      return
    this.params.issues.push({
      lineItemType: "ResistorConnectorNotAligned",
      resistorSchematicBox: rb,
      connectorSchematicBox: cb,
      resistorSourcePortId: rp.source_port_id,
      connectorSourcePortId: cp.source_port_id,
      message: behindConnector
        ? `Move ${rb.sourceComponentName || "the resistor"} beside its connected pin on ${cb.sourceComponentName || "the connector"} so the wire does not detour around the connector body. Preserve connector pin order, resistor value and all connections, leave room for labels and neighboring parts, and reroute affected traces.`
        : `Align ${rb.sourceComponentName || "the resistor"} with its connected terminal on ${cb.sourceComponentName || "the connector"}, facing their pins toward each other along a straight wire. Preserve connector pin order, resistor value and all connections, leave room for labels and neighboring parts, and reroute affected traces.`,
    })
  }
  private isSeparated({
    a,
    b,
    ap,
    bp,
  }: {
    a: NonNullable<ReturnType<PlacementNetworkIndex["placement"]>>
    b: NonNullable<ReturnType<PlacementNetworkIndex["placement"]>>
    ap: SourcePort & { source_component_id: string }
    bp: SourcePort & { source_component_id: string }
  }) {
    // Colliding bodies need collision correction first; short bends are acceptable.
    if (
      Math.abs(a.schX - b.schX) < (a.width + b.width) / 2 &&
      Math.abs(a.schY - b.schY) < (a.height + b.height) / 2
    )
      return false
    const p = this.index.port(ap)!,
      q = this.index.port(bp)!,
      pv = vectors[p.facing_direction!],
      qv = vectors[q.facing_direction!]
    const dx = q.center.x - p.center.x,
      dy = q.center.y - p.center.y
    const compactDistance = Math.max(2, 2 * Math.max(a.width, a.height))
    if (Math.hypot(dx, dy) <= compactDistance) return false
    // Opposed pins on the correct side may fan out to staggered resistors.
    // Connector pitch alone must not force resistor bodies/labels into a row.
    return !(
      pv[0] * qv[0] + pv[1] * qv[1] === -1 && dx * pv[0] + dy * pv[1] > 0
    )
  }
  private isBehindConnector({
    resistor,
    connector,
    rp,
    cp,
  }: {
    resistor: SchematicBoxPlacement
    connector: SchematicBoxPlacement
    rp: SourcePort & { source_component_id: string }
    cp: SourcePort & { source_component_id: string }
  }) {
    const p = this.index.port(cp)!,
      q = this.index.port(rp)!,
      v = vectors[p.facing_direction!]
    if (
      Math.hypot(p.center.x - q.center.x, p.center.y - q.center.y) <=
      Math.max(2, 2 * Math.max(resistor.width, resistor.height))
    )
      return false
    const behind = -(
      v[0] * (resistor.schX - connector.schX) +
      v[1] * (resistor.schY - connector.schY)
    )
    const halfExtent = v[0]
      ? (connector.width + resistor.width) / 2
      : (connector.height + resistor.height) / 2
    // The entire resistor body must be beyond the opposite connector edge.
    return behind > halfExtent + 0.2
  }

  private crossesSectionDivider(
    host: SchematicBoxPlacement,
    leaf: SchematicBoxPlacement,
  ) {
    const dx = leaf.schX - host.schX,
      dy = leaf.schY - host.schY
    return this.params.ctx.circuitJson.some((line) => {
      if (
        line.type !== "schematic_line" ||
        !line.is_dashed ||
        line.schematic_component_id ||
        line.schematic_sheet_id !== host.schematicSheetId ||
        ![line.x1, line.y1, line.x2, line.y2].every(Number.isFinite)
      )
        return false
      const sx = line.x2 - line.x1,
        sy = line.y2 - line.y1,
        cross = dx * sy - dy * sx
      if (Math.abs(cross) < 1e-9) return false
      const ox = line.x1 - host.schX,
        oy = line.y1 - host.schY
      const branch = (ox * sy - oy * sx) / cross,
        divider = (ox * dy - oy * dx) / cross
      return branch > 1e-6 && branch < 1 - 1e-6 && divider >= 0 && divider <= 1
    })
  }

  private validPlacement({
    id,
    pinCount,
    connectedPort,
  }: {
    id: string
    pinCount: number
    connectedPort?: SourcePort
  }) {
    const box = this.index.placement(id),
      ports = this.index.portsByComponent.get(id)
    if (
      this.unpopulated.has(id) ||
      !box ||
      ports?.length !== pinCount ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0 ||
      ports.some(
        (p) =>
          !this.validPort({
            port: p,
            sheetId: box.schematicSheetId,
            allowNoConnect: connectedPort !== undefined && p !== connectedPort,
          }),
      )
    )
      return
    return box
  }

  private validPort({
    port,
    sheetId,
    allowNoConnect = false,
  }: {
    port: SourcePort & { source_component_id: string }
    sheetId?: string
    allowNoConnect?: boolean
  }) {
    const geometry = this.index.port(port)
    return (
      (allowNoConnect || !port.do_not_connect) &&
      geometry &&
      geometry.schematic_sheet_id === sheetId &&
      [geometry.center.x, geometry.center.y].every(Number.isFinite) &&
      geometry.facing_direction &&
      geometry.facing_direction in vectors
    )
  }

  static issueToString(issue: ResistorConnectorNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "connectorName",
      issue.connectorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<ResistorConnectorNotAligned ${attrs.join(" ")} />`
  }
}
