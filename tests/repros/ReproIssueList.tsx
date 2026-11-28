import type {
  SchematicPlacementAnalysis,
  SchematicPlacementIssue,
} from "lib/index"

export function ReproIssueList(props: {
  analysis: SchematicPlacementAnalysis
  allIssues: SchematicPlacementIssue[]
  visibleIssues: SchematicPlacementIssue[]
  issueIndex?: number
  onSelectIssueIndex: (nextIndex?: number) => void
}) {
  const { analysis, allIssues, visibleIssues, issueIndex, onSelectIssueIndex } =
    props

  return (
    <>
      <p aria-live="polite">
        {visibleIssues.length} matching issues on this sheet
        {issueIndex === undefined
          ? ""
          : `; showing overlay for #${issueIndex + 1}`}
        .
      </p>
      {issueIndex !== undefined && (
        <button type="button" onClick={() => onSelectIssueIndex(undefined)}>
          Show all matching overlays
        </button>
      )}
      {visibleIssues.length === 0 && (
        <p>No issues of this type reported on this sheet.</p>
      )}
      {visibleIssues.map((issue) => {
        const index = allIssues.indexOf(issue)
        return (
          <article key={index}>
            <button
              type="button"
              aria-pressed={issueIndex === index}
              onClick={() => onSelectIssueIndex(index)}
            >
              Isolate #{index + 1} — {issue.lineItemType}
            </button>
            {issue.lineItemType === "NetLabelCollision" && (
              <p>
                {issue.collisionBounds?.length ?? "Unknown number of"} collision
                regions; {issue.pairs.length} component pairs.
              </p>
            )}
            <pre>
              {analysis.schematicIssuesToString(issue) ||
                JSON.stringify(issue, null, 2)}
            </pre>
            <details>
              <summary>Raw issue data</summary>
              <pre>{JSON.stringify(issue, null, 2)}</pre>
            </details>
          </article>
        )
      })}
    </>
  )
}
