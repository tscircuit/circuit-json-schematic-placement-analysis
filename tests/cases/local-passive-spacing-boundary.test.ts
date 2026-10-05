import { expect, test } from "bun:test"
import {
  createLocalPassiveSpacingFixture,
  inspectLocalPassiveSpacing,
} from "../fixtures/local-passive-spacing-fixture"

test("allows the exact local passive spacing threshold and detects a longer connection", () => {
  expect(
    inspectLocalPassiveSpacing(
      createLocalPassiveSpacingFixture(4),
      import.meta.path,
      "boundary",
    ),
  ).toEqual([])
  expect(
    inspectLocalPassiveSpacing(
      createLocalPassiveSpacingFixture(4.01),
      import.meta.path,
      "over",
    ),
  ).toMatchObject([{ pinDistance: 4.01, maxRecommendedPinDistance: 4 }])
})
