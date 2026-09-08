export interface AnalyzerTextIssueMarker {
  number: number
  text: string
  sheetId: string
}

export function createAnalyzerTextSvg(
  text: string,
  width: number,
  markers: readonly AnalyzerTextIssueMarker[] = [],
): string {
  const maxLineLength = Math.max(
    20,
    Math.floor((width - (markers.length ? 70 : 36)) / 10),
  )
  const lines: string[] = []
  const numberedLines: { number: number; lineIndex: number }[] = []
  const remaining = [...markers]
  let offset = 0
  let sheetId: string | undefined
  for (const line of text ? text.split("\n") : []) {
    if (line.startsWith("<SchematicSheet "))
      sheetId = line.match(/\bid="([^"]*)"/)?.[1]
    const match = remaining.findIndex(
      (marker) =>
        marker.text &&
        text.startsWith(marker.text, offset) &&
        (sheetId === undefined || sheetId === marker.sheetId),
    )
    if (match !== -1) {
      const [marker] = remaining.splice(match, 1)
      numberedLines.push({ number: marker!.number, lineIndex: lines.length })
    }
    lines.push(...wrapLine(line, Math.min(96, maxLineLength)))
    offset += line.length + 1
  }
  const lineHeight = 22
  const padding = 18
  const textX = numberedLines.length ? 52 : padding
  const height = padding * 2 + lines.length * lineHeight

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#fff" />`,
    `<text x="${textX}" y="${padding + lineHeight}" fill="#d00" font-family="Menlo, Consolas, monospace" font-size="16">`,
    ...lines.map(
      (line, index) =>
        `<tspan x="${textX}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    ),
    "</text>",
    ...numberedLines.map(({ number, lineIndex }) => {
      const y = padding + (lineIndex + 1) * lineHeight - 5
      return `<g data-listing-issue-number="${number}"><circle cx="${padding + 6}" cy="${y}" r="11" fill="#b91c1c" /><text x="${padding + 6}" y="${y}" dy="0.35em" text-anchor="middle" font-family="sans-serif" font-size="11" fill="white">${number}</text></g>`
    }),
    "</svg>",
  ].join("\n")
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function wrapLine(line: string, maxLineLength: number): string[] {
  if (line.length <= maxLineLength) return [line]

  const wrappedLines: string[] = []
  let remainingLine = line

  while (remainingLine.length > maxLineLength) {
    const breakIndex = remainingLine.lastIndexOf(" ", maxLineLength)
    const splitIndex = breakIndex > 0 ? breakIndex : maxLineLength

    wrappedLines.push(remainingLine.slice(0, splitIndex))
    remainingLine = `  ${remainingLine.slice(splitIndex).trimStart()}`
  }

  wrappedLines.push(remainingLine)
  return wrappedLines
}
