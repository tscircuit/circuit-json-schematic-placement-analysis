import { compactRailPathRepro } from "../fixtures/compact-rail-path-repro"
import { useState } from "react"
import { analyzeSchematicPlacement } from "../../lib/index"
import { createIssueOverlaySvg } from "../../lib/svg/create-issue-overlay-svg"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"

export default function RailPathVisibilityRepro() {
  const [compact, setCompact] = useState(false)
  const [real, setReal] = useState(false)
  const [maxSpan, setMaxSpan] = useState(8)
  const circuitJson = real
    ? getRp2040BldcSheet("hall")
    : compact
      ? compactRailPathRepro(createRailPathRepro())
      : createRailPathRepro()
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
    railPathVisibility: { maxSpan, maxPathLength: maxSpan * 2 },
  })
  const svg = createIssueOverlaySvg({
    circuitJson,
    analysis,
    width: 1200,
    height: 800,
    showFullSchematic: true,
  })
  return (
    <main style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1>Visible paths to power and ground</h1>
      <p>
        Reconstruction of the supplied RP2040 screenshot plus the repository's
        real Hall sheet. Red routes are readability advisories.
      </p>
      <button disabled={real} onClick={() => setCompact(!compact)}>
        {compact
          ? "Reset placement"
          : "Group R1, R11, R12 and C4 + recompute traces"}
      </button>
      <p>
        The grouping action moves the existing screenshot repro's four support
        components, shifts their pins and attached ground symbols, and
        regenerates all six traces from the moved endpoints, preserving the
        divider junction and source connectivity. The real Hall sheet is a
        detection-only control.
      </p>
      <label>
        <input
          type="checkbox"
          checked={real}
          onChange={(e) => setReal(e.target.checked)}
        />{" "}
        Real Hall sheet{" "}
      </label>
      <label>
        Maximum span{" "}
        <input
          type="range"
          min="4"
          max="24"
          step="0.5"
          value={maxSpan}
          onChange={(e) => setMaxSpan(Number(e.target.value))}
        />
        {maxSpan}
      </label>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <pre style={{ whiteSpace: "pre-wrap" }}>{analysis.toString()}</pre>
    </main>
  )
}
