# circuit-json-schematic-placement-analysis

Analyze schematic placement issues in Circuit JSON.

## Install

This package is intended to be installed directly from GitHub codeload:

```bash
bun add https://codeload.github.com/tscircuit/circuit-json-schematic-placement-analysis/tar.gz/refs/heads/main
```

## Usage

```ts
import { SchematicPlacementAnalyzer } from "circuit-json-schematic-placement-analysis"

const analyzer = new SchematicPlacementAnalyzer(circuitJson)

console.log(analyzer.issues)
console.log(analyzer.toString())
```

## Development

```bash
bun install
bun test
```

SVG snapshot tests use `bun-match-svg`, `circuit-to-svg`, and `stack-svgs`.
The fixture helper renders the schematic SVG on top and the analyzer output in
red text underneath so placement issues are easy to inspect visually.
