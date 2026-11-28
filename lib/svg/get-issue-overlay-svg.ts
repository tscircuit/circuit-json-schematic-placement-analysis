import { renderIssueOverlay } from "./create-issue-overlay-svg"

export function createIssueOverlaySvg(
  input: Parameters<typeof renderIssueOverlay>[0],
): string {
  return renderIssueOverlay(input).svg
}
