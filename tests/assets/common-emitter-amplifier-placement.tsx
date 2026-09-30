// Source for common-emitter-amplifier-placement.circuit.json, rendered with core 0.0.1875.
// Freeze the layouts to preserve valid native-NPN pin aliases across dependency versions.

export function CommonEmitterAmplifier({
  arranged = false,
  dividerBias = false,
}: {
  arranged?: boolean
  dividerBias?: boolean
} = {}) {
  return (
    <board schTraceAutoLabelEnabled schMaxTraceDistance={5}>
      <transistor
        name="Q1"
        type="npn"
        schX={0}
        schY={0}
        schRotation={arranged ? 270 : 0}
      />
      <resistor
        name="RC"
        resistance="10k"
        schX={arranged ? 0.29 : -2.5}
        schY={arranged ? 2.5 : 0.29}
        schRotation={arranged ? 270 : 0}
      />
      <resistor
        name="RE"
        resistance="1k"
        schX={arranged ? 0.29 : 2.5}
        schY={arranged ? -2.5 : 0.29}
        schRotation={arranged ? 270 : 0}
      />
      <resistor
        name="RB"
        resistance={dividerBias ? "100k" : "1M"}
        schX={-2.5}
        schY={3}
        schRotation={270}
      />
      {dividerBias && (
        <resistor
          name="RB_GND"
          resistance="10k"
          schX={-2.5}
          schY={-3}
          schRotation={270}
        />
      )}
      <capacitor name="C_IN" capacitance="100nF" schX={-4.5} schY={-1.5} />
      <capacitor name="C_OUT" capacitance="1uF" schX={4.5} schY={1.5} />
      <trace name="T_COLLECTOR" from=".Q1 > .collector" to="net.COLLECTOR" />
      <trace name="T_BASE" from=".Q1 > .base" to="net.BASE" />
      <trace name="T_EMITTER" from=".Q1 > .emitter" to=".RE > .pin1" />
      <trace name="T_RC_SUPPLY" from=".RC > .pin1" to="net.V12" />
      <trace name="T_RC_COLLECTOR" from=".RC > .pin2" to="net.COLLECTOR" />
      <trace name="T_RE_GROUND" from=".RE > .pin2" to="net.GND" />
      <trace name="T_RB_SUPPLY" from=".RB > .pin1" to="net.V12" />
      <trace name="T_RB_BASE" from=".RB > .pin2" to="net.BASE" />
      {dividerBias && (
        <trace name="T_RB_GND_BASE" from=".RB_GND > .pin1" to="net.BASE" />
      )}
      {dividerBias && (
        <trace name="T_RB_GND_RETURN" from=".RB_GND > .pin2" to="net.GND" />
      )}
      <trace name="T_INPUT" from=".C_IN > .pin1" to="net.INPUT" />
      <trace name="T_INPUT_BASE" from=".C_IN > .pin2" to="net.BASE" />
      <trace
        name="T_OUTPUT_COLLECTOR"
        from=".C_OUT > .pin1"
        to="net.COLLECTOR"
      />
      <trace name="T_OUTPUT" from=".C_OUT > .pin2" to="net.OUTPUT" />
    </board>
  )
}
