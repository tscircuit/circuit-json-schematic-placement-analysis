import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  FlybackDiodeSeparatedFromRelayCoil,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Local relay protection whose diode is displaced and connected through labels. */
export class RelayFlybackDiodePlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly relayIds: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.relayIds = [...this.index.components.keys()].filter((id) =>
      this.coilPorts(id),
    )
    this.solved = this.relayIds.length === 0
  }

  override _step(): void {
    const relayId = this.relayIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.relayIds.length
    if (!relayId) return
    const index = this.index
    const relay = index.placement(relayId)
    const coil = this.coilPorts(relayId)!
    if (!relay || coil.some((p) => p.do_not_connect)) return
    const nets = coil.map((p) => index.connected(p.source_port_id))
    if (nets[0] === nets[1]) return
    // Shared coils do not identify one local protection pair.
    if (
      this.relayIds.some(
        (id) =>
          id !== relayId &&
          this.coilPorts(id)!.every((p) =>
            nets.includes(index.connected(p.source_port_id)),
          ),
      )
    )
      return
    const diodeIds = new Set(
      (index.portsByNet.get(nets[0]!) ?? [])
        .filter(
          (p) =>
            index.components.get(p.source_component_id)?.ftype ===
            "simple_diode",
        )
        .map((p) => p.source_component_id)
        .filter((id) => index.twoTerminalNets(id)?.includes(nets[1]!)),
    )
    if (diodeIds.size !== 1) return
    const diodeId = [...diodeIds][0]!
    const diode = index.placement(diodeId)
    const anode = this.uniquePort(diodeId, /^(?:ANODE|A)$/)
    const cathode = this.uniquePort(diodeId, /^(?:CATHODE|K)$/)
    if (
      !diode ||
      !index.sameLocalScope(relay, diode) ||
      !anode ||
      !cathode ||
      anode === cathode ||
      anode.do_not_connect ||
      cathode.do_not_connect
    )
      return
    const anodeNet = index.connected(anode.source_port_id)
    const cathodeNet = index.connected(cathode.source_port_id)
    // Require the diode's anode at a grounded-emitter driver's collector.
    // This excludes reversed diodes and clamps on unidentified/AC loads.
    if (
      index.isRail(anodeNet) ||
      index.groundNets.has(cathodeNet) ||
      !this.hasGroundedDriver(anodeNet, cathodeNet)
    )
      return
    const coilPins = coil.map((p) => index.port(p))
    const diodePins = [anode, cathode].map((p) => index.port(p))
    if (
      [...coilPins, ...diodePins].some(
        (p) => !p || p.schematic_sheet_id !== relay.schematicSheetId,
      )
    )
      return
    const [first, second] = coilPins
    const left = Math.min(first!.center.x, second!.center.x)
    const right = Math.max(first!.center.x, second!.center.x)
    const bottom = Math.min(first!.center.y, second!.center.y)
    const top = Math.max(first!.center.y, second!.center.y)
    const gapX = Math.max(
      left - (diode.schX + diode.width / 2),
      diode.schX - diode.width / 2 - right,
      0,
    )
    const gapY = Math.max(
      bottom - (diode.schY + diode.height / 2),
      diode.schY - diode.height / 2 - top,
      0,
    )
    const distanceFromCoilPins = Math.hypot(gapX, gapY)
    const pinSpan = Math.hypot(right - left, top - bottom)
    // Allow room for symbols/labels and different coil-pin arrangements.
    // Deliberately remote blocks are outside this local grouping advisory.
    if (
      distanceFromCoilPins <= Math.max(1.5, 2 * pinSpan) ||
      distanceFromCoilPins >
        Math.max(8, 4 * Math.max(relay.width, relay.height))
    )
      return
    // A fully wired loop already makes the relationship visible. Require a
    // label attached to the displaced diode, not just a distant matching net.
    if (
      !this.params.ctx.circuitJson.some(
        (e) =>
          e.type === "schematic_net_label" &&
          e.schematic_sheet_id === relay.schematicSheetId &&
          e.anchor_position &&
          diodePins.some(
            (p) =>
              Math.hypot(
                p!.center.x - e.anchor_position!.x,
                p!.center.y - e.anchor_position!.y,
              ) < 0.01,
          ),
      )
    )
      return
    this.params.issues.push({
      lineItemType: "FlybackDiodeSeparatedFromRelayCoil",
      relaySchematicBox: relay,
      diodeSchematicBox: diode,
      coilSourcePortIds: [coil[0].source_port_id, coil[1].source_port_id],
      distanceFromCoilPins,
      message: `Place ${diode.sourceComponentName ?? diodeId} beside ${relay.sourceComponentName ?? relayId}'s coil pins so the flyback protection loop can be read together. Preserve diode polarity and all pin connections; leave room for labels and reroute affected traces.`,
    })
  }

  private uniquePort(id: string, pattern: RegExp) {
    const ports = this.index.portsByComponent
      .get(id)
      ?.filter((p) => hasHint(p, pattern))
    return ports?.length === 1 ? ports[0] : undefined
  }

  private coilPorts(id: string) {
    if (this.index.components.get(id)?.ftype !== "simple_chip") return
    const ports = this.index.portsByComponent.get(id) ?? []
    // Require both a named coil pair and relay contacts; never infer a relay
    // from its reference designator or generic pin numbers alone.
    if (
      !this.uniquePort(id, /^(?:COM|COMMON)$/) ||
      !ports.some((p) => hasHint(p, /^(?:NO|NC|NORMALLYOPEN|NORMALLYCLOSED)$/))
    )
      return
    const coil = ports.filter((p) => hasHint(p, /^(?:COIL[A-B12]|A[12])$/))
    if (coil.length !== 2) return
    for (const [a, b] of [
      ["COILA", "COILB"],
      ["COIL1", "COIL2"],
      ["A1", "A2"],
    ]) {
      const first = this.uniquePort(id, new RegExp(`^${a}$`))
      const second = this.uniquePort(id, new RegExp(`^${b}$`))
      if (
        first &&
        second &&
        first !== second &&
        !hasHint(first, new RegExp(`^${b}$`)) &&
        !hasHint(second, new RegExp(`^${a}$`))
      )
        return [first, second] as const
    }
  }

  private hasGroundedDriver(anodeNet: string, cathodeNet: string): boolean {
    return (this.index.portsByNet.get(anodeNet) ?? []).some((p) => {
      const id = p.source_component_id
      const component = this.index.components.get(id)
      if (
        component?.ftype !== "simple_chip" &&
        !(
          component?.ftype === "simple_transistor" &&
          component.transistor_type === "npn"
        )
      )
        return false
      if (this.index.portsByComponent.get(id)?.length !== 3) return false
      const c = this.uniquePort(id, /^(?:C|COLLECTOR)$/)
      const e = this.uniquePort(id, /^(?:E|EMITTER)$/)
      const b = this.uniquePort(id, /^(?:B|BASE)$/)
      if (
        !c ||
        !e ||
        !b ||
        new Set([c, e, b]).size !== 3 ||
        [c, e, b].some((p) => p.do_not_connect) ||
        c.source_port_id !== p.source_port_id
      )
        return false
      const emitterNet = this.index.connected(e.source_port_id),
        baseNet = this.index.connected(b.source_port_id)
      return (
        this.index.groundNets.has(emitterNet) &&
        !this.index.powerNets.has(emitterNet) &&
        new Set([anodeNet, cathodeNet, emitterNet, baseNet]).size === 4
      )
    })
  }

  static issueToString(issue: FlybackDiodeSeparatedFromRelayCoil): string {
    const attrs: string[] = []
    addAttr(attrs, "relayName", issue.relaySchematicBox.sourceComponentName)
    addAttr(attrs, "diodeName", issue.diodeSchematicBox.sourceComponentName)
    addAttr(attrs, "distanceFromCoilPins", issue.distanceFromCoilPins)
    addAttr(attrs, "message", issue.message)
    return `<FlybackDiodeSeparatedFromRelayCoil ${attrs.join(" ")} />`
  }
}

function hasHint(port: SourcePort, pattern: RegExp): boolean {
  return [port.name, ...(port.port_hints ?? [])].some((hint) =>
    pattern.test(hint.toUpperCase().replace(/[\s_]/g, "")),
  )
}
