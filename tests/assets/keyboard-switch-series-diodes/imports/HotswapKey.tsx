import { CPG151101S11_16 } from "./CPG151101S11_16"
import { SK6812MINI_E } from "./SK6812MINI_E"

// A single Cherry-MX hotswap key with a per-key SK6812 RGB LED.
//
// Construction (two-sided):
//   FRONT (top):  the MX switch clicks in from the front; per-key light comes
//                 up through a 3.4×3.0mm window just south of the stem.
//   BACK (bottom): the Kailh CPG151101S11 hotswap socket grips the switch pins,
//                 and the SK6812MINI-E reverse-mounts over the window (lens
//                 into the board) shining up at the switch — the orientation
//                 the C5149201 land pattern is drawn for.
//
// All coordinates are relative to the switch stem (the keycap center = pcbX/pcbY).
// MX plate geometry: Ø4mm center stem, two Ø1.7mm mount posts at ±5.08mm,
// switch terminals at (-3.81, 2.54) and (2.54, 5.08).
//
// The socket footprint carries its own two Ø3mm terminal holes. Placed on the
// bottom layer (which mirrors X) at offset (-0.635, +3.81) its holes land
// exactly on the two MX terminals, so no extra terminal holes are needed here.
export const HotswapKey = ({
  swName,
  ledName,
  pcbX = 0,
  pcbY = 0,
  schX = 0,
  schY = 0,
  ledSchY = schY - 7,
}: {
  swName: string
  ledName: string
  pcbX?: number
  pcbY?: number
  schX?: number
  schY?: number
  ledSchY?: number
}) => (
  <>
    {/* MX plate cutouts (mechanical, both layers) */}
    <hole pcbX={pcbX} pcbY={pcbY} diameter="4mm" />
    <hole pcbX={pcbX - 5.08} pcbY={pcbY} diameter="1.7mm" />
    <hole pcbX={pcbX + 5.08} pcbY={pcbY} diameter="1.7mm" />

    {/* Kailh hotswap socket on the BACK, rotated 180°: the vendor footprint is
        drawn with its stem-relief arc on the local +y side, so unrotated the
        plastic body overlaps the Ø4 stem hole and the switch's center post
        can't seat (caught in JLC's assembly render). The pad/hole pattern is
        180°-symmetric about the socket center, so the same offset still lands
        both Ø3mm holes on the MX terminals — the flip only moves the
        asymmetric body (relief now cradles the stem) and swaps which physical
        pad is pin1/pin2 (wired accordingly in the key matrix). */}
    <CPG151101S11_16
      name={swName}
      schSectionName="Keys"
      layer="bottom"
      pcbX={pcbX - 0.635}
      pcbY={pcbY + 3.81}
      pcbRotation="180deg"
      schX={schX}
      schY={schY}
    />

    {/* Light window: body-sized (3.2×2.8) plus clearance; the LED pads sit
        0.15mm outside its long edges. Pours subtract it automatically. */}
    <cutout
      shape="rect"
      width="3.4mm"
      height="3mm"
      pcbX={pcbX}
      pcbY={pcbY - 4.7}
    />

    {/* Per-key RGB reverse-mounted on the BACK, lens shining up through the
        window. C5149201 pads: 1=GND, 2=DIN, 3=VDD, 4=DOUT. */}
    <SK6812MINI_E
      name={ledName}
      schSectionName="LEDs"
      layer="bottom"
      pcbX={pcbX}
      pcbY={pcbY - 4.7}
      schX={schX}
      schY={ledSchY}
    />
  </>
)
