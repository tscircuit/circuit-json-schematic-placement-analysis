import type { DronePlacement } from "../assets/drone-parallel-diode-capacitors/index.circuit"

export function dronePlacements(correctPairs = true) {
  const placements: Record<string, DronePlacement> = {}
  for (const [i, name] of [
    "COUT1",
    "COUT2",
    "CESP",
    "CESPHF",
    "CIMU",
    "CIMUB",
    "CIO",
  ].entries())
    placements[name] = {
      schX: -5 + i * 1.7,
      schY: 11,
      schSectionName: "Controller",
    }
  for (const [i, name] of ["CIN", "CVINA", "CBULK"].entries())
    placements[name] = { schX: 29 + i * 1.7, schY: 12 }
  placements.CREG = { schX: 29, schY: -6 }
  for (let n = 1; n <= 6; n++)
    placements[`TP${n}`] = { schX: -6 + (n - 1) * 3, schY: 1 }
  if (!correctPairs) return placements
  for (let n = 1; n <= 4; n++) {
    const x = -20 + ((n - 1) % 2) * 14,
      y = -9 * Math.floor((n - 1) / 2)
    placements[`Q${n}`] = { schX: x + 0.5, schY: y - 34.2 }
    placements[`RG${n}`] = { schX: x - 3, schY: y - 34.1 }
    placements[`RPD${n}`] = { schX: x - 1.5, schY: y - 35.6 }
    placements[`D${n}`] = { schX: x + 2, schY: y - 33, schRotation: 90 }
    placements[`CM${n}`] = { schX: x + 4, schY: y - 33 }
    placements[`M${n}_POS`] = { schX: x + 5, schY: y - 31.8 }
    placements[`M${n}_NEG`] = { schX: x + 5, schY: y - 34.2 }
  }
  return placements
}
