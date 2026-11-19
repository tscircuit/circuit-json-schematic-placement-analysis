import { Circuit } from "@tscircuit/core"

// TPS25751EVM, SLVUCP9B Figure 5-4, "Zero Ohm Name Change": 0 ohm links
// that rename the TPS25751 GPIO nets for the expansion header. Components and
// positions are copied unchanged from the reference schematic in
// tscircuit/checks. GPIO3 shares its net with TPD_VPWR, as on the full board
// (where U4's GPIO3 pin feeds TPD_VPWR), so R68's end is drawn as a TPD_VPWR
// power symbol. Nets are declared as in the reference board.
export async function createTiTps25751EvmZeroOhmNameChange() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "none" }}>
      <net name="A_GPIO0" />
      <net name="A_GPIO1" />
      <net name="A_GPIO2" />
      <net name="A_GPIO3" />
      <net name="A_GPIO4" />
      <net name="A_GPIO5" />
      <net name="GPIO0" />
      <net name="GPIO1" />
      <net name="GPIO2" />
      <net name="GPIO3" />
      <net name="GPIO_45P" />
      <net name="GPIO_45N" />
      <net name="TPD_VPWR" />
      <resistor
        name="R60"
        schX={23.1248}
        schY={-1.54513}
        resistance="0ohm"
        symbolName="resistor"
        schRotation={0}
        manufacturerPartNumber="CRCW02010000Z0ED"
      />
      <resistor
        name="R61"
        schX={23.1248}
        schY={-2.74557}
        resistance="0ohm"
        symbolName="resistor"
        schRotation={0}
        manufacturerPartNumber="CRCW02010000Z0ED"
      />
      <resistor
        name="R65"
        schX={23.1248}
        schY={-3.946}
        resistance="0ohm"
        symbolName="resistor"
        schRotation={0}
        manufacturerPartNumber="CRCW02010000Z0ED"
      />
      <resistor
        name="R68"
        schX={23.1248}
        schY={-5.14647}
        resistance="0ohm"
        symbolName="resistor"
        schRotation={0}
        manufacturerPartNumber="CRCW02010000Z0ED"
      />
      <resistor
        name="R69"
        schX={23.1248}
        schY={-6.34691}
        resistance="0ohm"
        symbolName="resistor"
        schRotation={0}
        manufacturerPartNumber="CRCW02010000Z0ED"
      />
      <resistor
        name="R70"
        schX={23.1248}
        schY={-7.54735}
        resistance="0ohm"
        symbolName="resistor"
        schRotation={0}
        manufacturerPartNumber="CRCW02010000Z0ED"
      />
      <trace from="R61.pin2" to="net.A_GPIO1" />
      <trace from="R60.pin1" to="net.GPIO0" />
      <trace from="R60.pin2" to="net.A_GPIO0" />
      <trace from="R68.pin2" to="net.A_GPIO3" />
      <trace from="R61.pin1" to="net.GPIO1" />
      <trace from="R69.pin1" to="net.GPIO_45P" />
      <trace from="R70.pin1" to="net.GPIO_45N" />
      <trace from="R69.pin2" to="net.A_GPIO4" />
      <trace from="R70.pin2" to="net.A_GPIO5" />
      <trace from="R68.pin1" to="net.GPIO3" />
      <trace from="R65.pin1" to="net.GPIO2" />
      <trace from="R65.pin2" to="net.A_GPIO2" />
      <trace from="R68.pin1" to="net.TPD_VPWR" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
