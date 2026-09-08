# Real-circuit schematic audit — 8 September 2026

Reviewed 21 sheets/views: every saved schematic sheet in the six Desktop circuit projects, the separate 78-component Codex pedometer, and a fresh rendering of the one-component connector example. This is a visual placement audit, not an electrical or fabrication sign-off.

The strongest additional evidence is for **general text clearance** and **functional support-network grouping**. Two TSX repros were added to PR #46. This audit does not establish new real-world evidence for every other original proposal; the older synthetic repros remain proposals requiring further validation.

## New repros

### Generated section heading crossed by a wire

Source: `rp2040-bldc-controller`, sheet 7, Temperature & Hardware Protection. Its V3V3 bus crosses the generated section title. The reduced fixture retains R_TEMP_SCL/R_TEMP_SDA/R_TEMP_ALERT, values 4.7k/4.7k/10k, x coordinates -6/-4/-2, y=3, rotation 270°, and the original section title. The section is rendered on a single sheet, with the rest of the board omitted. Core generates both the title and routed wires; no post-render JSON edits or manually positioned annotation are involved.

This is a placement issue because moving the heading to a clear region fixes legibility without changing connectivity. A general analyzer should identify the colliding text and trace, using rendered bounds. The heading's wording is incidental. The reduced fixture currently produces no placement diagnostics on main or PR #44.

Readable reference: [TI TMP102 datasheet, Figure 7-1, page 20](https://www.ti.com/lit/ds/symlink/tmp102.pdf#page=20). The same three-pull-up arrangement is recognizable and its descriptive text has clear space. This is a visual comparison, not a claim that TI specifies an exact schematic clearance distance.

### Pedometer reset network scattered across the component grid

Source: the 78-component Codex pedometer, `index.circuit.tsx`. U1 is at (0,0), R8 at (-12,-40), C21 at (0,-28), and TP5 at (14,-26.919). R8 is 100kΩ from RESETN to V3; C21 is 100nF from RESETN to ground. The source's generic passive grid puts the parts far from the host and each other. The fixture retains these names, values, connections, positions and auto-label settings, reducing U1 to its RSTN pin and omitting unrelated circuitry and PCB details.

Readable reference: [TI SWRA834A, Figure 3-1, page 5](https://www.ti.com/lit/pdf/swra834#page=5). R1 and C92 form a compact reset branch beside the CC2340R53 MCU. The visual lesson is local support-network grouping; it does not prescribe a mandatory orientation or a PCB distance.

The full saved pedometer yields only a crystal-placement issue. The smaller TSX fixture additionally triggers trace simplification: move C21 right by 1.35, keeping y=-28. That reduces bends but leaves the reset capacitor 28 schematic units below U1 and does not group R8. The test explicitly checks this distinction. PR #44 produces the same existing suggestion. A compact control moves only R8/C21/TP5, preserves all nets, and generates no current placement diagnostic.

Future grouping logic must resolve connectivity across labels, exclude shared supply/ground nets as grouping evidence, respect sheets and intentionally separate blocks, and avoid declaring all long or labeled connections wrong. Exact distances here record the observed source; they are not proposed universal thresholds.

## Sheet-by-sheet findings

The issue count below is the number of current diagnostic objects, not the number of independently verified defects. Some existing suggestions may themselves need refinement. Each saved sheet was rendered separately from Circuit JSON; the multi-sheet projects' `dist/index/schematic.svg` exports alone do not show every sheet.

| Project / sheet | Components | Existing issue objects | Visual finding |
| --- | ---: | ---: | --- |
| drv8305-tida01330-motor-driver / communication-interface-block | 12 | 7 | CAN transceiver, choke and termination are recognizable. C27 orientation and detours already receive diagnostics. No additional placement repro selected. |
| drv8305-tida01330-motor-driver / light-driver-block | 4 | 0 | The LED connector and low-side transistor form a readable branch. No current diagnostic; no convincing missing placement rule. |
| drv8305-tida01330-motor-driver / mcu-block | 7 | 5 | Reset and oscillator support stay near the MCU. Inverted-looking supply branches and label proximity warrant review, but this sample does not establish a separate grouping gap. |
| drv8305-tida01330-motor-driver / motor-driver-block | 40 | 16 | Three phase-support networks are visible. Unusual charge-pump capacitor orientations and some bends are already reported; isolated labels and missing external stages also reflect the intentionally reduced source. |
| drv8305-tida01330-motor-driver / position-feedback-block | 6 | 12 | Both Hall-sensor channels use matching component positions. HALL_1 overlaps the pull-up value visually; the existing label geometry needs investigation before calling this a new general analyzer. |
| drv8305-tida01330-motor-driver / power-supply-block | 25 | 13 | The LM5050 functional topology matches the TI reference. Bent routes, horizontal C2 and diode/resistor alignment already receive diagnostics. Keep circuit-value text clearance as a follow-up observation. |
| pedometer / index | 72 | 20 | The older Desktop layout is crowded around the charger and level shifter. Existing overlap, label, crystal and trace diagnostics already report problems; no duplicate repro added. |
| rp2040-bldc-controller / RP2040 Control, USB & Debug | 39 | 3 | RP2040 controller: sections are identifiable; local trace detours already receive suggestions. Do not treat every labeled signal as a grouping error. |
| rp2040-bldc-controller / 5 V Hall Sensor Inputs | 10 | 1 | Three Hall-input channels have consistent relative layouts. Their L-shaped resistor dividers are readable; a vertical-only divider rule would be too strict. |
| rp2040-bldc-controller / Optional Quadrature Encoder | 10 | 1 | Three encoder-input channels likewise use consistent resistor/capacitor patterns. No repeated-channel inconsistency repro justified here. |
| rp2040-bldc-controller / USB-C PD & Barrel Power Input | 31 | 40 | USB-PD and barrel-input section headings overlap at the top-left. This supports general text/text clearance; the published snapshot also contains many existing box/label diagnostics. |
| rp2040-bldc-controller / Input Protection, Bus Sense & 5 V Power | 19 | 15 | DC Bus Current Sense and 5 V Buck Regulator headings occupy exactly the same point. This is another general text/text example. Feedback divider shape alone is not a new defect. |
| rp2040-bldc-controller / Three-Phase BLDC Power Stage | 47 | 44 | Three MOSFET phase columns are consistently arranged. Dense pin/label areas already receive diagnostics. Do not report intentional repeated structures as inconsistent. |
| rp2040-bldc-controller / Temperature & Hardware Protection | 7 | 15 | The generated Power-Stage Temperature Interlock heading is crossed by the V3V3 pull-up bus. Selected for a native TSX general-text-clearance repro. |
| wireless-earbuds-charging-case / index | 67 | 4 | Reviewed all five sections: USB input, BQ24074 charger, boost supply, left/right outputs, STM32/UI. Blocks and paired outputs are recognizable. Some imported symbols/values do not render fully in this saved artifact; that is not evidence for a placement analyzer. |
| wireless-mouse-pcb / Power, USB-C and LiPo Charging | 20 | 4 | The battery divider is horizontal but still readable. Charger and LDO detours already receive trace-simplification suggestions. No extra divider repro selected. |
| wireless-mouse-pcb / Wireless Controller and Debug | 26 | 2 | Crystal/load-capacitor grouping is already reported by the crystal analyzer. Pin-label collisions have existing coverage. RF layout is a separate topology-specific question, not automatic evidence for the proposed generic series-chain rule. |
| wireless-mouse-pcb / Optical Motion Sensor | 17 | 3 | SCLK/MOSI resistor flips are already the concrete motivation for PR #44. The current main analyzer also reports LDO trace detours. Do not duplicate these as new analyzer categories. |
| wireless-mouse-pcb / Mouse Buttons and Scroll Wheel | 11 | 0 | Buttons and wheel are separated but identifiable. No current issue; left/right and side switches are not all electrically identical, so identical placement should not be demanded. |
| pedometer-codex / index | 78 | 1 | A generic component grid separates U1, R8, C21 and TP5 on RESETN. The saved full-board analysis only reports a crystal issue. Selected for a support-network grouping repro. |
| test-connector / single sheet | 1 | — | Freshly rendered the one-part USB-C connector example. It is not a functional circuit and supplies no new placement-analyzer evidence. |

## Other published comparisons

The TI subcircuit layouts were also compared with [TIDA-01330, schematic sheet 2](https://www.ti.com/lit/df/tidrpz4/tidrpz4.pdf#page=1) and [TIDA-00992, schematic sheet 2](https://www.ti.com/lit/pdf/tidrne8#page=2). The latter already uses a readable L-shaped divider, and the former repeats three similar phase networks. These are useful counterexamples to rules that require every divider to be vertical or every repeated circuit to have exactly identical routing.

## Provenance and verification

Saved Circuit JSON was inspected as-is, using circuit-to-svg 0.0.370 and the analyzer at main commit `3bfb244bb4c17938ffc60e7e5d89c9ef862f4edf`. The saved artifacts are not claimed to be fresh builds of the full projects; their build dates and component counts differ. The obsolete TI `dist/index` export, which is not one of the six configured board entries, was excluded. The older mouse export in Codex was not counted again.

The two new repros build with this PR's @tscircuit/core 0.0.1382 and render successfully without error elements. The general text case uses the same generated-heading behavior in a single-sheet reduction. The grouping fixture uses the source's positions and explicit net connectivity, not a frozen Circuit JSON fixture. Both include stacked schematic/analysis snapshots. Rendering, connectivity and geometry checks run outside `test.failing`; the reset case also includes a compact control snapshot.

Checked the two reduced cases against PR #44 commit `0ea25ad2b3a1a35564ab0a79dca39a511b311f23`. It supplies no additional diagnostic for either missing behavior. All 47 tests pass, including eleven expected-failure tests. Temporarily running the two new cases as ordinary tests confirms they fail at the intended missing diagnostic assertions, not during rendering or snapshot setup.

Source fingerprints (SHA-256) allow the observed local versions to be identified without assuming a published repository revision:

- `rp2040-bldc-controller/schematic/ProtectionSection.tsx`: `29370639e0b0263d30c6ac81b5c8ca1145c71c770b77b54c91d612680142ce12`
- `rp2040-bldc-controller/schematic/SchematicSheets.tsx`: `4502b1b05c1407340ba341121356755ae5e50f48de4272b2412a7ece4036d389`
- `pedometer (Codex)/index.circuit.tsx`: `c2151e7d32d5b79be30adf12ca6c200f61f82eb74c36d9e14fea288514f9c730`
