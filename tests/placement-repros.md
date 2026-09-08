# Common schematic placement repros

These TSX fixtures cover seven proposed placement analyzers before their solvers
are implemented. Each fixture uses `Circuit`, JSX components and `<trace />`
connections. PCB rendering is disabled; no Circuit JSON elements are inserted or
modified after rendering. `schMaxTraceDistance` keeps long connections visible so
the layout problem can be reviewed in the schematic.

Each case has one `test.failing` assertion for the proposed diagnostic below.
Rendering, connectivity checks, geometry preconditions and the stacked SVG
snapshot run in `beforeAll`, outside the expected failure. A render error,
disconnected fixture or snapshot mismatch therefore fails the suite normally.
The snapshot contains the actual analyzer output beneath the schematic; an empty
analysis panel means the current analyzer emitted nothing.

The diagnostic names are proposed contracts for subsequent implementations. The
tests do not prescribe fixed placement coordinates or production thresholds.
When implementing a diagnostic, replace its `test.failing` with `test` and add
valid-layout and exception coverage.

| Repro | Proposed diagnostic | Intended placement improvement |
| --- | --- | --- |
| [Scattered voltage divider](assets/voltage-divider-scattered.tsx) | `VoltageDividerNotCompact` | Bring R1/R2 and their ADC tap into a recognizable compact divider. Accept both clear vertical and L-shaped drawings. |
| [Pull resistors on the wrong side](assets/pull-resistors-wrong-side.tsx) | `PullResistorOnWrongSide` | Place the RESET_N pull-up above its signal and the BOOT pull-down below its signal. The host ports carry explicit pull-up/pull-down requirements. |
| [Misaligned series chain](assets/series-chain-misaligned.tsx) | `SeriesChainNotAligned` | Align the R1-L1-R2 chain and its connected pins. There is no diode or multi-pin component, distinguishing this from the diode-specific solver and PR #44. |
| [Scattered feedback network](assets/feedback-network-scattered.tsx) | `FeedbackNetworkNotCompact` | Bring the gain-setting R1 back toward U1 while retaining the output-to-inverting-input feedback path. Either side of the amplifier may be appropriate. |
| [Inconsistent repeated circuit](assets/repeated-circuit-inconsistent.tsx) | `RepeatedCircuitLayoutInconsistent` | Make the R3/C3 relative layout consistent with the first two RC channels. The three channels have independent input, output and return nets. |
| [Wire crossing text](assets/wire-text-collision.tsx) | `SchematicTextCollision` | Separate arbitrary rendered text from the wire. Both ANALOG INPUT and DIGITAL STATUS reproduce the same geometry problem. |
| [Text crossing a component](assets/schematic-text-collisions.tsx) | `SchematicTextCollision` | Move the free NOTE annotation clear of U1's body. This is not a label belonging to the symbol. |
| [Text crossing other text](assets/schematic-text-collisions.tsx) | `SchematicTextCollision` | Separate the independent TEST POINTS and SERVICE ONLY annotations. |
| [Scattered functional block](assets/functional-block-scattered.tsx) | `FunctionalBlockNotGrouped` | Bring the compact R1/C1 reset network toward U1. U2 is unrelated despite lying between the network and its host. |

Tests and snapshots use the same basename under `cases/` and
`cases/__snapshots__/`. For example:

- [Divider test](cases/voltage-divider-scattered.test.ts)
- [Divider stacked snapshot](cases/__snapshots__/voltage-divider-scattered.snap.svg)

The divider and series-chain repros already receive generic
`TraceCanBeSimplifiedByMovingComponent` suggestions. Their proposed analyzers
must demonstrate useful grouping or alignment improvements beyond those existing
moves; merely emitting a new diagnostic name is not sufficient justification.

There are nine expected-failure tests for seven analyzer proposals. Text clearance
has three tests and four stacked snapshots, including two annotation wordings in
the wire case. These are initial repros, not complete solver acceptance suites.
Schematic grouping distances are readability heuristics, not PCB placement
constraints.

## General schematic text clearance

`SchematicTextCollision` is a content-independent geometry diagnostic, not an
ANALOG INPUT or analog-circuit rule. A general implementation should consider
rendered text against trace segments, unrelated symbol bodies and other text.
This includes free annotations and, where their rendered bounds are available,
reference designators, values, pin labels and net-label text. Use font size,
anchor, rotation, sheet and ownership when determining bounds and valid contact.

The existing `ComponentNetLabelCollisionSolver` handles some net-label/label and
net-label/component collisions, and `SchematicBoxInnerLabelCollisionSolver`
handles collisions among internal pin labels. Extend or share their geometry
and deduplicate diagnostics instead of emitting the same collision twice.
Neither currently checks arbitrary free `schematic_text` against wires, bodies
or other free text; the new repros isolate that gap.

Preserve intentional labels inside their own symbols, net-label attachment points
and text in other sheets. Ignore empty strings. Touching a text anchor or its
own connector is not equivalent to crossing the visible text. Implementation
tests should include these valid cases, different font sizes and rotations, and
reference/value collisions. Moving text is often sufficient; preserve electrical
connectivity and report the actual colliding objects.

Run all checks with:

```sh
bun test
bun run typecheck
bun run format:check
```
