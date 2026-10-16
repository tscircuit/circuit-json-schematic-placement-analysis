import { Circuit } from "@tscircuit/core"
import { Children, cloneElement, isValidElement, type ReactNode } from "react"
import { publishedPlacements } from "./published-placements"
import { MicroSdBootSubcircuit } from "./subcircuits/microsd-boot"

// Complete microSD sheet from ShiboSoftwareDev/t113-s3-linux-computer-p9 v0.1.4:
// https://tscircuit.com/ShiboSoftwareDev/t113-s3-linux-computer-p9?version=0.1.4#schematic
// Release: 24a45ffe-9c14-4f95-9142-5364be4705cc.
// The three source files are copied from that release, with formatting only.
// Freeze its published automatic placements in TSX so current core reproduces
// the arrangement. Symbols, pin arrangement, values and connections stay intact.
export type ReproPlacement = { schX: number; schY: number; schRotation: number }

export async function createMicroSdParallelCapacitorRepro(
  overrides: Partial<
    Record<keyof typeof publishedPlacements, ReproPlacement>
  > = {},
) {
  const placements: Record<string, ReproPlacement> = {
    ...publishedPlacements,
    ...overrides,
  }
  // These imported, synchronous TSX functions do not forward schematic props.
  // Expand them before applying positions to the native components.
  const place = (node: ReactNode): ReactNode => {
    if (!isValidElement<Record<string, unknown>>(node)) return node
    if (typeof node.type === "function") {
      const render = node.type as (props: Record<string, unknown>) => ReactNode
      return place(render(node.props))
    }
    return cloneElement(node, {
      ...(typeof node.props.name === "string"
        ? placements[node.props.name]
        : {}),
      ...(node.type === "subcircuit"
        ? { schAutoLayoutEnabled: false, schLayout: { layoutMode: "relative" } }
        : {}),
      children: Children.map(node.props.children as ReactNode, place),
    })
  }
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board routingDisabled>
      {place(MicroSdBootSubcircuit({ exposeToParent: false }))}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
