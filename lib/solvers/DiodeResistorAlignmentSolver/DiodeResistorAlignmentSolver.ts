import { BaseSolver } from "@tscircuit/solver-utils"
import type { SolverContext } from "../SolverContext"
import type {
  DiodeResistorNotAligned,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"

/** Alignment applies only after a private two-terminal series junction is established. */
export class DiodeResistorAlignmentSolver extends BaseSolver {
  private static readonly DIODE_FTYPES = new Set(["simple_led", "simple_diode"])
  private readonly index: PlacementNetworkIndex
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
    this.nets = [...this.index.portsByNet.keys()]
    this.solved = this.nets.length === 0
  }

  override _step(): void {
    const net = this.nets[this.currentIndex++]!
    this.solved = this.currentIndex >= this.nets.length
    const index = this.index
    const ports = index.portsByNet.get(net)
    // A shared rail or a junction with a third terminal does not establish a series pair.
    if (!ports || ports.length !== 2 || index.isRail(net)) return
    const diodeSourcePort = ports.find((port) =>
      DiodeResistorAlignmentSolver.DIODE_FTYPES.has(
        index.components.get(port.source_component_id)?.ftype ?? "",
      ),
    )
    const resistorSourcePort = ports.find(
      (port) =>
        index.components.get(port.source_component_id)?.ftype ===
        "simple_resistor",
    )
    if (!diodeSourcePort || !resistorSourcePort) return
    const diodeId = diodeSourcePort.source_component_id
    const resistorId = resistorSourcePort.source_component_id
    const diodeNets = index.twoTerminalNets(diodeId)
    const resistorNets = index.twoTerminalNets(resistorId)
    if (!diodeNets || !resistorNets) return
    // Sharing both nets is parallel, even if a rendered wire directly joins the symbols.
    if (
      diodeNets.find((id) => id !== net) ===
      resistorNets.find((id) => id !== net)
    )
      return
    if (
      [diodeId, resistorId].some((id) =>
        index.portsByComponent.get(id)?.some((port) => port.do_not_connect),
      )
    )
      return
    const diodeBox = index.placement(diodeId)
    const resistorBox = index.placement(resistorId)
    if (
      !diodeBox ||
      !resistorBox ||
      diodeBox.schematicSheetId !== resistorBox.schematicSheetId
    )
      return
    // Resolve the actual connected terminals by source IDs, independent of trace shape and labels.
    const diodePort = index.port(diodeSourcePort)
    const resistorPort = index.port(resistorSourcePort)
    if (
      !diodePort ||
      !resistorPort ||
      diodePort.schematic_sheet_id !== diodeBox.schematicSheetId ||
      resistorPort.schematic_sheet_id !== resistorBox.schematicSheetId
    )
      return

    const diodeName = diodeBox.sourceComponentName || "component"
    const resistorName = resistorBox.sourceComponentName || "component"
    const diodePin =
      diodePort.display_pin_label ?? diodePort.pin_number?.toString()
    const resistorPin =
      resistorPort.display_pin_label ?? resistorPort.pin_number?.toString()
    const diodeFacing = diodePort.facing_direction
    const resistorFacing = resistorPort.facing_direction
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
      this.params.issues.push(
        makeIssue(
          `series pins are not aligned — align ${diodeName} and ${resistorName} on the same axis so ${diodePinDesc} faces ${resistorPinDesc}`,
        ),
      )
    } else if (
      diodeFacing &&
      resistorFacing &&
      !DiodeResistorAlignmentSolver.pinsFacingEachOther(
        diodePort.center,
        diodeFacing,
        resistorPort.center,
        resistorFacing,
      )
    ) {
      this.params.issues.push(
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
