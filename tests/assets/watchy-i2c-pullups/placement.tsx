import { Circuit } from "@tscircuit/core"

/** Reconstruct Watchy's accelerometer block with its published pin connections. */
export async function createWatchyI2cPullupPlacement(grouped = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={10}>
      <net name="P3V3" isPowerNet />
      <net name="GND" isGroundNet />
      <net name="SDA" />
      <net name="SCL" />
      <chip
        name="U6"
        manufacturerPartNumber="BMA423"
        schX={0}
        schY={0}
        schWidth={1.4}
        schHeight={1.4}
        pinLabels={{
          pin1: "SDO",
          pin2: "SDX",
          pin3: "VDDIO",
          pin4: "ASDA",
          pin5: "INT1",
          pin6: "INT2",
          pin7: "VDD",
          pin8: "GNDIO",
          pin9: "GND",
          pin10: "CSB",
          pin11: "ASCL",
          pin12: "SCX",
        }}
        schPinArrangement={{
          leftSide: {
            pins: ["pin1", "pin2", "pin3", "pin4", "pin5", "pin6"],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: ["pin12", "pin11", "pin10", "pin9", "pin8", "pin7"],
            direction: "top-to-bottom",
          },
        }}
      />
      <resistor
        name="R18"
        resistance="10k"
        schX={grouped ? -0.8 : 0}
        schY={grouped ? 3 : 2.64}
        schRotation={grouped ? 90 : 0}
      />
      <resistor
        name="R20"
        resistance="10k"
        schX={grouped ? 1 : 2.61}
        schY={grouped ? 3 : 1.08}
        schRotation={grouped ? 90 : 0}
      />
      <trace name="SDA_PULLUP" from=".R18 > .pin1" to=".U6 > .SDX" />
      <trace name="SCL_PULLUP" from=".R20 > .pin1" to=".U6 > .SCX" />
      <trace name="SDA_LABEL" from=".U6 > .SDX" to="net.SDA" />
      <trace name="SCL_LABEL" from=".U6 > .SCX" to="net.SCL" />
      <trace name="PULLUP_SUPPLY" from=".R18 > .pin2" to=".R20 > .pin2" />
      <trace name="PULLUP_POWER" from=".R18 > .pin2" to="net.P3V3" />
      <trace name="VDDIO_POWER" from=".U6 > .VDDIO" to="net.P3V3" />
      <trace name="VDD_POWER" from=".U6 > .VDD" to="net.P3V3" />
      <trace name="I2C_MODE" from=".U6 > .CSB" to="net.P3V3" />
      <trace name="I2C_ADDRESS" from=".U6 > .SDO" to="net.GND" />
      <trace name="GNDIO_RETURN" from=".U6 > .GNDIO" to="net.GND" />
      <trace name="GND_RETURN" from=".U6 > .GND" to="net.GND" />
      <trace name="INT1_SIGNAL" from=".U6 > .INT1" to="net.ACC_INT_1" />
      <trace name="INT2_SIGNAL" from=".U6 > .INT2" to="net.ACC_INT_2" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
