import { Circuit } from "@tscircuit/core"

// Complete DAC sheet from Devesh36/pocket-audio-player v1.0.12.
// https://tscircuit.com/Devesh36/pocket-audio-player?version=1.0.12
// Source: audio-player-board.tsx and imports/PCM5102APWR.tsx; PCB/CAD omitted.
const resistors = [
  ["R_DAC_MUTE", "100k", -19, -15, "DAC_UNMUTE", "GND"],
  ["R_DAC_L", "470", -15.5, -15, "DAC_L", "LINE_L"],
  ["R_DAC_R", "470", -12, -15, "DAC_R", "LINE_R"],
] as const

const capacitors = [
  ["C_DAC_CP", "1uF", -8.5, -15, "DAC_CAPP", "DAC_CAPM"],
  ["C_DAC_NEG", "1uF", -5, -15, "GND", "DAC_VNEG"],
  ["C_DAC_CPVDD", "2.2uF", -19, -19, "V3V3", "GND"],
  ["C_DAC_AVDD", "2.2uF", -15.5, -19, "V3V3", "GND"],
  ["C_DAC_DVDD", "2.2uF", -12, -19, "V3V3", "GND"],
  ["C_DAC_LDO", "100nF", -8.5, -19, "DAC_LDO", "GND"],
  ["C_FILTER_L", "2.2nF", -5, -19, "LINE_L", "GND"],
  ["C_FILTER_R", "2.2nF", -19, -23, "LINE_R", "GND"],
] as const

const pinLabels = {
  pin1: ["CPVDD"],
  pin2: ["CAPP"],
  pin3: ["CPGND"],
  pin4: ["CAPM"],
  pin5: ["VNEG"],
  pin6: ["OUTL"],
  pin7: ["OUTR"],
  pin8: ["AVDD"],
  pin9: ["AGND"],
  pin10: ["DEMP"],
  pin11: ["FLT"],
  pin12: ["SCK"],
  pin13: ["BCK"],
  pin14: ["DIN"],
  pin15: ["LRCK"],
  pin16: ["FMT"],
  pin17: ["XSMT"],
  pin18: ["LDOO"],
  pin19: ["DGND"],
  pin20: ["DVDD"],
} as const

const chipNets = [
  "V3V3",
  "DAC_CAPP",
  "GND",
  "DAC_CAPM",
  "DAC_VNEG",
  "DAC_L",
  "DAC_R",
  "V3V3",
  "GND",
  "GND",
  "GND",
  "GND",
  "I2S_BCK",
  "I2S_DATA",
  "I2S_LRCK",
  "GND",
  "DAC_UNMUTE",
  "DAC_LDO",
  "GND",
  "V3V3",
]

export default function PocketAudioDac({
  groupFilters = false,
}: {
  groupFilters?: boolean
}) {
  const moved: Record<string, { x: number; y: number }> = groupFilters
    ? {
        C_FILTER_L: { x: -14.3, y: -16.3 },
        C_FILTER_R: { x: -10.8, y: -16.3 },
      }
    : {}
  return (
    <board schLayout={{ layoutMode: "relative" }}>
      <net name="V3V3" isPowerNet />
      <schematicsheet name="DAC" displayName="DAC">
        <schematicsection name="DAC" displayName="DAC" />
      </schematicsheet>
      <chip
        name="U_DAC"
        manufacturerPartNumber="PCM5102APWR"
        supplierPartNumbers={{ jlcpcb: ["C107671"] }}
        pinLabels={pinLabels}
        pinAttributes={{
          pin1: { requiresPower: true, requiresVoltage: "3.3V" },
          pin8: { requiresPower: true, requiresVoltage: "3.3V" },
          pin20: { requiresPower: true, requiresVoltage: "3.3V" },
          pin3: { requiresGround: true },
          pin9: { requiresGround: true },
          pin19: { requiresGround: true },
        }}
        schX={-12}
        schY={-7}
        schWidth={3}
        schHeight={7}
        schSectionName="DAC"
        schSheetName="DAC"
        showPinAliases
      />
      {resistors.map(([name, resistance, x, y, first, second]) => (
        <resistor
          key={name}
          name={name}
          resistance={resistance}
          schX={x}
          schY={y}
          schSectionName="DAC"
          schSheetName="DAC"
          connections={{ pin1: `net.${first}`, pin2: `net.${second}` }}
        />
      ))}
      {capacitors.map(([name, capacitance, x, y, first, second]) => (
        <capacitor
          key={name}
          name={name}
          capacitance={capacitance}
          maxVoltageRating="16V"
          schX={moved[name]?.x ?? x}
          schY={moved[name]?.y ?? y}
          schSectionName="DAC"
          schSheetName="DAC"
          schOrientation={first === "GND" ? "pos_bottom" : "pos_top"}
          connections={{ pin1: `net.${first}`, pin2: `net.${second}` }}
        />
      ))}
      {chipNets.map((net, i) => (
        <group key={i} schSheetName="DAC">
          <trace
            from={`.U_DAC > .pin${i + 1}`}
            to={`net.${net}`}
            schDisplayLabel={net}
          />
        </group>
      ))}
      <group schSheetName="DAC">
        <trace
          name="DAC_GROUND_DEMP"
          from=".U_DAC > .pin10"
          to=".U_DAC > .pin9"
        />
        <trace
          name="DAC_GROUND_FLT"
          from=".U_DAC > .pin11"
          to=".U_DAC > .pin12"
        />
      </group>
    </board>
  )
}

export async function createPocketAudioDac(groupFilters = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<PocketAudioDac groupFilters={groupFilters} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
