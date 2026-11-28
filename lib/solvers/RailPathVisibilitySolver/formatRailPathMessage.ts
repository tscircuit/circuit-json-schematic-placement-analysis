export function formatRailPathMessage(params: {
  hostComponentName: string
  sourcePortName: string
  railType: "power" | "ground"
  pathSpan: number
  hasSupportElements: boolean
}): string {
  const endpoint = `${params.hostComponentName}.${params.sourcePortName}`
  const prefix = `Visible path from ${endpoint} to ${params.railType} spans ${params.pathSpan.toFixed(2)} schematic units`
  if (!params.hasSupportElements) {
    return `${prefix}; shorten the visible wire or connect ${endpoint} to a nearby ${params.railType} symbol.`
  }
  return `${prefix}; move the connected support elements closer together near the pin and recompute their schematic traces.`
}
