export const getColorFromString = (string: string, alpha = 1) => {
  const hash = string.split("").reduce((acc, char) => {
    return acc * 31 + char.charCodeAt(0)
  }, 0)

  return `hsl(${hash % 360}, 100%, 50%, ${alpha})`
}
