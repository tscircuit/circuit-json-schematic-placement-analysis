/**
 * Verification script for Issue #21 — Vertical Capacitors
 * Run: bun run test-scripts/verify-fix.tsx
 */
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "../lib/index"

async function main() {
  // --- Horizontal Capacitor ---
  const hCircuit = new Circuit()
  hCircuit.add(
    <board width="10mm" height="10mm">
      <capacitor name="C1" capacitance="1uF" footprint="0402" schX={0} schY={0} />
    </board>,
  )
  await hCircuit.renderUntilSettled()
  const hAnalysis = analyzeSchematicPlacement(hCircuit.getCircuitJson())

  console.log("=== Horizontal Capacitor ===")
  console.log(hAnalysis.toString())
  console.log()

  // --- Vertical Capacitor ---
  const vCircuit = new Circuit()
  vCircuit.add(
    <board width="10mm" height="10mm">
      <capacitor
        name="C1"
        capacitance="1uF"
        footprint="0402"
        schX={0}
        schY={0}
        schRotation={90}
      />
    </board>,
  )
  await vCircuit.renderUntilSettled()
  const vAnalysis = analyzeSchematicPlacement(vCircuit.getCircuitJson())

  console.log("=== Vertical Capacitor (schRotation=90) ===")
  console.log(vAnalysis.toString())
  console.log()

  // --- Summary ---
  const hHasIssue = hAnalysis
    .toString()
    .includes("CapacitorSymbolHorizontal")
  const vHasIssue = vAnalysis
    .toString()
    .includes("CapacitorSymbolHorizontal")

  console.log(
    `Horizontal capacitor → CapacitorSymbolHorizontal: ${hHasIssue ? "✓ (expected)" : "✗ MISSING!"}`,
  )
  console.log(
    `Vertical capacitor   → CapacitorSymbolHorizontal: ${vHasIssue ? "✗ BUG!" : "✓ (none, expected)"}`,
  )
  console.log()
  console.log(
    hHasIssue && !vHasIssue ? "ALL CHECKS PASSED ✓" : "FAILED ✗",
  )
}

main()