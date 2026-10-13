import type { CircuitJson } from "circuit-json"
import type { SchematicPlacementAnalysis } from "lib/index"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"

/** Stack viewports of one complete render without moving or removing circuit elements. */
export function createSectionedSchematicSnapshot(input: {
  circuitJson: CircuitJson
  analysis: SchematicPlacementAnalysis
  sections: readonly {
    title: string
    componentNames: readonly string[]
    /** Schematic units beyond symbol/port bounds; leave room for labels and nearby wiring. */
    padding?: Partial<Record<"left" | "right" | "top" | "bottom", number>>
  }[]
}) {
  const { circuitJson, analysis, sections } = input
  const width = 1200
  const components = circuitJson.filter((e) => e.type === "schematic_component")
  const sources = new Map(
    circuitJson
      .filter((e) => e.type === "source_component")
      .map((e) => [e.source_component_id, e]),
  )
  const byName = new Map<string, (typeof components)[number]>()
  for (const component of components) {
    const source = component.source_component_id
      ? sources.get(component.source_component_id)
      : undefined
    if (!source?.name || byName.has(source.name))
      throw new Error("Section components must have unique source names")
    byName.set(source.name, component)
  }
  if (
    new Set(components.map((component) => component.schematic_sheet_id)).size >
    1
  )
    throw new Error("Sectioned snapshot requires one schematic sheet")
  const covered = new Set<string>()
  const svg = renderIssueOverlay({
    circuitJson,
    analysis,
    showFullSchematic: true,
    showOverlay: false,
    width,
    height: 800,
  }).svg
  const matrix = svg
    .match(/data-real-to-screen-transform="matrix\(([^)]+)\)"/)![1]!
    .split(/[\s,]+/)
    .map(Number)
  const [a, b, c, d, e, f] = matrix as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  if (b !== 0 || c !== 0 || a <= 0 || d >= 0)
    throw new Error("Unsupported schematic transform")
  const body = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"))
  const escape = (text: string) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
  let offset = 88
  const panels = sections.map((section, index) => {
    const selected = section.componentNames.map((name) => {
      const component = byName.get(name)
      if (!component) throw new Error(`Missing section component ${name}`)
      if (covered.has(component.schematic_component_id))
        throw new Error(`Component assigned to multiple sections: ${name}`)
      covered.add(component.schematic_component_id)
      return component
    })
    if (!selected.length) throw new Error(`Empty section: ${section.title}`)
    // Include the symbols, their port endpoints, and space for names/net labels.
    const ports = circuitJson.filter(
      (item) =>
        item.type === "schematic_port" &&
        selected.some(
          (component) =>
            component.schematic_component_id === item.schematic_component_id,
        ),
    )
    const bounds = selected.flatMap((component) => [
      {
        x: component.center.x - component.size.width / 2,
        y: component.center.y - component.size.height / 2,
      },
      {
        x: component.center.x + component.size.width / 2,
        y: component.center.y + component.size.height / 2,
      },
    ])
    for (const port of ports)
      if (port.type === "schematic_port") bounds.push(port.center)
    const left =
      Math.min(...bounds.map((p) => p.x)) - (section.padding?.left ?? 2)
    const right =
      Math.max(...bounds.map((p) => p.x)) + (section.padding?.right ?? 2)
    const bottom =
      Math.min(...bounds.map((p) => p.y)) - (section.padding?.bottom ?? 2)
    const top =
      Math.max(...bounds.map((p) => p.y)) + (section.padding?.top ?? 2)
    const scale = Math.min(80, width / (right - left))
    const panelWidth = (right - left) * scale
    const panelHeight = (top - bottom) * scale
    const viewBox = `${a * left + e} ${d * top + f} ${a * (right - left)} ${-d * (top - bottom)}`
    const panel = `<g data-schematic-section="${index + 1}" transform="translate(0 ${offset})">
<text x="18" y="32" font-family="sans-serif" font-size="24" fill="#172b3a">${index + 1}. ${escape(section.title)}</text>
<svg x="${(width - panelWidth) / 2}" y="48" width="${panelWidth}" height="${panelHeight}" viewBox="${viewBox}" overflow="hidden"><use href="#sectioned-sheet" /></svg>
</g>`
    offset += 48 + panelHeight + 24
    return panel
  })
  const missing = [...byName].filter(
    ([, component]) => !covered.has(component.schematic_component_id),
  )
  if (missing.length)
    throw new Error(
      `Components missing from sections: ${missing.map(([name]) => name).join(", ")}`,
    )
  const issues = analysis.getIssues()
  const diagnostics = createAnalyzerTextSvg(
    [
      `Complete sheet: ${covered.size} schematic components shown in ${sections.length} sections.`,
      `Full-sheet analysis: ${issues.length} reported issues.`,
      ...issues.map((issue) => analysis.schematicIssuesToString(issue)),
    ].join("\n"),
    width,
  )
  const diagnosticHeight = Number(diagnostics.match(/height="([\d.]+)"/)![1])
  const height = offset + diagnosticHeight + 18
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="white" />
<defs><g id="sectioned-sheet">${body}</g></defs>
<text x="18" y="34" font-family="sans-serif" font-size="26" fill="#172b3a">Complete after layout — section by section</text>
<text x="18" y="64" font-family="sans-serif" font-size="16" fill="#172b3a">Views of the same rendered sheet; wires can continue beyond a section boundary.</text>
${panels.join("\n")}
<g transform="translate(0 ${offset})">${diagnostics}</g>
</svg>`.replace(/[ \t]+$/gm, "")
}
