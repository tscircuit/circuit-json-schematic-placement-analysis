export const jlc = (partNumber: string) => ({ jlcpcb: [partNumber] })

export const cleanImportedSilk = {
  pcbSx: { "& silkscreentext": { visibility: "hidden" as const } },
}

export const footprint0402 = (
  <footprint>
    <smtpad
      portHints={["pin1"]}
      pcbX="-0.43mm"
      pcbY="0mm"
      width="0.56mm"
      height="0.54mm"
      shape="rect"
    />
    <smtpad
      portHints={["pin2"]}
      pcbX="0.43mm"
      pcbY="0mm"
      width="0.56mm"
      height="0.54mm"
      shape="rect"
    />
    <courtyardrect width="1.35mm" height="0.70mm" />
  </footprint>
)

export const footprint0603 = (
  <footprint>
    <smtpad
      portHints={["pin1"]}
      pcbX="-0.75mm"
      pcbY="0mm"
      width="0.80mm"
      height="0.90mm"
      shape="rect"
    />
    <smtpad
      portHints={["pin2"]}
      pcbX="0.75mm"
      pcbY="0mm"
      width="0.80mm"
      height="0.90mm"
      shape="rect"
    />
    <courtyardrect width="2.15mm" height="1.25mm" />
  </footprint>
)

type Placement = {
  name: string
  x: number
  y: number
  rotation?: number
  sectionName: string
  maxDecouplingTraceLength?: string
}

type ResistorPlacement = Placement & {
  resistance: string
  mpn: string
  lcsc: string
  size?: "0402" | "0603"
}

export const R = ({
  name,
  resistance,
  mpn,
  lcsc,
  x,
  y,
  rotation = 0,
  sectionName,
  size = "0402",
}: ResistorPlacement) => (
  <resistor
    name={name}
    resistance={resistance}
    footprint={size === "0402" ? footprint0402 : footprint0603}
    manufacturerPartNumber={mpn}
    supplierPartNumbers={jlc(lcsc)}
    pcbX={x}
    pcbY={y}
    pcbRotation={rotation}
    schSectionName={sectionName}
  />
)

type CapacitorPlacement = Placement & {
  capacitance: string
  mpn: string
  lcsc: string
  size?: "0402" | "0603"
  maxVoltageRating?: string
}

export const C = ({
  name,
  capacitance,
  mpn,
  lcsc,
  x,
  y,
  rotation = 0,
  sectionName,
  size = "0402",
  maxVoltageRating = "10V",
  maxDecouplingTraceLength,
}: CapacitorPlacement) => (
  <capacitor
    name={name}
    capacitance={capacitance}
    maxVoltageRating={maxVoltageRating}
    footprint={size === "0402" ? footprint0402 : footprint0603}
    manufacturerPartNumber={mpn}
    supplierPartNumbers={jlc(lcsc)}
    pcbX={x}
    pcbY={y}
    pcbRotation={rotation}
    schSectionName={sectionName}
    maxDecouplingTraceLength={maxDecouplingTraceLength}
  />
)

export const part = {
  r0: { mpn: "0402WGF0000TCE", lcsc: "C17168", value: "0ohm" },
  r22: { mpn: "0402WGF220JTCE", lcsc: "C25092", value: "22ohm" },
  r33: { mpn: "0402WGF330JTCE", lcsc: "C25100", value: "33ohm" },
  r100: { mpn: "0402WGF1000TCE", lcsc: "C25076", value: "100ohm" },
  r240: { mpn: "AC0402FR-07240RL", lcsc: "C144776", value: "240ohm" },
  r330: { mpn: "0402WGF3300TCE", lcsc: "C25104", value: "330ohm" },
  r1k: { mpn: "0402WGF1001TCE", lcsc: "C11702", value: "1kohm" },
  r2k2: { mpn: "0402WGF2201TCE", lcsc: "C25879", value: "2.2kohm" },
  r4k7: { mpn: "0402WGF4701TCE", lcsc: "C25900", value: "4.7kohm" },
  r5k1: { mpn: "0402WGF5101TCE", lcsc: "C25905", value: "5.1kohm" },
  r10k: { mpn: "0402WGF1002TCE", lcsc: "C25744", value: "10kohm" },
  r49k9: { mpn: "FRC0402F4992TS", lcsc: "C2906873", value: "49.9kohm" },
  r51k: { mpn: "0402WGF5102TCE", lcsc: "C25794", value: "51kohm" },
  r100k: { mpn: "0402WGF1003TCE", lcsc: "C25741", value: "100kohm" },
  r453k: { mpn: "FRC0402F4533TS", lcsc: "C3013172", value: "453kohm" },
  r680k: { mpn: "0402WGF6803TCE", lcsc: "C25765", value: "680kohm" },
  c10p: { mpn: "0402CG100J500NT", lcsc: "C1548", value: "10pF" },
  c12p: { mpn: "0402CG120J500NT", lcsc: "C1547", value: "12pF" },
  c20p: { mpn: "0402CG200J500NT", lcsc: "C1554", value: "20pF" },
  c100n: { mpn: "CL05B104KO5NNNC", lcsc: "C1525", value: "100nF" },
  c1u: { mpn: "TCC0402X5R105M6R3AT", lcsc: "C2887021", value: "1uF" },
  c4u7: { mpn: "CL10A475KO8NNNC", lcsc: "C19666", value: "4.7uF" },
  c10u: { mpn: "CL10A106KP8NNNC", lcsc: "C19702", value: "10uF" },
  c22u: { mpn: "CL10A226MQ8NRNC", lcsc: "C59461", value: "22uF" },
} as const
