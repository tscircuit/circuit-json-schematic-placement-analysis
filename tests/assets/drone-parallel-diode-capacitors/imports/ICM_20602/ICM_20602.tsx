import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["VDDIO"],
  pin2: ["pin2"],
  pin3: ["pin3"],
  pin4: ["pin4"],
  pin5: ["CS"],
  pin6: ["INT"],
  pin7: ["RESV1"],
  pin8: ["FSYNC"],
  pin9: ["RESV2"],
  pin10: ["RESV3"],
  pin11: ["RESV4"],
  pin12: ["RESV5"],
  pin13: ["GND"],
  pin14: ["REGOUT"],
  pin15: ["RESV6"],
  pin16: ["VDD"],
} as const

const pinAttributes = {
  pin13: { requiresGround: true },
  pin16: { requiresPower: true },
} as const

export const ICM_20602 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C97633"],
      }}
      manufacturerPartNumber="ICM-20602"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-0.999998mm"
            pcbY="-1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-0.499872mm"
            pcbY="-1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="0mm"
            pcbY="-1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="0.500126mm"
            pcbY="-1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="0.999998mm"
            pcbY="-1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="1.342644mm"
            pcbY="-0.500126mm"
            width="0.5999988mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="1.342644mm"
            pcbY="0mm"
            width="0.5999988mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="1.342644mm"
            pcbY="0.499872mm"
            width="0.5999988mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="0.999998mm"
            pcbY="1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin10"]}
            pcbX="0.500126mm"
            pcbY="1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin11"]}
            pcbX="0mm"
            pcbY="1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin12"]}
            pcbX="-0.499872mm"
            pcbY="1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin13"]}
            pcbX="-0.999998mm"
            pcbY="1.342644mm"
            width="0.2800096mm"
            height="0.5999988mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin14"]}
            pcbX="-1.342644mm"
            pcbY="0.499872mm"
            width="0.5999988mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin15"]}
            pcbX="-1.342644mm"
            pcbY="0mm"
            width="0.5999988mm"
            height="0.2800096mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin16"]}
            pcbX="-1.342644mm"
            pcbY="-0.500126mm"
            width="0.5999988mm"
            height="0.2800096mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -1.5761970000000929, y: 0.830503799999974 },
              { x: -1.5761970000000929, y: 1.5761970000000929 },
              { x: -1.3305027999999766, y: 1.5761970000000929 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.5761969999998655, y: 0.830503799999974 },
              { x: 1.5761969999998655, y: 1.5761970000000929 },
              { x: 1.3305027999998629, y: 1.5761970000000929 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: -1.5761970000000929, y: -0.8305037999998603 },
              { x: -1.5761970000000929, y: -1.5761969999999792 },
              { x: -1.3305027999999766, y: -1.5761969999999792 },
            ]}
          />
          <silkscreenpath
            route={[
              { x: 1.5761969999998655, y: -0.8305037999998603 },
              { x: 1.5761969999998655, y: -1.5761969999999792 },
              { x: 1.3305027999998629, y: -1.5761969999999792 },
            ]}
          />
          <silkscreencircle
            pcbX="-0.999998mm"
            pcbY="-2.009902mm"
            radius="0.07493mm"
          />
          <silkscreentext
            text="{NAME}"
            pcbX="-0.0127mm"
            pcbY="2.651mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -1.9010000000000673, y: 1.9010000000000673 },
              { x: 1.875599999999963, y: 1.9010000000000673 },
              { x: 1.875599999999963, y: -2.3327999999999065 },
              { x: -1.9010000000000673, y: -2.3327999999999065 },
              { x: -1.9010000000000673, y: 1.9010000000000673 },
            ]}
          />
        </footprint>
      }
      {...props}
    />
  )
}
