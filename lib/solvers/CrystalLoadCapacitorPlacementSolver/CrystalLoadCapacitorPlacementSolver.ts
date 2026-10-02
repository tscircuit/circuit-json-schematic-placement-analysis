import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  CrystalNotCenteredOverLoadCapacitors,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

interface SourceComponentInfo {
  sourceComponentId: string
  ftype?: string
}

interface SourcePortInfo {
  sourcePortId: string
  sourceComponentId: string
  connectivityKey: string
}

interface CapacitorConnection {
  capacitor: SchematicBoxPlacement
  loadPort: SchematicPort
  returnConnectivityKey: string
}

interface CrystalLoadNetwork {
  crystal: SchematicBoxPlacement
  firstLoadCapacitor: SchematicBoxPlacement
  secondLoadCapacitor: SchematicBoxPlacement
  newSchX: number
  newSchY: number
}

export class CrystalLoadCapacitorPlacementSolver extends BaseSolver {
  private static readonly ALIGNMENT_TOLERANCE = 0.1
  private readonly issues: SchematicPlacementIssue[]
  private readonly networks: CrystalLoadNetwork[]
  private currentNetworkIndex = 0

  constructor({
    ctx,
    issues,
  }: {
    ctx: SolverContext
    issues: SchematicPlacementIssue[]
  }) {
    super()
    this.issues = issues
    this.networks = this.findCrystalLoadNetworks(ctx)
    this.solved = this.networks.length === 0
  }

  override _step(): void {
    const network = this.networks[this.currentNetworkIndex]
    if (!network) {
      this.solved = true
      return
    }

    this.currentNetworkIndex += 1
    this.solved = this.currentNetworkIndex >= this.networks.length

    const deltaSchX = round(network.newSchX - network.crystal.schX)
    const deltaSchY = round(network.newSchY - network.crystal.schY)
    if (
      Math.abs(deltaSchX) <=
        CrystalLoadCapacitorPlacementSolver.ALIGNMENT_TOLERANCE &&
      Math.abs(deltaSchY) <=
        CrystalLoadCapacitorPlacementSolver.ALIGNMENT_TOLERANCE
    ) {
      return
    }

    const crystalName = network.crystal.sourceComponentName ?? "the crystal"
    const firstCapacitorName =
      network.firstLoadCapacitor.sourceComponentName ??
      "the first load capacitor"
    const secondCapacitorName =
      network.secondLoadCapacitor.sourceComponentName ??
      "the second load capacitor"

    this.issues.push({
      lineItemType: "CrystalNotCenteredOverLoadCapacitors",
      crystalSchematicBox: network.crystal,
      firstLoadCapacitorSchematicBox: network.firstLoadCapacitor,
      secondLoadCapacitorSchematicBox: network.secondLoadCapacitor,
      deltaSchX,
      deltaSchY,
      newSchX: network.newSchX,
      newSchY: network.newSchY,
      message: `move ${crystalName} to schX=${network.newSchX}, schY=${network.newSchY} so it is centered between ${firstCapacitorName} and ${secondCapacitorName} at or above their load-side pins`,
    })
  }

  private findCrystalLoadNetworks(ctx: SolverContext): CrystalLoadNetwork[] {
    const index = new PlacementNetworkIndex(ctx)
    const sourceComponents = new Map<string, SourceComponentInfo>()
    const sourcePortsByComponentId = new Map<string, SourcePortInfo[]>()
    const schematicPortsBySourcePortId = new Map<string, SchematicPort>()
    const placementBySourceComponentId = new Map(
      ctx.componentPlacements.flatMap((placement) =>
        placement.sourceComponentId
          ? [[placement.sourceComponentId, placement] as const]
          : [],
      ),
    )

    for (const element of ctx.circuitJson) {
      if (element.type === "source_component") {
        sourceComponents.set(element.source_component_id, {
          sourceComponentId: element.source_component_id,
          ftype:
            "ftype" in element && typeof element.ftype === "string"
              ? element.ftype
              : undefined,
        })
      }
      if (
        element.type === "source_port" &&
        typeof element.source_component_id === "string"
      ) {
        const sourcePort: SourcePortInfo = {
          sourcePortId: element.source_port_id,
          sourceComponentId: element.source_component_id,
          connectivityKey: index.connected(element.source_port_id),
        }
        const componentPorts =
          sourcePortsByComponentId.get(element.source_component_id) ?? []
        componentPorts.push(sourcePort)
        sourcePortsByComponentId.set(
          element.source_component_id,
          componentPorts,
        )
      }
      if (element.type === "schematic_port" && element.source_port_id) {
        schematicPortsBySourcePortId.set(element.source_port_id, element)
      }
    }

    const capacitorConnectionsByConnectivityKey = new Map<
      string,
      CapacitorConnection[]
    >()
    for (const sourceComponent of sourceComponents.values()) {
      if (sourceComponent.ftype !== "simple_capacitor") continue
      const capacitorPorts =
        sourcePortsByComponentId.get(sourceComponent.sourceComponentId) ?? []
      if (capacitorPorts.length !== 2) continue
      const firstCapacitorPort = capacitorPorts[0]!
      const secondCapacitorPort = capacitorPorts[1]!

      const capacitorPlacement = placementBySourceComponentId.get(
        sourceComponent.sourceComponentId,
      )
      if (!capacitorPlacement) continue

      for (const [loadPort, returnPort] of [
        [firstCapacitorPort, secondCapacitorPort],
        [secondCapacitorPort, firstCapacitorPort],
      ] as const) {
        const schematicLoadPort = schematicPortsBySourcePortId.get(
          loadPort.sourcePortId,
        )
        if (!schematicLoadPort) continue
        const connections =
          capacitorConnectionsByConnectivityKey.get(loadPort.connectivityKey) ??
          []
        connections.push({
          capacitor: capacitorPlacement,
          loadPort: schematicLoadPort,
          returnConnectivityKey: returnPort.connectivityKey,
        })
        capacitorConnectionsByConnectivityKey.set(
          loadPort.connectivityKey,
          connections,
        )
      }
    }

    const networks: CrystalLoadNetwork[] = []
    for (const sourceComponent of sourceComponents.values()) {
      if (
        sourceComponent.ftype !== "simple_crystal" &&
        sourceComponent.ftype !== "simple_chip"
      ) {
        continue
      }

      const allCrystalPorts =
        sourcePortsByComponentId.get(sourceComponent.sourceComponentId) ?? []
      // Only a typed crystal may have extra grounded case terminals. Do not
      // interpret an arbitrary multi-pin IC as a crystal based on its wiring.
      if (
        allCrystalPorts.length !== 2 &&
        !(
          sourceComponent.ftype === "simple_crystal" &&
          allCrystalPorts.length === 4
        )
      )
        continue
      const crystalPorts = allCrystalPorts.filter(
        (port) => !index.groundNets.has(port.connectivityKey),
      )
      if (
        crystalPorts.length !== 2 ||
        crystalPorts[0]!.connectivityKey === crystalPorts[1]!.connectivityKey
      )
        continue
      const firstCrystalConnectivityKey = crystalPorts[0]!.connectivityKey
      const secondCrystalConnectivityKey = crystalPorts[1]!.connectivityKey

      const crystalPlacement = placementBySourceComponentId.get(
        sourceComponent.sourceComponentId,
      )
      if (!crystalPlacement) continue

      const firstConnections =
        capacitorConnectionsByConnectivityKey.get(
          crystalPorts[0]!.connectivityKey,
        ) ?? []
      const secondConnections =
        capacitorConnectionsByConnectivityKey.get(
          crystalPorts[1]!.connectivityKey,
        ) ?? []

      const candidatePairs = firstConnections.flatMap((firstConnection) =>
        secondConnections.flatMap((secondConnection) => {
          if (
            firstConnection.capacitor.sourceComponentId ===
              secondConnection.capacitor.sourceComponentId ||
            firstConnection.returnConnectivityKey !==
              secondConnection.returnConnectivityKey ||
            firstConnection.returnConnectivityKey ===
              firstCrystalConnectivityKey ||
            firstConnection.returnConnectivityKey ===
              secondCrystalConnectivityKey ||
            firstConnection.capacitor.schematicSheetId !==
              crystalPlacement.schematicSheetId ||
            secondConnection.capacitor.schematicSheetId !==
              crystalPlacement.schematicSheetId
          ) {
            return []
          }
          return [{ firstConnection, secondConnection }]
        }),
      )
      const verifiedPairs = candidatePairs.filter(({ firstConnection }) => {
        const returnKey = firstConnection.returnConnectivityKey
        if (
          allCrystalPorts.some(
            (port) =>
              !crystalPorts.includes(port) &&
              port.connectivityKey !== returnKey,
          )
        )
          return false

        // A typed crystal with two grounded loads identifies the local pattern
        // on its own. It must also work in an isolated four-component section,
        // without requiring the oscillator host to be present in the input.
        if (
          sourceComponent.ftype === "simple_crystal" &&
          index.groundNets.has(returnKey)
        )
          return true

        // Follow at most one typed series resistor on each oscillator leg.
        // A feedback resistor between the legs or a rail pull must not make
        // one MCU terminal look like two oscillator terminals.
        const hostNets = (signal: string, otherSignal: string) => {
          const nets = new Set([signal])
          for (const component of sourceComponents.values()) {
            if (component.ftype !== "simple_resistor") continue
            const terminals = index.twoTerminalNets(component.sourceComponentId)
            if (!terminals?.includes(signal)) continue
            const outward = terminals.find((net) => net !== signal)!
            if (
              outward !== otherSignal &&
              outward !== returnKey &&
              !index.isRail(outward)
            )
              nets.add(outward)
          }
          return nets
        }
        const firstHostNets = hostNets(
          firstCrystalConnectivityKey,
          secondCrystalConnectivityKey,
        )
        const secondHostNets = hostNets(
          secondCrystalConnectivityKey,
          firstCrystalConnectivityKey,
        )
        return [...sourcePortsByComponentId.entries()].some(
          ([id, ports]) =>
            id !== sourceComponent.sourceComponentId &&
            sourceComponents.get(id)?.ftype === "simple_chip" &&
            ports.length > 2 &&
            ports.some(
              (first) =>
                firstHostNets.has(first.connectivityKey) &&
                ports.some(
                  (second) =>
                    secondHostNets.has(second.connectivityKey) &&
                    first.connectivityKey !== second.connectivityKey,
                ),
            ),
        )
      })
      // Ambiguous loads cannot identify a unique standard crystal network.
      if (verifiedPairs.length !== 1) continue

      const bestPair = verifiedPairs[0]!
      const loadPorts = [
        bestPair.firstConnection.loadPort,
        bestPair.secondConnection.loadPort,
      ]
      const capacitors = [
        bestPair.firstConnection.capacitor,
        bestPair.secondConnection.capacitor,
      ].toSorted((a, b) => a.schX - b.schX)

      networks.push({
        crystal: crystalPlacement,
        firstLoadCapacitor: capacitors[0]!,
        secondLoadCapacitor: capacitors[1]!,
        newSchX: round((loadPorts[0]!.center.x + loadPorts[1]!.center.x) / 2),
        // Matchpack leaves vertical wire clearance below a four-pin crystal.
        // Preserve that clearance instead of forcing it onto the cap pins.
        newSchY: round(
          Math.max(
            crystalPlacement.schY,
            loadPorts[0]!.center.y,
            loadPorts[1]!.center.y,
          ),
        ),
      })
    }

    return networks
  }

  static issueToString(issue: CrystalNotCenteredOverLoadCapacitors): string {
    const attrs: string[] = []
    addAttr(attrs, "crystalName", issue.crystalSchematicBox.sourceComponentName)
    addAttr(
      attrs,
      "firstLoadCapacitorName",
      issue.firstLoadCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondLoadCapacitorName",
      issue.secondLoadCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "newSchX", issue.newSchX)
    addAttr(attrs, "newSchY", issue.newSchY)
    addAttr(attrs, "deltaSchX", issue.deltaSchX, { formatDelta: true })
    addAttr(attrs, "deltaSchY", issue.deltaSchY, { formatDelta: true })
    addAttr(attrs, "message", issue.message)
    return `<CrystalNotCenteredOverLoadCapacitors ${attrs.join(" ")} />`
  }
}

const round = (value: number): number => Math.round(value * 100) / 100
