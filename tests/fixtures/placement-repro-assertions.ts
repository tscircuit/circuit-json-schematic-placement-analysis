import { expect } from "bun:test"
import type { CircuitJson } from "circuit-json"

export function getReproSourcePort(
  circuitJson: CircuitJson,
  componentName: string,
  pin: string,
) {
  const component = circuitJson.find(
    (element) =>
      element.type === "source_component" && element.name === componentName,
  )
  if (component?.type !== "source_component") {
    throw new Error(`Missing component ${componentName}`)
  }
  const port = circuitJson.find(
    (element) =>
      element.type === "source_port" &&
      element.source_component_id === component.source_component_id &&
      (element.name === pin || element.port_hints?.includes(pin)),
  )
  if (port?.type !== "source_port") {
    throw new Error(`Missing port ${componentName}.${pin}`)
  }
  return port
}

export function getReproSchematicComponent(
  circuitJson: CircuitJson,
  componentName: string,
) {
  const source = circuitJson.find(
    (element) =>
      element.type === "source_component" && element.name === componentName,
  )
  if (source?.type !== "source_component") {
    throw new Error(`Missing component ${componentName}`)
  }
  const schematic = circuitJson.find(
    (element) =>
      element.type === "schematic_component" &&
      element.source_component_id === source.source_component_id,
  )
  if (schematic?.type !== "schematic_component") {
    throw new Error(`Missing schematic component ${componentName}`)
  }
  return schematic
}

/** Each row must be connected internally and electrically distinct from every other row. */
export function expectReproNets(circuitJson: CircuitJson, groups: string[][]) {
  const groupKeys = groups.map((endpoints) => {
    const keys = endpoints.map((endpoint) => {
      const [componentName, pin] = endpoint.split(".")
      if (!componentName || !pin)
        throw new Error(`Invalid endpoint ${endpoint}`)
      const element =
        componentName === "net"
          ? circuitJson.find(
              (item) => item.type === "source_net" && item.name === pin,
            )
          : getReproSourcePort(circuitJson, componentName, pin)
      if (element?.type !== "source_port" && element?.type !== "source_net") {
        throw new Error(`Missing endpoint ${endpoint}`)
      }
      const key = element.subcircuit_connectivity_map_key
      expect(key).toBeString()
      expect(key!.length).toBeGreaterThan(0)
      return key
    })
    expect(new Set(keys).size).toBe(1)
    return keys[0]
  })
  expect(new Set(groupKeys).size).toBe(groups.length)
}

export function expectReproRendered(
  circuitJson: CircuitJson,
  componentCount: number,
) {
  expect(
    circuitJson.filter((element) => element.type.endsWith("_error")),
  ).toEqual([])
  expect(
    circuitJson.filter((element) => element.type === "schematic_component"),
  ).toHaveLength(componentCount)
  expect(
    circuitJson.some((element) => element.type === "schematic_trace"),
  ).toBe(true)
}
