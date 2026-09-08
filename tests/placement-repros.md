# Common schematic placement repros

These TSX fixtures cover seven proposed placement analyzers with independent text clearance
and reset-network grouping now implemented. Each fixture uses `Circuit`, JSX components and native traces
or `connections` props. PCB rendering is disabled; no Circuit JSON elements are
inserted or modified after rendering. The synthetic fixtures keep long traces
visible; the real pedometer reduction preserves its original auto-label settings.

The six text/reset repros use ordinary passing tests. The other five proposals
keep their `test.failing` assertions.
Rendering, connectivity checks, geometry preconditions and the stacked SVG
snapshot run in `beforeAll`, outside the expected failure. A render error,
disconnected fixture or snapshot mismatch therefore fails the suite normally.
The snapshot contains the actual analyzer output beneath the schematic; an empty
analysis panel means the current analyzer emitted nothing.

The remaining expected-failure diagnostics are proposed contracts for future implementations. The
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
| [Scattered functional block](assets/functional-block-scattered.tsx) | `ResetNetworkNotGrouped` | Bring the compact R1/C1 reset network toward U1. U2 is unrelated despite lying between the network and its host. |
| [RP2040 generated heading](assets/rp2040-section-heading-wire-collision.tsx) | `SchematicTextCollision` | Keep the generated section title clear of the supply bus joining the real circuit's three pull-ups. |
| [Pedometer reset network](assets/pedometer-reset-network-scattered.tsx) | `ResetNetworkNotGrouped` | Bring R8/C21/TP5 toward U1; the existing sideways move of C21 leaves it 28 schematic units below its host. Includes a compact control with identical connectivity. |

Tests and snapshots use the same basename under `cases/` and
`cases/__snapshots__/`. For example:

- [Divider test](cases/voltage-divider-scattered.test.ts)
- [Divider stacked snapshot](cases/__snapshots__/voltage-divider-scattered.snap.svg)

The divider and series-chain repros already receive generic
`TraceCanBeSimplifiedByMovingComponent` suggestions. Their proposed analyzers
must demonstrate useful grouping or alignment improvements beyond those existing
moves; merely emitting a new diagnostic name is not sufficient justification.

The original eleven repro tests now comprise six passing tests and five expected
failures, with thirteen stacked snapshots for seven proposals. Text clearance has four tests and five stacked snapshots,
including two annotation wordings in the wire case. These are initial repros,
not complete solver acceptance suites.
Schematic grouping distances are readability heuristics, not PCB placement
constraints.

The [real-circuit audit](real-circuit-audit.md) records all 21 inspected sheets,
source fingerprints, published references, existing-analyzer overlap and the two
new reductions. Only text clearance and support-network grouping gained concrete
new repro evidence in that audit; the remaining synthetic proposals still need
further validation.

## Independent schematic text clearance

`SchematicTextCollision` checks independent sheet-space annotations and generated
section headings against wires, component bounds and other independent text.
It does not reposition component reference/value labels, symbol text, or
trace-owned labels. The existing verbose-net-label fixture also verifies that a
component-owned reference crossing a wire gets no independent-text move.

The reset repros use `ResetNetworkNotGrouped` for their specific RC topology.
The pedometer case includes a compact control: no grouping diagnostic is expected
for that layout. Its TSX fixture remains a reduced rendering; it is not an exact
copy of the original full sheet. See the existing real-circuit audit for provenance.

Run all checks with:

```sh
bun test
bun run typecheck
bun run format:check
```
