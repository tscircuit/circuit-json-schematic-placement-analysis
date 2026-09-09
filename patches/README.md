# circuit-to-svg symbol alignment

`circuit-to-svg@0.0.370.patch` corrects the translation in
`pointPairsToMatrix`, which fits symbol terminals to exported schematic ports.
Bun applies this patch through `package.json`'s `patchedDependencies` during
`bun install`. No generated Circuit JSON is changed.

The original transform scales a symbol point `p` by `s` and translates by
`target - source`. That misses the target when `s != 1`. The translation must
be `target - s * source`, so `s * source + translation == target`.

Trellis Core's capacitor ports are 0.6 schematic units apart, while the installed
`schematic-symbols@0.0.224` capacitor terminals are 1.1 units apart. The required
scale is `0.6 / 1.1`. Before the correction, both symbol leads were displaced by
about 0.259 schematic units (6.55 pixels in the default SVG). The traces already
ended at the correct ports.

Adding `tscircuit` does not replace the directly installed renderer or symbols.
Upgrading symbols alone conceals this case when terminal spacing matches, but
changes other fixtures and does not fix scaled historical exports. The same
translation calculation is also present in `circuit-to-svg@0.0.413`.

The Trellis Core CPU repro asserts that both visible symbol leads and traces
meet all four C28/C29 ports. It fails on the unpatched dependency and passes
with this correction. Remove the patch after adopting an upstream release with
the corrected transform. Package managers that do not support Bun's
`patchedDependencies` will not apply it.
