# circuit-json-schematic-placement-analysis

Analyze `circuit-json` schematic placement and emit schematic placement issues
such as overlapping components, together with only the schematic box positions
that provide context for those issues.

The analysis also detects when vertically shifting one of two connected
components would align multiple opposing pin pairs and simplify their traces.

This is intended for placement-focused diagnostics. Multi-sheet results are
grouped by schematic sheet; circuits with zero or one sheet keep a compact flat
output. Each result contains issue nodes and, when useful,
`<SchematicBoxPlacement />` rows for the components involved in those issues.
Circuits without issues produce an empty string.

## Install

Install directly from GitHub codeload:

```sh
bun add https://codeload.github.com/tscircuit/circuit-json-schematic-placement-analysis/tar.gz/refs/heads/main
```

## Minimal Usage

```ts
import { analyzeSchematicPlacement } from "@tscircuit/circuit-json-schematic-placement-analysis"

const analysis = analyzeSchematicPlacement(circuitJson)

console.log(analysis.getLineItems())
console.log(analysis.toString())
```

## Sample Output

```xml
<SchematicBoxPositions>
  <SchematicBoxPlacement componentName="U1" positionAnchor="center" schX="0" schY="0" width="2.5" height="1.25" />
  <SchematicBoxPlacement componentName="R2" positionAnchor="center" schX="1" schY="0.5" width="1" height="0.5" />
</SchematicBoxPositions>
<SchematicPlacementIssues>
  <ComponentOverlap component1Name="U1" component2Name="R2" component1SchX="0" component1SchY="0" component2SchX="1" component2SchY="0.5" overlapWidth="0.25" overlapHeight="0.194">
    <OverlapCorrectionSuggestion target="R2" newSchX="1.25" deltaSchX="+0.25" />
    <OverlapCorrectionSuggestion target="R2" newSchY="0.694" deltaSchY="+0.194" />
  </ComponentOverlap>
</SchematicPlacementIssues>
```

## Feedback and pull-resistor placement

Two advisory diagnostics recognize electrical roles before checking placement:

- `FeedbackNetworkNotCompact`: finds two-terminal resistors and capacitors
  directly connecting a `simple_op_amp` output to its inverting input, including
  parallel R/C feedback. It suggests grouping a distant member with the amplifier
  when their shortest bounding-box gap exceeds both 4 schematic units and three
  times that member's largest dimension. Compact loops above or below the
  amplifier are accepted. Generic chips, positive feedback, series feedback
  networks, and shared summing nodes are outside this initial scope.
- `PullResistorOnWrongSide`: requires a nonzero resistor between a declared
  power/ground net and a pin marked `needs_external_pullup` or
  `needs_external_pulldown`. It suggests the conventional above/below placement
  only when the entire resistor is more than 1.5 schematic units on the opposite
  side of the actual signal pin. Small offsets and signal-level horizontal
  resistors are accepted. Shared buses, conflicting or missing role metadata,
  and additional resistor/device branches are skipped; a local shunt capacitor
  to ground is allowed.

These thresholds are schematic readability heuristics, not electrical errors or
PCB placement constraints. Both checks respect sheet, subcircuit, and explicit
component-group boundaries and skip ambiguous symbol representations. They
resolve connectivity from source IDs, traces, and connectivity keys rather than
net display names. Suggestions do not move components or claim a collision-free
replacement position. Structured results include the involved components and
measured gaps; string output includes their names and the readability suggestion.

## Test

```sh
bun test
```

SVG snapshot tests use `bun-match-svg`, `circuit-to-svg`, and `stack-svgs`.
The fixture helper renders the schematic SVG on top and the analyzer output in
red text underneath so placement issues are easy to inspect visually.
