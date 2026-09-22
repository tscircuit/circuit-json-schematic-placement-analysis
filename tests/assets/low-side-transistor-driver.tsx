// Source for low-side-transistor-driver.circuit.json, rendered with core 0.0.1875.
// Freeze both layouts to avoid dependency changes altering transistor pin aliases.

export function LowSideTransistorDriver({
  belowLoad = false,
  upright = false,
} = {}) {
  const transistorY = belowLoad ? -3 : 3
  return (
    <board>
      <net name="VCC" />
      <net name="GND" isGroundNet />
      <net name="INPUT" />
      <transistor
        name="Q1"
        type="npn"
        schX={0}
        schY={transistorY}
        schRotation={upright ? -90 : 0}
      />
      <resistor name="R1" resistance="1k" schX={-3.5} schY={transistorY} />
      <chip
        name="BZ1"
        pinLabels={{ pin1: "POS", pin2: "NEG" }}
        schPinArrangement={{ topSide: ["POS"], bottomSide: ["NEG"] }}
        schWidth={0.5}
        schHeight={0.8}
      />
      <diode name="D1" schX={3} schRotation={90} />
      <trace from="net.INPUT" to=".R1 > .pin1" />
      <trace from=".R1 > .pin2" to=".Q1 > .base" />
      <trace from=".Q1 > .emitter" to="net.GND" />
      <trace from=".Q1 > .collector" to=".BZ1 > .NEG" />
      <trace from=".BZ1 > .POS" to="net.VCC" />
      <trace from=".D1 > .anode" to=".BZ1 > .NEG" />
      <trace from=".D1 > .cathode" to="net.VCC" />
    </board>
  )
}
