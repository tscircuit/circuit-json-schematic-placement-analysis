import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"

// Complete Hall sheet from rp2040-bldc-controller, ControllerSection.tsx.
// Only J_HALL's position varies; all components and sheet boundary nets remain.
const hallChannels = [
  { name: "A", connectorPin: "pin3", schY: 5 },
  { name: "B", connectorPin: "pin4", schY: 0 },
  { name: "C", connectorPin: "pin5", schY: -5 },
] as const

export async function renderRp2040HallSheet(
  connectorPosition = { x: 7, y: 0 },
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board width="105mm" height="76mm" layers={2} schSheetName="hall">
      <net name="GND" isGroundNet />
      <net name="V5" isPowerNet />
      <schematicsheet
        name="hall"
        displayName="5 V Hall Sensor Inputs"
        sheetIndex={2}
      >
        <schematicsection
          name="hall_inputs"
          displayName="Filtered Hall Sensor Inputs"
        />
      </schematicsheet>
      <pinheader
        name="J_HALL"
        doNotPlace
        pinCount={5}
        gender="male"
        pitch="2.54mm"
        pinLabels={["HALL_5V", "GND", "HALL_A", "HALL_B", "HALL_C"]}
        showSilkscreenPinLabels
        pcbX={-47}
        pcbY={-7}
        pcbRotation={90}
        schX={connectorPosition.x}
        schY={connectorPosition.y}
        schWidth={1.2}
        schSheetName="hall"
        schSectionName="hall_inputs"
      />

      {hallChannels.map(({ name, connectorPin, schY }, index) => (
        <Fragment key={name}>
          <resistor
            name={`R_HALL_${name}_TOP`}
            resistance="10k"
            footprint="0603"
            pcbX={-43}
            pcbY={-5 - index * 4}
            schX={-10}
            schY={schY}
            schSheetName="hall"
            schSectionName="hall_inputs"
          />
          <resistor
            name={`R_HALL_${name}_BOT`}
            resistance="18k"
            footprint="0603"
            pcbX={-38}
            pcbY={-5 - index * 4}
            schRotation={270}
            schX={-5}
            schY={schY - 1}
            schSheetName="hall"
            schSectionName="hall_inputs"
          />
          <capacitor
            name={`C_HALL_${name}`}
            capacitance="1nF"
            footprint="0603"
            pcbX={-33}
            pcbY={-5 - index * 4}
            schRotation={270}
            schX={-2}
            schY={schY - 1}
            schSheetName="hall"
            schSectionName="hall_inputs"
          />
          <trace
            name={`HALL_${name}_INPUT`}
            from={`.J_HALL > .${connectorPin}`}
            to={`.R_HALL_${name}_TOP > .pin1`}
          />
          <trace
            name={`HALL_${name}_DIVIDER`}
            from={`.R_HALL_${name}_TOP > .pin2`}
            to={`.R_HALL_${name}_BOT > .pin1`}
          />
          <trace
            name={`HALL_${name}_FILTER`}
            from={`.R_HALL_${name}_TOP > .pin2`}
            to={`.C_HALL_${name} > .pin1`}
          />
          <trace
            name={`HALL_${name}_GPIO`}
            from={`.R_HALL_${name}_TOP > .pin2`}
            to={`net.MCU_HALL_${name}_GPIO`}
            schDisplayLabel={`HALL_${name}`}
          />
          <trace
            name={`HALL_${name}_PULLDOWN_GND`}
            from={`.R_HALL_${name}_BOT > .pin2`}
            to="net.GND"
          />
          <trace
            name={`HALL_${name}_CAP_GND`}
            from={`.C_HALL_${name} > .pin2`}
            to="net.GND"
          />
        </Fragment>
      ))}

      <trace
        name="HALL_SUPPLY"
        from=".J_HALL > .pin1"
        to="net.V5"
        schDisplayLabel="5V"
      />
      <trace name="HALL_GROUND" from=".J_HALL > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
