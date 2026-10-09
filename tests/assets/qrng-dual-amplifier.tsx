import { Circuit } from "@tscircuit/core"

// Complete 18-component AndyAguilo/qrng_optimized_dual-amp v0.0.1 source.
// https://tscircuit.com/AndyAguilo/qrng_optimized_dual-amp?version=0.0.1
// Published schematic positions/rotations are made explicit; wires are regenerated.
// PCB/supplier data omitted; legacy power attributes use their current camelCase API.
export const QrngDualAmplifier = ({
  alignedRails = false,
}: {
  alignedRails?: boolean
} = {}) => (
  <board schAutoLayoutEnabled={false}>
    <chip
      name="PWR_IN"
      schX={0.40562500000000146}
      schY={-5.04445535}
      schRotation={0}
      pinLabels={{ pin1: "V12", pin2: "GND" }}
      pinAttributes={{
        pin1: { requiresPower: true },
        pin2: { requiresGround: true },
      }}
    />

    <capacitor
      name="C_PWR1"
      schX={0.5889583333333333}
      schY={-7.2644553499999995}
      schRotation={0}
      capacitance="100nF"
    />

    <capacitor
      name="C_PWR2"
      schX={0.5889583333333333}
      schY={-9.30445535}
      schRotation={0}
      capacitance="10uF"
    />

    <resistor
      name="R_BIAS"
      schX={-0.87}
      schY={-0.8750000000000002}
      schRotation={0}
      resistance="1k"
    />

    <diode
      name="D_ZENER"
      schX={0.9000000000000002}
      schY={-0.8750000000000002}
      schRotation={180}
    />

    <capacitor
      name="C1"
      schX={alignedRails ? -2.585 : 0.38}
      schY={alignedRails ? 2.765 : 0.595}
      schRotation={alignedRails ? 0 : 90}
      capacitance="100nF"
    />

    <transistor
      name="Q1"
      schX={-0.27500000000000024}
      schY={2.765}
      schRotation={alignedRails ? 270 : 0}
      type="npn"
    />

    <resistor
      name="R1C"
      schX={alignedRails ? 0.015 : -2.5850000000000004}
      schY={alignedRails ? 5.2 : 2.53945535}
      schRotation={alignedRails ? 270 : 0}
      resistance="10k"
    />

    <resistor
      name="R1E"
      schX={alignedRails ? 0.015 : 1.525}
      schY={alignedRails ? 1.1 : 3.0549999999999997}
      schRotation={alignedRails ? 270 : 0}
      resistance="1k"
    />

    <resistor
      name="R1B"
      schX={alignedRails ? -2.585 : -2.5850000000000004}
      schY={alignedRails ? 4.3 : 4.128366049999999}
      schRotation={alignedRails ? 270 : 0}
      resistance="100k"
    />

    <capacitor
      name="C2"
      schX={alignedRails ? 2.1 : -3.18}
      schY={alignedRails ? -2.82945535 : 0.7249999999999996}
      schRotation={alignedRails ? 0 : 0}
      capacitance="100nF"
    />

    <transistor
      name="Q2"
      schX={alignedRails ? 4.5 : -0.6024999999999999}
      schY={-2.82945535}
      schRotation={alignedRails ? 270 : 0}
      type="npn"
    />

    <resistor
      name="R2C"
      schX={alignedRails ? 4.79 : -2.9125}
      schY={alignedRails ? -0.8 : -2.5394553500000003}
      schRotation={alignedRails ? 270 : 0}
      resistance="10k"
    />

    <resistor
      name="R2E"
      schX={alignedRails ? 4.79 : 1.1975000000000002}
      schY={alignedRails ? -4.8 : -2.5394553500000003}
      schRotation={alignedRails ? 270 : 0}
      resistance="1k"
    />

    <resistor
      name="R2B"
      schX={alignedRails ? 2.1 : -2.9074999999999998}
      schY={alignedRails ? -1.3 : -4.1283660499999995}
      schRotation={alignedRails ? 270 : 0}
      resistance="100k"
    />

    <capacitor
      name="C_OUT"
      schX={-5.2225}
      schY={-2.53945535}
      schRotation={0}
      capacitance="1uF"
    />

    <diode
      name="D_CLAMP"
      schX={-2.424374999999999}
      schY={-5.792821399999998}
      schRotation={0}
    />

    <chip
      name="OUT_TEENSY"
      schX={-2.2710416666666666}
      schY={-7.862821399999996}
      schRotation={0}
      pinLabels={{ pin1: "SIG", pin2: "GND" }}
      pinAttributes={{
        pin1: { requiresPower: false },
        pin2: { requiresGround: true },
      }}
    />

    <trace from=".PWR_IN .pin1" to="net.V12" />
    <trace from="net.V12" to=".C_PWR1 .pin1" />
    <trace from="net.V12" to=".C_PWR2 .pin1" />
    <trace from="net.V12" to=".R_BIAS .pin1" />
    <trace from="net.V12" to=".R1C .pin1" />
    <trace from="net.V12" to=".R1B .pin1" />
    <trace from="net.V12" to=".R2C .pin1" />
    <trace from="net.V12" to=".R2B .pin1" />

    <trace from=".PWR_IN .pin2" to="net.GND" />
    <trace from=".C_PWR1 .pin2" to="net.GND" />
    <trace from=".C_PWR2 .pin2" to="net.GND" />
    <trace from=".D_ZENER .anode" to="net.GND" />
    <trace from=".R1E .pin2" to="net.GND" />
    <trace from=".R2E .pin2" to="net.GND" />
    <trace from=".D_CLAMP .anode" to="net.GND" />
    <trace from=".OUT_TEENSY .pin2" to="net.GND" />

    <trace from=".R_BIAS .pin2" to=".D_ZENER .cathode" />
    <trace from=".D_ZENER .cathode" to=".C1 .pin1" />
    <trace from=".C1 .pin2" to="net.Q1_BASE" />
    <trace from="net.Q1_BASE" to=".Q1 .base" />
    <trace from="net.Q1_BASE" to=".R1B .pin2" />
    <trace from=".Q1 .collector" to="net.Q1_COLL" />
    <trace from="net.Q1_COLL" to=".R1C .pin2" />
    <trace from=".Q1 .emitter" to=".R1E .pin1" />

    <trace from="net.Q1_COLL" to=".C2 .pin1" />
    <trace from=".C2 .pin2" to="net.Q2_BASE" />
    <trace from="net.Q2_BASE" to=".Q2 .base" />
    <trace from="net.Q2_BASE" to=".R2B .pin2" />
    <trace from=".Q2 .collector" to="net.Q2_COLL" />
    <trace from="net.Q2_COLL" to=".R2C .pin2" />
    <trace from=".Q2 .emitter" to=".R2E .pin1" />

    <trace from="net.Q2_COLL" to=".C_OUT .pin1" />
    <trace from=".C_OUT .pin2" to="net.SAFE_SIG" />
    <trace from="net.SAFE_SIG" to=".D_CLAMP .cathode" />
    <trace from="net.SAFE_SIG" to=".OUT_TEENSY .pin1" />
  </board>
)

export async function createQrngDualAmplifier(alignedRails = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<QrngDualAmplifier alignedRails={alignedRails} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
