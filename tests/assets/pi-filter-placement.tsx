import { Circuit } from "@tscircuit/core"

export async function createPiFilterPlacement({
  grouped = false,
  rotation = 0,
  mirrored = false,
}: {
  grouped?: boolean
  rotation?: number
  mirrored?: boolean
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const position = (x: number, y: number) => {
    const angle = (rotation * Math.PI) / 180
    x *= mirrored ? -1 : 1
    return {
      schX: x * Math.cos(angle) - y * Math.sin(angle),
      schY: x * Math.sin(angle) + y * Math.cos(angle),
    }
  }
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={4}>
      <inductor
        name="L1"
        inductance="2.8nH"
        {...position(0, grouped ? 0 : -1)}
        schRotation={rotation + (mirrored ? 180 : 0)}
      />
      <capacitor
        name="C1"
        capacitance="1.5pF"
        {...position(grouped ? -1.5 : -4, grouped ? -1.1 : 3)}
        schRotation={rotation - 90}
      />
      <capacitor
        name="C2"
        capacitance="1.5pF"
        {...position(grouped ? 1.5 : 4, grouped ? -1.1 : 3)}
        schRotation={rotation - 90}
      />
      <trace name="T1" from=".L1 > .pin1" to="net.FILTER_IN" />
      <trace name="T2" from=".C1 > .pin1" to="net.FILTER_IN" />
      <trace name="T3" from=".L1 > .pin2" to="net.FILTER_OUT" />
      <trace name="T4" from=".C2 > .pin1" to="net.FILTER_OUT" />
      <trace name="T5" from=".C1 > .pin2" to="net.GND" />
      <trace name="T6" from=".C2 > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
