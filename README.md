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

To execute only selected checks, pass `issueTypes`:

```ts
const analysis = analyzeSchematicPlacement(circuitJson, {
  issueTypes: ["TwoPinComponentHasInvertedRails", "ComponentOverlap"],
})
```

Omit `issueTypes` to run all checks, or pass `[]` to run none. Shared solvers
run once, with any prerequisites needed to preserve diagnostic deduplication;
only requested findings are returned. `analysis.getIssues({ issueTypes })`
filters already-computed results instead. Counts describe emitted findings;
zero counts for unselected types do not mean those checks ran.

Consumers that do not generate SVGs can import `analyzeSchematicPlacement` from
`@tscircuit/circuit-json-schematic-placement-analysis/analysis`. This source
entry point excludes the SVG artifact exports and requires TypeScript bundling.

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
wireless-mouse controller or sensor sheet, the five-sheet Trellis Core circuit,
or import a Circuit JSON `.json` array
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
The regression tests record each sheet's current issue counts. The sensor sheet's
three former `TraceCanBeSimplifiedByMovingComponent` warnings are suppressed
because their proposed moves cannot be verified safely. `NetLabelCollision`
counts grouped issue objects; its `collisionBounds` retains the individual
intersection regions.

Trace movement warnings reroute every attached, unbranched port-to-port trace
with `calculate-elbow`, respecting both port directions. The target trace must
have fewer turns than both its existing route and a reroute without moving;
no attached trace may gain turns or length. Proposed bodies and routes are
checked against same-sheet components, wires, text and net labels. Ambiguous
endpoints, junctions and attached labels are skipped rather than guessed.
This is a conservative check of specific elbow routes, not a complete autorouter.
When a valid C* or R* move can replace a U* move, the passive is preferred.
Only one verified alternative is suggested for each trace.
Trace warnings use a readable `traceName` (for example, `U3.pin1 to R11.pin1`)
instead of displaying internal trace IDs.
The issue's `suggestedTraces` contains the verified route points. Green overlays
show those routes and the proposed component bounds; red shows the original.
Reanalyze after applying a suggestion: separate suggestions are evaluated against
the original schematic, not as a combined move plan.

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

## Load directly in a browser

The release workflow builds `dist/browser.js` as a self-contained ES module and
publishes the package to GitHub Packages, following the handbook's built-package
workflow. jscdn serves the published file without a separate CDN upload:

```js
const { createSchematicPlacementIssueArtifacts } = await import(
  "https://jscdn.tscircuit.com/@tscircuit/circuit-json-schematic-placement-analysis/latest/dist/browser.js"
)
const artifacts = createSchematicPlacementIssueArtifacts(circuitJson)
```

No npm dependencies, TypeScript transpilation, or import map are needed in the
browser. The module runs locally on the supplied Circuit JSON. `latest` follows
the latest published release (jscdn caches it for up to ten minutes); replace it
with a version for a fixed release. Browsers cache imported modules for the life
of the page. The URL becomes available after the first successful publication.

Run `bun run build` to create the browser bundle locally. Source-based package
imports remain available through the existing root export.

## Schematic box diagnostics

Pin-padding warnings are grouped into one `SchematicPinPaddingToEdgeTooLarge`
issue per component, with combined affected sides and width/height guidance.
`paddingDetails` retains each measured gap; the scalar gap fields describe the
largest excess. Box width, pin padding and inner-label checks skip built-in
symbols and custom components with `is_box_with_pins: false`. Older box exports
that omit the flag remain supported.
