// Schematic artwork from imrishabh18/nema-23-stepper-controller v1.2.5, expressed as TSX.

export const DTC114EU3HZGT106Symbol = ({
  name,
  x,
  y,
}: {
  name: string
  x: number
  y: number
}) => (
  <symbol>
    <port
      name="pin3"
      pinNumber={3}
      aliases={["pin3", "3", "C"]}
      direction="up"
      schX={x + 0.2}
      schY={y + 0.8}
      schStemLength={0.4}
    />
    <port
      name="pin1"
      pinNumber={1}
      aliases={["pin1", "1", "E"]}
      direction="down"
      schX={x + 0.2}
      schY={y + -0.8}
      schStemLength={0.4}
    />
    <port
      name="pin2"
      pinNumber={2}
      aliases={["pin2", "2", "B"]}
      direction="left"
      schX={x + -1}
      schY={y + 0}
      schStemLength={0.4}
    />
    <schematicpath
      points={[
        { x: -0.6, y: 0 },
        { x: -0.52, y: 0 },
        { x: -0.5, y: 0.06 },
        { x: -0.46, y: -0.06 },
        { x: -0.42, y: 0.06 },
        { x: -0.38, y: -0.06 },
        { x: -0.34, y: 0.06 },
        { x: -0.3, y: -0.06 },
        { x: -0.28, y: 0 },
        { x: -0.2, y: 0 },
        { x: 0, y: 0 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0, y: 0.18 },
        { x: 0, y: -0.18 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0, y: -0.06 },
        { x: 0.2, y: -0.2 },
        { x: 0.2, y: -0.4 },
        { x: -0.2, y: -0.4 },
        { x: -0.2, y: -0.32 },
        { x: -0.26, y: -0.3 },
        { x: -0.14, y: -0.26 },
        { x: -0.26, y: -0.22 },
        { x: -0.14, y: -0.18 },
        { x: -0.26, y: -0.14 },
        { x: -0.14, y: -0.1 },
        { x: -0.2, y: -0.08 },
        { x: -0.2, y: 0 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.2, y: 0.4 },
        { x: 0.2, y: 0.2 },
        { x: 0, y: 0.06 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.2, y: -0.2 },
        { x: 0.08, y: -0.18 },
        { x: 0.14, y: -0.1 },
        { x: 0.2, y: -0.2 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematictext
      text={name}
      schX={0.55}
      schY={0.15}
      fontSize={0.22}
      anchor="left"
    />
    <schematictext
      text="DTC114EU3HZGT106"
      schX={0.55}
      schY={-0.1}
      fontSize={0.16}
      anchor="left"
    />
  </symbol>
)

export const LTST_C19HE1WTSymbol = ({
  name,
  x,
  y,
}: {
  name: string
  x: number
  y: number
}) => (
  <symbol>
    <port
      name="pin4"
      pinNumber={4}
      aliases={["pin4", "4", "_POS"]}
      direction="up"
      schX={x + 0}
      schY={y + 0.6}
      schStemLength={0.3}
    />
    <port
      name="pin3"
      pinNumber={3}
      aliases={["pin3", "3", "B_NEG"]}
      direction="down"
      schX={x + 0.4}
      schY={y + -0.4}
      schStemLength={0.3}
    />
    <port
      name="pin1"
      pinNumber={1}
      aliases={["pin1", "1", "R_NEG"]}
      direction="down"
      schX={x + -0.4}
      schY={y + -0.4}
      schStemLength={0.3}
    />
    <port
      name="pin2"
      pinNumber={2}
      aliases={["pin2", "2", "G_NEG"]}
      direction="down"
      schX={x + 0}
      schY={y + -0.4}
      schStemLength={0.3}
    />
    <schematicpath
      points={[
        { x: -0.4, y: 0.4 },
        { x: -0.4, y: 0.04 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.4, y: 0.4 },
        { x: 0.4, y: 0 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0, y: 0.4 },
        { x: 0, y: 0.04 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.4, y: 0.4 },
        { x: -0.4, y: 0.4 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.28, y: 0.1 },
        { x: 0.4, y: -0.1 },
        { x: 0.54, y: 0.1 },
        { x: 0.28, y: 0.1 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.56, y: -0.1 },
        { x: 0.24, y: -0.1 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.6, y: -0.08 },
        { x: 0.74, y: -0.22 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.52, y: -0.16 },
        { x: 0.66, y: -0.3 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.74, y: -0.22 },
        { x: 0.7, y: -0.14 },
        { x: 0.66, y: -0.18 },
        { x: 0.74, y: -0.22 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.66, y: -0.3 },
        { x: 0.62, y: -0.22 },
        { x: 0.58, y: -0.26 },
        { x: 0.66, y: -0.3 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.52, y: 0.1 },
        { x: -0.4, y: -0.1 },
        { x: -0.26, y: 0.1 },
        { x: -0.52, y: 0.1 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.24, y: -0.1 },
        { x: -0.56, y: -0.1 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.2, y: -0.08 },
        { x: -0.06, y: -0.22 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.28, y: -0.16 },
        { x: -0.14, y: -0.3 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.06, y: -0.22 },
        { x: -0.1, y: -0.14 },
        { x: -0.14, y: -0.18 },
        { x: -0.06, y: -0.22 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.14, y: -0.3 },
        { x: -0.18, y: -0.22 },
        { x: -0.22, y: -0.26 },
        { x: -0.14, y: -0.3 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.12, y: 0.1 },
        { x: 0, y: -0.1 },
        { x: 0.14, y: 0.1 },
        { x: -0.12, y: 0.1 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.16, y: -0.1 },
        { x: -0.16, y: -0.1 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.2, y: -0.08 },
        { x: 0.34, y: -0.22 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.12, y: -0.16 },
        { x: 0.26, y: -0.3 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.34, y: -0.22 },
        { x: 0.3, y: -0.14 },
        { x: 0.26, y: -0.18 },
        { x: 0.34, y: -0.22 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.26, y: -0.3 },
        { x: 0.22, y: -0.22 },
        { x: 0.18, y: -0.26 },
        { x: 0.26, y: -0.3 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematictext
      text={name}
      schX={0}
      schY={1.45}
      fontSize={0.22}
      anchor="center"
    />
    <schematictext
      text="LTST-C19HE1WT"
      schX={0}
      schY={1.2}
      fontSize={0.16}
      anchor="center"
    />
  </symbol>
)

export const AO3400ASymbol = ({
  name,
  x,
  y,
}: {
  name: string
  x: number
  y: number
}) => (
  <symbol>
    <port
      name="pin3"
      pinNumber={3}
      aliases={["pin3", "3", "D"]}
      direction="up"
      schX={x + 0.2}
      schY={y + 0.4}
      schStemLength={0.2}
    />
    <port
      name="pin1"
      pinNumber={1}
      aliases={["pin1", "1", "G"]}
      direction="left"
      schX={x + -0.4}
      schY={y + 0}
      schStemLength={0.2}
    />
    <port
      name="pin2"
      pinNumber={2}
      aliases={["pin2", "2", "S"]}
      direction="down"
      schX={x + 0.2}
      schY={y + -0.4}
      schStemLength={0.2}
    />
    <schematicpath
      points={[
        { x: 0, y: 0 },
        { x: 0.12, y: -0.04 },
        { x: 0.12, y: 0.04 },
        { x: 0, y: 0 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#FEFEFE"
    />
    <schematicpath
      points={[
        { x: 0.4, y: 0.04 },
        { x: 0.34, y: -0.06 },
        { x: 0.46, y: -0.06 },
        { x: 0.4, y: 0.04 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#FEFEFE"
    />
    <schematicpath
      points={[
        { x: 0, y: 0.14 },
        { x: 0.2, y: 0.14 },
        { x: 0.2, y: 0.2 },
        { x: 0.4, y: 0.2 },
        { x: 0.4, y: 0.04 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0, y: 0 },
        { x: 0.2, y: 0 },
        { x: 0.2, y: -0.2 },
        { x: 0.4, y: -0.2 },
        { x: 0.4, y: -0.06 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.2, y: -0.14 },
        { x: 0, y: -0.14 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.04, y: 0.18 },
        { x: -0.04, y: -0.18 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0, y: 0.18 },
        { x: 0, y: 0.1 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0, y: -0.04 },
        { x: 0, y: 0.04 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0, y: -0.18 },
        { x: 0, y: -0.1 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: -0.2, y: 0 },
        { x: -0.04, y: 0 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.48, y: 0.04 },
        { x: 0.44, y: 0.04 },
        { x: 0.36, y: 0.04 },
        { x: 0.32, y: 0.04 },
      ]}
      strokeColor="#880000"
    />
    <schematictext
      text={name}
      schX={0}
      schY={1.25}
      fontSize={0.22}
      anchor="center"
    />
    <schematictext
      text="AO3400A"
      schX={0}
      schY={1}
      fontSize={0.16}
      anchor="center"
    />
  </symbol>
)

export const HYG_8503ASymbol = ({
  name,
  x,
  y,
}: {
  name: string
  x: number
  y: number
}) => (
  <symbol>
    <schematicrect
      width={0.6}
      height={0.6}
      strokeWidth={0.02}
      color="#880000"
    />
    <schematiccircle
      center={{ x: -0.2, y: 0.2 }}
      radius={0.03}
      strokeWidth={0.02}
      color="#880000"
      isFilled
      fillColor="#880000"
    />
    <port
      name="pin1"
      pinNumber={1}
      aliases={["pin1", "1", "_POS"]}
      direction="left"
      schX={x + -0.5}
      schY={y + 0.1}
      schStemLength={0.2}
    />
    <port
      name="pin2"
      pinNumber={2}
      aliases={["pin2", "2", "_NEG"]}
      direction="left"
      schX={x + -0.5}
      schY={y + -0.1}
      schStemLength={0.2}
    />
    <port
      name="pin3"
      pinNumber={3}
      aliases={["pin3", "3", "NC1"]}
      direction="right"
      schX={x + 0.5}
      schY={y + -0.1}
      schStemLength={0.2}
    />
    <port
      name="pin4"
      pinNumber={4}
      aliases={["pin4", "4", "NC2"]}
      direction="right"
      schX={x + 0.5}
      schY={y + 0.1}
      schStemLength={0.2}
    />
    <schematictext
      text={name}
      schX={0}
      schY={0.95}
      fontSize={0.22}
      anchor="center"
    />
    <schematictext
      text="HYG-8503A"
      schX={0}
      schY={0.7}
      fontSize={0.16}
      anchor="center"
    />
  </symbol>
)

export const B5819W_SLSymbol = ({
  name,
  x,
  y,
}: {
  name: string
  x: number
  y: number
}) => (
  <symbol>
    <port
      name="pin1"
      pinNumber={1}
      aliases={["pin1", "1", "K", "cathode", "neg"]}
      direction="up"
      schX={x + 0}
      schY={y + 0.4}
      schStemLength={0.3}
    />
    <port
      name="pin2"
      pinNumber={2}
      aliases={["pin2", "2", "A", "anode", "pos"]}
      direction="down"
      schX={x + 0}
      schY={y + -0.4}
      schStemLength={0.3}
    />
    <schematicpath
      points={[
        { x: -0.14, y: 0.04 },
        { x: -0.18, y: 0.04 },
        { x: -0.18, y: 0.1 },
        { x: 0.08, y: 0.1 },
        { x: 0.14, y: 0.1 },
        { x: 0.14, y: 0.16 },
        { x: 0.1, y: 0.16 },
      ]}
      strokeColor="#880000"
    />
    <schematicpath
      points={[
        { x: 0.12, y: -0.1 },
        { x: 0, y: 0.1 },
        { x: -0.12, y: -0.1 },
        { x: 0.12, y: -0.1 },
      ]}
      strokeColor="#880000"
      isFilled
      fillColor="#880000"
    />
    <schematictext
      text={name}
      schX={0.45}
      schY={0.15}
      fontSize={0.22}
      anchor="left"
    />
    <schematictext
      text="B5819W-SL"
      schX={0.45}
      schY={-0.1}
      fontSize={0.16}
      anchor="left"
    />
  </symbol>
)
