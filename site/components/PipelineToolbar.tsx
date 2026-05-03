import { useEffect, useReducer, useRef } from "react"
import type { SchematicAnalysisPipeline } from "lib/index"

export const PipelineToolbar = ({
  pipeline,
  triggerRender,
}: {
  pipeline: SchematicAnalysisPipeline
  triggerRender: () => void
}) => {
  const [isAnimating, toggleAnimating] = useReducer((value) => !value, false)
  const animationRef = useRef<number | undefined>(undefined)

  const stopAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current)
      animationRef.current = undefined
    }
  }

  const handleStep = () => {
    pipeline.step()
    triggerRender()
  }

  const handleSolve = () => {
    pipeline.solve()
    triggerRender()
  }

  const handleAnimate = () => {
    if (isAnimating) {
      stopAnimation()
      toggleAnimating()
      return
    }

    toggleAnimating()
    animationRef.current = window.setInterval(() => {
      if (pipeline.isComplete || pipeline.failed) {
        stopAnimation()
        toggleAnimating()
        triggerRender()
        return
      }

      pipeline.step()
      triggerRender()
    }, 25)
  }

  useEffect(() => {
    return () => {
      stopAnimation()
    }
  }, [])

  useEffect(() => {
    if ((pipeline.isComplete || pipeline.failed) && isAnimating) {
      stopAnimation()
      toggleAnimating()
    }
  }, [isAnimating, pipeline.failed, pipeline.isComplete])

  return (
    <div className="space-y-1 px-1">
      <div className="flex gap-2 pb-1 items-center">
        <button
          onClick={handleStep}
          disabled={pipeline.isComplete || pipeline.failed || isAnimating}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-1 rounded"
        >
          Step
        </button>
        <button
          onClick={handleSolve}
          disabled={pipeline.isComplete || pipeline.failed || isAnimating}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-3 py-1 rounded"
        >
          Solve
        </button>
        <button
          onClick={handleAnimate}
          disabled={pipeline.isComplete || pipeline.failed}
          className={`px-3 py-1 rounded text-white ${
            isAnimating
              ? "bg-red-500 hover:bg-red-600"
              : "bg-yellow-500 hover:bg-yellow-600"
          } disabled:bg-gray-300`}
        >
          {isAnimating ? "Stop" : "Animate"}
        </button>

        <div className="ml-4 text-sm text-gray-600">
          Iterations: {pipeline.iterations}
        </div>

        {pipeline.isComplete && (
          <div className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
            Solved
          </div>
        )}
      </div>

      {pipeline.failed && (
        <div className="text-red-500">Failed: {pipeline.error}</div>
      )}
    </div>
  )
}
