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

## Test

```sh
bun test
```

SVG snapshot tests use `bun-match-svg`, `circuit-to-svg`, and `stack-svgs`.
The fixture helper renders the schematic SVG on top and the analyzer output in
red text underneath so placement issues are easy to inspect visually.

## Inspect real schematic repros

Run `bun start` and open the `real-schematics` Cosmos fixture. Select a complete
wireless-mouse controller or sensor sheet, or import a Circuit JSON `.json` array
from another project. Imports are analyzed locally in the browser.

The table shows counts for every issue type, including zeros, both for the
selected sheet and the entire export. Select a type to filter the issue list and
its overlay, then isolate a numbered issue to inspect it. Red highlights mark
reported component bounds, trace segments, label positions, or collision regions;
dashed blue boxes provide component context. The SVG viewBox frames the selected
issue geometry with half a bounds-width/height of padding on each side; thin overlay
strokes stay thin when zooming. Zoom and scroll to inspect details,
toggle the overlay to compare, and download the current SVG or JSON report.

The built-in examples reuse the unchanged complete sheet imports from
`MustafaMulla29/wireless-mouse-pcb` in `tests/assets/wireless-mouse-*-sheet.ts`.
Current regression baselines are one `CrystalNotCenteredOverLoadCapacitors` issue
on the controller sheet and three `TraceCanBeSimplifiedByMovingComponent` issues
on the sensor sheet; all other counts are zero. Counts record analyzer behavior,
not whether a report is a true positive. `NetLabelCollision` counts grouped issue
objects; its `collisionBounds` retains the individual intersection regions.

Programmatically, use `analysis.getIssueCounts()` and
`analysis.getIssues({ issueTypes: ["ComponentOverlap"], schematicSheetId })`.
Omit `issueTypes` for all types, or pass `[]` for none. Omit `schematicSheetId`
for all sheets, or pass `""` for unassigned elements. These methods filter the
existing results without rerunning solvers.

## Per-issue SVG artifacts for CLI checks

`createSchematicPlacementIssueArtifacts(circuitJson, options?)` returns one
self-contained SVG per emitted issue. Each SVG frames only that issue's geometry
and involved components, with half a bounds-width/height of padding on each side,
and shows only that issue's XML description below the schematic. Other issue
overlays, descriptions, and count summaries are excluded.

The function performs no filesystem writes. A CLI command such as
`tsci check schematic-placement` can save the returned artifacts:

```ts
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "@tscircuit/circuit-json-schematic-placement-analysis"

const analysis = analyzeSchematicPlacement(circuitJson)
const artifacts = createSchematicPlacementIssueArtifacts(circuitJson, { analysis })
const outputDir = "dist/schematic-placement"
if (artifacts.length) await mkdir(outputDir, { recursive: true })
for (const artifact of artifacts) {
  await writeFile(join(outputDir, artifact.fileName), artifact.content)
}
```

Each artifact includes `issueIndex`, `issue`, `schematicSheetId`, unpadded `bounds`
(in schematic coordinates, Y up), `descriptionXml`, `fileName`, `contentType`, and
SVG `content`. Filenames retain the original issue index when filtered. Options
support `issueTypes`, `schematicSheetId`, and schematic-panel `width`/`height`;
the XML panel adds to the height. No matching issues returns `[]`. Bounds are
absent only if an issue has no locatable geometry or involved components.

## Vercel previews

The linked Vercel project builds the Cosmos fixture gallery for pull requests.
`vercel.json` runs `bun run build:site` and serves `cosmos-export`; use the
Vercel preview on the PR and select `real-schematics` to inspect the repros.
