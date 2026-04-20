# circuit-json-schematic-placement-analysis

Detect schematic readability issues in Circuit JSON and render them as
AI-friendly XML.

## Testing

Use Bun's `toMatchInlineSnapshot` matcher to keep the XML contract visible in
the test file:

```ts
expect(analysis.toString()).toMatchInlineSnapshot(`
  "<SchematicPlacementAnalysisReport ...>...</SchematicPlacementAnalysisReport>"
`)
```

This repo snapshots the XML string rather than raw objects so output diffs are
easy to review and easy for AI tools to consume.
