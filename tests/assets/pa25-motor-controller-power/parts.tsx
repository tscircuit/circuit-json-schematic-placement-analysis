import type {
  ChipProps,
  DiodeProps,
  FuseProps,
  InductorProps,
  CapacitorProps,
  ResistorProps,
} from "@tscircuit/props"
// Schematic definitions from the same published PA25 release as index.tsx.
// PCB/CAD data and unsupported legacy ERC hints are omitted. Custom symbols,
// component types and semantic pin connections are retained. The native diode
// uses anode/cathode aliases; its legacy pinLabels override is not a supported prop.
const AP63203WU_7PinLabels = {
  pin1: ["FB"],
  pin2: ["EN"],
  pin3: ["VIN"],
  pin4: ["GND"],
  pin5: ["SW"],
  pin6: ["BST"],
} as const
const AP63203WU_7PinAttributes = {
  pin3: { requiresPower: true },
  pin4: { requiresGround: true },
} as const
export const AP63203WU_7 = (props: ChipProps<typeof AP63203WU_7PinLabels>) => {
  return (
    <chip
      pinLabels={AP63203WU_7PinLabels}
      pinAttributes={AP63203WU_7PinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C780769"],
      }}
      manufacturerPartNumber="AP63203WU-7"
      {...props}
    />
  )
}

export const BZT52C12 = (props: DiodeProps) => {
  const { name = "D1", ...restProps } = props
  return (
    <diode
      name={name}
      supplierPartNumbers={{
        jlcpcb: ["C173429"],
      }}
      manufacturerPartNumber="BZT52C12"
      {...restProps}
    />
  )
}

const DMP4015SK3Q_13PinLabels = {
  pin1: ["G"],
  pin2: ["D"],
  pin3: ["S"],
} as const
export const DMP4015SK3Q_13 = (
  props: ChipProps<typeof DMP4015SK3Q_13PinLabels>,
) => {
  return (
    <chip
      pinLabels={DMP4015SK3Q_13PinLabels}
      symbol={
        <symbol>
          <schematictext text="{REF}" schX={0} schY={1.04} fontSize={0.18} />
          <schematictext
            text="DMP4015SK3Q"
            schX={0}
            schY={0.76}
            fontSize={0.16}
          />
          <port
            name="pin3"
            pinNumber={3}
            aliases={["S"]}
            direction="down"
            schX={0}
            schY={-0.4}
            schStemLength={0.2}
          />
          <port
            name="pin1"
            pinNumber={1}
            aliases={["G"]}
            direction="left"
            schX={-0.4}
            schY={0}
            schStemLength={0.16}
          />
          <port
            name="pin2"
            pinNumber={2}
            aliases={["D"]}
            direction="up"
            schX={0}
            schY={0.4}
            schStemLength={0.2}
          />
          <schematicpath
            points={[
              { x: 0.26, y: -0.06 },
              { x: 0.24, y: -0.04 },
              { x: 0.16, y: -0.04 },
              { x: 0.14, y: -0.02 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.2, y: -0.18 },
              { x: -0.2, y: -0.1 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.2, y: -0.04 },
              { x: -0.2, y: 0.04 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.2, y: 0.1 },
              { x: -0.2, y: 0.18 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.24, y: 0.18 },
              { x: -0.24, y: -0.18 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0, y: -0.14 },
              { x: -0.2, y: -0.14 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.2, y: 0 },
              { x: 0, y: 0 },
              { x: 0, y: -0.2 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0, y: 0.14 },
              { x: -0.2, y: 0.14 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0, y: 0.14 },
              { x: 0, y: 0.2 },
              { x: 0.2, y: 0.2 },
              { x: 0.2, y: 0.06 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0, y: -0.2 },
              { x: 0.2, y: -0.2 },
              { x: 0.2, y: -0.04 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0.2, y: -0.04 },
              { x: 0.26, y: 0.06 },
              { x: 0.14, y: 0.06 },
              { x: 0.2, y: -0.04 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0, y: 0 },
              { x: -0.12, y: 0.04 },
              { x: -0.12, y: -0.04 },
              { x: 0, y: 0 },
            ]}
            strokeColor="#880000"
            isFilled
            fillColor="#FEFEFE"
          />
        </symbol>
      }
      supplierPartNumbers={{
        jlcpcb: ["C461089"],
      }}
      manufacturerPartNumber="DMP4015SK3Q-13"
      {...props}
    />
  )
}

export const F1206SB3000V032TM = (
  props: Omit<FuseProps<"pin1" | "pin2">, "currentRating" | "voltageRating">,
) => {
  return (
    <fuse
      currentRating="3A"
      voltageRating="32V"
      symbol={
        <symbol>
          <schematictext text="{REF}" schX={0.9} schY={0.14} fontSize={0.18} />
          <schematictext
            text="3 A / 32 V"
            schX={0.9}
            schY={-0.14}
            fontSize={0.16}
          />
          <schematicpath
            points={[
              { x: 0, y: -0.2 },
              { x: 0, y: 0.2 },
            ]}
            strokeColor="#8D2323"
          />
          <port
            name="pin2"
            pinNumber={2}
            aliases={["2"]}
            direction="up"
            schX={0}
            schY={0.4}
            schStemLength={0.2}
          />
          <port
            name="pin1"
            pinNumber={1}
            aliases={["1"]}
            direction="down"
            schX={0}
            schY={-0.4}
            schStemLength={0.2}
          />
          <schematicrect
            schX={0}
            schY={0}
            width={0.12}
            height={0.52}
            strokeWidth={0.02}
            color="#880000"
          />
        </symbol>
      }
      supplierPartNumbers={{
        jlcpcb: ["C311000"],
      }}
      manufacturerPartNumber="F1206SB3000V032TM"
      {...props}
    />
  )
}

// Pad and drill dimensions use nominal metric values; importer conversion noise is removed.
const KF301_5_0_2PPinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
} as const
export const KF301_5_0_2P = (
  props: ChipProps<typeof KF301_5_0_2PPinLabels>,
) => {
  return (
    <connector
      pinLabels={KF301_5_0_2PPinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C474881"],
      }}
      manufacturerPartNumber="KF301-5.0-2P"
      {...props}
    />
  )
}

const SMBJ18APinLabels = {
  pin1: ["K"],
  pin2: ["A"],
} as const
export const SMBJ18A = (props: ChipProps<typeof SMBJ18APinLabels>) => {
  return (
    <chip
      pinLabels={SMBJ18APinLabels}
      pinAttributes={{ A: { requiresGround: true } }}
      symbol={
        <symbol>
          <schematictext text="{REF}" schX={0.9} schY={0.14} fontSize={0.18} />
          <schematictext
            text="SMBJ18A"
            schX={0.9}
            schY={-0.14}
            fontSize={0.16}
          />
          <port
            name="pin2"
            pinNumber={2}
            aliases={["A"]}
            direction="down"
            schX={0}
            schY={-0.4}
            schStemLength={0.3}
          />
          <port
            name="pin1"
            pinNumber={1}
            aliases={["K"]}
            direction="up"
            schX={0}
            schY={0.4}
            schStemLength={0.3}
          />
          <schematicpath
            points={[
              { x: 0.18, y: 0.18 },
              { x: 0.1, y: 0.1 },
              { x: -0.1, y: 0.1 },
              { x: -0.18, y: 0.02 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            svgPath="M -0.12 -0.1 L 0 0.1 L 0.14 -0.1 Z"
            strokeColor="#880000"
          />
        </symbol>
      }
      supplierPartNumbers={{
        jlcpcb: ["C353379"],
      }}
      manufacturerPartNumber="SMBJ18A"
      {...props}
    />
  )
}

export const SRN6045TA_4R7M = (props: Omit<InductorProps, "inductance">) => {
  return (
    <inductor
      inductance="4.7uH"
      supplierPartNumbers={{
        jlcpcb: ["C2044594"],
      }}
      manufacturerPartNumber="SRN6045TA-4R7M"
      {...props}
    />
  )
}

const resistorParts = {
  "100": ["0603WAF1000T5E", "C22775"],
  "220": ["0603WAF2200T5E", "C22962"],
  "1k": ["0603WAF1001T5E", "C21190"],
  "10k": ["RT0603BRD0710KL", "C95204"],
  "1.8k": ["RC0603FR-071K8L", "C185354"],
  "4.7k": ["0603WAF4701T5E", "C23162"],
  "5.1k": ["0603WAF5101T5E", "C23186"],
  "30k": ["0603WAF3002T5E", "C22984"],
  "100k": ["0603WAF1003T5E", "C25803"],
} as const
export function R(
  props: Omit<ResistorProps, "resistance" | "footprint"> & {
    resistance: keyof typeof resistorParts
  },
) {
  const [manufacturerPartNumber, lcsc] = resistorParts[props.resistance]
  return (
    <resistor
      {...props}
      manufacturerPartNumber={manufacturerPartNumber}
      supplierPartNumbers={{ jlcpcb: [lcsc] }}
    />
  )
}
const capacitorParts = {
  "100nF": ["CC0603KRX7R9BB104", "C14663", "0603", 50],
  "22nF": ["CL10B223KB8NNNC", "C21122", "0603", 50],
  "10nF": ["CL10B103KB8NNNC", "C1589", "0603", 50],
  "1uF": ["CL10A105KB8NNNC", "C15849", "0603", 50],
  "4.7uF": ["CL10A475KO8NNNC", "C19666", "0603", 16],
  "10uF": ["CL31A106KBHNNNE", "C13585", "1206", 50],
  "22uF": ["CL21A226MAYNNNE", "C602037", "0805", 25],
} as const
export function C(
  props: Omit<CapacitorProps, "capacitance" | "footprint"> & {
    capacitance: keyof typeof capacitorParts
  },
) {
  const [manufacturerPartNumber, lcsc, footprint, maxVoltageRating] =
    capacitorParts[props.capacitance]
  return (
    <capacitor
      {...props}
      maxVoltageRating={maxVoltageRating}
      manufacturerPartNumber={manufacturerPartNumber}
      supplierPartNumbers={{ jlcpcb: [lcsc] }}
    />
  )
}
