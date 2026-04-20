type CircuitJsonItem = {
  type: string
  [key: string]: unknown
}

type Point = {
  x: number
  y: number
}

type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type SourceComponent = {
  type: "source_component"
  source_component_id: string
  name?: string
}

type SchematicComponent = {
  type: "schematic_component"
  schematic_component_id: string
  source_component_id?: string
  center?: Point
  size?: {
    width?: number
    height?: number
  }
}

type SchematicNetLabel = {
  type: "schematic_net_label"
  schematic_net_label_id: string
  text: string
  center?: Point
  anchor_position?: Point
  anchor_side?: string
  font_size?: number
}

type SchematicTrace = {
  type: "schematic_trace"
  schematic_trace_id: string
  source_trace_id?: string
  edges?: {
    from: Point
    to: Point
  }[]
}

export type SchematicPlacementIssueType =
  | "label_label_overlap"
  | "label_symbol_overlap"
  | "text_crosses_connection"

export type SchematicPlacementSeverity = "high" | "medium" | "low"

export type SchematicPlacementIssue = {
  id: string
  type: SchematicPlacementIssueType
  severity: SchematicPlacementSeverity
  summary: string
  bounds: Bounds
  participants: {
    kind: "label" | "component" | "trace"
    ref: string
    text?: string
  }[]
  metadata: Record<string, string | number>
}

const severityRank: Record<SchematicPlacementSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const issueTypeRank: Record<SchematicPlacementIssueType, number> = {
  label_label_overlap: 0,
  label_symbol_overlap: 1,
  text_crosses_connection: 2,
}

export class SchematicPlacementAnalysisReport {
  readonly requestedTarget: string
  readonly resolvedTarget: string
  readonly targetKind: "circuit" | "component"
  readonly issueCount: number
  readonly highSeverityCount: number
  readonly mediumSeverityCount: number
  readonly lowSeverityCount: number
  readonly typeCounts: Record<SchematicPlacementIssueType, number>
  #issues: SchematicPlacementIssue[]

  constructor(args: {
    requestedTarget: string
    resolvedTarget: string
    targetKind: "circuit" | "component"
    issues: SchematicPlacementIssue[]
  }) {
    this.requestedTarget = args.requestedTarget
    this.resolvedTarget = args.resolvedTarget
    this.targetKind = args.targetKind
    this.#issues = [...args.issues]
    this.issueCount = this.#issues.length
    this.highSeverityCount = this.#issues.filter(
      (issue) => issue.severity === "high",
    ).length
    this.mediumSeverityCount = this.#issues.filter(
      (issue) => issue.severity === "medium",
    ).length
    this.lowSeverityCount = this.#issues.filter(
      (issue) => issue.severity === "low",
    ).length
    this.typeCounts = {
      label_label_overlap: this.#issues.filter(
        (issue) => issue.type === "label_label_overlap",
      ).length,
      label_symbol_overlap: this.#issues.filter(
        (issue) => issue.type === "label_symbol_overlap",
      ).length,
      text_crosses_connection: this.#issues.filter(
        (issue) => issue.type === "text_crosses_connection",
      ).length,
    }
  }

  listIssues() {
    return [...this.#issues]
  }

  toString() {
    return this.#issues.map(renderIssue).join("\n\n")
  }
}

export const analyzeAllSchematicPlacements = (
  circuitJson: readonly CircuitJsonItem[],
): SchematicPlacementAnalysisReport => {
  const issues = collectIssues(circuitJson)

  return new SchematicPlacementAnalysisReport({
    requestedTarget: "all",
    resolvedTarget: "all",
    targetKind: "circuit",
    issues,
  })
}

export const analyzeComponentSchematicPlacement = (
  circuitJson: readonly CircuitJsonItem[],
  componentName: string,
): SchematicPlacementAnalysisReport => {
  const issues = collectIssues(circuitJson).filter((issue) =>
    issue.participants.some((participant) => participant.ref === componentName),
  )

  return new SchematicPlacementAnalysisReport({
    requestedTarget: componentName,
    resolvedTarget: componentName,
    targetKind: "component",
    issues,
  })
}

const collectIssues = (
  circuitJson: readonly CircuitJsonItem[],
): SchematicPlacementIssue[] => {
  const sourceComponentNameById = new Map(
    circuitJson
      .filter(
        (item): item is SourceComponent => item.type === "source_component",
      )
      .map((component) => [
        component.source_component_id,
        component.name ?? "",
      ]),
  )

  const componentModels = circuitJson
    .filter(
      (item): item is SchematicComponent => item.type === "schematic_component",
    )
    .map((component) => {
      const name = component.source_component_id
        ? sourceComponentNameById.get(component.source_component_id) ||
          component.schematic_component_id
        : component.schematic_component_id

      return {
        id: component.schematic_component_id,
        name,
        bounds: getComponentBounds(component),
      }
    })

  const labelModels = circuitJson
    .filter(
      (item): item is SchematicNetLabel => item.type === "schematic_net_label",
    )
    .map((label) => ({
      id: label.schematic_net_label_id,
      text: label.text,
      bounds: getLabelBounds(label),
      anchorPosition: label.anchor_position ?? label.center ?? { x: 0, y: 0 },
    }))

  const traceModels = circuitJson
    .filter((item): item is SchematicTrace => item.type === "schematic_trace")
    .flatMap((trace) =>
      (trace.edges ?? []).map((edge, index) => ({
        id: `${trace.schematic_trace_id}:${index}`,
        ref: trace.source_trace_id ?? trace.schematic_trace_id,
        from: edge.from,
        to: edge.to,
      })),
    )

  const issues: SchematicPlacementIssue[] = []

  for (let index = 0; index < labelModels.length; index += 1) {
    const labelA = labelModels[index]
    if (!labelA) continue

    for (
      let otherIndex = index + 1;
      otherIndex < labelModels.length;
      otherIndex += 1
    ) {
      const labelB = labelModels[otherIndex]
      if (!labelB) continue

      const overlap = intersectBounds(labelA.bounds, labelB.bounds)
      if (!overlap) continue

      issues.push({
        id: `${labelA.id}:${labelB.id}`,
        type: "label_label_overlap",
        severity: getSeverityFromBounds(overlap),
        summary: `${labelA.text} overlaps ${labelB.text}`,
        bounds: overlap,
        participants: [
          { kind: "label", ref: labelA.id, text: labelA.text },
          { kind: "label", ref: labelB.id, text: labelB.text },
        ],
        metadata: {
          labelA: labelA.text,
          labelB: labelB.text,
          overlapWidth: formatNumber(overlap.maxX - overlap.minX),
          overlapHeight: formatNumber(overlap.maxY - overlap.minY),
        },
      })
    }

    for (const component of componentModels) {
      const overlap = intersectBounds(labelA.bounds, component.bounds)
      if (!overlap) continue

      issues.push({
        id: `${labelA.id}:${component.id}`,
        type: "label_symbol_overlap",
        severity: getSeverityFromBounds(overlap),
        summary: `${labelA.text} overlaps ${component.name}`,
        bounds: overlap,
        participants: [
          { kind: "label", ref: labelA.id, text: labelA.text },
          { kind: "component", ref: component.name },
        ],
        metadata: {
          label: labelA.text,
          component: component.name,
          overlapWidth: formatNumber(overlap.maxX - overlap.minX),
          overlapHeight: formatNumber(overlap.maxY - overlap.minY),
        },
      })
    }

    for (const trace of traceModels) {
      const hit = segmentIntersectsBounds(trace.from, trace.to, labelA.bounds)
      if (!hit) continue

      issues.push({
        id: `${labelA.id}:${trace.id}`,
        type: "text_crosses_connection",
        severity: "high",
        summary: `${labelA.text} crosses ${trace.ref}`,
        bounds: labelA.bounds,
        participants: [
          { kind: "label", ref: labelA.id, text: labelA.text },
          { kind: "trace", ref: trace.ref },
        ],
        metadata: {
          label: labelA.text,
          trace: trace.ref,
          traceFromX: formatNumber(trace.from.x),
          traceFromY: formatNumber(trace.from.y),
          traceToX: formatNumber(trace.to.x),
          traceToY: formatNumber(trace.to.y),
        },
      })
    }
  }

  return issues.sort((issueA, issueB) => {
    const severityDifference =
      severityRank[issueA.severity] - severityRank[issueB.severity]
    if (severityDifference !== 0) return severityDifference

    const typeDifference =
      issueTypeRank[issueA.type] - issueTypeRank[issueB.type]
    if (typeDifference !== 0) return typeDifference

    return issueA.id.localeCompare(issueB.id)
  })
}

const getComponentBounds = (component: SchematicComponent): Bounds => {
  const center = component.center ?? { x: 0, y: 0 }
  const width = component.size?.width ?? 0
  const height = component.size?.height ?? 0

  return {
    minX: center.x - width / 2,
    maxX: center.x + width / 2,
    minY: center.y - height / 2,
    maxY: center.y + height / 2,
  }
}

const getLabelBounds = (label: SchematicNetLabel): Bounds => {
  const fontSize = label.font_size ?? 0.18
  const height = fontSize * 1.4
  const width = Math.max(label.text.length * fontSize * 0.62, fontSize)
  const center =
    label.center ??
    getLabelCenterFromAnchor(
      label.anchor_position ?? { x: 0, y: 0 },
      width,
      height,
      label.anchor_side,
    )

  return {
    minX: center.x - width / 2,
    maxX: center.x + width / 2,
    minY: center.y - height / 2,
    maxY: center.y + height / 2,
  }
}

const getLabelCenterFromAnchor = (
  anchorPosition: Point,
  width: number,
  height: number,
  anchorSide?: string,
): Point => {
  if (anchorSide === "left") {
    return { x: anchorPosition.x + width / 2, y: anchorPosition.y }
  }

  if (anchorSide === "right") {
    return { x: anchorPosition.x - width / 2, y: anchorPosition.y }
  }

  if (anchorSide === "top") {
    return { x: anchorPosition.x, y: anchorPosition.y + height / 2 }
  }

  if (anchorSide === "bottom") {
    return { x: anchorPosition.x, y: anchorPosition.y - height / 2 }
  }

  return anchorPosition
}

const intersectBounds = (boundsA: Bounds, boundsB: Bounds): Bounds | null => {
  const minX = Math.max(boundsA.minX, boundsB.minX)
  const minY = Math.max(boundsA.minY, boundsB.minY)
  const maxX = Math.min(boundsA.maxX, boundsB.maxX)
  const maxY = Math.min(boundsA.maxY, boundsB.maxY)

  if (minX >= maxX || minY >= maxY) return null

  return { minX, minY, maxX, maxY }
}

const segmentIntersectsBounds = (from: Point, to: Point, bounds: Bounds) => {
  if (pointInsideBounds(from, bounds) || pointInsideBounds(to, bounds))
    return true

  const corners: [Point, Point][] = [
    [
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
    ],
    [
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
    ],
    [
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY },
    ],
    [
      { x: bounds.minX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.minY },
    ],
  ]

  return corners.some(([edgeStart, edgeEnd]) =>
    segmentsIntersect(from, to, edgeStart, edgeEnd),
  )
}

const pointInsideBounds = (point: Point, bounds: Bounds) =>
  point.x >= bounds.minX &&
  point.x <= bounds.maxX &&
  point.y >= bounds.minY &&
  point.y <= bounds.maxY

const segmentsIntersect = (a1: Point, a2: Point, b1: Point, b2: Point) => {
  const denominator =
    (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x)

  if (denominator === 0) return false

  const ua =
    ((b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)) /
    denominator
  const ub =
    ((a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)) /
    denominator

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
}

const getSeverityFromBounds = (bounds: Bounds): SchematicPlacementSeverity => {
  const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)

  if (area >= 0.04) return "high"
  if (area >= 0.015) return "medium"
  return "low"
}

const issueElementName: Record<SchematicPlacementIssueType, string> = {
  label_label_overlap: "LabelLabelOverlap",
  label_symbol_overlap: "LabelSymbolOverlap",
  text_crosses_connection: "TextCrossesConnection",
}

const renderIssue = (issue: SchematicPlacementIssue) => {
  const attrs = [`severity="${escapeXml(issue.severity)}"`]

  if (issue.type === "label_label_overlap") {
    attrs.push(
      `labelA="${escapeXml(String(issue.metadata.labelA))}"`,
      `labelB="${escapeXml(String(issue.metadata.labelB))}"`,
    )
  } else if (issue.type === "label_symbol_overlap") {
    attrs.push(
      `label="${escapeXml(String(issue.metadata.label))}"`,
      `component="${escapeXml(String(issue.metadata.component))}"`,
    )
  } else {
    attrs.push(
      `label="${escapeXml(String(issue.metadata.label))}"`,
      `trace="${escapeXml(String(issue.metadata.trace))}"`,
      `traceFromX="${issue.metadata.traceFromX}"`,
      `traceFromY="${issue.metadata.traceFromY}"`,
      `traceToX="${issue.metadata.traceToX}"`,
      `traceToY="${issue.metadata.traceToY}"`,
    )
  }

  const { minX, minY, maxX, maxY } = issue.bounds
  attrs.push(
    `left="${formatNumber(minX)}"`,
    `right="${formatNumber(maxX)}"`,
    `bottom="${formatNumber(minY)}"`,
    `top="${formatNumber(maxY)}"`,
    `width="${formatNumber(maxX - minX)}"`,
    `height="${formatNumber(maxY - minY)}"`,
  )

  return `<${issueElementName[issue.type]} ${attrs.join(" ")} />`
}

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const formatNumber = (value: number) => value.toFixed(2)
