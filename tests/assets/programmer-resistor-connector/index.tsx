import React from "react"
import { Circuit } from "@tscircuit/core"
import { JstSwdSide } from "./JstSwdSide"

// Real UART extract: https://tscircuit.com/tscircuit/standard-jst-programmer?version=0.8.0#schematic
// Release 3d6952c4-e6ee-4711-a7c7-dded0cdef4eb; programmer.tsx lines 75–89.
// StandardJstUartSide's host labels are inlined below; its imported footprint is unchanged.
// Original positions, values, native symbols and physical pin order are preserved.
// U1.GPIO8/9 become boundary nets UART_TX_GPIO/RX_GPIO; other board blocks are omitted.
export async function createProgrammerResistorConnector() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "relative" }}>
      <JstSwdSide
        name="J5"
        schX={8}
        schY={-6}
        pinLabels={{ pin1: ["TX"], pin2: ["GND"], pin3: ["RX"] }}
        uartSilkscreenLabels={["TX", "GND", "RX"]}
      />
      <resistor
        name="R_UART_TX"
        resistance="100"
        footprint="0402"
        schX={3}
        schY={-5}
      />
      <resistor
        name="R_UART_RX"
        resistance="100"
        footprint="0402"
        schX={3}
        schY={-7}
      />
      <trace
        from="net.UART_TX_GPIO"
        to="R_UART_TX.pin1"
        schDisplayLabel="UART_TX_GPIO"
      />
      <trace
        from="net.UART_RX_GPIO"
        to="R_UART_RX.pin1"
        schDisplayLabel="UART_RX_GPIO"
      />
      <trace from="R_UART_TX.pin2" to="J5.TX" schDisplayLabel="UART_TX" />
      <trace from="R_UART_RX.pin2" to="J5.RX" schDisplayLabel="UART_RX" />
      <trace from="J5.GND" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
