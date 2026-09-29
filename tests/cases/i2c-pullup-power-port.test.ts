import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { watchyI2cPullups } from "../assets/watchy-i2c-pullups"
import { getReproSourcePort } from "../fixtures/placement-repro-assertions"

test("power ports exclude named SDA and SCL nets from I2C grouping", () => {
  for (const pin of ["pin2", "pin12"]) {
    for (const powerFlag of ["requires_power", "provides_power"] as const) {
      const circuitJson = structuredClone(watchyI2cPullups)
      getReproSourcePort(circuitJson, "U6", pin)[powerFlag] = true
      expect(
        analyzeSchematicPlacement(circuitJson, {
          issueTypes: ["I2cPullupPairNotGrouped"],
        }).getIssues(),
      ).toEqual([])
    }
  }
})
