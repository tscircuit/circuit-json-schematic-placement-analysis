import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  SchematicPlacementIssue,
  SeriesChainNotAligned,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

const directions = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, 1],
  down: [0, -1],
} as const

/** A three-element resistor/inductor series chain should read along a consistent axis. */
export class SeriesChainAlignmentSolver extends BaseSolver {
  private index!: PlacementNetworkIndex
  private readonly componentIds: string[] = []
  private readonly unpopulated = new Set<string>()
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    let inductorCount = 0
    let resistorCount = 0
    for (const element of params.ctx.circuitJson) {
      if (element.type !== "source_component") continue
      if (element.ftype === "simple_inductor") inductorCount++
      else if (element.ftype === "simple_resistor") resistorCount++
    }
    if (
      inductorCount === 0 ||
      resistorCount === 0 ||
      inductorCount + resistorCount < 3
    ) {
      this.solved = true
      return
    }
    this.index = new PlacementNetworkIndex(params.ctx)
    for (const element of params.ctx.circuitJson) {
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
      if (element.type === "source_port") {
        const net = this.index.connected(element.source_port_id)
        if (element.requires_ground || element.provides_ground)
          this.index.groundNets.add(net)
        if (
          element.requires_power ||
          element.provides_power ||
          element.requires_voltage !== undefined ||
          element.provides_voltage !== undefined
        )
          this.index.powerNets.add(net)
      }
    }
    for (const [id, comp] of this.index.components) {
      if (comp.ftype === "simple_inductor" || comp.ftype === "simple_resistor")
        this.componentIds.push(id)
    }
    this.solved = this.componentIds.length === 0
  }

  override _step(): void {
    const middleId = this.componentIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.componentIds.length
    if (!middleId) return
    const middle = this.seriesPassive(middleId)
    if (!middle) return
    const index = this.index
    const [netA, netB] = middle.nets
    if (index.isRail(netA) || index.isRail(netB)) return
    const portsA = index.portsByNet.get(netA) ?? []
    const portsB = index.portsByNet.get(netB) ?? []
    if (portsA.length !== 2 || portsB.length !== 2) return
    const otherA = portsA.find((p) => p.source_component_id !== middleId)
    const middleA = portsA.find((p) => p.source_component_id === middleId)
    const otherB = portsB.find((p) => p.source_component_id !== middleId)
    const middleB = portsB.find((p) => p.source_component_id === middleId)
    if (!otherA || !middleA || !otherB || !middleB) return
    if (otherA.source_component_id === otherB.source_component_id) return

    const candA = this.seriesPassive(otherA.source_component_id)
    const candB = this.seriesPassive(otherB.source_component_id)
    if (!candA || !candB) return

    const ftypes = [candA.ftype, middle.ftype, candB.ftype]
    if (
      !ftypes.includes("simple_inductor") ||
      !ftypes.includes("simple_resistor")
    )
      return
    if (candA.nets.some((n) => candB.nets.includes(n))) return

    const boxes = [candA.box, middle.box, candB.box]
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!,
          b = boxes[j]!
        if (
          Math.abs(a.schX - b.schX) < (a.width + b.width) / 2 &&
          Math.abs(a.schY - b.schY) < (a.height + b.height) / 2
        )
          return
      }
    }

    const spanX = Math.abs(candB.box.schX - candA.box.schX)
    const spanY = Math.abs(candB.box.schY - candA.box.schY)
    const horizontal = spanX >= spanY
    const forward = horizontal
      ? candA.box.schX <= candB.box.schX
      : candA.box.schY <= candB.box.schY

    const first = forward ? candA : candB
    const last = forward ? candB : candA
    const firstPort = forward ? otherA : otherB
    const middleFirstPort = forward ? middleA : middleB
    const middleLastPort = forward ? middleB : otherA && middleA
    const lastPort = forward ? otherB : otherA

    if (horizontal) {
      if (
        !(first.box.schX < middle.box.schX && middle.box.schX < last.box.schX)
      )
        return
    } else if (
      !(first.box.schY < middle.box.schY && middle.box.schY < last.box.schY)
    ) {
      return
    }

    const pFirst = index.port(firstPort)!
    const pMiddleFirst = index.port(middleFirstPort)!
    const pMiddleLast = index.port(middleLastPort)!
    const pLast = index.port(lastPort)!
    const d1 = Math.hypot(
      pMiddleFirst.center.x - pFirst.center.x,
      pMiddleFirst.center.y - pFirst.center.y,
    )
    const d2 = Math.hypot(
      pLast.center.x - pMiddleLast.center.x,
      pLast.center.y - pMiddleLast.center.y,
    )
    const maxDim = Math.max(...boxes.flatMap((b) => [b.width, b.height]))
    const compactDistance = Math.max(2, 2 * maxDim)
    if (d1 <= compactDistance && d2 <= compactDistance) return

    const crossCoords = boxes.map((b) => (horizontal ? b.schY : b.schX))
    const crossSpread = Math.max(...crossCoords) - Math.min(...crossCoords)
    const middleDir = directions[pMiddleFirst.facing_direction!]
    const middlePerpendicular = horizontal
      ? middleDir[0] === 0
      : middleDir[1] === 0
    if (crossSpread <= 1.5 && !middlePerpendicular) return
    if (
      !index.sameLocalScope(candA.box, middle.box) ||
      !index.sameLocalScope(middle.box, candB.box)
    )
      return

    this.params.issues.push({
      lineItemType: "SeriesChainNotAligned",
      chainSchematicBoxes: [first.box, middle.box, last.box],
      junctionSourcePortPairs: [
        [firstPort.source_port_id, middleFirstPort.source_port_id],
        [middleLastPort.source_port_id, lastPort.source_port_id],
      ],
      message: `Align ${first.box.sourceComponentName || "the first component"}, ${middle.box.sourceComponentName || "the middle component"} and ${last.box.sourceComponentName || "the third component"} along a single series axis so their two-terminal chain reads end-to-end. Preserve all pin connections, leave room for labels, and reroute the connecting traces.`,
    })
  }

  private seriesPassive(id: string) {
    const index = this.index
    const component = index.components.get(id)
    if (!component || this.unpopulated.has(id)) return
    const isValidResistor =
      component.ftype === "simple_resistor" &&
      Number.isFinite(component.resistance) &&
      component.resistance > 0
    const isValidInductor =
      component.ftype === "simple_inductor" &&
      (typeof (component.inductance as unknown) === "string"
        ? (component.inductance as unknown as string).trim().length > 0
        : Number.isFinite(component.inductance) && component.inductance > 0)
    if (!isValidResistor && !isValidInductor) return
    const box = index.placement(id)
    const nets = index.twoTerminalNets(id)
    const ports = index.portsByComponent.get(id)
    if (
      !box ||
      !nets ||
      !ports ||
      ports.length !== 2 ||
      ![box.schX, box.schY, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0 ||
      ports.some((p) => !this.validPort(p, box.schematicSheetId))
    )
      return
    return {
      box,
      nets,
      ftype: component.ftype as "simple_resistor" | "simple_inductor",
    }
  }

  private validPort(
    p: SourcePort & { source_component_id: string },
    sheetId?: string,
  ) {
    const pin = this.index.port(p)
    return Boolean(
      !p.do_not_connect &&
        pin &&
        pin.schematic_sheet_id === sheetId &&
        [pin.center.x, pin.center.y].every(Number.isFinite) &&
        pin.facing_direction &&
        pin.facing_direction in directions,
    )
  }

  static issueToString(issue: SeriesChainNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "firstComponentName",
      issue.chainSchematicBoxes[0].sourceComponentName,
    )
    addAttr(
      attrs,
      "middleComponentName",
      issue.chainSchematicBoxes[1].sourceComponentName,
    )
    addAttr(
      attrs,
      "lastComponentName",
      issue.chainSchematicBoxes[2].sourceComponentName,
    )
    addAttr(attrs, "message", issue.message)
    return `<SeriesChainNotAligned ${attrs.join(" ")} />`
  }
}
