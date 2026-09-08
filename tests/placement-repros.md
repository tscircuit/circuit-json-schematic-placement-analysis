# Common schematic placement repros

These TSX fixtures describe missing placement diagnostics before their solvers are
implemented. Each fixture uses `Circuit`, JSX components and `<trace />`
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
| [Scattered RC filter](assets/rc-filter-scattered.tsx) | `RCFilterNotCompact` | Bring C1 beside the R1/U2 filter node. C1 is already vertical; the missing behavior concerns grouping. |
| [Misaligned series chain](assets/series-chain-misaligned.tsx) | `SeriesChainNotAligned` | Align the R1-L1-R2 chain and its connected pins. There is no diode or multi-pin component, distinguishing this from the diode-specific solver and PR #44. |
| [Scattered feedback network](assets/feedback-network-scattered.tsx) | `FeedbackNetworkNotCompact` | Bring the gain-setting R1 back toward U1 while retaining the output-to-inverting-input feedback path. Either side of the amplifier may be appropriate. |
| [Inconsistent repeated circuit](assets/repeated-circuit-inconsistent.tsx) | `RepeatedCircuitLayoutInconsistent` | Make the R3/C3 relative layout consistent with the first two RC channels. The three channels have independent input, output and return nets. |
| [Wire crossing text](assets/wire-text-collision.tsx) | `WireTextCollision` | Separate the wire from the rendered ANALOG INPUT text. Its large font extends beyond the router's text obstacle. |
| [Reversed signal flow](assets/signal-flow-reversed.tsx) | `SignalFlowReversed` | Place the UART transmitter before its receiver in the reading direction. TX/RX source-port hints identify the intended direction; this is not a bidirectional bus or a feedback path. |
| [Scattered functional block](assets/functional-block-scattered.tsx) | `FunctionalBlockNotGrouped` | Bring the compact R1/C1 reset network toward U1. U2 is unrelated despite lying between the network and its host. |
| [Four-way junction](assets/four-way-junction.tsx) | `FourWayJunction` | Stagger the four connected arms into two T-junctions without changing the net. Setup checks that the rendered wires and junction really form a four-way connection. |

Tests and snapshots use the same basename under `cases/` and
`cases/__snapshots__/`. For example:

- [Divider test](cases/voltage-divider-scattered.test.ts)
- [Divider stacked snapshot](cases/__snapshots__/voltage-divider-scattered.snap.svg)

The divider, RC filter and series-chain repros already receive generic
`TraceCanBeSimplifiedByMovingComponent` suggestions. Those local bend reductions
do not diagnose the complete circuit pattern, so the expected failures require
the corresponding proposed diagnostic specifically.

These repros cover one concrete layout per analyzer proposal, with both pull
directions in the pull-resistor case. They are not complete solver acceptance
suites: high-pass filters, I2C pull-up pairs, wire/body collisions, mirrored
channels, bidirectional interfaces and other valid exceptions belong in the
subsequent implementation PRs. Schematic grouping distances are readability
heuristics, not PCB placement constraints.

Run all checks with:

```sh
bun test
bun run typecheck
bun run format:check
```
