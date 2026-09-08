import { useEffect, useMemo, useState } from "react"
import { analyzeSchematicPlacement } from "../../lib/index"
import { realSchematics } from "../assets/real-schematics"
import { createSchematicAnalysisFixtureSvg } from "./create-schematic-analysis-fixture-svg"
import {
  createSchematicReview,
  getReviewSheets,
  issueTypes,
  type IssueType,
} from "./schematic-review"

export default function RealSchematicsReview() {
  const [projectIndex, setProjectIndex] = useState(0)
  const fixture = realSchematics[projectIndex]!
  const sheets = useMemo(() => getReviewSheets(fixture.circuitJson), [fixture])
  const [sheetId, setSheetId] = useState(sheets[1]?.id ?? sheets[0]!.id)
  const [issueType, setIssueType] = useState<IssueType | "all">(
    "CrystalNotCenteredOverLoadCapacitors",
  )
  const [issueNumber, setIssueNumber] = useState<number | undefined>()
  const [zoom, setZoom] = useState(true)
  const analysis = useMemo(
    () => analyzeSchematicPlacement(fixture.circuitJson),
    [fixture],
  )
  const review = useMemo(
    () =>
      createSchematicReview({
        circuitJson: fixture.circuitJson,
        analysis,
        sheetId,
        issueTypes: issueType === "all" ? undefined : [issueType],
        issueNumber,
        zoomToIssue: zoom,
      }),
    [fixture, analysis, sheetId, issueType, issueNumber, zoom],
  )
  const matching = review.allIssues.filter(
    (entry) =>
      entry.sheetId === sheetId &&
      (issueType === "all" || entry.issue.lineItemType === issueType),
  )
  const [downloadUrl, setDownloadUrl] = useState<string>()
  useEffect(() => {
    const svg = createSchematicAnalysisFixtureSvg({
      circuitJson: fixture.circuitJson,
      analysis,
      height: 700,
      review: {
        sheetId,
        issueTypes: issueType === "all" ? undefined : [issueType],
        issueNumber,
        zoomToIssue: zoom,
      },
    })
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
    setDownloadUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [fixture, analysis, sheetId, issueType, issueNumber, zoom])
  return (
    <main className="schematic-review">
      <style>{`
      .schematic-review { color: #172033; background: #f8fafc; font: 14px system-ui,sans-serif; padding: 20px; min-height: 100vh; box-sizing: border-box; }
      .schematic-review h1 { font-size: 22px; margin: 0 0 6px; }
      .schematic-review p { color: #475569; margin: 6px 0 16px; }
      .schematic-review .controls { display: flex; flex-wrap: wrap; gap: 16px; align-items: end; margin-bottom: 16px; }
      .schematic-review label { display: flex; flex-direction: column; gap: 5px; font-weight: 600; min-width: 0; max-width: 100%; }
      .schematic-review select, .schematic-review button, .schematic-review .download { font: inherit; background: white; color: #172033; border: 1px solid #cbd5e1; padding: 7px; border-radius: 5px; text-decoration: none; }
      .schematic-review select { max-width: 100%; }
      .schematic-review button { cursor: pointer; }
      .schematic-review .layout { display: grid; grid-template-columns: minmax(0,1fr) 330px; gap: 16px; }
      .schematic-review .canvas { border: 1px solid #cbd5e1; background: white; overflow: auto; }
      .schematic-review .canvas svg { width: 100%; height: auto; display: block; }
      .schematic-review .findings { background: white; border: 1px solid #cbd5e1; padding: 12px; max-height: 680px; overflow: auto; }
      .schematic-review .findings button { display: block; text-align: left; width: 100%; margin-top: 8px; overflow-wrap: anywhere; }
      .schematic-review button[aria-pressed=true] { border-color: #b91c1c; background: #fff1f2; }
      .schematic-review pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; background: white; border: 1px solid #cbd5e1; padding: 14px; color: #b91c1c; }
      .schematic-review table { border-collapse: collapse; width: 100%; background: white; }
      .schematic-review th, .schematic-review td { text-align: left; padding: 5px 10px; border-bottom: 1px solid #e2e8f0; }
      .schematic-review summary { cursor: pointer; margin: 14px 0; }
      @media(max-width: 900px) { .schematic-review .layout { grid-template-columns: 1fr; } }
    `}</style>
      <h1>Real schematic review</h1>
      <p>
        Original exported layouts. Counts are emitted findings, not verified
        defects. Select a type, then a numbered finding to inspect its location.
      </p>
      <div className="controls">
        <label>
          Project
          <select
            value={projectIndex}
            onChange={(event) => {
              const next = Number(event.target.value)
              setProjectIndex(next)
              setSheetId(
                getReviewSheets(realSchematics[next]!.circuitJson)[0]!.id,
              )
              setIssueNumber(undefined)
            }}
          >
            {realSchematics.map((f, index) => (
              <option key={f.provenance.id} value={index}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sheet
          <select
            value={sheetId}
            onChange={(event) => {
              setSheetId(event.target.value)
              setIssueNumber(undefined)
            }}
          >
            {sheets.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>
                {sheet.name} (
                {
                  review.allIssues.filter((entry) => entry.sheetId === sheet.id)
                    .length
                }
                )
              </option>
            ))}
          </select>
        </label>
        <label>
          Issue type — sheet / all sheets
          <select
            value={issueType}
            onChange={(event) => {
              setIssueType(event.target.value as IssueType | "all")
              setIssueNumber(undefined)
            }}
          >
            <option value="all">
              All types (
              {
                review.allIssues.filter((entry) => entry.sheetId === sheetId)
                  .length
              }{" "}
              / {review.allIssues.length})
            </option>
            {issueTypes.map((type) => (
              <option key={type} value={type}>
                {type} ({review.sheetCounts[type]} / {review.counts[type]})
              </option>
            ))}
          </select>
        </label>
        <a
          className="download"
          href={downloadUrl}
          download={`${fixture.provenance.id}-${sheetId || "schematic"}-${issueType}.svg`}
        >
          Download review SVG
        </a>
      </div>
      <div className="layout">
        <div
          className="canvas"
          aria-label="Schematic with numbered issue highlights"
          dangerouslySetInnerHTML={{ __html: review.circuitSvg }}
        />
        <aside className="findings">
          <strong>{matching.length} matching findings on this sheet</strong>
          <p>Numbers stay the same when filters change.</p>
          <label style={{ flexDirection: "row" }}>
            <input
              type="checkbox"
              checked={zoom}
              onChange={(event) => setZoom(event.target.checked)}
            />
            Zoom to selected finding
          </label>
          <button
            aria-pressed={issueNumber === undefined}
            onClick={() => setIssueNumber(undefined)}
          >
            Show all matching findings
          </button>
          {matching.length === 0 && (
            <p>No findings for this type on this sheet.</p>
          )}
          {matching.map((entry) => (
            <button
              key={entry.number}
              aria-pressed={entry.number === issueNumber}
              onClick={() => setIssueNumber(entry.number)}
            >
              <strong>
                #{entry.number} {entry.issue.lineItemType}
              </strong>
              <br />
              {"message" in entry.issue
                ? entry.issue.message
                : analysis.schematicIssuesToString(entry.issue)}
              {entry.shapes.length === 0 && (
                <span> — No overlay geometry available</span>
              )}
            </button>
          ))}
        </aside>
      </div>
      <details>
        <summary>Issue counts — all types, including zero</summary>
        <table>
          <thead>
            <tr>
              <th>Issue type</th>
              <th>This sheet</th>
              <th>All sheets</th>
            </tr>
          </thead>
          <tbody>
            {issueTypes.map((type) => (
              <tr key={type}>
                <td>{type}</td>
                <td>{review.sheetCounts[type]}</td>
                <td>{review.counts[type]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <details>
        <summary>Source export</summary>
        <p>
          {fixture.provenance.sourcePath}
          <br />
          Local package version: {fixture.provenance.packageVersion}. Captured:{" "}
          {fixture.provenance.capturedAt}.<br />
          All schematic and source elements retained; PCB/CAD omitted. No layout
          edits or rebuilding.
        </p>
        <code>Original SHA-256: {fixture.provenance.originalSha256}</code>
      </details>
      <pre aria-label="Filtered analyzer output">{review.text}</pre>
    </main>
  )
}
