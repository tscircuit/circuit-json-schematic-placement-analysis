import type { CircuitJson } from "circuit-json"
import { InteractiveGraphics } from "graphics-debug/react"
import {
  SchematicAnalysisPipeline,
  SchematicPlacementAnalysis,
} from "lib/index"
import { useEffect, useMemo, useReducer, useState } from "react"
import { PipelineStageTable } from "./PipelineStageTable"
import { PipelineToolbar } from "./PipelineToolbar"

export const PipelineDebugger = ({
  loadCircuitJson,
}: {
  loadCircuitJson: () => CircuitJson | Promise<CircuitJson>
}) => {
  const [, triggerRender] = useReducer((count) => count + 1, 0)
  const [circuitJson, setCircuitJson] = useState<CircuitJson | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    setCircuitJson(null)
    setError(null)

    Promise.resolve(loadCircuitJson())
      .then((nextCircuitJson) => {
        if (isCancelled) return
        setCircuitJson(nextCircuitJson)
      })
      .catch((loadError) => {
        if (isCancelled) return
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        )
      })

    return () => {
      isCancelled = true
    }
  }, [loadCircuitJson])

  const pipeline = useMemo(
    () =>
      circuitJson
        ? new SchematicAnalysisPipeline({
            circuitJson,
          })
        : null,
    [circuitJson],
  )

  if (error) {
    return (
      <div className="text-red-500">Failed to load circuit JSON: {error}</div>
    )
  }

  if (!pipeline || !circuitJson) {
    return <div>Loading fixture...</div>
  }

  const analysis = new SchematicPlacementAnalysis(pipeline.getLineItems())

  return (
    <div>
      <PipelineToolbar
        pipeline={pipeline}
        triggerRender={() => triggerRender()}
      />
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <InteractiveGraphics graphics={pipeline.visualize()} />
        </div>
        <pre className="w-[420px] max-h-[700px] overflow-auto whitespace-pre-wrap border border-gray-300 bg-white p-4 font-mono text-xs text-red-700">
          {analysis.toString()}
        </pre>
      </div>
      <PipelineStageTable
        pipeline={pipeline}
        triggerRender={() => triggerRender()}
      />
    </div>
  )
}
