import type { GraphicsObject } from "graphics-debug"

export abstract class BaseAnalyzer {
  isComplete = false
  failed = false
  iterations = 0
  error: string | null = null

  step(): void {
    if (this.isComplete || this.failed) return
    this.iterations += 1

    try {
      this._step()
    } catch (error) {
      this.error = `${this.constructor.name} error: ${String(error)}`
      this.failed = true
      throw error
    }
  }

  visualize(): GraphicsObject {
    return {
      lines: [],
      points: [],
      rects: [],
      circles: [],
      texts: [],
    }
  }

  preview(): GraphicsObject {
    return this.visualize()
  }

  protected abstract _step(): void
}
