# circuit-json-schematic-placement-analysis

Analyze `circuit-json` schematic placement, report schematic box positions, and
emit schematic placement issues such as overlapping components.

This is intended for placement-focused diagnostics. It emits
`<SchematicBoxPlacement />` rows inside `<SchematicBoxPositions>` and issue nodes
inside `<SchematicPlacementIssues>` when problems are detected.

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
<SchematicBoxPlacement componentName="U1" positionAnchor="center" schX="10" schY="-3.125" width="2.5" height="1.25" />
</SchematicBoxPositions>
<SchematicPlacementIssues>
<ComponentOverlap component1Name="U1" component2Name="R2" component1SchX="0" component1SchY="0" component2SchX="1" component2SchY="0.5" overlapCenterSchX="0.5" overlapCenterSchY="0.25" overlapWidth="2" overlapHeight="1.5" />
</SchematicPlacementIssues>
```

## Test

```sh
bun test
```

SVG snapshot tests use `bun-match-svg`, `circuit-to-svg`, and `stack-svgs`.
The fixture helper renders the schematic SVG on top and the analyzer output in
red text underneath so placement issues are easy to inspect visually.
