# Trellis Core schematic repro

Source: [techmannih/trellis-core](https://tscircuit.com/techmannih/trellis-core#schematic),
published version **0.2.9**, release ID `7e27d896-d9e3-403f-a95f-3d1ccb54cddb`,
retrieved September 9, 2026. The preview entrypoint is `index.circuit.tsx`.

`trellis-core.circuit.json` contains every `source_*` and `schematic_*` record
from that release's preview Circuit JSON, in the original order. PCB, CAD, and
other non-schematic records are omitted. No retained records, component
positions, symbols, traces, labels, sheet assignments, or connectivity were
edited. There are 1,832 retained records, 92 schematic components, and five
complete sheets: Power, CPU Core, Expansion/Boot/Status, Storage, and USB-C.
Tests and the gallery use this checked-in data without network requests or
rebuilding against a newer layout engine.

The reviewer requested grouping decoupling capacitors on the same supply rail
and keeping LEDs near their paired resistors. The placement checks remain
**repros**; the snapshots record current behavior before analyzer or layout fixes:

- CPU Core: C9–C15 share P3V3/GND and span 12 schematic units. C16–C21 share
  P1V8/GND; C34/C35 are on that same rail in a separate cluster. C22–C27 share
  P0V9/GND, and C28–C31 share P1V5/GND. The test checks these real connections
  and original coordinates. The analyzer currently has no
  `DecouplingCapacitorsNotCloseTogether` report. It emits three trace
  simplification, one crystal placement, and five vertical orientation reports
  on this sheet.
- Power: D1 and R4 are connected through `POWER_LED_K`, with D1's other pin on
  P3V3 and R4's other pin on GND. Their centers are 6.38 schematic units apart.
  The analyzer emits no `DiodeResistorNotAligned` report for this pair; it emits
  ten vertical orientation reports on the sheet. Alignment and proximity are
  separate concerns; a later fix must decide how to report this case.

Reported issue counts are baselines, not endorsements of each diagnosis.
The snapshots show each complete sheet with the analysis text below it.

The CPU repro also checks that C28/C29's rendered symbol leads and traces meet
their exported ports. A [renderer dependency patch](../../patches/README.md)
corrects symbol scaling that previously left visible gaps at those connections.
The original fixture and placement analyzer are unchanged.

Run the repros:

```sh
bun test tests/cases/trellis-core-cpu-decoupling-repro.test.ts tests/cases/trellis-core-power-led-resistor-repro.test.ts
```

For interactive inspection, run `bun start`, open `real-schematics`, select
**Trellis Core — all five sheets (v0.2.9)**, then choose `cpu-core` or `power`.
The other three sheets remain available for context.

To reproduce the fixture extraction from the pinned release:

```sh
curl -fLsS 'https://api.tscircuit.com/package_releases/get_preview_circuit_json?package_release_id=7e27d896-d9e3-403f-a95f-3d1ccb54cddb' -o /tmp/trellis-core-preview.json
bun -e 'const { preview_circuit_json_response: preview } = await Bun.file("/tmp/trellis-core-preview.json").json(); const records = preview.circuit_json.filter((e) => e.type.startsWith("source_") || e.type.startsWith("schematic_")); await Bun.write("tests/assets/trellis-core.circuit.json", JSON.stringify(records, null, 2) + "\n")'
bunx biome format --write tests/assets/trellis-core.circuit.json
```
