import { createMiniMp3Headphones } from "../assets/mini-mp3-headphones"

export const createCorrectedMiniMp3Headphones = () =>
  createMiniMp3Headphones({
    placements: {
      J4: [0, 0.1, 0],
      C43: [-4, 0, 0],
      C44: [4, 0, 180],
      R25: [-2, -1.4, -90],
      R26: [2, -1.4, -90],
      R19: [-4, -4, -90],
      C34: [-4, -6, -90],
      R20: [0, -4, -90],
      C35: [0, -6, -90],
      R18: [4, -4, -90],
      C33: [4, -6, -90],
    },
    schMaxTraceDistance: 3,
    children: (
      <>
        <netlabel
          net="GND"
          connectsTo={[".J4 > .pin1", ".J4 > .pin4"]}
          schX={0}
          schY={1.2}
          anchorSide="left"
        />
        <netlabel
          net="GND"
          connectsTo=".R25 > .pin2"
          schX={-2}
          schY={-2.1}
          anchorSide="top"
        />
        <netlabel
          net="GND"
          connectsTo=".R26 > .pin2"
          schX={2}
          schY={-2.1}
          anchorSide="top"
        />
      </>
    ),
  })
