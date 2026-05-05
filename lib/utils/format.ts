export const fmtNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value)
  return value
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
}

export const fmtDelta = (value: number): string => {
  const formatted = fmtNumber(value)
  return value > 0 ? `+${formatted}` : formatted
}

export const escapeAttr = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

export const addAttr = (
  attrs: string[],
  key: string,
  value: string | number | undefined,
  options?: { formatDelta?: boolean; escape?: boolean },
): void => {
  if (value === undefined) return
  const stringValue =
    typeof value === "number"
      ? options?.formatDelta
        ? fmtDelta(value)
        : fmtNumber(value)
      : options?.escape === false
        ? value
        : escapeAttr(value)
  attrs.push(`${key}="${stringValue}"`)
}
