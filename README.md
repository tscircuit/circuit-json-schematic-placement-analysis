# circuit-json-schematic-placement-analysis

Analyze `circuit-json` schematic placement, report schematic box positions, and
surface placement issues.

This is intended for placement-focused diagnostics. It emits
`<SchematicBoxPlacement />` rows inside `<SchematicBoxPositions>`, and includes
`<SchematicPlacementIssues>` when checks find placement problems such as
horizontal capacitor symbols.

## Install

```sh
bun add @tscircuit/circuit-json-schematic-placement-analysis
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
<SchematicBoxPlacement positionAnchor="center" schX="10" schY="-3.125" width="2.5" height="1.25" />
<SchematicPlacementIssues>
<CapacitorSymbolHorizontal positionAnchor="center" schX="10" schY="-3.125" width="2.5" height="1.25" />
</SchematicPlacementIssues>
</SchematicBoxPositions>
```

## Test

```sh
bun test
```
