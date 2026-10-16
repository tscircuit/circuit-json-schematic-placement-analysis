import type { BicycleLightPlacements } from "../assets/bicycle-brake-light"

export function bicycleLightPlacements(
  compact: boolean,
): BicycleLightPlacements {
  const placements: BicycleLightPlacements = {}
  for (let i = 0; i < 6; i++) {
    const schX = compact ? -7.5 + i * 3 : -7.05 + (i % 2) * 9.4
    const schY = compact ? 5.475 : 5.475 - Math.floor(i / 2) * 3.65
    placements[`R${12 + i}`] = { schX, schY, schRotation: -90 }
    placements[`D${i + 1}`] = { schX, schY: schY - 1.8, schRotation: -90 }
  }
  const schX = compact ? 0 : -7.05
  const schY = compact ? 0 : -5.475
  placements.Q1 = { schX, schY }
  placements.R18 = { schX: schX - 4, schY: schY + 0.1 }
  placements.R19 = { schX: schX - 2, schY: schY - 1.5, schRotation: -90 }
  return placements
}
