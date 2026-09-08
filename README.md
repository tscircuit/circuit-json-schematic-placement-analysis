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

## Text clearance and reset grouping

`SchematicTextClearanceSolver` reports `SchematicTextCollision` when sheet-space
`schematic_text` overlaps a wire, another text element, or an unrelated component
body. It covers free annotations, generated section headings, and reference/value
labels represented as text elements. Geometry follows font size, anchors, rotation,
and individual lines. Empty text, wire contact along the boundary, text in other
sheets, and labels inside their own component are excluded. Font advances are
approximations of sans-serif text, not exact glyph measurements. Identical
overprinted labels are deduplicated. Custom path/circle symbols without body
geometry are excluded from component-body checks to avoid flagging their empty
bounding-box corners.

Each issue identifies both objects and their bounds. When a clear position is
found among the modeled objects, it includes a suggested text-anchor position.
Apply one suggestion and reanalyze; suggestions from separate issues are not a
simultaneous layout solution. Renderer-only pin labels, net-label glyphs, and
symbol-template text are outside this solver's geometry. Existing net-label and
internal pin-label collision solvers continue to handle their respective cases.

`ResetNetworkGroupingSolver` reports `ResetNetworkNotGrouped` for a recognizable
reset pin with one resistor to a known supply, one capacitor to ground, and optional
test points. It uses electrical connectivity across wires and labels, never net
names alone. It excludes ordinary filters, ambiguous/shared reset hosts, unsupported
topologies, and networks split across schematic sheets, subcircuits, or groups.

The distance heuristic measures from the reset pin to the nearest point of each
resistor/capacitor body's bounds. It warns beyond the larger of 6 schematic units or three
times the largest resistor/capacitor symbol dimension. A remote test point alone
does not trigger a grouping issue. The result names the network to group;
it does not prescribe component coordinates or change wiring. This is schematic
readability guidance, not a PCB or electrical distance requirement.

## Test

```sh
bun test
```

SVG snapshot tests use `bun-match-svg`, `circuit-to-svg`, and `stack-svgs`.
The fixture helper renders the schematic SVG on top and the analyzer output in
red text underneath so placement issues are easy to inspect visually.

See [common schematic placement repros](tests/placement-repros.md) for TSX fixtures and expected-failure tests covering proposed analyzers.
