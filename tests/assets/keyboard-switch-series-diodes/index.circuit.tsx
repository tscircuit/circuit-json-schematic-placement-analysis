// Complete pmdroid/key-pcb v1.0.4 schematic. Original placements and wiring.
// C81598 pin labels are supplied in its import to match the manufacturer pinout.
// https://tscircuit.com/pmdroid/key-pcb?version=1.0.4
import { ESP32_S3_WROOM_1_N4R8 } from "./imports/ESP32_S3_WROOM_1_N4R8"
import { Fragment } from "react"
import { HotswapKey } from "./imports/HotswapKey"
import { ArcadeLogo } from "./imports/ArcadeLogo"
import { EC11E18244A5 } from "./imports/EC11E18244A5"
import { MCP73871T_2CCI_ML } from "./imports/MCP73871T_2CCI_ML"
import { TPS61023DRLR } from "./imports/TPS61023DRLR"
import { S2B_PH_SM4_TB_LF__SN_ } from "./imports/S2B_PH_SM4_TB_LF__SN_"
import { SN74AHCT1G125DBVR } from "./imports/SN74AHCT1G125DBVR"
import { HX_3x4x2_2P_1_6N_TACTILE_SWITCH } from "./imports/HX_3x4x2_2P_1_6N_TACTILE_SWITCH"
import { USBLC6_2SC6 } from "./imports/USBLC6_2SC6"
import { XRNR4030_1uH_N } from "./imports/XRNR4030_1uH_N"
import { A_1N4148W } from "./imports/A_1N4148W"
import { TYPE_C_31_M_12 } from "./imports/TYPE_C_31_M_12"
import type { PartsEngine, TraceProps } from "@tscircuit/props"

// ── arcade.dev macropad ─────────────────────────────────────────────────────
// Square (94mm) board, rounded corners. Two-sided build:
//   FRONT (top):  3×4 hotswap key grid + per-key SK6812 RGB, rotary encoder
//                 top-left, big "arcade.dev" silkscreen logo top-right.
//   BACK (bottom): ESP32-S3-WROOM-1 (270°, antenna at the right board edge over
//                   a copper-free notch), USB-C, 3.3V LDO, LiPo charger/power-
//                   path, 5V boost, Kailh hotswap sockets, reverse-mount LEDs.
// USB 5V feeds the charger input (VUSB). The MCP73871 power-path creates VSYS,
// TPS61023 regenerates VBUS(5V), and an AP2114H LDO derives 3V3 for the ESP32.
// Programming/HID over USB-C via the ESP32-S3 native USB, plus SMD RST/BOOT
// buttons on the back for a manual hardware reset / ROM-bootloader entry.
// ─────────────────────────────────────────────────────────────────────────────

// Keys occupy the bottom three rows of a 4×4, 19.05mm-pitch grid centered on the
// board (equal margins on all four edges). The top row (y = +28.575) is left
// open for the rotary knob (top-left cell) and the "Arcade" logo.
const COLS = [-28.575, -9.525, 9.525, 28.575]
const ROWS = [9.525, -9.525, -28.575]
// Key MATRIX (3 rows × 4 cols) with one diode per key — the standard keyboard
// wiring (QMK "COL2ROW"): COL pin → switch → diode anode, cathode → ROW pin.
// Firmware drives one row low at a time and reads the columns with internal
// pull-ups: 7 GPIOs instead of 12, no ghosting, full NKRO.
const ROW_IOS = ["IO4", "IO5", "IO6"] // top → bottom key rows
const COL_IOS = ["IO7", "IO15", "IO16", "IO17"] // left → right key columns
const KEYS = ROWS.flatMap((y, r) =>
  COLS.map((x, c) => {
    const i = r * 4 + c
    return { sw: `SW${i + 1}`, led: `LED${i + 1}`, d: `D${i + 1}`, x, y, r, c }
  }),
)

// LED data-chain order: a serpentine (row1 right→left, row2 left→right, row3
// right→left) entered at LED4, the key nearest the U5 level shifter. Every
// DOUT→DIN hop stays within ~one key pitch instead of wrapping ~55mm across
// the board twice. Firmware must address LEDs in THIS order (chain index
// 0..11), not by key number.
const LED_CHAIN = [4, 3, 2, 1, 5, 6, 7, 8, 12, 11, 10, 9]

// ── Mounting holes ──────────────────────────────────────────────────────────
// Four M3 corner holes to bolt the board onto the 3D-printed base (see
// models/base.scad / base.stl). Board is 94×94mm centered on the origin, so the
// corners are at ±47; the holes sit 5mm inset (±42, ±42), matching the standoff
// posts in the base. 3.2mm diameter = M3 clearance.
const MOUNT_INSET = 42 // mm from board center to each hole (both axes)
const MOUNT_DIA = 3.2 // mm — M3 screw clearance
const MOUNT_HOLES = [
  { name: "MH1", x: -MOUNT_INSET, y: MOUNT_INSET },
  { name: "MH2", x: MOUNT_INSET, y: MOUNT_INSET },
  { name: "MH3", x: -MOUNT_INSET, y: -MOUNT_INSET },
  { name: "MH4", x: MOUNT_INSET, y: -MOUNT_INSET },
]

// ── Copper pour outline ─────────────────────────────────────────────────────
// All four planes fill this polygon: the board shape inset 0.5mm, minus the
// top-right block (x ≥ 38, y ≥ 20.5) holding the WROOM antenna. Keepouts do
// NOT clip pours in tscircuit — the notch has to be carved into the pour
// outline itself. Keep in sync with the RF keepout next to U1.
const POUR_EDGE = 46.5 // 47mm half-board − 0.5mm edge margin
const POUR_R = 5.5 // 6mm board corner radius − 0.5mm margin
const NOTCH_X = 38 // antenna notch: everything right of this…
const NOTCH_Y = 20.5 // …and above this stays copper-free
const POUR_OUTLINE = (() => {
  const pts: { x: number; y: number }[] = []
  const corner = (cx: number, cy: number, start: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = start + (Math.PI / 2) * (i / 8)
      pts.push({ x: cx + POUR_R * Math.cos(a), y: cy + POUR_R * Math.sin(a) })
    }
  }
  const C = POUR_EDGE - POUR_R
  pts.push({ x: NOTCH_X, y: POUR_EDGE }) // top edge, at the notch's left rim
  corner(-C, C, Math.PI / 2) // top-left corner
  corner(-C, -C, Math.PI) // bottom-left corner
  corner(C, -C, (3 * Math.PI) / 2) // bottom-right corner
  pts.push({ x: POUR_EDGE, y: NOTCH_Y }) // up the right edge to the notch
  pts.push({ x: NOTCH_X, y: NOTCH_Y }) // notch floor, closing back to the start
  return pts
})()

// SMD tactile push-button for safe reset/boot of the ESP32-S3.
// hanxia HX 3x4x2-2P-1.6N (LCSC C49234124, JLCPCB Extended — no Basic part
// exists in this size class): 4.0×3.0×2.0mm body, top-actuated Ø2.8mm plunger,
// TWO pins (SPST-NO, one terminal per 3mm end) — no internal-pairing trap like
// the 4-pin TS-1187A it replaces. Uses the imported JLC/EasyEDA footprint and
// 3D model so assembly orientation matches their library.
const ResetButton = ({
  name,
  schX,
  schY,
  pcbX,
  pcbY,
}: {
  name: string
  schX: number
  schY: number
  pcbX: number
  pcbY: number
}) => (
  <HX_3x4x2_2P_1_6N_TACTILE_SWITCH
    name={name}
    schSectionName="MCU"
    layer="bottom"
    schX={schX}
    schY={schY}
    pcbX={pcbX}
    pcbY={pcbY}
    pcbRotation="180deg"
  />
)

// Trace wrapper that forwards a `name` prop. The pinned tscircuit's
// TraceProps has no `name` yet, but newer engines (e.g. the dev UI runtime)
// accept it and warn on unnamed traces; the pinned build's non-strict schema
// simply ignores the extra key, so this is forward-compatible.
const NamedTrace = (
  props: TraceProps & { name?: string; schDisplayLabel?: string },
) => <trace {...(props as TraceProps)} />

// Offline parts engine. Every component on this board carries an explicit,
// pinned supplierPartNumber, so the default engine's two network jobs —
// auto-assigning jellybean part numbers and cross-checking footprints against
// the JLCPCB library — have nothing left to do. Leaving it enabled spams
// "unknown_error_finding_part" for every part on any registry-down/offline
// run. The BOM is exactly what the default engine used to pick.
const OFFLINE_PARTS_ENGINE: PartsEngine = {
  findPart: () => ({}),
  fetchPartCircuitJson: () => undefined,
}

export default ({
  correctedLayout = false,
}: {
  correctedLayout?: boolean
} = {}) => (
  <board
    width="94mm"
    height="94mm"
    layers={2}
    borderRadius={6}
    solderMaskColor="black"
    partsEngine={OFFLINE_PARTS_ENGINE}
    pcbStyle={{ viaPadDiameter: "0.45mm", viaHoleDiameter: "0.3mm" }}
    minViaPadDiameter="0.45mm"
    minViaHoleDiameter="0.3mm"
  >
    {/* ═══ Corner mounting holes (M3) → fasten board to the 3D base ═══ */}
    {MOUNT_HOLES.map((h) => (
      <Fragment key={h.name}>
        <hole name={h.name} diameter={`${MOUNT_DIA}mm`} pcbX={h.x} pcbY={h.y} />
      </Fragment>
    ))}

    <schematicsection name="USB" />
    <schematicsection name="Power" />
    <schematicsection name="Battery" />
    <schematicsection name="MCU" />
    <schematicsection name="Encoder" />
    <schematicsection name="Keys" />
    <schematicsection name="LEDs" />
    <schematicsection name="Debug" />

    {/* ═══ USB-C: power (5V) + native-USB data — top edge, opening faces up.
        Vendored import of the TYPE-C-31-M-12 (C165948) instead of
        <connector standard="usb_c">: the standard connector fetches its
        footprint from the network at build time and SILENTLY produces a
        padless, portless connector when the fetch fails — that failure once
        shipped a fab export with no USB at all. ═══ */}
    <TYPE_C_31_M_12
      name="USBC"
      schWidth={correctedLayout ? 1.4 : undefined}
      schSectionName="USB"
      layer="bottom"
      schX={-42.62}
      schY={0}
      pcbX={0}
      pcbY={43}
      pcbRotation="180deg"
    />
    {/* CC pulldowns (5.1k) → advertise as a USB device (UFP); tucked directly
        under the connector, ~3.5mm from the CC pads at (±1.25, 40.87) */}
    <resistor
      name="R_CC1"
      schRotation={correctedLayout ? -90 : 0}
      resistance="5.1k"
      footprint="0402"
      layer="bottom"
      schSectionName="USB"
      schX={correctedLayout ? -45 : -39.15}
      schY={correctedLayout ? -2.2 : -4}
      pcbX={-4}
      pcbY={39.3}
      supplierPartNumbers={{ jlcpcb: ["C25905"] }}
    />
    <resistor
      name="R_CC2"
      schRotation={correctedLayout ? -90 : 0}
      resistance="5.1k"
      footprint="0402"
      layer="bottom"
      schSectionName="USB"
      schX={-40}
      schY={correctedLayout ? -2.2 : -7}
      pcbX={4.2}
      pcbY={39.3}
      supplierPartNumbers={{ jlcpcb: ["C25905"] }}
    />

    {/* USB ESD array (ST USBLC6-2SC6, C7519 — Extended; no Basic USB ESD part
        exists): rail-to-rail clamps on D+/D− plus the VBUS TVS, next to the
        connector. Pins 1↔6 and 3↔4 are internally one node each (flow-through);
        pin5 = VBUS reference, pin2 = GND. */}
    <USBLC6_2SC6
      name="U6"
      schSectionName="USB"
      layer="bottom"
      schX={-36}
      schY={-5}
      pcbX={0}
      pcbY={37.55}
      pcbRotation="90deg"
    />

    {/* ═══ 3.3V LDO (AP2114H-3.3, C150716): 5V VBUS → 3V3. 1A output with
        450mV dropout at full load, Iq 65µA, and — the reason it replaces the
        AMS1117 — datasheet-guaranteed stability with plain ceramic caps (the
        AMS1117 wants ≥22µF tantalum-class ESR). Same SOT-223 pinout:
        pin1 GND, pin2 VOUT, pin3 VIN, tab = VOUT. ═══ */}
    <chip
      name="U2"
      schWidth={correctedLayout ? 1.3 : undefined}
      schSectionName="Power"
      manufacturerPartNumber="AP2114H-3.3TRG1"
      supplierPartNumbers={{ jlcpcb: ["C150716"] }}
      pinLabels={{
        pin1: ["GND"],
        pin2: ["VOUT1"],
        pin3: ["VIN"],
        pin4: ["VOUT2"],
      }}
      pinAttributes={{
        VIN: { requiresPower: true },
        VOUT1: { providesPower: true },
        VOUT2: { providesPower: true },
        GND: { requiresGround: true },
      }}
      footprint="sot223"
      layer="bottom"
      schX={-26}
      schY={0}
      pcbX={-12}
      pcbY={33}
    />
    <capacitor
      schOrientation="vertical"
      name="C_IN"
      capacitance="10uF"
      footprint="0805"
      layer="bottom"
      schSectionName="Power"
      schX={correctedLayout ? -64.4 : -30}
      schY={correctedLayout ? -13 : -5}
      pcbX={-9}
      pcbY={27.9}
      supplierPartNumbers={{ jlcpcb: ["C15850"] }}
    />
    <capacitor
      schOrientation="vertical"
      name="C_OUT"
      capacitance="10uF"
      footprint="0805"
      layer="bottom"
      schSectionName="Power"
      schX={correctedLayout ? 8.6 : -22}
      schY={correctedLayout ? -6 : -5}
      pcbX={-5.5}
      pcbY={33}
      supplierPartNumbers={{ jlcpcb: ["C15850"] }}
    />

    {/* ═══ Battery subsystem (BACK, center block under the USB-C) ═══════════════
        Untethered LiPo power. USB 5V (net.VUSB) feeds the MCP73871 power-path
        charger: on USB the device runs from USB and the cell charges cleanly;
        on unplug OUT switches to the battery. OUT (net.VSYS, 3.0–5V) feeds a
        TPS61023 boost that regenerates a solid 5V onto the existing net.VBUS —
        so the 3V3 LDO and the WS2812 LEDs downstream are unchanged.
        The whole charger/boost/LDO chain sits centered right below the USB-C,
        so VUSB (~8mm) and boost→LDO VBUS (~4mm) runs are short; only the DC
        charge path to the battery connector crosses the board. The JST stays
        on the left edge where the battery bay and cable live.
        1S LiPo (~500 mAh) via JST-PH; ~500 mA USB-limited charge. ═══════════ */}
    <S2B_PH_SM4_TB_LF__SN_
      name="J_BAT"
      schSectionName="Battery"
      layer="bottom"
      schX={-70}
      schY={0}
      pcbX={-42}
      pcbY={33}
    />
    {/* Battery polarity marks (JST-PH pigtail polarity is NOT standardized —
        meter the pack before first plug-in). NOTE: U4.EN is tied to VSYS, so
        the boost drains the cell below safe discharge — a PROTECTED 1S pack
        is required; document this with the build instructions. */}
    <silkscreentext
      text="+"
      layer="bottom"
      pcbX={-38.6}
      pcbY={39.1}
      anchorAlignment="center"
      fontSize="1.5mm"
    />
    <silkscreentext
      text="-"
      layer="bottom"
      pcbX={-45.4}
      pcbY={39.1}
      anchorAlignment="center"
      fontSize="1.5mm"
    />

    {/* MCP73871 power-path charger. Straps: SEL=Hi → AC-DC mode with the
        ~1.8A input limit (the 500mA USB mode starved 12 LEDs + Wi-Fi; modern
        ports deliver this, same assumption every RGB keyboard makes). PROG2=Hi
        (only read in USB mode — must not float). CE=Hi(enable) TE=Hi(disable
        safety timer, recommended for load-share). VPCC = 330k/110k divider
        from IN (datasheet Fig 6-1): if the port sags below ≈4.9V the charger
        throttles CHARGING first — the load keeps priority and the rail stays
        up on weak ports. PROG1=2k(500mA charge), PROG3=33k(term ~30mA),
        THERM=10k→GND (~0.5V, inside the 0.25–1.24V window, no NTC fitted). */}
    <MCP73871T_2CCI_ML
      name="U3"
      schSectionName="Battery"
      layer="bottom"
      schWidth={2.2}
      schHeight={2.2}
      schX={-60}
      schY={0}
      pcbX={0}
      pcbY={33}
    />
    <resistor
      name="R_VPCC_H"
      schRotation={correctedLayout ? -90 : 0}
      resistance="330k"
      footprint="0402"
      layer="bottom"
      schSectionName="Battery"
      schX={-64}
      schY={correctedLayout ? 2.3 : 3}
      pcbX={-0.6}
      pcbY={28.6}
      supplierPartNumbers={{ jlcpcb: ["C25778"] }}
    />
    <resistor
      name="R_VPCC_L"
      schRotation={correctedLayout ? -90 : 0}
      resistance="110k"
      footprint="0402"
      layer="bottom"
      schSectionName="Battery"
      schX={-64}
      schY={correctedLayout ? -0.7 : 6}
      pcbX={-3}
      pcbY={28.6}
      supplierPartNumbers={{ jlcpcb: ["C2909311"] }}
    />
    {/* Mirrored bottom-layer U3 puts IN1/IN2 on its east edge (x≈+1.9),
        OUT on the south-east, VBAT/PROG on the north edge, THERM south-west —
        the passives ring the matching edges. */}
    <capacitor
      schOrientation="vertical"
      name="C_VUSB"
      capacitance="10uF"
      footprint="0805"
      layer="bottom"
      schSectionName="Battery"
      schX={-66}
      schY={-6}
      pcbX={5.1}
      pcbY={32.8}
      supplierPartNumbers={{ jlcpcb: ["C15850"] }}
    />
    <capacitor
      schOrientation="vertical"
      name="C_VSYS"
      capacitance="4.7uF"
      footprint="0805"
      layer="bottom"
      schSectionName="Battery"
      schX={-54}
      schY={-6}
      pcbX={4.8}
      pcbY={29.8}
      supplierPartNumbers={{ jlcpcb: ["C1779"] }}
    />
    <capacitor
      schOrientation="vertical"
      name="C_VBAT"
      capacitance="4.7uF"
      footprint="0805"
      layer="bottom"
      schSectionName="Battery"
      schX={-54}
      schY={6}
      pcbX={-7.4}
      pcbY={38.6}
      supplierPartNumbers={{ jlcpcb: ["C1779"] }}
    />
    <resistor
      name="R_PROG1"
      schRotation={correctedLayout ? -90 : 0}
      resistance="2k"
      footprint="0402"
      layer="bottom"
      schSectionName="Battery"
      schX={correctedLayout ? -54 : -60}
      schY={correctedLayout ? -2.2 : -6}
      pcbX={4.6}
      pcbY={36.2}
      supplierPartNumbers={{ jlcpcb: ["C4109"] }}
    />
    <resistor
      name="R_PROG3"
      schRotation={correctedLayout ? -90 : 0}
      resistance="33k"
      footprint="0402"
      layer="bottom"
      schSectionName="Battery"
      schX={correctedLayout ? -57 : -60}
      schY={correctedLayout ? -2.2 : -9}
      pcbX={-6.3}
      pcbY={35.2}
      supplierPartNumbers={{ jlcpcb: ["C25779"] }}
    />
    <resistor
      name="R_THERM"
      schRotation={correctedLayout ? -90 : 0}
      resistance="10k"
      footprint="0402"
      layer="bottom"
      schSectionName="Battery"
      schX={correctedLayout ? -66.5 : -60}
      schY={correctedLayout ? -2.2 : -12}
      pcbX={-4.4}
      pcbY={30.1}
      supplierPartNumbers={{ jlcpcb: ["C191123"] }}
    />

    {/* TPS61023 boost: net.VSYS → 5.0V onto net.VBUS. L1 from VSYS to SW,
        FB divider R_FBH/R_FBL sets Vout = 0.6·(1+732k/100k) ≈ 5.0V. */}
    {/* Boost trio sits south-east of the charger, out of the west corridor the
        encoder's A/B/SW lines use to reach the module — the router needs that
        band clear. VSYS hop U3.OUT → U4.VIN is ~7mm. */}
    <TPS61023DRLR
      name="U4"
      schSectionName="Battery"
      layer="bottom"
      schX={-47.37}
      schY={0}
      pcbX={-1}
      pcbY={25}
    />
    {/* L1: XR XRNR4030-1uH/N (C5289359) — 1µH, Isat 5.26A (above the boost's
        ~3.7A switch limit), 16mΩ DCR, 4×4×3mm shielded. Replaces the previous
        unspecified generic "1µH 1210". */}
    <XRNR4030_1uH_N
      name="L1"
      inductance="1uH"
      schSectionName="Battery"
      layer="bottom"
      schX={-50}
      schY={4}
      pcbX={4.2}
      pcbY={25}
    />
    <capacitor
      schOrientation="vertical"
      name="C_BVIN"
      capacitance="10uF"
      footprint="0805"
      layer="bottom"
      schSectionName="Battery"
      schX={correctedLayout ? -52.6 : -50}
      schY={-6}
      pcbX={-4.6}
      pcbY={25.2}
      supplierPartNumbers={{ jlcpcb: ["C15850"] }}
    />
    {/* 2×22µF on the boost output per TI's 5V reference design — ceramics
        lose >50% capacitance at 5V DC bias, so one is not enough. */}
    <capacitor
      schOrientation="vertical"
      name="C_BVOUT"
      capacitance="22uF"
      footprint="0805"
      layer="bottom"
      schSectionName="Battery"
      schX={correctedLayout ? -68 : -42}
      schY={correctedLayout ? -13 : -6}
      pcbX={-2.6}
      pcbY={21.5}
      supplierPartNumbers={{ jlcpcb: ["C45783"] }}
    />
    <capacitor
      schOrientation="vertical"
      name="C_BVOUT2"
      capacitance="22uF"
      footprint="0805"
      layer="bottom"
      schSectionName="Battery"
      schX={correctedLayout ? -66.2 : -39}
      schY={correctedLayout ? -13 : -9}
      pcbX={1.6}
      pcbY={20.2}
      supplierPartNumbers={{ jlcpcb: ["C45783"] }}
    />
    {/* FB divider hugs the FB pin (high-impedance 732k node next to a switch
        node — keep its loop tiny) */}
    <resistor
      name="R_FBH"
      schRotation={correctedLayout ? -90 : 0}
      resistance="732k"
      footprint="0402"
      layer="bottom"
      schSectionName="Battery"
      schX={correctedLayout ? -51 : -42}
      schY={correctedLayout ? 1.7 : 4}
      pcbX={-7}
      pcbY={23.2}
      supplierPartNumbers={{ jlcpcb: ["C5159692"] }}
    />
    <resistor
      name="R_FBL"
      schRotation={correctedLayout ? -90 : 0}
      resistance="100k"
      footprint="0402"
      layer="bottom"
      schSectionName="Battery"
      schX={correctedLayout ? -51 : -42.85}
      schY={correctedLayout ? -1.3 : -4}
      pcbX={-5.6}
      pcbY={21.2}
      supplierPartNumbers={{ jlcpcb: ["C25741"] }}
    />

    {/* ═══ MCU: ESP32-S3-WROOM-1 (on the BACK, 270° rotated, tucked under the
        arcade logo at the top-right). Bottom-layer placement mirrors X before
        rotating, so footprint-local (x,y) lands at global (28 + y, 29.5 + x):
        the antenna (local y 11.4–16.9) points RIGHT, spanning x ≈ 39.4–44.9
        over the copper-free notch, 2mm shy of the board edge. pcbY is 29.5 so
        the module body (y ≤ 38.5) clears the Ø6mm base standoff post around
        MH2 at (42, 42) — see models/base.scad. ═══ */}
    <ESP32_S3_WROOM_1_N4R8
      name="U1"
      schSectionName="MCU"
      layer="bottom"
      schHeight={5}
      schX={0}
      schY={0}
      pcbX={28}
      pcbY={29.5}
      pcbRotation="270deg"
    />
    {/* WROOM decoupling + EN/BOOT straps (manual RST/BOOT buttons added below)
        spread across the field on the module's west flank, everything kept
        west of x≈14.5 so a straight corridor stays open along the west pad
        column (x=19.2) for the matrix/encoder/USB bundle. The V3_3 trunk
        feeds C_BULK + C_DEC here on its way in — the WROOM's internal
        decoupling relaxes the place-at-the-pin rule for C_DEC. */}
    <capacitor
      schOrientation="vertical"
      name="C_BULK"
      capacitance="10uF"
      footprint="0805"
      layer="bottom"
      schSectionName="MCU"
      schX={10}
      schY={-6}
      pcbX={10}
      pcbY={21.5}
      supplierPartNumbers={{ jlcpcb: ["C15850"] }}
    />
    <capacitor
      schOrientation="vertical"
      name="C_DEC"
      capacitance="0.1uF"
      footprint="0402"
      layer="bottom"
      schSectionName="MCU"
      schX={correctedLayout ? 11.4 : 13}
      schY={-6}
      pcbX={12.8}
      pcbY={21.5}
      pcbRotation="90deg"
      supplierPartNumbers={{ jlcpcb: ["C1525"] }}
    />
    <resistor
      name="R_EN"
      resistance="10k"
      footprint="0402"
      layer="bottom"
      schSectionName="MCU"
      schX={-6}
      schY={6}
      pcbX={14}
      pcbY={36}
      pcbRotation="90deg"
      supplierPartNumbers={{ jlcpcb: ["C191123"] }}
    />
    <capacitor
      schOrientation="vertical"
      name="C_EN"
      capacitance="1uF"
      footprint="0402"
      layer="bottom"
      schSectionName="MCU"
      schX={-6}
      schY={3}
      pcbX={11}
      pcbY={36}
      pcbRotation="90deg"
      supplierPartNumbers={{ jlcpcb: ["C52923"] }}
    />
    <resistor
      name="R_BOOT"
      resistance="10k"
      footprint="0402"
      layer="bottom"
      schSectionName="MCU"
      schX={6}
      schY={6}
      pcbX={20.5}
      pcbY={40.8}
      pcbRotation="90deg"
      supplierPartNumbers={{ jlcpcb: ["C191123"] }}
    />
    {/* Safe-reset buttons (SMD tact, BACK) side by side in the strip directly
        above the module, west of the antenna corner: SW_RST pulls EN→GND for
        a hardware reset; SW_BOOT pulls IO0→GND. Hold BOOT + tap RST to force
        the ROM serial bootloader by hand (native-USB download still works). */}
    <ResetButton name="SW_RST" schX={-12} schY={4} pcbX={26.5} pcbY={43} />
    <ResetButton name="SW_BOOT" schX={12} schY={4} pcbX={33.5} pcbY={43} />
    {/* Silkscreen description for the reset/boot buttons (BACK) — above the
        buttons: at 180° their {NAME} labels print below, toward the module */}
    <silkscreentext
      text="BOOT+RST = flash"
      layer="bottom"
      pcbX={30}
      pcbY={45.7}
      anchorAlignment="center"
      fontSize="1mm"
    />

    {/* ═══ Debug test points (BACK) — one per rail plus the LED data feed,
        Ø1.8mm probe pads parked in pour areas beside the block they serve.
        TP_GND × 2 so a probe ground clip always has a nearby home. ═══ */}
    <testpoint
      name="TP_GND1"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.8mm"
      layer="bottom"
      schSectionName="Debug"
      schX={54}
      schY={-2}
      pcbX={-9.5}
      pcbY={21.5}
    />
    <testpoint
      name="TP_GND2"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.8mm"
      layer="bottom"
      schSectionName="Debug"
      schX={57}
      schY={-2}
      pcbX={20}
      pcbY={17.5}
    />
    <testpoint
      name="TP_VBAT"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.8mm"
      layer="bottom"
      schSectionName="Debug"
      schX={54}
      schY={0}
      pcbX={-10.5}
      pcbY={38.5}
    />
    <testpoint
      name="TP_VUSB"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.8mm"
      layer="bottom"
      schSectionName="Debug"
      schX={57}
      schY={0}
      pcbX={8.5}
      pcbY={32.8}
    />
    <testpoint
      name="TP_5V"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.8mm"
      layer="bottom"
      schSectionName="Debug"
      schX={54}
      schY={2}
      pcbX={6.5}
      pcbY={20.5}
    />
    <testpoint
      name="TP_3V3"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.8mm"
      layer="bottom"
      schSectionName="Debug"
      schX={57}
      schY={2}
      pcbX={10}
      pcbY={18.5}
    />
    <testpoint
      name="TP_EN"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.8mm"
      layer="bottom"
      schSectionName="Debug"
      schX={54}
      schY={4}
      pcbX={8.5}
      pcbY={36}
    />
    <testpoint
      name="TP_LED"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.8mm"
      layer="bottom"
      schSectionName="Debug"
      schX={57}
      schY={4}
      pcbX={17}
      pcbY={19}
    />
    <NamedTrace name="TP_GND1__GND" from="TP_GND1.pin1" to="net.GND" />
    <NamedTrace name="TP_GND2__GND" from="TP_GND2.pin1" to="net.GND" />
    <NamedTrace name="TP_VBAT__VBAT" from="TP_VBAT.pin1" to="net.VBAT" />
    <NamedTrace name="TP_VUSB__VUSB" from="TP_VUSB.pin1" to="net.VUSB" />
    <NamedTrace name="TP_5V__VBUS" from="TP_5V.pin1" to="net.VBUS" />
    <NamedTrace name="TP_3V3__V3_3" from="TP_3V3.pin1" to="net.V3_3" />
    <NamedTrace name="TP_EN__R_EN" from="TP_EN.pin1" to="R_EN.pin2" />
    <NamedTrace name="TP_LED__LED4" from="TP_LED.pin1" to="LED4.pin2" />

    {/* ═══ Keys + per-key RGB (FRONT 3×4 grid, 19.05mm pitch) ═══ */}
    {KEYS.map((k) => (
      <HotswapKey
        key={k.sw}
        swName={k.sw}
        ledName={k.led}
        pcbX={k.x}
        pcbY={k.y}
        schX={24 + k.c * 7}
        schY={14 - k.r * 9}
      />
    ))}

    {/* ═══ Rotary encoder (EC11, FRONT) — grid-aligned, top-left ═══ */}
    {/* Top-left cell of the 4×4 grid: left column (x=-28.575), top row (y=28.575). */}
    <EC11E18244A5
      name="ENC1"
      schSectionName="Encoder"
      schHeight={0.8}
      schX={-44}
      schY={10}
      pcbX={-28.575}
      pcbY={28.575}
    />

    {/* ═══ "Arcade" logo (FRONT silkscreen, top) ═══ */}
    <ArcadeLogo scale={2.1} cx={10} cy={28.575} />

    {/* ═══ Tagline (FRONT silkscreen, bottom edge) ═══ */}
    <silkscreentext
      text="Ship agents. Not auth infrastructure."
      layer="top"
      pcbX={0}
      pcbY={-43}
      anchorAlignment="center"
      fontSize="2mm"
    />
    <silkscreentext
      text="https://github.com/ArcadeAI-labs/pcb"
      layer="bottom"
      pcbX={0}
      pcbY={-44}
      anchorAlignment="center"
      fontSize="1.5mm"
    />

    {/* ───────────────────────── Traces ───────────────────────── */}

    {/* Power rails — USB 5V now feeds the charger input (net.VUSB), not the
        system rail directly. net.VBUS is regenerated as a solid 5V by the boost. */}
    {/* Power-carrying traces are 0.4mm: with only two layers there are no
        power planes, so the rails live on routed copper (~1A capable at 1oz
        with modest temperature rise). */}
    <NamedTrace
      name="USBC_VBUS1__VUSB"
      from="USBC.VBUS1"
      to="net.VUSB"
      thickness="0.4mm"
    />
    <NamedTrace
      name="USBC_VBUS2__VUSB"
      from="USBC.VBUS2"
      to="net.VUSB"
      thickness="0.4mm"
    />
    <NamedTrace name="USBC_GND1__GND" from="USBC.GND1" to="net.GND" />
    <NamedTrace name="USBC_GND2__GND" from="USBC.GND2" to="net.GND" />
    <NamedTrace name="USBC_SHELL1__GND" from="USBC.SHELL1" to="net.GND" />
    <NamedTrace name="USBC_SHELL2__GND" from="USBC.SHELL2" to="net.GND" />
    <NamedTrace name="USBC_SHELL3__GND" from="USBC.SHELL3" to="net.GND" />
    <NamedTrace name="USBC_SHELL4__GND" from="USBC.SHELL4" to="net.GND" />
    <NamedTrace
      name="USBC_CC1__R_CC1_pin1"
      schDisplayLabel="CC1"
      from="USBC.CC1"
      to="R_CC1.pin1"
    />
    <NamedTrace name="R_CC1_pin2__GND" from="R_CC1.pin2" to="net.GND" />
    <NamedTrace
      name="USBC_CC2__R_CC2_pin1"
      schDisplayLabel="CC2"
      from="USBC.CC2"
      to="R_CC2.pin1"
    />
    <NamedTrace name="R_CC2_pin2__GND" from="R_CC2.pin2" to="net.GND" />

    {/* USB data (both type-C rows tied for either orientation) */}
    <NamedTrace name="USBC_DP1__USB_DP" from="USBC.DP1" to="net.USB_DP" />
    <NamedTrace name="USBC_DP2__USB_DP" from="USBC.DP2" to="net.USB_DP" />
    <NamedTrace name="USBC_DM1__USB_DM" from="USBC.DM1" to="net.USB_DM" />
    <NamedTrace name="USBC_DM2__USB_DM" from="USBC.DM2" to="net.USB_DM" />
    <NamedTrace name="U1_IO20__USB_DP" from="U1.IO20" to="net.USB_DP" />
    <NamedTrace name="U1_IO19__USB_DM" from="U1.IO19" to="net.USB_DM" />
    {/* ESD array rides the data pair + VUSB (both ends of each internal
        channel are bound so the router can flow through) */}
    <NamedTrace name="U6_pin1__USB_DP" from="U6.pin1" to="net.USB_DP" />
    <NamedTrace name="U6_pin6__USB_DP" from="U6.pin6" to="net.USB_DP" />
    <NamedTrace name="U6_pin3__USB_DM" from="U6.pin3" to="net.USB_DM" />
    <NamedTrace name="U6_pin4__USB_DM" from="U6.pin4" to="net.USB_DM" />
    <NamedTrace name="U6_pin5__VUSB" from="U6.pin5" to="net.VUSB" />
    <NamedTrace name="U6_pin2__GND" from="U6.pin2" to="net.GND" />

    {/* Regulator VBUS(5V from boost) → 3V3 */}
    <NamedTrace
      name="U2_VIN__VBUS"
      from="U2.VIN"
      to="net.VBUS"
      thickness="0.4mm"
    />
    <NamedTrace
      name="U2_VOUT1__V3_3"
      from="U2.VOUT1"
      to="net.V3_3"
      thickness="0.4mm"
    />
    <NamedTrace
      name="U2_VOUT2__V3_3"
      from="U2.VOUT2"
      to="net.V3_3"
      thickness="0.4mm"
    />
    <NamedTrace name="U2_GND__GND" from="U2.GND" to="net.GND" />
    <NamedTrace name="C_IN_pin1__VBUS" from="C_IN.pin1" to="net.VBUS" />
    <NamedTrace name="C_IN_pin2__GND" from="C_IN.pin2" to="net.GND" />
    <NamedTrace name="C_OUT_pin1__V3_3" from="C_OUT.pin1" to="net.V3_3" />
    <NamedTrace name="C_OUT_pin2__GND" from="C_OUT.pin2" to="net.GND" />

    {/* ─── Battery charger (MCP73871, U3) ─── */}
    {/* USB 5V in + decoupling */}
    <NamedTrace
      name="U3_IN1__VUSB"
      from="U3.IN1"
      to="net.VUSB"
      thickness="0.4mm"
    />
    <NamedTrace
      name="U3_IN2__VUSB"
      from="U3.IN2"
      to="net.VUSB"
      thickness="0.4mm"
    />
    <NamedTrace name="C_VUSB_pin1__VUSB" from="C_VUSB.pin1" to="net.VUSB" />
    <NamedTrace name="C_VUSB_pin2__GND" from="C_VUSB.pin2" to="net.GND" />
    {/* Power-path system output → boost input + decoupling */}
    <NamedTrace
      name="U3_OUT1__VSYS"
      from="U3.OUT1"
      to="net.VSYS"
      thickness="0.4mm"
    />
    <NamedTrace
      name="U3_OUT2__VSYS"
      from="U3.OUT2"
      to="net.VSYS"
      thickness="0.4mm"
    />
    <NamedTrace name="C_VSYS_pin1__VSYS" from="C_VSYS.pin1" to="net.VSYS" />
    <NamedTrace name="C_VSYS_pin2__GND" from="C_VSYS.pin2" to="net.GND" />
    {/* Battery + sense + decoupling + JST connector */}
    <NamedTrace
      name="U3_VBAT1__VBAT"
      from="U3.VBAT1"
      to="net.VBAT"
      thickness="0.4mm"
    />
    <NamedTrace
      name="U3_VBAT2__VBAT"
      from="U3.VBAT2"
      to="net.VBAT"
      thickness="0.4mm"
    />
    <NamedTrace name="U3_VBAT_SENSE__VBAT" from="U3.VBAT_SENSE" to="net.VBAT" />
    <NamedTrace name="C_VBAT_pin1__VBAT" from="C_VBAT.pin1" to="net.VBAT" />
    <NamedTrace name="C_VBAT_pin2__GND" from="C_VBAT.pin2" to="net.GND" />
    <NamedTrace
      name="J_BAT_pin1__VBAT"
      from="J_BAT.pin1"
      to="net.VBAT"
      thickness="0.4mm"
    />
    <NamedTrace name="J_BAT_pin2__GND" from="J_BAT.pin2" to="net.GND" />
    {/* SMD connector mechanical mounting tabs → GND for solder-joint strength */}
    <NamedTrace name="J_BAT_pin3__GND" from="J_BAT.pin3" to="net.GND" />
    <NamedTrace name="J_BAT_pin4__GND" from="J_BAT.pin4" to="net.GND" />
    {/* Grounds (VSS1/VSS2/EP) */}
    <NamedTrace name="U3_VSS1__GND" from="U3.VSS1" to="net.GND" />
    <NamedTrace name="U3_VSS2__GND" from="U3.VSS2" to="net.GND" />
    <NamedTrace name="U3_PAD__GND" from="U3.PAD" to="net.GND" />
    {/* Config straps (never float): SEL/PROG2/CE/TE=Hi(→IN); VPCC senses IN
        through the 330k/110k divider */}
    <NamedTrace name="U3_SEL__VUSB" from="U3.SEL" to="net.VUSB" />
    <NamedTrace name="U3_PROG2__VUSB" from="U3.PROG2" to="net.VUSB" />
    <NamedTrace name="U3_CE__VUSB" from="U3.CE" to="net.VUSB" />
    <NamedTrace name="U3_TE__VUSB" from="U3.TE" to="net.VUSB" />
    <NamedTrace name="R_VPCC_H_pin1__VUSB" from="R_VPCC_H.pin1" to="net.VUSB" />
    <NamedTrace
      name="R_VPCC_H_pin2__U3_VPCC"
      schDisplayLabel="VPCC"
      from="R_VPCC_H.pin2"
      to="U3.VPCC"
    />
    <NamedTrace
      name="R_VPCC_L_pin1__U3_VPCC"
      from="R_VPCC_L.pin1"
      to="U3.VPCC"
    />
    <NamedTrace name="R_VPCC_L_pin2__GND" from="R_VPCC_L.pin2" to="net.GND" />
    {/* Program resistors: fast-charge (PROG1), termination (PROG3), THERM bias */}
    <NamedTrace
      name="R_PROG1_pin1__U3_PROG1"
      from="R_PROG1.pin1"
      to="U3.PROG1"
    />
    <NamedTrace name="R_PROG1_pin2__GND" from="R_PROG1.pin2" to="net.GND" />
    <NamedTrace
      name="R_PROG3_pin1__U3_PROG3"
      schDisplayLabel="PROG3"
      from="R_PROG3.pin1"
      to="U3.PROG3"
    />
    <NamedTrace name="R_PROG3_pin2__GND" from="R_PROG3.pin2" to="net.GND" />
    <NamedTrace
      name="R_THERM_pin1__U3_THERM"
      schDisplayLabel="THERM"
      from="R_THERM.pin1"
      to="U3.THERM"
    />
    <NamedTrace name="R_THERM_pin2__GND" from="R_THERM.pin2" to="net.GND" />

    {/* ─── Boost 3.0–5V → 5V (TPS61023, U4) ─── */}
    <NamedTrace
      name="U4_VIN__VSYS"
      from="U4.VIN"
      to="net.VSYS"
      thickness="0.4mm"
    />
    <NamedTrace name="U4_EN__VSYS" from="U4.EN" to="net.VSYS" />
    <NamedTrace
      name="L1_pin1__VSYS"
      from="L1.pin1"
      to="net.VSYS"
      thickness="0.4mm"
    />
    <NamedTrace
      name="L1_pin2__U4_SW"
      from="L1.pin2"
      to="U4.SW"
      thickness="0.25mm"
    />
    <NamedTrace
      name="U4_VOUT__VBUS"
      from="U4.VOUT"
      to="net.VBUS"
      thickness="0.4mm"
    />
    <NamedTrace name="U4_GND__GND" from="U4.GND" to="net.GND" />
    <NamedTrace
      name="C_BVIN_pin1__VSYS"
      from="C_BVIN.pin1"
      to="net.VSYS"
      thickness="0.4mm"
    />
    <NamedTrace name="C_BVIN_pin2__GND" from="C_BVIN.pin2" to="net.GND" />
    <NamedTrace
      name="C_BVOUT_pin1__VBUS"
      from="C_BVOUT.pin1"
      to="net.VBUS"
      thickness="0.4mm"
    />
    <NamedTrace name="C_BVOUT_pin2__GND" from="C_BVOUT.pin2" to="net.GND" />
    <NamedTrace
      name="C_BVOUT2_pin1__VBUS"
      from="C_BVOUT2.pin1"
      to="net.VBUS"
      thickness="0.4mm"
    />
    <NamedTrace name="C_BVOUT2_pin2__GND" from="C_BVOUT2.pin2" to="net.GND" />
    {/* Feedback divider sets 5.0V */}
    <NamedTrace name="R_FBH_pin1__VBUS" from="R_FBH.pin1" to="net.VBUS" />
    <NamedTrace
      name="R_FBH_pin2__U4_FB"
      schDisplayLabel="FB"
      from="R_FBH.pin2"
      to="U4.FB"
    />
    <NamedTrace name="R_FBL_pin1__U4_FB" from="R_FBL.pin1" to="U4.FB" />
    <NamedTrace name="R_FBL_pin2__GND" from="R_FBL.pin2" to="net.GND" />

    {/* WROOM power + decoupling */}
    <NamedTrace
      name="U1_3V3__V3_3"
      from="U1.3V3"
      to="net.V3_3"
      thickness="0.4mm"
    />
    <NamedTrace name="U1_GND1__GND" from="U1.GND1" to="net.GND" />
    <NamedTrace name="U1_GND2__GND" from="U1.GND2" to="net.GND" />
    <NamedTrace name="U1_EP1__GND" from="U1.EP1" to="net.GND" />
    <NamedTrace name="C_BULK_pin1__V3_3" from="C_BULK.pin1" to="net.V3_3" />
    <NamedTrace name="C_BULK_pin2__GND" from="C_BULK.pin2" to="net.GND" />
    <NamedTrace name="C_DEC_pin1__V3_3" from="C_DEC.pin1" to="net.V3_3" />
    <NamedTrace name="C_DEC_pin2__GND" from="C_DEC.pin2" to="net.GND" />

    {/* EN reset RC + BOOT pull-up, with manual RST/BOOT buttons to GND */}
    <NamedTrace name="R_EN_pin1__V3_3" from="R_EN.pin1" to="net.V3_3" />
    <NamedTrace
      name="R_EN_pin2__U1_EN"
      schDisplayLabel="EN"
      from="R_EN.pin2"
      to="U1.EN"
    />
    <NamedTrace name="C_EN_pin1__U1_EN" from="C_EN.pin1" to="U1.EN" />
    <NamedTrace name="C_EN_pin2__GND" from="C_EN.pin2" to="net.GND" />
    <NamedTrace name="R_BOOT_pin1__V3_3" from="R_BOOT.pin1" to="net.V3_3" />
    <NamedTrace
      name="R_BOOT_pin2__U1_IO0"
      schDisplayLabel="BOOT"
      from="R_BOOT.pin2"
      to="U1.IO0"
    />
    {/* RST button: EN → GND. BOOT button: IO0 → GND. Two-pin SPST — one
        terminal per end, either orientation works. */}
    <NamedTrace name="SW_RST_pin1__R_EN" from="SW_RST.pin1" to="R_EN.pin2" />
    <NamedTrace name="SW_RST_pin2__GND" from="SW_RST.pin2" to="net.GND" />
    <NamedTrace name="SW_BOOT_pin1__U1_IO0" from="SW_BOOT.pin1" to="U1.IO0" />
    <NamedTrace name="SW_BOOT_pin2__GND" from="SW_BOOT.pin2" to="net.GND" />

    {/* ═══ Key matrix wiring: per-key 1N4148W (C81598, SOD-123 with the JLC
        footprint + 3D model, BACK, west of each stem, rotated along Y).
        COL net → switch pin2 (east pad); switch pin1 (west pad, beside the
        diode) → diode ANODE; diode CATHODE → ROW. Pin roles follow the
        socket's 180° mount (see HotswapKey.tsx) — the two contacts are
        interchangeable, geography picks the pin.
        ⚠ Wire the diodes by PIN NUMBER: the imported EasyEDA footprint puts
        the cathode band at pad "pin1" (EasyEDA/KiCad convention), which is the
        OPPOSITE of tscircuit's diode alias (anode=pin1) — using .anode/.cathode
        here would reverse every diode at assembly. ═══ */}
    {KEYS.map((k, i) => (
      <Fragment key={`${k.sw}-matrix`}>
        <A_1N4148W
          name={k.d}
          layer="bottom"
          schSectionName="Keys"
          schX={24 + k.c * 7 + (correctedLayout ? -3 : 3)}
          schY={14 - k.r * 9 - (correctedLayout ? 0 : 3)}
          schRotation={correctedLayout ? 180 : 0}
          pcbX={k.x - 7.2}
          pcbY={k.y - 1.4}
          pcbRotation="270deg"
        />
        <NamedTrace
          name={`${k.sw}__COL${k.c}`}
          from={`${k.sw}.pin2`}
          to={`net.COL${k.c}`}
        />
        <NamedTrace
          name={`${k.sw}__${k.d}`}
          from={`${k.sw}.pin1`}
          to={`${k.d}.pin2`}
        />
        <NamedTrace
          name={`${k.d}__ROW${k.r}`}
          from={`${k.d}.pin1`}
          to={`net.ROW${k.r}`}
        />
      </Fragment>
    ))}
    {ROW_IOS.map((io, r) => (
      <Fragment key={`row-${io}`}>
        <NamedTrace
          name={`U1_${io}__ROW${r}`}
          from={`U1.${io}`}
          to={`net.ROW${r}`}
        />
      </Fragment>
    ))}
    {COL_IOS.map((io, c) => (
      <Fragment key={`col-${io}`}>
        <NamedTrace
          name={`U1_${io}__COL${c}`}
          from={`U1.${io}`}
          to={`net.COL${c}`}
        />
      </Fragment>
    ))}

    {/* RGB rails per the C5149201 reverse-mount pad numbering — the EasyEDA
        footprint pads are NOT datasheet pin numbers: 1=GND, 2=DIN, 3=VDD
        (5V=VBUS), 4=DOUT. Daisy-chained pin4 → next pin2. */}
    {KEYS.map((k) => (
      <Fragment key={`${k.led}-v`}>
        <NamedTrace
          name={`${k.led}__VBUS`}
          from={`${k.led}.pin3`}
          to="net.VBUS"
          thickness="0.3mm"
        />
      </Fragment>
    ))}
    {KEYS.map((k) => (
      <Fragment key={`${k.led}-g`}>
        <NamedTrace
          name={`${k.led}__GND`}
          from={`${k.led}.pin1`}
          to="net.GND"
        />
      </Fragment>
    ))}
    {/* Per-LED 0.1µF decoupling (SK6812 datasheet), one 0402 on the BACK just
        south of each reverse-mounted LED — clear of the light window and the
        LED body, short run to the VDD/GND pads. */}
    {KEYS.map((k) => (
      <Fragment key={`${k.led}-dec`}>
        <capacitor
          name={`C_${k.led}`}
          capacitance="0.1uF"
          footprint="0402"
          layer="bottom"
          schOrientation="vertical"
          supplierPartNumbers={{ jlcpcb: ["C1525"] }}
          schSectionName="LEDs"
          schX={
            correctedLayout ? -60.8 + (k.r * 4 + k.c) * 1.8 : 24 + k.c * 7 + 3
          }
          schY={correctedLayout ? -13 : 14 - k.r * 9 - 7}
          pcbX={k.x}
          pcbY={k.y - 8.2}
        />
      </Fragment>
    ))}
    {KEYS.map((k) => (
      <Fragment key={`${k.led}-dv`}>
        <NamedTrace
          name={`C_${k.led}__VBUS`}
          from={`C_${k.led}.pin1`}
          to="net.VBUS"
        />
      </Fragment>
    ))}
    {KEYS.map((k) => (
      <Fragment key={`${k.led}-dg`}>
        <NamedTrace
          name={`C_${k.led}__GND`}
          from={`C_${k.led}.pin2`}
          to="net.GND"
        />
      </Fragment>
    ))}
    {/* Data with 3V3→5V level shift: the SK6812 data-high threshold is ~0.7·VDD
        ≈ 3.5V at 5V, above the ESP32's 3.3V drive. A 74AHCT1G125 (TTL inputs,
        5V VCC) reads IO12's 3.3V as a solid high and re-drives the chain at 5V.
        IO12 → U5 → 470Ω → LED4.DIN, then DOUT→DIN along the LED_CHAIN
        serpentine through all 12 LEDs. */}
    {/* Level-shift trio in the strip south-west of the module — as close to
        IO12's pad (19.2, 28.9) as the module body allows, so the 3V3 run to U5
        stays short. R_LED (series termination, so it belongs at the driver)
        feeds the chain entry at LED4, the nearest key. */}
    <resistor
      name="R_LED"
      resistance="470"
      schRotation={correctedLayout ? 180 : 0}
      footprint="0402"
      layer="bottom"
      schSectionName="LEDs"
      schX={correctedLayout ? 50 : 43.4}
      schY={correctedLayout ? 10 : 7}
      pcbX={16.2}
      pcbY={22}
      pcbRotation="90deg"
      supplierPartNumbers={{ jlcpcb: ["C25117"] }}
    />
    <capacitor
      name="C_LS"
      capacitance="0.1uF"
      footprint="0402"
      layer="bottom"
      schOrientation="vertical"
      schSectionName="LEDs"
      schX={correctedLayout ? -62.6 : 30}
      schY={correctedLayout ? -13 : 4}
      pcbX={14}
      pcbY={26.5}
      pcbRotation="90deg"
      supplierPartNumbers={{ jlcpcb: ["C1525"] }}
    />
    <SN74AHCT1G125DBVR
      name="U5"
      schSectionName="LEDs"
      layer="bottom"
      schHeight={0.6}
      schX={correctedLayout ? 54.5 : 30}
      schY={correctedLayout ? 10 : 8}
      schRotation={correctedLayout ? 180 : 0}
      pcbX={10.5}
      pcbY={26.5}
    />
    <NamedTrace
      name="U1_IO12__U5_A"
      schDisplayLabel="LED_DATA_3V3"
      from="U1.IO12"
      to="U5.A"
    />
    <NamedTrace
      name="U5_Y__R_LED_pin1"
      from="U5.Y"
      to="R_LED.pin1"
      schDisplayLabel="LED_DATA_5V"
    />
    <NamedTrace
      name={`R_LED__LED${LED_CHAIN[0]}`}
      schDisplayLabel="LED_DIN"
      from="R_LED.pin2"
      to={`LED${LED_CHAIN[0]}.pin2`}
    />
    <NamedTrace name="U5_OE__GND" from="U5.OE" to="net.GND" />
    <NamedTrace name="U5_VCC__VBUS" from="U5.VCC" to="net.VBUS" />
    <NamedTrace name="U5_GND__GND" from="U5.GND" to="net.GND" />
    <NamedTrace name="C_LS_pin1__VBUS" from="C_LS.pin1" to="net.VBUS" />
    <NamedTrace name="C_LS_pin2__GND" from="C_LS.pin2" to="net.GND" />
    {/* Serpentine chain (see LED_CHAIN): each DOUT (pin4) feeds the DIN (pin2)
        of the physically adjacent LED — no cross-board wraps. */}
    {LED_CHAIN.slice(0, -1).map((n, i) => (
      <Fragment key={`led-chain-${n}`}>
        <NamedTrace
          name={`LED${n}__LED${LED_CHAIN[i + 1]}`}
          from={`LED${n}.pin4`}
          to={`LED${LED_CHAIN[i + 1]}.pin2`}
        />
      </Fragment>
    ))}
    {/* Chain terminus: the last LED's DOUT ends the serpentine. This
        single-member net documents that it is intentionally unterminated —
        a driven output must never be tied to a rail — and satisfies the
        missing-trace check without creating any copper (one-pin nets have
        nothing to route). */}
    <NamedTrace
      name={`LED${LED_CHAIN[LED_CHAIN.length - 1]}__CHAIN_OUT`}
      from={`LED${LED_CHAIN[LED_CHAIN.length - 1]}.pin4`}
      to="net.LED_CHAIN_OUT"
    />

    {/* ═══ Rotary encoder: A/B quadrature (IO13/IO14), push switch on IO21.
        Common + frame tabs to GND; MCU internal pull-ups on A/B/SW. ═══ */}
    <NamedTrace name="ENC1_A__U1_IO13" from="ENC1.A" to="U1.IO13" />
    <NamedTrace name="ENC1_B__U1_IO14" from="ENC1.B" to="U1.IO14" />
    <NamedTrace name="ENC1_C__GND" from="ENC1.C" to="net.GND" />
    <NamedTrace name="ENC1_D__U1_IO21" from="ENC1.D" to="U1.IO21" />
    <NamedTrace name="ENC1_E__GND" from="ENC1.E" to="net.GND" />
    <NamedTrace name="ENC1_pin6__GND" from="ENC1.pin6" to="net.GND" />
    <NamedTrace name="ENC1_pin7__GND" from="ENC1.pin7" to="net.GND" />

    {/* ─── RF keepout under the WROOM PCB antenna (270° → antenna points right,
        spanning x≈39.4–44.9, y≈20.5–38.5). Blocks routing on every layer
        through the antenna block; the matching copper-free notch is carved out
        of the pour outline (POUR_OUTLINE) since pours ignore keepouts. ─── */}
    <keepout
      shape="rect"
      pcbX={42.5}
      pcbY={33.75}
      width="9mm"
      height="26.5mm"
      layers={["top", "bottom"]}
    />
    {/* Tiny router keepout between the module's GND1→EP stitch and the EN
        pad: every north-south trace that tunnels the module wants to drop
        its via exactly here, 0.05mm off the stitch. Fence the spot so vias
        land in free space instead. */}
    <keepout
      shape="rect"
      pcbX={34.35}
      pcbY={25.1}
      width="1.6mm"
      height="1.6mm"
      layers={["top", "bottom"]}
    />

    {/* ─── WROOM exposed-pad (EP) thermal vias. Four GND vias drop the EP into
        the top-side GND pour through the gaps of the 3×3 pad grid. Besides the
        thermal/return-path benefit, occupying these gaps with GND copper stops
        the autorouter from squeezing a signal via between the EP pads (which
        previously collided with the EP's GND flood). With the module on the
        bottom at 270°, footprint-local (x,y) lands at global (28 + y, 29.5 + x):
        EP pad columns at x {27.99, 29.39, 30.79}, rows at y {26.6, 28.0, 29.4},
        so the grid gaps are at the positions below. ─── */}
    {[
      [28.685, 27.3],
      [30.085, 27.3],
      [28.685, 28.7],
      [30.085, 28.7],
    ].map(([x, y]) => (
      <Fragment key={`ep-via-${x}-${y}`}>
        <via
          pcbX={x}
          pcbY={y}
          fromLayer="top"
          toLayer="bottom"
          holeDiameter="0.3mm"
          outerDiameter="0.45mm"
          connectsTo="net.GND"
        />
      </Fragment>
    ))}

    {/* ─── 2-layer stackup ───────────────────────────────────────────────
        top: GND pour + overflow routing · bottom: components, signals + GND
        pour. Nothing electrical lives on top except the encoder, so two
        layers route this board fine: the top pour is the return/reference
        for the (full-speed-only) USB pair and the WROOM, and the 3V3 plane
        is replaced by a 0.4mm routed trunk (see the V3_3 traces). Both pours
        fill POUR_OUTLINE, which carves the antenna notch out of both layers
        (keepouts don't clip pours). */}
    <copperpour connectsTo="net.GND" layer="top" outline={POUR_OUTLINE} />
    <copperpour connectsTo="net.GND" layer="bottom" outline={POUR_OUTLINE} />
  </board>
)
