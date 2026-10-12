import { expect, test } from "bun:test"
import { createSchematicPlacementIssueArtifacts } from "lib/index"
import { parseSync } from "svgson"
import { createNearTouchingPinLabelsCircuitJson } from "../assets/near-touching-pin-labels"

test("highlights both implicated pin labels in issue artifacts and lists each pair", async () => {
  for (const vertical of [false, true]) {
    for (const dimension of [1.1, 1.3]) {
      const circuitJson = await createNearTouchingPinLabelsCircuitJson({
        vertical,
        dimension,
      })
      const artifacts = createSchematicPlacementIssueArtifacts(circuitJson, {
        issueTypes: ["SchematicBoxInnerLabelCollision"],
        width: 900,
        height: 450,
      })
      expect(artifacts).toHaveLength(1)
      const artifact = artifacts[0]!
      if (artifact.issue.lineItemType !== "SchematicBoxInnerLabelCollision")
        throw Error()
      const labels = new Map(
        artifact.issue
          .labelPairs!.flatMap((pair) => [pair.firstLabel, pair.secondLabel])
          .map((label) => [label.schematicPortId, label]),
      )
      expect(labels.size).toBe(dimension === 1.1 ? 3 : 2)
      const nodes = [] as ReturnType<typeof parseSync>[]
      const visit = (node: ReturnType<typeof parseSync>) => {
        if (node.attributes.class === "pin-label-collision-highlight")
          nodes.push(node)
        for (const child of node.children) visit(child)
      }
      visit(parseSync(artifact.content))
      expect(nodes).toHaveLength(labels.size)
      for (const node of nodes) {
        const label = labels.get(
          node.attributes["data-highlight-schematic-port-id"]!,
        )!
        expect(label).toBeDefined()
        expect(node.attributes["data-highlight-label"]).toBe(label.text)
        // Frame the implicated text with a small visual margin, leaving its
        // nominal diagnostic bounds and measured clearance unchanged.
        const left = Number(node.attributes.x)
        const bottom = Number(node.attributes.y)
        expect(left).toBeLessThan(label.bounds.left)
        expect(bottom).toBeLessThan(label.bounds.bottom)
        expect(left + Number(node.attributes.width)).toBeGreaterThan(
          label.bounds.right,
        )
        expect(bottom + Number(node.attributes.height)).toBeGreaterThan(
          label.bounds.top,
        )
      }
      expect(artifact.descriptionXml).toContain(
        '<PinLabelPair label1="SOURCE" label2="DRAIN"',
      )
      expect(artifact.descriptionXml).toContain(
        `kind="${dimension === 1.1 ? "overlap" : "clearance"}"`,
      )
      if (dimension === 1.3)
        expect(artifact.content).not.toContain('data-highlight-label="GATE"')
      expect(artifact.content).toMatchSvgSnapshot(
        import.meta.path,
        `${vertical ? "top-bottom" : "left-right"}-${dimension === 1.1 ? "overlap" : "clearance"}`,
      )
    }
  }
})
