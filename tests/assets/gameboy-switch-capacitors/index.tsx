// Complete controls sheet from AnasSarkiz/Game-Boy-Enhance v1.0.3.
// https://tscircuit.com/AnasSarkiz/Game-Boy-Enhance?version=1.0.3#schematic
// The other board sheets are outside this repro; original local traces and net
// boundaries, component imports, symbols and placements are retained.
import { Circuit } from "@tscircuit/core"
import { TSA010A2026B } from "./TSA010A2026B"
import { A_0402WGF5101TCE } from "./A_0402WGF5101TCE"
import { CL05B104KB54PNC } from "./CL05B104KB54PNC"
type Layout = "original" | "orientation-only" | "grouped" | "resistor-separated"
export default function Controls({
  layout: variant = "original",
}: {
  layout?: Layout
}) {
  const layout = variant === "resistor-separated" ? "grouped" : variant
  return (
    <board schLayout={{ layoutMode: "relative" }} routingDisabled>
      <schematicsheet
        name="controls"
        displayName="GAME INPUTS / GPIO FILTERS"
        sheetWidth={600}
        sheetHeight={500}
      >
        <schematicsection
          sectionTitleFontSize={layout === "grouped" ? 0.12 : undefined}
          name="controls"
          displayName="GAME INPUTS / GPIO FILTERS"
        />
        <TSA010A2026B
          name="SW3"
          schX={layout === "grouped" ? -12 : -18}
          schY={layout === "grouped" ? 12 : 14}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={-36}
          pcbY={34}
          pcbRotation={0}
        />
        <silkscreentext text="UP" pcbX={-36} pcbY={38} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R26"
          schX={
            variant === "resistor-separated"
              ? -20
              : layout === "grouped"
                ? -9.8
                : -13
          }
          schY={layout === "grouped" ? 13.6 : 14}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-37}
          pcbY={30.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C45"
          schX={layout === "grouped" ? -9.8 : -8}
          schY={layout === "grouped" ? 12 : 14}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-35}
          pcbY={30.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW4"
          schX={layout === "grouped" ? -5 : 6}
          schY={layout === "grouped" ? 12 : 14}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={-36}
          pcbY={16}
          pcbRotation={0}
        />
        <silkscreentext text="DOWN" pcbX={-36} pcbY={20} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R27"
          schX={layout === "grouped" ? -2.8 : 11}
          schY={layout === "grouped" ? 13.6 : 14}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-37}
          pcbY={12.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C46"
          schX={layout === "grouped" ? -2.8 : 16}
          schY={layout === "grouped" ? 12 : 14}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-35}
          pcbY={12.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW5"
          schX={layout === "grouped" ? -12 : -18}
          schY={layout === "grouped" ? 7.5 : 8}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={-45}
          pcbY={25}
          pcbRotation={0}
        />
        <silkscreentext text="LEFT" pcbX={-45} pcbY={29} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R28"
          schX={layout === "grouped" ? -9.8 : -13}
          schY={layout === "grouped" ? 9.1 : 8}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-46}
          pcbY={21.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C47"
          schX={layout === "grouped" ? -9.8 : -8}
          schY={layout === "grouped" ? 7.5 : 8}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-44}
          pcbY={21.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW6"
          schX={layout === "grouped" ? -5 : 6}
          schY={layout === "grouped" ? 7.5 : 8}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={-27}
          pcbY={25}
          pcbRotation={0}
        />
        <silkscreentext text="RIGHT" pcbX={-27} pcbY={29} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R29"
          schX={layout === "grouped" ? -2.8 : 11}
          schY={layout === "grouped" ? 9.1 : 8}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-28}
          pcbY={21.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C48"
          schX={layout === "grouped" ? -2.8 : 16}
          schY={layout === "grouped" ? 7.5 : 8}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-26}
          pcbY={21.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW7"
          schX={layout === "grouped" ? -12 : -18}
          schY={layout === "grouped" ? 3 : 2}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={38}
          pcbY={31}
          pcbRotation={0}
        />
        <silkscreentext text="A" pcbX={38} pcbY={35} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R30"
          schX={layout === "grouped" ? -9.8 : -13}
          schY={layout === "grouped" ? 4.6 : 2}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={37}
          pcbY={27.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C49"
          schX={layout === "grouped" ? -9.8 : -8}
          schY={layout === "grouped" ? 3 : 2}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={39}
          pcbY={27.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW8"
          schX={layout === "grouped" ? -5 : 6}
          schY={layout === "grouped" ? 3 : 2}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={27}
          pcbY={23}
          pcbRotation={0}
        />
        <silkscreentext text="B" pcbX={27} pcbY={27} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R31"
          schX={layout === "grouped" ? -2.8 : 11}
          schY={layout === "grouped" ? 4.6 : 2}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={26}
          pcbY={19.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C50"
          schX={layout === "grouped" ? -2.8 : 16}
          schY={layout === "grouped" ? 3 : 2}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={28}
          pcbY={19.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW9"
          schX={layout === "grouped" ? -12 : -18}
          schY={layout === "grouped" ? -1.5 : -4}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={7}
          pcbY={42}
          pcbRotation={0}
        />
        <silkscreentext text="START" pcbX={7} pcbY={46} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R32"
          schX={layout === "grouped" ? -9.8 : -13}
          schY={layout === "grouped" ? 0.1 : -4}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={6}
          pcbY={38.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C51"
          schX={layout === "grouped" ? -9.8 : -8}
          schY={layout === "grouped" ? -1.5 : -4}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={8}
          pcbY={38.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW10"
          schX={layout === "grouped" ? -5 : 6}
          schY={layout === "grouped" ? -1.5 : -4}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={-7}
          pcbY={42}
          pcbRotation={0}
        />
        <silkscreentext text="SELECT" pcbX={-7} pcbY={46} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R33"
          schX={layout === "grouped" ? -2.8 : 11}
          schY={layout === "grouped" ? 0.1 : -4}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-8}
          pcbY={38.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C52"
          schX={layout === "grouped" ? -2.8 : 16}
          schY={layout === "grouped" ? -1.5 : -4}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-6}
          pcbY={38.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW11"
          schX={layout === "grouped" ? -12 : -18}
          schY={layout === "grouped" ? -6 : -10}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={-44}
          pcbY={46}
          pcbRotation={0}
        />
        <silkscreentext text="L" pcbX={-44} pcbY={50} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R34"
          schX={layout === "grouped" ? -9.8 : -13}
          schY={layout === "grouped" ? -4.4 : -10}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-45}
          pcbY={42.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C53"
          schX={layout === "grouped" ? -9.8 : -8}
          schY={layout === "grouped" ? -6 : -10}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={-43}
          pcbY={42.5}
          pcbRotation={90}
        />
        <TSA010A2026B
          name="SW12"
          schX={layout === "grouped" ? -5 : 6}
          schY={layout === "grouped" ? -6 : -10}
          schRotation={layout === "grouped" ? 90 : undefined}
          schSectionName="controls"
          pcbX={44}
          pcbY={46}
          pcbRotation={0}
        />
        <silkscreentext text="R" pcbX={44} pcbY={50} fontSize="1.2mm" />
        <A_0402WGF5101TCE
          name="R35"
          schX={layout === "grouped" ? -2.8 : 11}
          schY={layout === "grouped" ? -4.4 : -10}
          schRotation={layout === "grouped" ? -90 : undefined}
          schSectionName="controls"
          pcbX={43}
          pcbY={42.5}
          pcbRotation={90}
        />
        <CL05B104KB54PNC
          name="C54"
          schX={layout === "grouped" ? -2.8 : 16}
          schY={layout === "grouped" ? -6 : -10}
          schRotation={layout !== "original" ? -90 : undefined}
          schSectionName="controls"
          pcbX={45}
          pcbY={42.5}
          pcbRotation={90}
        />
      </schematicsheet>
      <net name="SYS_3V3" isPowerNet />
      <net name="GND" isGroundNet />
      <net name="BUTTON_UP_N" />
      <net name="BUTTON_DOWN_N" />
      <net name="BUTTON_LEFT_N" />
      <net name="BUTTON_RIGHT_N" />
      <net name="BUTTON_A_N" />
      <net name="BUTTON_B_N" />
      <net name="BUTTON_START_N" />
      <net name="BUTTON_SELECT_N" />
      <net name="BUTTON_L_N" />
      <net name="BUTTON_R_N" />
      <trace from=".R26 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R27 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R28 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R29 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R30 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R31 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R32 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R33 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R34 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".R35 > .pin1" to="net.SYS_3V3" schDisplayLabel="SYS_3V3" />
      <trace from=".SW3 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C45 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW4 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C46 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW5 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C47 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW6 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C48 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW7 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C49 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW8 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C50 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW9 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C51 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW10 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C52 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW11 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C53 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace from=".SW12 > .pin1" to="net.GND" schDisplayLabel="GND" />
      <trace from=".C54 > .pin2" to="net.GND" schDisplayLabel="GND" />
      <trace
        from=".SW3 > .pin2"
        to="net.BUTTON_UP_N"
        schDisplayLabel="BUTTON_UP_N"
      />
      <trace
        from=".R26 > .pin2"
        to="net.BUTTON_UP_N"
        schDisplayLabel="BUTTON_UP_N"
      />
      <trace
        from=".C45 > .pin1"
        to="net.BUTTON_UP_N"
        schDisplayLabel="BUTTON_UP_N"
      />
      <trace
        from=".SW4 > .pin2"
        to="net.BUTTON_DOWN_N"
        schDisplayLabel="BUTTON_DOWN_N"
      />
      <trace
        from=".R27 > .pin2"
        to="net.BUTTON_DOWN_N"
        schDisplayLabel="BUTTON_DOWN_N"
      />
      <trace
        from=".C46 > .pin1"
        to="net.BUTTON_DOWN_N"
        schDisplayLabel="BUTTON_DOWN_N"
      />
      <trace
        from=".SW5 > .pin2"
        to="net.BUTTON_LEFT_N"
        schDisplayLabel="BUTTON_LEFT_N"
      />
      <trace
        from=".R28 > .pin2"
        to="net.BUTTON_LEFT_N"
        schDisplayLabel="BUTTON_LEFT_N"
      />
      <trace
        from=".C47 > .pin1"
        to="net.BUTTON_LEFT_N"
        schDisplayLabel="BUTTON_LEFT_N"
      />
      <trace
        from=".SW6 > .pin2"
        to="net.BUTTON_RIGHT_N"
        schDisplayLabel="BUTTON_RIGHT_N"
      />
      <trace
        from=".R29 > .pin2"
        to="net.BUTTON_RIGHT_N"
        schDisplayLabel="BUTTON_RIGHT_N"
      />
      <trace
        from=".C48 > .pin1"
        to="net.BUTTON_RIGHT_N"
        schDisplayLabel="BUTTON_RIGHT_N"
      />
      <trace
        from=".SW7 > .pin2"
        to="net.BUTTON_A_N"
        schDisplayLabel="BUTTON_A_N"
      />
      <trace
        from=".R30 > .pin2"
        to="net.BUTTON_A_N"
        schDisplayLabel="BUTTON_A_N"
      />
      <trace
        from=".C49 > .pin1"
        to="net.BUTTON_A_N"
        schDisplayLabel="BUTTON_A_N"
      />
      <trace
        from=".SW8 > .pin2"
        to="net.BUTTON_B_N"
        schDisplayLabel="BUTTON_B_N"
      />
      <trace
        from=".R31 > .pin2"
        to="net.BUTTON_B_N"
        schDisplayLabel="BUTTON_B_N"
      />
      <trace
        from=".C50 > .pin1"
        to="net.BUTTON_B_N"
        schDisplayLabel="BUTTON_B_N"
      />
      <trace
        from=".SW9 > .pin2"
        to="net.BUTTON_START_N"
        schDisplayLabel="BUTTON_START_N"
      />
      <trace
        from=".R32 > .pin2"
        to="net.BUTTON_START_N"
        schDisplayLabel="BUTTON_START_N"
      />
      <trace
        from=".C51 > .pin1"
        to="net.BUTTON_START_N"
        schDisplayLabel="BUTTON_START_N"
      />
      <trace
        from=".SW10 > .pin2"
        to="net.BUTTON_SELECT_N"
        schDisplayLabel="BUTTON_SELECT_N"
      />
      <trace
        from=".R33 > .pin2"
        to="net.BUTTON_SELECT_N"
        schDisplayLabel="BUTTON_SELECT_N"
      />
      <trace
        from=".C52 > .pin1"
        to="net.BUTTON_SELECT_N"
        schDisplayLabel="BUTTON_SELECT_N"
      />
      <trace
        from=".SW11 > .pin2"
        to="net.BUTTON_L_N"
        schDisplayLabel="BUTTON_L_N"
      />
      <trace
        from=".R34 > .pin2"
        to="net.BUTTON_L_N"
        schDisplayLabel="BUTTON_L_N"
      />
      <trace
        from=".C53 > .pin1"
        to="net.BUTTON_L_N"
        schDisplayLabel="BUTTON_L_N"
      />
      <trace
        from=".SW12 > .pin2"
        to="net.BUTTON_R_N"
        schDisplayLabel="BUTTON_R_N"
      />
      <trace
        from=".R35 > .pin2"
        to="net.BUTTON_R_N"
        schDisplayLabel="BUTTON_R_N"
      />
      <trace
        from=".C54 > .pin1"
        to="net.BUTTON_R_N"
        schDisplayLabel="BUTTON_R_N"
      />
    </board>
  )
}

export async function createGameboySwitchCapacitorRepro(
  layout: Layout = "original",
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Controls layout={layout} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
