# circuit-json-schematic-placement-analysis

This package analyzes the readability of a `circuit.json` schematic.

It is used to find layout problems that make schematics harder for humans or AI
agents to interpret, such as overlapping net labels or text placed directly on
top of connections.

The output is XML-first and AI-friendly. Each report includes summary metadata
at the top level plus nested issue details with bounds, participants, and
structured metadata.

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

The XML output uses:

- PascalCase elements
- camelCase attributes
- nested issue metadata intended to be easy for AI tools to parse

Example:

```xml
<SchematicPlacementAnalysisReport
  requestedTarget="all"
  resolvedTarget="all"
  targetKind="circuit"
  issueCount="1"
  highSeverityCount="1"
  mediumSeverityCount="0"
  lowSeverityCount="0"
  labelLabelOverlapCount="0"
  labelSymbolOverlapCount="1"
  textCrossesConnectionCount="0"
>
  <Issues>
    <Issue
      id="symbol_overlap_label:schematic_component_0"
      type="label_symbol_overlap"
      severity="high"
      summary="VREF overlaps U1"
    >
      <Bounds minX="-0.22" minY="-0.13" maxX="0.22" maxY="0.13" />
      <Participants>
        <Participant
          kind="label"
          ref="symbol_overlap_label"
          text="VREF"
        />
        <Participant kind="component" ref="U1" />
      </Participants>
      <Metadata>
        <Entry key="label" value="VREF" />
        <Entry key="component" value="U1" />
        <Entry key="overlapWidth" value="0.45" />
        <Entry key="overlapHeight" value="0.25" />
      </Metadata>
    </Issue>
  </Issues>
</SchematicPlacementAnalysisReport>
```

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
