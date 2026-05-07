import type { CircuitJson, SchematicTrace, SchematicPort } from "circuit-json"
import { BaseSolver } from "@tscircuit/solver-utils"
import type { SolverContext } from "../SolverContext"
import type {
  DiodeResistorNotAligned,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"

export class DiodeResistorAlignmentSolver extends BaseSolver {
  private static readonly DIODE_FTYPES = new Set(["simple_led", "simple_diode"])

  private readonly ctx: SolverContext
  private readonly out: SchematicPlacementIssue[]
  private readonly schematicTraces: SchematicTrace[]
  private currentIndex = 0

  private readonly sourceComponentFtypeById: Map<string, string>
  private readonly sourceComponentIdBySourcePortId: Map<string, string>
  private readonly schematicPorts: SchematicPort[]
  private readonly schematicBoxBySourceComponentId: Map<
    string,
    SchematicBoxPlacement
  >

  constructor({
    ctx,
    issues,
  }: {
    ctx: SolverContext
    issues: SchematicPlacementIssue[]
  }) {
    super()
    this.ctx = ctx
    this.out = issues

    const { circuitJson } = ctx

    this.sourceComponentFtypeById =
      this.buildSourceComponentFtypeById(circuitJson)
    this.sourceComponentIdBySourcePortId =
      this.buildSourceComponentIdBySourcePortId(circuitJson)
    this.schematicPorts = circuitJson.filter(
      (el): el is SchematicPort => el.type === "schematic_port",
    )
    this.schematicBoxBySourceComponentId =
      this.buildSchematicBoxBySourceComponentId()

    this.schematicTraces = circuitJson.filter(
      (el): el is SchematicTrace => el.type === "schematic_trace",
    )
    this.solved = this.schematicTraces.length === 0
  }

  override _step(): void {
    const trace = this.schematicTraces[this.currentIndex]
    if (!trace) {
      this.solved = true
      return
    }
    this.currentIndex++
    this.solved = this.currentIndex >= this.schematicTraces.length

    if (!trace.edges || trace.edges.length === 0) return

    const firstEdge = trace.edges[0]
    const lastEdge = trace.edges[trace.edges.length - 1]
    if (!firstEdge || !lastEdge) return
    const start = firstEdge.from
    const end = lastEdge.to

    const startSourceCompId = this.findSourceComponentIdNearPoint(start)
    const endSourceCompId = this.findSourceComponentIdNearPoint(end)
    if (!startSourceCompId || !endSourceCompId) return

    const startFtype = this.sourceComponentFtypeById.get(startSourceCompId)
    const endFtype = this.sourceComponentFtypeById.get(endSourceCompId)

    const { DIODE_FTYPES } = DiodeResistorAlignmentSolver

    const isDiodeResistorPair =
      (DIODE_FTYPES.has(startFtype!) && endFtype === "simple_resistor") ||
      (startFtype === "simple_resistor" && DIODE_FTYPES.has(endFtype!))
    if (!isDiodeResistorPair) return

    const diodeCompId = DIODE_FTYPES.has(startFtype!)
      ? startSourceCompId
      : endSourceCompId
    const resistorCompId =
      startFtype === "simple_resistor" ? startSourceCompId : endSourceCompId

    const diodeBox = this.schematicBoxBySourceComponentId.get(diodeCompId)
    const resistorBox = this.schematicBoxBySourceComponentId.get(resistorCompId)
    if (!diodeBox || !resistorBox) return

    const diodePort = this.findNearestPort(
      DIODE_FTYPES.has(startFtype!) ? start : end,
    )
    const resistorPort = this.findNearestPort(
      startFtype === "simple_resistor" ? start : end,
    )

    if (!diodePort?.center || !resistorPort?.center) return

    const diodeName = diodeBox.sourceComponentName ?? diodeCompId
    const resistorName = resistorBox.sourceComponentName ?? resistorCompId
    const diodePin =
      diodePort?.display_pin_label ?? diodePort?.pin_number?.toString()
    const resistorPin =
      resistorPort?.display_pin_label ?? resistorPort?.pin_number?.toString()
    const diodeFacing = diodePort?.facing_direction
    const resistorFacing = resistorPort?.facing_direction
    const diodePinDesc = diodePin ? `${diodeName}.${diodePin}` : diodeName
    const resistorPinDesc = resistorPin
      ? `${resistorName}.${resistorPin}`
      : resistorName

    const makeIssue = (message: string): DiodeResistorNotAligned => ({
      lineItemType: "DiodeResistorNotAligned",
      diodeSchematicBox: diodeBox,
      resistorSchematicBox: resistorBox,
      diodePin,
      resistorPin,
      diodePinFacingDirection: diodeFacing,
      resistorPinFacingDirection: resistorFacing,
      message,
    })

    if (
      !DiodeResistorAlignmentSolver.isCoLinear(
        diodePort.center,
        resistorPort.center,
      )
    ) {
      this.out.push(
        makeIssue(
          `trace has corners — align ${diodeName} and ${resistorName} on same axis and rotate so ${diodePinDesc} faces ${resistorPinDesc}`,
        ),
      )
      return
    }

    if (
      diodeFacing &&
      resistorFacing &&
      !DiodeResistorAlignmentSolver.pinsFacingEachOther(
        diodePort.center,
        diodeFacing,
        resistorPort.center,
        resistorFacing,
      )
    ) {
      this.out.push(
        makeIssue(
          `${diodePinDesc} and ${resistorPinDesc} face away from each other — rotate ${diodeName} so ${diodePinDesc} faces ${resistorPinDesc}`,
        ),
      )
    }
  }

  private static isCoLinear(
    a: { x: number; y: number },
    b: { x: number; y: number },
    epsilon = 0.01,
  ): boolean {
    return Math.abs(a.x - b.x) < epsilon || Math.abs(a.y - b.y) < epsilon
  }

  private static pinsFacingEachOther(
    aCenter: { x: number; y: number },
    aFacing: string,
    bCenter: { x: number; y: number },
    bFacing: string,
  ): boolean {
    const dx = bCenter.x - aCenter.x
    const dy = bCenter.y - aCenter.y
    const aToward =
      (aFacing === "right" && dx > 0) ||
      (aFacing === "left" && dx < 0) ||
      (aFacing === "up" && dy > 0) ||
      (aFacing === "down" && dy < 0)
    const bToward =
      (bFacing === "right" && dx < 0) ||
      (bFacing === "left" && dx > 0) ||
      (bFacing === "up" && dy < 0) ||
      (bFacing === "down" && dy > 0)
    return aToward && bToward
  }

  private static dist(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
  }

  private findNearestPort(point: {
    x: number
    y: number
  }): SchematicPort | undefined {
    let nearest: SchematicPort | undefined
    let minDist = Infinity
    for (const port of this.schematicPorts) {
      if (!port.center) continue
      const d = DiodeResistorAlignmentSolver.dist(point, port.center)
      if (d < minDist) {
        minDist = d
        nearest = port
      }
    }
    return nearest
  }

  private findSourceComponentIdNearPoint(point: {
    x: number
    y: number
  }): string | undefined {
    const nearest = this.findNearestPort(point)
    if (!nearest || !nearest.source_port_id) return undefined
    return this.sourceComponentIdBySourcePortId.get(nearest.source_port_id)
  }

  private buildSourceComponentFtypeById(
    circuitJson: CircuitJson,
  ): Map<string, string> {
    const map = new Map<string, string>()
    for (const el of circuitJson) {
      if (
        el.type === "source_component" &&
        "source_component_id" in el &&
        "ftype" in el &&
        typeof el.ftype === "string"
      ) {
        map.set(el.source_component_id as string, el.ftype)
      }
    }
    return map
  }

  private buildSourceComponentIdBySourcePortId(
    circuitJson: CircuitJson,
  ): Map<string, string> {
    const map = new Map<string, string>()
    for (const el of circuitJson) {
      if (
        el.type === "source_port" &&
        "source_port_id" in el &&
        "source_component_id" in el &&
        typeof el.source_port_id === "string" &&
        typeof el.source_component_id === "string"
      ) {
        map.set(el.source_port_id, el.source_component_id)
      }
    }
    return map
  }

  private buildSchematicBoxBySourceComponentId(): Map<
    string,
    SchematicBoxPlacement
  > {
    const map = new Map<string, SchematicBoxPlacement>()
    for (const placement of this.ctx.componentPlacements) {
      if (placement.sourceComponentId) {
        map.set(placement.sourceComponentId, placement)
      }
    }
    return map
  }

  static issueToString(issue: DiodeResistorNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "diodeComponentName",
      issue.diodeSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "diodePin", issue.diodePin)
    addAttr(
      attrs,
      "resistorComponentName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "resistorPin", issue.resistorPin)
    addAttr(attrs, "message", issue.message)
    return `<DiodeResistorNotAligned ${attrs.join(" ")} />`
  }
}
