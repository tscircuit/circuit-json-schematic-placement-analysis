import type { CircuitJson, SchematicPort, SourceTrace } from "circuit-json"
import { BaseSolver } from "@tscircuit/solver-utils"
import type { SolverContext } from "../SolverContext"
import type {
  ResistorDiodeCapacitorNotAligned,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"

interface DiodeNeighbor {
  diodePort: SchematicPort
  neighborCompId: string
  neighborFtype: string
  neighborPort: SchematicPort
}

export class ResistorDiodeCapacitorAlignmentSolver extends BaseSolver {
  private static readonly DIODE_FTYPES = new Set(["simple_led", "simple_diode"])
  private static readonly RESISTOR_FTYPE = "simple_resistor"
  private static readonly CAPACITOR_FTYPE = "simple_capacitor"

  private readonly ctx: SolverContext
  private readonly out: SchematicPlacementIssue[]
  private readonly diodeIds: string[]
  private readonly neighborsByDiodeId: Map<string, DiodeNeighbor[]>
  private readonly schematicBoxBySourceComponentId: Map<
    string,
    SchematicBoxPlacement
  >
  private currentIndex = 0

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
    const sourceComponentFtypeById =
      this.buildSourceComponentFtypeById(circuitJson)
    const sourceComponentIdBySourcePortId =
      this.buildSourceComponentIdBySourcePortId(circuitJson)
    const schematicPorts = circuitJson.filter(
      (el): el is SchematicPort => el.type === "schematic_port",
    )
    const sourceTraces = circuitJson.filter(
      (el): el is SourceTrace => el.type === "source_trace",
    )
    const schematicPortBySourcePortId = new Map<string, SchematicPort>()
    for (const port of schematicPorts) {
      if (port.source_port_id) {
        schematicPortBySourcePortId.set(port.source_port_id, port)
      }
    }

    this.schematicBoxBySourceComponentId =
      this.buildSchematicBoxBySourceComponentId()

    this.neighborsByDiodeId = this.buildNeighborsByDiodeId({
      sourceTraces,
      schematicPortBySourcePortId,
      sourceComponentFtypeById,
      sourceComponentIdBySourcePortId,
    })

    this.diodeIds = Array.from(this.neighborsByDiodeId.keys())
    this.solved = this.diodeIds.length === 0
  }

  override _step(): void {
    const diodeId = this.diodeIds[this.currentIndex]
    if (!diodeId) {
      this.solved = true
      return
    }
    this.currentIndex++
    this.solved = this.currentIndex >= this.diodeIds.length

    const neighbors = this.neighborsByDiodeId.get(diodeId) ?? []
    const resistorNeighbor = neighbors.find(
      (n) =>
        n.neighborFtype ===
        ResistorDiodeCapacitorAlignmentSolver.RESISTOR_FTYPE,
    )
    const capacitorNeighbor = neighbors.find(
      (n) =>
        n.neighborFtype ===
        ResistorDiodeCapacitorAlignmentSolver.CAPACITOR_FTYPE,
    )
    if (!resistorNeighbor || !capacitorNeighbor) return
    if (
      resistorNeighbor.diodePort.schematic_port_id ===
      capacitorNeighbor.diodePort.schematic_port_id
    )
      return

    const diodeBox = this.schematicBoxBySourceComponentId.get(diodeId)
    const resistorBox = this.schematicBoxBySourceComponentId.get(
      resistorNeighbor.neighborCompId,
    )
    const capacitorBox = this.schematicBoxBySourceComponentId.get(
      capacitorNeighbor.neighborCompId,
    )
    if (!diodeBox || !resistorBox || !capacitorBox) return

    const resistorPort = resistorNeighbor.neighborPort
    const capacitorPort = capacitorNeighbor.neighborPort
    const diodeResistorSidePort = resistorNeighbor.diodePort
    const diodeCapacitorSidePort = capacitorNeighbor.diodePort
    if (!resistorPort.center || !capacitorPort.center) return
    if (!diodeResistorSidePort.center || !diodeCapacitorSidePort.center) return

    const diodeName = diodeBox.sourceComponentName ?? diodeId
    const resistorName =
      resistorBox.sourceComponentName ?? resistorNeighbor.neighborCompId
    const capacitorName =
      capacitorBox.sourceComponentName ?? capacitorNeighbor.neighborCompId

    const resistorPin =
      resistorPort.display_pin_label ?? resistorPort.pin_number?.toString()
    const diodeResistorSidePin =
      diodeResistorSidePort.display_pin_label ??
      diodeResistorSidePort.pin_number?.toString()
    const diodeCapacitorSidePin =
      diodeCapacitorSidePort.display_pin_label ??
      diodeCapacitorSidePort.pin_number?.toString()
    const capacitorPin =
      capacitorPort.display_pin_label ?? capacitorPort.pin_number?.toString()

    const resistorPinDesc = resistorPin
      ? `${resistorName}.${resistorPin}`
      : resistorName
    const diodeResistorPinDesc = diodeResistorSidePin
      ? `${diodeName}.${diodeResistorSidePin}`
      : diodeName
    const diodeCapacitorPinDesc = diodeCapacitorSidePin
      ? `${diodeName}.${diodeCapacitorSidePin}`
      : diodeName
    const capacitorPinDesc = capacitorPin
      ? `${capacitorName}.${capacitorPin}`
      : capacitorName

    const makeIssue = (message: string): ResistorDiodeCapacitorNotAligned => ({
      lineItemType: "ResistorDiodeCapacitorNotAligned",
      resistorSchematicBox: resistorBox,
      diodeSchematicBox: diodeBox,
      capacitorSchematicBox: capacitorBox,
      resistorPin,
      diodeResistorSidePin,
      diodeCapacitorSidePin,
      capacitorPin,
      resistorPinFacingDirection: resistorPort.facing_direction,
      diodeResistorSidePinFacingDirection:
        diodeResistorSidePort.facing_direction,
      diodeCapacitorSidePinFacingDirection:
        diodeCapacitorSidePort.facing_direction,
      capacitorPinFacingDirection: capacitorPort.facing_direction,
      message,
    })

    const rdColinear = ResistorDiodeCapacitorAlignmentSolver.isCoLinear(
      resistorPort.center,
      diodeResistorSidePort.center,
    )
    const dcColinear = ResistorDiodeCapacitorAlignmentSolver.isCoLinear(
      diodeCapacitorSidePort.center,
      capacitorPort.center,
    )

    const allBoxesSharedAxis =
      ResistorDiodeCapacitorAlignmentSolver.threeOnSameAxis(
        { x: resistorBox.schX, y: resistorBox.schY },
        { x: diodeBox.schX, y: diodeBox.schY },
        { x: capacitorBox.schX, y: capacitorBox.schY },
      )

    if (!rdColinear || !dcColinear || !allBoxesSharedAxis) {
      this.out.push(
        makeIssue(
          `R-D-C chain not colinear — align ${resistorName}, ${diodeName}, ${capacitorName} on same axis and rotate so ${resistorPinDesc} faces ${diodeResistorPinDesc} and ${diodeCapacitorPinDesc} faces ${capacitorPinDesc}`,
        ),
      )
      return
    }

    const diodeMiddle = ResistorDiodeCapacitorAlignmentSolver.isMiddle(
      { x: resistorBox.schX, y: resistorBox.schY },
      { x: diodeBox.schX, y: diodeBox.schY },
      { x: capacitorBox.schX, y: capacitorBox.schY },
    )
    if (!diodeMiddle) {
      this.out.push(
        makeIssue(
          `${diodeName} must be between ${resistorName} and ${capacitorName} — reorder so chain is ${resistorName} → ${diodeName} → ${capacitorName}`,
        ),
      )
      return
    }

    const rdFacing =
      !resistorPort.facing_direction ||
      !diodeResistorSidePort.facing_direction ||
      ResistorDiodeCapacitorAlignmentSolver.pinsFacingEachOther(
        resistorPort.center,
        resistorPort.facing_direction,
        diodeResistorSidePort.center,
        diodeResistorSidePort.facing_direction,
      )
    const dcFacing =
      !diodeCapacitorSidePort.facing_direction ||
      !capacitorPort.facing_direction ||
      ResistorDiodeCapacitorAlignmentSolver.pinsFacingEachOther(
        diodeCapacitorSidePort.center,
        diodeCapacitorSidePort.facing_direction,
        capacitorPort.center,
        capacitorPort.facing_direction,
      )

    if (!rdFacing || !dcFacing) {
      this.out.push(
        makeIssue(
          `pins face away in R-D-C chain — rotate so ${resistorPinDesc} faces ${diodeResistorPinDesc} and ${diodeCapacitorPinDesc} faces ${capacitorPinDesc}`,
        ),
      )
    }
  }

  private buildNeighborsByDiodeId(args: {
    sourceTraces: SourceTrace[]
    schematicPortBySourcePortId: Map<string, SchematicPort>
    sourceComponentFtypeById: Map<string, string>
    sourceComponentIdBySourcePortId: Map<string, string>
  }): Map<string, DiodeNeighbor[]> {
    const {
      sourceTraces,
      schematicPortBySourcePortId,
      sourceComponentFtypeById,
      sourceComponentIdBySourcePortId,
    } = args

    const { DIODE_FTYPES } = ResistorDiodeCapacitorAlignmentSolver
    const map = new Map<string, DiodeNeighbor[]>()

    for (const trace of sourceTraces) {
      const portIds = trace.connected_source_port_ids ?? []
      if (portIds.length < 2) continue
      for (let i = 0; i < portIds.length; i++) {
        for (let j = i + 1; j < portIds.length; j++) {
          const aPortId = portIds[i]!
          const bPortId = portIds[j]!
          const aSchPort = schematicPortBySourcePortId.get(aPortId)
          const bSchPort = schematicPortBySourcePortId.get(bPortId)
          if (!aSchPort || !bSchPort) continue
          const aCompId = sourceComponentIdBySourcePortId.get(aPortId)
          const bCompId = sourceComponentIdBySourcePortId.get(bPortId)
          if (!aCompId || !bCompId) continue
          const aFtype = sourceComponentFtypeById.get(aCompId)
          const bFtype = sourceComponentFtypeById.get(bCompId)
          if (!aFtype || !bFtype) continue

          if (DIODE_FTYPES.has(aFtype)) {
            const list = map.get(aCompId) ?? []
            list.push({
              diodePort: aSchPort,
              neighborCompId: bCompId,
              neighborFtype: bFtype,
              neighborPort: bSchPort,
            })
            map.set(aCompId, list)
          }
          if (DIODE_FTYPES.has(bFtype)) {
            const list = map.get(bCompId) ?? []
            list.push({
              diodePort: bSchPort,
              neighborCompId: aCompId,
              neighborFtype: aFtype,
              neighborPort: aSchPort,
            })
            map.set(bCompId, list)
          }
        }
      }
    }
    return map
  }

  private static isCoLinear(
    a: { x: number; y: number },
    b: { x: number; y: number },
    epsilon = 0.01,
  ): boolean {
    return Math.abs(a.x - b.x) < epsilon || Math.abs(a.y - b.y) < epsilon
  }

  private static threeOnSameAxis(
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
    epsilon = 0.01,
  ): boolean {
    const sameX = Math.abs(a.x - b.x) < epsilon && Math.abs(b.x - c.x) < epsilon
    const sameY = Math.abs(a.y - b.y) < epsilon && Math.abs(b.y - c.y) < epsilon
    return sameX || sameY
  }

  private static isMiddle(
    a: { x: number; y: number },
    mid: { x: number; y: number },
    c: { x: number; y: number },
    epsilon = 0.01,
  ): boolean {
    const sameX =
      Math.abs(a.x - mid.x) < epsilon && Math.abs(mid.x - c.x) < epsilon
    if (sameX) {
      return (a.y <= mid.y && mid.y <= c.y) || (c.y <= mid.y && mid.y <= a.y)
    }
    const sameY =
      Math.abs(a.y - mid.y) < epsilon && Math.abs(mid.y - c.y) < epsilon
    if (sameY) {
      return (a.x <= mid.x && mid.x <= c.x) || (c.x <= mid.x && mid.x <= a.x)
    }
    return false
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

  static issueToString(issue: ResistorDiodeCapacitorNotAligned): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "resistorComponentName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "resistorPin", issue.resistorPin)
    addAttr(
      attrs,
      "diodeComponentName",
      issue.diodeSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "diodeResistorSidePin", issue.diodeResistorSidePin)
    addAttr(attrs, "diodeCapacitorSidePin", issue.diodeCapacitorSidePin)
    addAttr(
      attrs,
      "capacitorComponentName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "capacitorPin", issue.capacitorPin)
    addAttr(attrs, "message", issue.message)
    return `<ResistorDiodeCapacitorNotAligned ${attrs.join(" ")} />`
  }
}
