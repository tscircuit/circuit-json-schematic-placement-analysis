import { useMemo, useState } from "react"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createIssueOverlaySvg,
  getReproSheets,
  type IssueType,
} from "../fixtures/create-issue-overlay-svg"
import { downloadReproFile } from "./download-repro-file"
import { parseReproCircuitJson } from "./import-circuit-json"
import { ReproIssueList } from "./ReproIssueList"
import { realSchematics } from "./real-schematics"
import "./repros.css"

export default function RealSchematicRepros() {
  const [repro, setRepro] = useState(realSchematics[0]!)
  const [sheetId, setSheetId] = useState(
    getReproSheets(repro.circuitJson)[0]?.id ?? "",
  )
  const [issueType, setIssueType] = useState<IssueType | "all">("all")
  const [issueIndex, setIssueIndex] = useState<number>()
  const [showOverlay, setShowOverlay] = useState(true)
  const [showFullSheet, setShowFullSheet] = useState(
    repro.showFullSchematic ?? true,
  )
  const [zoom, setZoom] = useState(100)
  const [error, setError] = useState("")
  const analysis = useMemo(
    () => analyzeSchematicPlacement(repro.circuitJson),
    [repro],
  )
  const sheets = useMemo(() => getReproSheets(repro.circuitJson), [repro])
  const counts = analysis.getIssueCounts()
  const sheetCounts = analysis.getIssueCounts({ schematicSheetId: sheetId })
  const filter = {
    schematicSheetId: sheetId,
    issueTypes: issueType === "all" ? undefined : [issueType],
  }
  const visibleIssues = analysis.getIssues(filter)
  const allIssues = analysis.getIssues()
  const render = useMemo(() => {
    try {
      return {
        svg: createIssueOverlaySvg({
          circuitJson: repro.circuitJson,
          analysis,
          ...filter,
          issueIndex,
          showOverlay,
          showFullSchematic:
            showFullSheet ||
            (issueType === "all" && issueIndex === undefined
              ? repro.showFullSchematic
              : false),
        }),
        error: "",
      }
    } catch (error) {
      return {
        svg: "",
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [
    repro,
    analysis,
    sheetId,
    issueType,
    issueIndex,
    showOverlay,
    showFullSheet,
  ])

  const selectRepro = (next: (typeof realSchematics)[number]) => {
    setRepro(next)
    setSheetId(getReproSheets(next.circuitJson)[0]?.id ?? "")
    setIssueType("all")
    setIssueIndex(undefined)
    setShowFullSheet(next.showFullSchematic ?? true)
    setError("")
  }

  return (
    <main className="repro-explorer">
      <h1>Real schematic placement repros</h1>
      <p>
        Inspect emitted issues on complete, unchanged circuit exports. Red marks
        show reported locations; dashed blue boxes show involved components.
        Numbers match the issue list.
      </p>
      <div className="repro-controls">
        <label>
          Example{" "}
          <select
            aria-label="Example"
            value={realSchematics.findIndex((example) => example === repro)}
            onChange={(event) =>
              selectRepro(realSchematics[Number(event.target.value)]!)
            }
          >
            {!realSchematics.includes(repro) && (
              <option value={-1}>{repro.name}</option>
            )}
            {realSchematics.map((example, index) => (
              <option key={example.name} value={index}>
                {example.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Import Circuit JSON{" "}
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (!file) return
              try {
                const circuitJson = parseReproCircuitJson(await file.text())
                const importedAnalysis = analyzeSchematicPlacement(circuitJson)
                createIssueOverlaySvg({
                  circuitJson,
                  analysis: importedAnalysis,
                })
                selectRepro({ name: file.name, circuitJson })
              } catch (error) {
                setError(error instanceof Error ? error.message : String(error))
              }
            }}
          />
        </label>
        <label>
          Sheet{" "}
          <select
            aria-label="Sheet"
            value={sheetId}
            onChange={(event) => {
              setSheetId(event.target.value)
              setIssueIndex(undefined)
            }}
          >
            {sheets.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>
                {sheet.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(error || render.error) && <p role="alert">{error || render.error}</p>}
      <p>
        <strong>{allIssues.length} emitted issues</strong> across{" "}
        {sheets.length} sheet(s). Counts are issue objects, not a verdict on
        correctness. NetLabelCollision groups multiple collision regions into
        one issue per sheet.
      </p>
      <div className="repro-layout">
        <aside>
          <button
            type="button"
            aria-pressed={issueType === "all"}
            onClick={() => {
              setIssueType("all")
              setIssueIndex(undefined)
            }}
          >
            All types (
            {analysis.getIssues({ schematicSheetId: sheetId }).length})
          </button>
          <table>
            <caption>Issue counts — select a type to isolate it</caption>
            <thead>
              <tr>
                <th>Type</th>
                <th>Sheet</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(counts) as IssueType[])
                .sort(
                  (a, b) =>
                    sheetCounts[b] - sheetCounts[a] ||
                    counts[b] - counts[a] ||
                    a.localeCompare(b),
                )
                .map((type) => (
                  <tr key={type}>
                    <td>
                      <button
                        type="button"
                        aria-pressed={issueType === type}
                        onClick={() => {
                          setIssueType(type)
                          setIssueIndex(undefined)
                        }}
                      >
                        {type}
                      </button>
                    </td>
                    <td>{sheetCounts[type]}</td>
                    <td>{counts[type]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </aside>
        <section aria-label="Schematic and issues">
          <div className="repro-controls">
            <label>
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(event) => setShowOverlay(event.target.checked)}
              />{" "}
              Show overlay
            </label>
            <label>
              <input
                type="checkbox"
                checked={showFullSheet}
                onChange={(event) => setShowFullSheet(event.target.checked)}
              />{" "}
              Full sheet
            </label>
            <label>
              Zoom{" "}
              <input
                aria-label="Zoom"
                type="range"
                min="50"
                max="300"
                step="25"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />{" "}
              {zoom}%
            </label>
            <button
              type="button"
              disabled={!render.svg}
              onClick={() =>
                downloadReproFile({
                  name: "schematic-issues.svg",
                  contents: render.svg,
                  mimeType: "image/svg+xml",
                })
              }
            >
              Download overlay SVG
            </button>
            <button
              type="button"
              onClick={() =>
                downloadReproFile({
                  name: "placement-issues.json",
                  contents: JSON.stringify(
                    {
                      repro: repro.name,
                      counts,
                      sheetCounts,
                      filter,
                      issueIndex,
                      issues: visibleIssues
                        .filter(
                          (issue) =>
                            issueIndex === undefined ||
                            allIssues.indexOf(issue) === issueIndex,
                        )
                        .map((issue) => ({
                          number: allIssues.indexOf(issue) + 1,
                          ...issue,
                        })),
                    },
                    null,
                    2,
                  ),
                  mimeType: "application/json",
                })
              }
            >
              Download report
            </button>
          </div>
          <div className="schematic-viewport">
            {render.svg && (
              <img
                alt={`${repro.name}, ${issueType}, schematic overlay`}
                style={{ width: `${zoom}%`, maxWidth: "none" }}
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(render.svg)}`}
              />
            )}
          </div>
          <ReproIssueList
            analysis={analysis}
            allIssues={allIssues}
            visibleIssues={visibleIssues}
            issueIndex={issueIndex}
            onSelectIssueIndex={setIssueIndex}
          />
        </section>
      </div>
    </main>
  )
}
