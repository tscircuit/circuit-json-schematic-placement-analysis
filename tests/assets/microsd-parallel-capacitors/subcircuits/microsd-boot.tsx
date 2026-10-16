import { C, R, part } from "../components/standard-passives"
import { TF_01A } from "../imports/TF_01A"

const SECTION = "MICROSD_BOOT"

const breakoutPad = (name: string, net: string, label: string, x: number) => (
  <testpoint
    name={name}
    footprint={
      <footprint>
        <smtpad
          portHints={["pin1"]}
          pcbX="0mm"
          pcbY="0mm"
          width="1.0mm"
          height="1.0mm"
          shape="rect"
        />
        <courtyardrect width="1.5mm" height="1.5mm" />
      </footprint>
    }
    pcbX={x}
    pcbY={13}
    schSectionName={SECTION}
    connections={{ pin1: `net.${net}` }}
    pcbSx={{ "& silkscreentext": { visibility: "hidden" } }}
  >
    <silkscreentext text={label} pcbX={x} pcbY={14.2} fontSize="0.55mm" />
  </testpoint>
)

export const MicroSdBootSubcircuit = ({
  exposeToParent = true,
}: {
  exposeToParent?: boolean
}) => (
  <subcircuit
    name="MICROSD_BOOT"
    width="42mm"
    height="34mm"
    autorouter="default"
    autorouterVersion="beta_pipeline9"
    autorouterEffortLevel="10x"
    defaultTraceWidth="0.15mm"
    exposeNets={exposeToParent}
    schAutoLayoutEnabled
    schTraceAutoLabelEnabled
  >
    <net name="VDD_3V3" isPowerNet nominalTraceWidth="0.5mm" />
    <net name="GND" isGroundNet nominalTraceWidth="0.5mm" />
    <net name="SD_DAT0" />
    <net name="SD_DAT1" />
    <net name="SD_DAT2" />
    <net name="SD_DAT3" />
    <net name="SD_CMD" />
    <net name="SD_CLK" />
    <net name="SD_CARD_DETECT_N" />

    <TF_01A
      name="J_SD"
      pcbX={0}
      pcbY={-6}
      schX={0}
      schY={0}
      schSectionName={SECTION}
      pcbSx={{ "& silkscreentext": { visibility: "hidden" } }}
    />

    {breakoutPad("TP_SD_DAT2", "SD_DAT2", "D2", 9)}
    {breakoutPad("TP_SD_DAT3", "SD_DAT3", "D3", 6)}
    {breakoutPad("TP_SD_CMD", "SD_CMD", "CMD", 3)}
    {breakoutPad("TP_SD_CLK", "SD_CLK", "CLK", 0)}
    {breakoutPad("TP_SD_DAT0", "SD_DAT0", "D0", -3)}
    {breakoutPad("TP_SD_DAT1", "SD_DAT1", "D1", -6)}
    {breakoutPad("TP_SD_CD", "SD_CARD_DETECT_N", "CD", -9)}

    <R
      name="R_SD_DAT2_PU"
      resistance={part.r4k7.value}
      mpn={part.r4k7.mpn}
      lcsc={part.r4k7.lcsc}
      x={7.4}
      y={4.2}
      rotation={90}
      sectionName={SECTION}
    />
    <R
      name="R_SD_DAT3_PU"
      resistance={part.r4k7.value}
      mpn={part.r4k7.mpn}
      lcsc={part.r4k7.lcsc}
      x={5.4}
      y={4.2}
      rotation={90}
      sectionName={SECTION}
    />
    <R
      name="R_SD_CMD_PU"
      resistance={part.r4k7.value}
      mpn={part.r4k7.mpn}
      lcsc={part.r4k7.lcsc}
      x={3.4}
      y={4.2}
      rotation={90}
      sectionName={SECTION}
    />
    <R
      name="R_SD_DAT0_PU"
      resistance={part.r4k7.value}
      mpn={part.r4k7.mpn}
      lcsc={part.r4k7.lcsc}
      x={-5.4}
      y={4.2}
      rotation={90}
      sectionName={SECTION}
    />
    <R
      name="R_SD_DAT1_PU"
      resistance={part.r4k7.value}
      mpn={part.r4k7.mpn}
      lcsc={part.r4k7.lcsc}
      x={-7.4}
      y={4.2}
      rotation={90}
      sectionName={SECTION}
    />
    <R
      name="R_SD_CD_PU"
      resistance={part.r10k.value}
      mpn={part.r10k.mpn}
      lcsc={part.r10k.lcsc}
      x={-9.4}
      y={4.2}
      rotation={90}
      sectionName={SECTION}
    />

    <C
      name="C_SD_HF"
      capacitance={part.c100n.value}
      mpn={part.c100n.mpn}
      lcsc={part.c100n.lcsc}
      x={-2.16}
      y={1.6}
      rotation={180}
      sectionName={SECTION}
    />
    <C
      name="C_SD_BULK"
      capacitance={part.c10u.value}
      mpn={part.c10u.mpn}
      lcsc={part.c10u.lcsc}
      x={-2.16}
      y={3.6}
      rotation={90}
      size="0603"
      sectionName={SECTION}
    />

    <trace
      name="SD_DAT2_ESCAPE"
      from=".J_SD > .DAT2"
      to=".TP_SD_DAT2 > .pin1"
      width="0.15mm"
    />
    <trace
      name="SD_DAT3_ESCAPE"
      from=".J_SD > .DAT3"
      to=".TP_SD_DAT3 > .pin1"
      width="0.15mm"
    />
    <trace
      name="SD_CMD_ESCAPE"
      from=".J_SD > .CMD"
      to=".TP_SD_CMD > .pin1"
      width="0.15mm"
    />
    <trace
      name="SD_CLK_ESCAPE"
      from=".J_SD > .CLK"
      to=".TP_SD_CLK > .pin1"
      width="0.15mm"
    />
    <trace
      name="SD_DAT0_ESCAPE"
      from=".J_SD > .DAT0"
      to=".TP_SD_DAT0 > .pin1"
      width="0.15mm"
    />
    <trace
      name="SD_DAT1_ESCAPE"
      from=".J_SD > .DAT1"
      to=".TP_SD_DAT1 > .pin1"
      width="0.15mm"
    />
    <trace
      name="SD_CD_ESCAPE"
      from=".J_SD > .CARD_DETECT_N"
      to=".TP_SD_CD > .pin1"
      width="0.15mm"
    />

    <bus
      name="SDC0_TOP_BUS"
      pcbAllowedLayers={["top"]}
      pcbTraceWidth="0.15mm"
      maxLengthSkew="2.5mm"
      connections={[
        "SD_DAT2_ESCAPE",
        "SD_DAT3_ESCAPE",
        "SD_CMD_ESCAPE",
        "SD_CLK_ESCAPE",
        "SD_DAT0_ESCAPE",
        "SD_DAT1_ESCAPE",
      ]}
    />

    <trace
      name="SD_DAT2_PULLUP"
      from=".J_SD > .DAT2"
      to=".R_SD_DAT2_PU > .pin1"
    />
    <trace
      name="SD_DAT3_PULLUP"
      from=".J_SD > .DAT3"
      to=".R_SD_DAT3_PU > .pin1"
    />
    <trace name="SD_CMD_PULLUP" from=".J_SD > .CMD" to=".R_SD_CMD_PU > .pin1" />
    <trace
      name="SD_DAT0_PULLUP"
      from=".J_SD > .DAT0"
      to=".R_SD_DAT0_PU > .pin1"
    />
    <trace
      name="SD_DAT1_PULLUP"
      from=".J_SD > .DAT1"
      to=".R_SD_DAT1_PU > .pin1"
    />
    <trace
      name="SD_CD_PULLUP"
      from=".J_SD > .CARD_DETECT_N"
      to=".R_SD_CD_PU > .pin1"
    />
    <bus
      name="SDC0_PULLUPS_TOP"
      pcbAllowedLayers={["top"]}
      connections={[
        "SD_DAT2_PULLUP",
        "SD_DAT3_PULLUP",
        "SD_CMD_PULLUP",
        "SD_DAT0_PULLUP",
        "SD_DAT1_PULLUP",
        "SD_CD_PULLUP",
      ]}
    />

    <trace
      name="SD_VDD_LOCAL"
      from=".J_SD > .VDD"
      to=".C_SD_HF > .pin1"
      width="0.4mm"
    />
    <trace
      name="SD_VSS_LOCAL"
      from=".J_SD > .VSS"
      to=".C_SD_HF > .pin2"
      width="0.4mm"
    />
    <trace
      name="SD_VDD_BULK"
      from=".C_SD_HF > .pin1"
      to=".C_SD_BULK > .pin1"
      width="0.5mm"
    />
    <trace
      name="SD_VSS_BULK"
      from=".C_SD_HF > .pin2"
      to=".C_SD_BULK > .pin2"
      width="0.5mm"
    />
    <bus
      name="SD_POWER_LOCAL_TOP"
      pcbAllowedLayers={["top"]}
      connections={[
        "SD_VDD_LOCAL",
        "SD_VSS_LOCAL",
        "SD_VDD_BULK",
        "SD_VSS_BULK",
      ]}
    />

    <trace
      name="SD_VDD_PLANE"
      from=".C_SD_BULK > .pin1"
      to="net.VDD_3V3"
      width="0.5mm"
    />
    <trace
      name="SD_GND_PLANE"
      from=".C_SD_BULK > .pin2"
      to="net.GND"
      width="0.5mm"
    />
    <trace
      name="SD_DAT2_PULLUP_POWER"
      from=".R_SD_DAT2_PU > .pin2"
      to="net.VDD_3V3"
    />
    <trace
      name="SD_DAT3_PULLUP_POWER"
      from=".R_SD_DAT3_PU > .pin2"
      to="net.VDD_3V3"
    />
    <trace
      name="SD_CMD_PULLUP_POWER"
      from=".R_SD_CMD_PU > .pin2"
      to="net.VDD_3V3"
    />
    <trace
      name="SD_DAT0_PULLUP_POWER"
      from=".R_SD_DAT0_PU > .pin2"
      to="net.VDD_3V3"
    />
    <trace
      name="SD_DAT1_PULLUP_POWER"
      from=".R_SD_DAT1_PU > .pin2"
      to="net.VDD_3V3"
    />
    <trace
      name="SD_CD_PULLUP_POWER"
      from=".R_SD_CD_PU > .pin2"
      to="net.VDD_3V3"
    />
    <trace
      name="SD_SHELL_GROUND_1"
      from=".J_SD > .GND1"
      to="net.GND"
      width="0.5mm"
    />
    <trace
      name="SD_SHELL_GROUND_2"
      from=".J_SD > .GND2"
      to="net.GND"
      width="0.5mm"
    />
    <trace
      name="SD_SHELL_GROUND_3"
      from=".J_SD > .GND3"
      to="net.GND"
      width="0.5mm"
    />
    <trace
      name="SD_SHELL_GROUND_4"
      from=".J_SD > .GND4"
      to="net.GND"
      width="0.5mm"
    />

    <silkscreentext
      text="microSD BOOT / ROOTFS"
      pcbX={0}
      pcbY={8.1}
      fontSize="0.7mm"
    />
  </subcircuit>
)
