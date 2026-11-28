export function downloadReproFile({
  name,
  contents,
  mimeType,
}: {
  name: string
  contents: string
  mimeType: string
}) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
