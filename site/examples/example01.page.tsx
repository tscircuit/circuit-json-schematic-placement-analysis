import { PipelineDebugger } from "site/components/PipelineDebugger"
import { createSchematicBoxSizingPinHeaderCircuitJson } from "../../tests/assets/schematic-box-sizing-pin-header"

export default () => (
  <PipelineDebugger
    loadCircuitJson={createSchematicBoxSizingPinHeaderCircuitJson}
  />
)
