import { Fragment } from "react"
import { Circuit } from "@tscircuit/core"

// Complete Light sheet from muse/book-reading-clip-lamp v0.4.0.
// https://tscircuit.com/muse/book-reading-clip-lamp?version=0.4.0
// Source index.circuit.tsx + schematic-layout.tsx; PCB-only data omitted.
// Native LED/diode terminal selectors preserve anode/cathode connections without
// importing the package's reversed physical pin numbering into the old test core.
export default function ReadingLampLedChain() {
  return (
    <board
      schAutoLayoutEnabled={false}
      title="Reading-light boost driver and LED string"
    >
      <net name="GND" isGroundNet />
      <net name="SYS" isPowerNet />
      <net name="LED_SW" isPowerNet />
      <chip
        name="U6"
        manufacturerPartNumber="TPS61165DBVR"
        schX={27}
        schY={7}
        schWidth={1.2}
        schHeight={0.8}
        pinLabels={{
          pin1: "VIN",
          pin2: "CTRL",
          pin3: "SW",
          pin4: "GND",
          pin5: "COMP",
          pin6: "FB",
        }}
        pinAttributes={{
          pin1: { requiresPower: true },
          pin4: { requiresGround: true },
        }}
        connections={{
          pin1: "net.SYS",
          pin2: "net.LED_PWM",
          pin3: "net.LED_SW",
          pin4: "net.GND",
          pin5: "net.LED_COMP",
          pin6: "net.LED_SENSE",
        }}
      />
      <inductor
        name="L2"
        inductance="10uH"
        schX={33}
        schY={8}
        connections={{ pin1: "net.SYS", pin2: "net.LED_SW" }}
      />
      <diode
        name="D1"
        manufacturerPartNumber="MBR0540T1G"
        schX={33}
        schY={4}
        schRotation={-90}
        connections={{ anode: "net.LED_SW", cathode: "net.LED_ANODE" }}
      />
      {Array.from({ length: 6 }, (_, i) => (
        <led
          key={i}
          name={`LED${i + 1}`}
          manufacturerPartNumber="XL-3216WWC"
          schX={24 + (i % 3) * 5}
          schY={i < 3 ? 19 : 22}
          schRotation={i === 5 ? 180 : 0}
          connections={{
            anode: i === 0 ? "net.LED_ANODE" : `net.LED_LINK_${i}`,
            cathode: i === 5 ? "net.LED_SENSE" : `net.LED_LINK_${i + 1}`,
          }}
        />
      ))}
      <resistor
        name="R16"
        resistance="100k"
        schX={25}
        schY={14}
        schRotation={-90}
        connections={{ pin1: "net.LED_PWM", pin2: "net.GND" }}
      />
      <resistor
        name="R17"
        resistance="13.3"
        schX={30}
        schY={14}
        schRotation={-90}
        connections={{ pin1: "net.LED_SENSE", pin2: "net.GND" }}
      />
      <capacitor
        name="C18"
        capacitance="4.7uF"
        schX={25}
        schY={18}
        schRotation={-90}
        connections={{ pin1: "net.SYS", pin2: "net.GND" }}
      />
      <capacitor
        name="C19"
        capacitance="220nF"
        schX={30}
        schY={18}
        schRotation={-90}
        connections={{ pin1: "net.LED_COMP", pin2: "net.GND" }}
      />
      <capacitor
        name="C20"
        capacitance="1uF"
        schX={35}
        schY={18}
        schRotation={-90}
        connections={{ pin1: "net.LED_ANODE", pin2: "net.GND" }}
      />
      <schematictext
        text="08 / Reading-light boost driver and LED string"
        schX={22}
        schY={29.3}
        anchor="top_left"
        fontSize={0.65}
      />
      {[
        "U6, L2 and D1 boost SYS to drive six series warm-white reading LEDs.",
        "R17 sets about 15 mA; LED_PWM controls brightness from the MCU.",
        "C19 stabilizes the control loop; C20 filters the boosted LED_ANODE rail.",
      ].map((text, i) => (
        <Fragment key={text}>
          <schematictext
            text={text}
            schX={22}
            schY={28.1 - i * 0.8}
            anchor="top_left"
            fontSize={0.38}
          />
        </Fragment>
      ))}
      <schematictext
        text="Book Reading Clip Lamp  |  Sheet 8/9  |  Named nets connect between sheets"
        schX={22}
        schY={1}
        anchor="top_left"
        fontSize={0.32}
      />
    </board>
  )
}

export async function createReadingLampLedChain() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<ReadingLampLedChain />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
