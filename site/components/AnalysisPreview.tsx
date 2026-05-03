import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { SchematicPlacementAnalysis } from "lib/index"
import type { CircuitJson } from "circuit-json"
import { useMemo } from "react"
import type { SchematicAnalysisPipeline } from "lib/index"

export const AnalysisPreview = ({
  circuitJson,
  pipeline,
}: {
  circuitJson: CircuitJson
  pipeline: SchematicAnalysisPipeline
}) => {
  const circuitSvg = useMemo(
    () =>
      convertCircuitJsonToSchematicSvg(circuitJson, {
        width: 960,
        height: 520,
      }),
    [circuitJson],
  )

  const analysis = useMemo(
    () => new SchematicPlacementAnalysis(pipeline.getLineItems()),
    [pipeline, pipeline.iterations],
  )

  return (
    <div className="space-y-4">
      <section>
        <div className="text-sm font-medium text-gray-700 pb-1">Circuit</div>
        <div
          className="overflow-auto border border-gray-300"
          dangerouslySetInnerHTML={{ __html: circuitSvg }}
        />
      </section>

      <section>
        <div className="text-sm font-medium text-gray-700 pb-1">
          Analysis Output
        </div>
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap border border-gray-300 bg-white p-4 font-mono text-xs text-red-700">
          {analysis.toString()}
        </pre>
      </section>
    </div>
  )
}
