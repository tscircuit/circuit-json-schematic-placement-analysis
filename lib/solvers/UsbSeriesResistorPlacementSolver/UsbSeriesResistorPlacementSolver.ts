import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  UsbSeriesResistorsNotAligned,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type SignalAxis = "horizontal" | "vertical"
type UsbRole = "positive" | "negative"
interface SeriesResistor {
  id: string
  placement: SchematicBoxPlacement
  hostNet: string
  interfaceNet: string
  axis: SignalAxis
}

/** Report a USB series pair drawn end-to-end instead of in parallel paths. */
export class UsbSeriesResistorPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly hostIds: string[]
  private readonly reportedPairs = new Set<string>()
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
    const ports = this.index.portsByComponent.get(hostId) ?? []
    const positivePorts = ports.filter((port) => usbRole(port) === "positive")
    const negativePorts = ports.filter((port) => usbRole(port) === "negative")
    // Don't guess a pairing for multi-interface chips or conflicting aliases.
    if (positivePorts.length !== 1 || negativePorts.length !== 1) return
    const positivePort = positivePorts[0]!
    const negativePort = negativePorts[0]!
    const positive = this.seriesResistor(positivePort)
    const negative = this.seriesResistor(negativePort)
    if (
      !positive ||
      !negative ||
      positive.axis !== negative.axis ||
      !this.index.sameLocalScope(positive.placement, negative.placement) ||
      new Set([
        positive.hostNet,
        negative.hostNet,
        positive.interfaceNet,
        negative.interfaceNet,
      ]).size !== 4 ||
      !this.shareInterface(positive, negative, hostId)
    )
      return

    const pairKey = [positive.id, negative.id].sort().join("\0")
    if (this.reportedPairs.has(pairKey)) return
    const a = positive.placement
    const b = negative.placement
    const horizontal = positive.axis === "horizontal"
    const along = Math.abs(horizontal ? a.schX - b.schX : a.schY - b.schY)
    const across = Math.abs(horizontal ? a.schY - b.schY : a.schX - b.schX)
    const alongA = horizontal ? a.width : a.height
    const alongB = horizontal ? b.width : b.height
    const acrossA = horizontal ? a.height : a.width
    const acrossB = horizontal ? b.height : b.width
    // Restrict this to a clearly end-to-end pair. Minor offsets and separated
    // parallel rows are accepted; overlapping bodies have their own analyzer.
    const bodyGap = along - (alongA + alongB) / 2
    if (
      bodyGap < Math.max(alongA, alongB) ||
      across >= (acrossA + acrossB) / 2 - 0.01
    )
      return

    this.reportedPairs.add(pairKey)
    const positiveName = a.sourceComponentName ?? positive.id
    const negativeName = b.sourceComponentName ?? negative.id
    this.params.issues.push({
      lineItemType: "UsbSeriesResistorsNotAligned",
      positiveResistorSchematicBox: a,
      negativeResistorSchematicBox: b,
      hostSourceComponentId: hostId,
      positiveSourcePortId: positivePort.source_port_id,
      negativeSourcePortId: negativePort.source_port_id,
      signalAxis: positive.axis,
      message: `Arrange ${positiveName} (D+) and ${negativeName} (D−) in adjacent parallel ${horizontal ? "rows with the same schX and different schY" : "columns with the same schY and different schX"}. Keep each USB signal on its original pins, leave room for labels, and reroute affected traces.`,
    })
  }

  private seriesResistor(hostPort: SourcePort): SeriesResistor | undefined {
    const index = this.index
    const hostNet = index.connected(hostPort.source_port_id)
    if (index.isRail(hostNet)) return
    const candidates = new Set(
      (index.portsByNet.get(hostNet) ?? [])
        .filter(
          (port) =>
            index.components.get(port.source_component_id)?.ftype ===
            "simple_resistor",
        )
        .map((port) => port.source_component_id),
    )
    if (candidates.size !== 1) return
    const id = [...candidates][0]!
    const nets = index.twoTerminalNets(id)
    const interfaceNet = nets?.find((net) => net !== hostNet)
    const placement = index.placement(id)
    if (!interfaceNet || index.isRail(interfaceNet) || !placement) return
    // A pull/termination resistor or another series stage makes this ambiguous,
    // including when the pair is discovered from its opposite endpoint.
    if (
      (index.portsByNet.get(interfaceNet) ?? []).some(
        (port) =>
          port.source_component_id !== id &&
          index.components.get(port.source_component_id)?.ftype ===
            "simple_resistor",
      )
    )
      return
    const pins = index.portsByComponent.get(id)!.map((port) => index.port(port))
    const [first, second] = pins
    if (!first || !second) return
    const facing = new Set([first.facing_direction, second.facing_direction])
    let axis: SignalAxis
    if (
      facing.has("left") &&
      facing.has("right") &&
      Math.abs(first.center.y - second.center.y) < 0.01
    )
      axis = "horizontal"
    else if (
      facing.has("up") &&
      facing.has("down") &&
      Math.abs(first.center.x - second.center.x) < 0.01
    )
      axis = "vertical"
    else return
    return { id, placement, hostNet, interfaceNet, axis }
  }

  private shareInterface(
    positive: SeriesResistor,
    negative: SeriesResistor,
    hostId: string,
  ): boolean {
    const peerIds = (net: string) =>
      new Set(
        (this.index.portsByNet.get(net) ?? [])
          .map((port) => port.source_component_id)
          .filter(
            (id) =>
              id !== hostId &&
              id !== positive.id &&
              id !== negative.id &&
              (this.index.portsByComponent.get(id)?.length ?? 0) > 2,
          ),
      )
    const positivePeers = peerIds(positive.interfaceNet)
    return [...peerIds(negative.interfaceNet)].some((id) =>
      positivePeers.has(id),
    )
  }

  static issueToString(issue: UsbSeriesResistorsNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "positiveResistorName",
      issue.positiveResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "negativeResistorName",
      issue.negativeResistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "signalAxis", issue.signalAxis)
    addAttr(attrs, "message", issue.message)
    return `<UsbSeriesResistorsNotAligned ${attrs.join(" ")} />`
  }
}

function usbRole(port: SourcePort): UsbRole | undefined {
  const roles = new Set<UsbRole>()
  for (const hint of [port.name, ...(port.port_hints ?? [])]) {
    const name = hint.toUpperCase()
    if (/^(?:USB_?)?D(?:P|\+|_POS)$/.test(name)) roles.add("positive")
    if (/^(?:USB_?)?D(?:M|N|-|_NEG)$/.test(name)) roles.add("negative")
  }
  return roles.size === 1 ? [...roles][0] : undefined
}
