# Common schematic placement repros

These original TSX fixtures cover seven placement proposals, with text clearance
and reset grouping now implemented. Each fixture uses `Circuit`, JSX components
and native traces
or `connections` props. PCB rendering is disabled; no Circuit JSON elements are
inserted or modified after rendering. The synthetic fixtures keep long traces
visible; the real pedometer reduction preserves its original auto-label settings.

The text-clearance and reset-network cases now use ordinary passing tests.
Five remaining proposal cases use `test.failing` for their proposed diagnostics.
Rendering, connectivity checks, geometry preconditions and the stacked SVG
snapshot run in `beforeAll`, outside the expected failure. A render error,
disconnected fixture or snapshot mismatch therefore fails the suite normally.
The snapshot contains the actual analyzer output beneath the schematic; an empty
analysis panel means the current analyzer emitted nothing.

The remaining expected-failure diagnostic names are proposed contracts for
subsequent implementations. The tests do not prescribe fixed placement coordinates or production thresholds.
When implementing a diagnostic, replace its `test.failing` with `test` and add
valid-layout and exception coverage.

| Repro | Diagnostic (implemented or proposed) | Intended placement improvement |
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

The original eleven repro tests now comprise six passing tests and five
expected-failure tests, with thirteen stacked snapshots for seven proposals.
Among these original repros, text clearance has four tests and five snapshots,
including two annotation wordings in the wire case. Additional text and reset
acceptance tests cover valid layouts, geometry,
connectivity, sheet/group boundaries, and the original pedometer export.
Schematic grouping distances are readability heuristics, not PCB placement
constraints.

The [real-circuit audit](real-circuit-audit.md) records all 21 inspected sheets,
source fingerprints, published references, existing-analyzer overlap and the two
new reductions. Only text clearance and support-network grouping gained concrete
new repro evidence in that audit; the remaining synthetic proposals still need
further validation.

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
`SchematicTextClearanceSolver` now checks sheet-space `schematic_text` against
wires, unrelated bodies and other text. It includes explicit reference/value
text elements while leaving renderer-only pin labels and net-label glyphs to
existing coverage; it does not duplicate the existing net-label diagnostics.

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

## Original pedometer regression

`assets/pedometer-original-sheet.json` preserves every `source_*` and
`schematic_*` record from the saved 78-component Codex pedometer export; only
non-schematic domains such as PCB/CAD are omitted. Its MCU has all 41 pins and
the original 2.2 × 4.2 symbol. All positions, labels and wire edges are unchanged.
The regression runs directly against that data without rerouting and checks that
the reset issue identifies U1.RSTN with R8, C21 and TP5.

Source export SHA-256:
`5c14f220ca42a3ce89d75cdd6b5266423b057ef6bd85cb31873b8726f8650e5c`.
See the original source location and audit context in [real-circuit-audit.md](real-circuit-audit.md).
The TSX pedometer fixture remains a reduced, freshly routed companion with a
compact control; it is not described as an exact full-sheet reproduction.

The two reset repros use the narrower `ResetNetworkNotGrouped` contract in place
of the earlier generic `FunctionalBlockNotGrouped` proposal. Other functional
blocks, including feedback networks, are not implemented by this reset solver.

The additional acceptance tests sometimes change only text positions, font sizes,
connectivity cache fields or equivalent wire segmentation to verify those
representations and to apply suggested text moves. The real-source JSON fixture
and the eleven original TSX repro renderings are not modified by those tests.
