import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const noErrorsJson = JSON.parse(
  readFileSync(new URL("./assets/no-errors.json", import.meta.url), "utf8"),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("no-errors empty report snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(noErrorsJson)

  expect(analysis.issueCount).toBe(0)
  expect(analysis.listIssues()).toEqual([])
  expect(
    convertCircuitJsonToSchematicSvg(noErrorsJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`""`)
})
