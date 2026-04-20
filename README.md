# circuit-json-schematic-placement-analysis

This package analyzes the readability of a `circuit.json` schematic.

It is used to find layout problems that make schematics harder for humans or AI
agents to interpret, such as overlapping net labels or text placed directly on
top of connections.

The output is XML-first and AI-friendly. Each issue is rendered as a single
self-closing element with semantic attributes — bounds, participants, and
issue-specific data are all flattened onto the issue itself, with no
wrapper elements. Reports with no issues render to an empty string.

## Usage

To analyze the whole schematic at once:

```ts
import { analyzeAllSchematicPlacements } from "circuit-json-schematic-placement-analysis"

const analysis = analyzeAllSchematicPlacements(circuitJson)

console.log(analysis.toString())
console.log(analysis.listIssues())
console.log(analysis.issueCount)
```

To analyze only the issues involving one component:

```ts
import { analyzeComponentSchematicPlacement } from "circuit-json-schematic-placement-analysis"

const analysis = analyzeComponentSchematicPlacement(circuitJson, "R1")

console.log(analysis.toString())
console.log(analysis.listIssues())
```

## Return Value

Both entrypoints return a `SchematicPlacementAnalysisReport`.

It exposes:

- `toString()` for XML output
- `listIssues()` for structured issue objects
- `issueCount`
- `highSeverityCount`
- `mediumSeverityCount`
- `lowSeverityCount`
- `requestedTarget`
- `resolvedTarget`
- `targetKind`

Each issue includes:

- `id`
- `type`
- `severity`
- `summary`
- `bounds`
- `participants`
- `metadata`

Example issue object:

```ts
{
  id: "schematic_net_label_overlap_a:schematic_component_0",
  type: "label_symbol_overlap",
  severity: "high",
  summary: "U1_VCP/C10_pin2 overlaps R1",
  bounds: {
    minX: -0.55,
    minY: -0.13,
    maxX: 0.55,
    maxY: 0.13,
  },
  participants: [
    {
      kind: "label",
      ref: "schematic_net_label_overlap_a",
      text: "U1_VCP/C10_pin2",
    },
    {
      kind: "component",
      ref: "R1",
    },
  ],
  metadata: {
    label: "U1_VCP/C10_pin2",
    component: "R1",
    overlapWidth: "1.10",
    overlapHeight: "0.25",
  },
}
```

## Issue Types

The current analyzer detects:

- `label_label_overlap`
- `label_symbol_overlap`
- `text_crosses_connection`

Severity is currently one of:

- `high`
- `medium`
- `low`

## XML Output

The XML output is intentionally flat — each issue is one self-closing element,
with bounds and identifiers inlined as attributes. Multiple issues are
separated by a blank line. Issue-type-specific element names carry the
semantic, so no `type=...` attribute is needed.

Example:

```xml
<LabelLabelOverlap severity="medium" labelA="VIN" labelB="GND" left="0.09" right="0.17" bottom="-0.13" top="0.13" width="0.07" height="0.25" />

<LabelSymbolOverlap severity="high" label="VREF" component="U1" left="-0.22" right="0.22" bottom="-0.13" top="0.13" width="0.45" height="0.25" />

<TextCrossesConnection severity="high" label="CLK" trace="U1.CLK-J1.CLK" traceFromX="-0.50" traceFromY="0.00" traceToX="0.50" traceToY="0.00" left="-0.17" right="0.17" bottom="-0.13" top="0.13" width="0.33" height="0.25" />
```

Issue elements:

- `<LabelLabelOverlap>` — `labelA`, `labelB`
- `<LabelSymbolOverlap>` — `label`, `component`
- `<TextCrossesConnection>` — `label`, `trace`, `traceFromX/Y`, `traceToX/Y`

All issues share `severity` plus the bounding box (`left`, `right`, `bottom`,
`top`, `width`, `height`).

Full structured data (participants, metadata, ids, summary, target/kind, and
severity counts) remains available via the `SchematicPlacementAnalysisReport`
class — see [`listIssues()`](#return-value) and the report properties.

## What It Helps Find

This package is aimed at common schematic readability failures such as:

- Net labels colliding with each other
- Net labels sitting on top of component symbols
- Text crossing traces or connections
- Component-scoped hotspots that make one part hard to read in context

## Tests

Tests are asset-backed, similar to
`circuit-json-trace-length-analysis`.

Each test:

- loads a checked-in `circuit.json` fixture from `tests/assets`
- snapshots the XML report with `toMatchInlineSnapshot`
- snapshots the rendered schematic SVG with `toMatchSvgSnapshot(import.meta.path)`

This keeps both the machine-readable report and the visual rendering easy to
review in diffs.
