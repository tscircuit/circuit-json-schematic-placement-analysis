import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  SchematicComponent,
  SchematicPort,
  SourcePort,
} from "circuit-json"
import type {
  LocalPassiveConnectionTooLong,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Advisory for a long, unambiguous local signal connection to a simple passive. */
export class LocalPassiveSpacingSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly nets: string[]
  private readonly excludedNets = new Set<string>()
  private readonly schematicComponents = new Map<string, SchematicComponent[]>()
  private readonly schematicPorts = new Map<string, SchematicPort[]>()
  private readonly hasMultipleSheets: boolean
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.nets = [...this.index.portsByNet.keys()]
    const sheets = new Set<string>()
    for (const element of params.ctx.circuitJson) {
      if (
        element.type === "source_port" &&
        (element.do_not_connect || hasSupplyRole(element))
      )
        this.excludedNets.add(this.index.connected(element.source_port_id))
      if (element.type === "schematic_component") {
        append(
          this.schematicComponents,
          element.schematic_component_id,
          element,
        )
        if (element.schematic_sheet_id) sheets.add(element.schematic_sheet_id)
      }
      if (element.type === "schematic_port" && element.source_port_id)
        append(this.schematicPorts, element.source_port_id, element)
      if (element.type === "schematic_sheet")
        sheets.add(element.schematic_sheet_id)
    }
    this.hasMultipleSheets = sheets.size > 1
    this.solved = this.nets.length === 0
  }

  override _step(): void {
    const net = this.nets[this.currentIndex++]
    this.solved = this.currentIndex >= this.nets.length
    if (!net || this.index.isRail(net) || this.excludedNets.has(net)) return
    const members = this.index.portsByNet.get(net)
    if (members?.length !== 2) return
    const first = members[0]!
    const second = members[1]!
    if (first.source_component_id === second.source_component_id) return
    const firstComponent = this.index.placement(first.source_component_id)
    const secondComponent = this.index.placement(second.source_component_id)
    if (
      !firstComponent ||
      !secondComponent ||
      !validBox(firstComponent) ||
      !validBox(secondComponent)
    )
      return
    if (!this.index.sameLocalScope(firstComponent, secondComponent)) return
    const passives = [firstComponent, secondComponent].filter((box) => {
      const id = box.sourceComponentId!
      const type = this.index.components.get(id)?.ftype
      return (
        (type === "simple_resistor" ||
          type === "simple_capacitor" ||
          type === "simple_inductor") &&
        this.index.twoTerminalNets(id) !== undefined
      )
    })
    if (passives.length === 0) return
    const firstPin = this.uniquePin(first.source_port_id, firstComponent)
    const secondPin = this.uniquePin(second.source_port_id, secondComponent)
    if (!firstPin || !secondPin) return
    const pinDistance = Math.hypot(
      firstPin.center.x - secondPin.center.x,
      firstPin.center.y - secondPin.center.y,
    )
    const maxRecommendedPinDistance = Math.max(
      4,
      ...passives.map((box) => 3 * Math.max(box.width, box.height)),
    )
    if (
      !Number.isFinite(pinDistance) ||
      pinDistance <= maxRecommendedPinDistance
    )
      return
    this.params.issues.push({
      lineItemType: "LocalPassiveConnectionTooLong",
      firstComponent,
      secondComponent,
      sourcePortIds: [first.source_port_id, second.source_port_id],
      pinDistance,
      maxRecommendedPinDistance,
      message: `Place ${firstComponent.sourceComponentName ?? first.source_component_id} and ${secondComponent.sourceComponentName ?? second.source_component_id} closer together so this local passive connection can be read together. Preserve pin connections, leave room for labels, and reroute affected traces.`,
    })
  }

  private uniquePin(
    sourcePortId: string,
    box: SchematicBoxPlacement,
  ): SchematicPort | undefined {
    const components = this.schematicComponents.get(
      box.schematicComponentId ?? "",
    )
    const ports = this.schematicPorts.get(sourcePortId)
    if (components?.length !== 1 || ports?.length !== 1) return
    const component = components[0]!
    const port = ports[0]!
    if (
      component.source_component_id !== box.sourceComponentId ||
      port.schematic_component_id !== box.schematicComponentId ||
      component.schematic_sheet_id !== box.schematicSheetId ||
      port.schematic_sheet_id !== box.schematicSheetId ||
      (this.hasMultipleSheets && box.schematicSheetId === undefined) ||
      !Number.isFinite(port.center.x) ||
      !Number.isFinite(port.center.y)
    )
      return
    return port
  }

  static issueToString(issue: LocalPassiveConnectionTooLong): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "firstComponentName",
      issue.firstComponent.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondComponentName",
      issue.secondComponent.sourceComponentName,
    )
    addAttr(attrs, "pinDistance", issue.pinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<LocalPassiveConnectionTooLong ${attrs.join(" ")} />`
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

function append<T>(map: Map<string, T[]>, key: string, value: T): void {
  const values = map.get(key)
  if (values) values.push(value)
  else map.set(key, [value])
}
