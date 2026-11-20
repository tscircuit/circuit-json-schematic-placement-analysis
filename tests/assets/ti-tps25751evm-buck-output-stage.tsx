import { Circuit } from "@tscircuit/core"

// TPS25751EVM, SLVUCP9B Figure 5-3: the LM76005 buck output stage. C64 is
// the bootstrap capacitor from U10.CBOOT to the SW/L7 node; L7 feeds PP5V,
// where C65 and C66 return to ground and R102/R104 set U10.FB. Components,
// positions and pin attributes are copied unchanged from the transcription
// in tscircuit/checks#578; supply and ground pins leave on net labels.
export async function createTiTps25751EvmBuckOutputStage() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "none" }}>
      <net name="GND" />
      <net name="VSYS" />
      <net name="PP5V" />
      <chip
        name="U10"
        schX={-8.52671}
        schY={-0.42635}
        pinLabels={{
          pin13: "AGND",
          pin14: "AGND",
          pin15: "AGND",
          pin9: "BIAS",
          pin6: "CBOOT",
          pin18: "EN",
          pin12: "FB",
          pin7: "NC",
          pin19: "NC",
          pin23: "NC",
          pin27: "NC",
          pin28: "NC",
          pin29: "NC",
          pin30: "NC",
          pin31: "PAD",
          pin26: "PGND",
          pin24: "PGND",
          pin25: "PGND",
          pin16: "PGOOD",
          pin20: "PVIN",
          pin21: "PVIN",
          pin22: "PVIN",
          pin10: "RT",
          pin11: "SS_TRK",
          pin5: "SW",
          pin1: "SW",
          pin2: "SW",
          pin3: "SW",
          pin4: "SW",
          pin17: "SYNC_MODE",
          pin8: "VCC",
        }}
        schPinArrangement={{
          leftSide: {
            pins: [
              "pin8",
              "pin20",
              "pin21",
              "pin22",
              "pin18",
              "pin16",
              "pin11",
              "pin10",
              "pin17",
              "pin7",
              "pin19",
              "pin23",
              "pin27",
              "pin28",
              "pin29",
              "pin30",
            ],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: [
              "pin31",
              "pin26",
              "pin25",
              "pin24",
              "pin15",
              "pin14",
              "pin13",
              "pin12",
              "pin9",
              "pin6",
              "pin5",
              "pin4",
              "pin3",
              "pin2",
              "pin1",
            ],
            direction: "bottom-to-top",
          },
        }}
        schPinStyle={{
          pin8: { topMargin: 0 },
          pin20: { topMargin: 0.59897 },
          pin21: { topMargin: 0.19949 },
          pin22: { topMargin: 0.19864 },
          pin18: { topMargin: 0.59898 },
          pin16: { topMargin: 0.59897 },
          pin11: { topMargin: 0.59806 },
          pin10: { topMargin: 0.59897 },
          pin17: { topMargin: 0.59813 },
          pin7: { topMargin: 0.59897 },
          pin19: { topMargin: 0.19949 },
          pin23: { topMargin: 0.19942 },
          pin27: { topMargin: 0.1987 },
          pin28: { topMargin: 0.19943 },
          pin29: { topMargin: 0.19948 },
          pin30: { topMargin: 0.19949, bottomMargin: 7e-5 },
          pin31: { bottomMargin: 0 },
          pin26: { bottomMargin: 0.59898 },
          pin25: { bottomMargin: 0.19948 },
          pin24: { bottomMargin: 0.19943 },
          pin15: { bottomMargin: 0.59812 },
          pin14: { bottomMargin: 0.19949 },
          pin13: { bottomMargin: 0.19949 },
          pin12: { bottomMargin: 0.59812 },
          pin9: { bottomMargin: 1.39788 },
          pin6: { bottomMargin: 0.59813 },
          pin5: { bottomMargin: 0.99846 },
          pin4: { bottomMargin: 0.19864 },
          pin3: { bottomMargin: 0.19949 },
          pin2: { bottomMargin: 0.19948 },
          pin1: { bottomMargin: 0.19949, topMargin: 0.39942 },
        }}
        schWidth={4.79983}
        schHeight={10.38137}
        pinAttributes={{
          pin1: { providesPower: true },
          pin2: { providesPower: true },
          pin3: { providesPower: true },
          pin4: { providesPower: true },
          pin5: { providesPower: true },
          pin6: { requiresPower: true },
          pin7: { doNotConnect: true },
          pin8: { providesPower: true, shouldHaveDecouplingCapacitor: true },
          pin9: { requiresPower: true },
          pin10: { isBidirectional: true },
          pin11: { isBidirectional: true },
          pin12: { isInput: true },
          pin13: { requiresGround: true },
          pin14: { requiresGround: true },
          pin15: { requiresGround: true },
          pin16: {
            isOutput: true,
            canUseOpenDrain: true,
            isUsingOpenDrain: true,
          },
          pin17: { isInput: true },
          pin18: { isInput: true },
          pin19: { isPassive: true },
          pin20: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin21: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin22: { requiresPower: true, shouldHaveDecouplingCapacitor: true },
          pin23: { doNotConnect: true },
          pin24: { requiresGround: true },
          pin25: { requiresGround: true },
          pin26: { requiresGround: true },
          pin27: { isPassive: true },
          pin28: { isPassive: true },
          pin29: { isPassive: true },
          pin30: { isPassive: true },
          pin31: { requiresGround: true },
        }}
        manufacturerPartNumber="LM76005RNPR"
      />
      <inductor
        name="L7"
        schX={-1.72777}
        schY={4.26588}
        inductance="4.7uH"
        schRotation={0}
        manufacturerPartNumber="XAL6060-472MEB"
      />
      <capacitor
        name="C64"
        schX={-4.32723}
        schY={1.17075}
        capacitance="0.47uF"
        schRotation={180}
        manufacturerPartNumber="GRM155R61A474KE15D"
      />
      <capacitor
        name="C65"
        schX={1.4727}
        schY={0.97098}
        capacitance="220uF"
        polarized
        schRotation={270}
        manufacturerPartNumber="TPSE227M016R0100"
      />
      <capacitor
        name="C66"
        schX={3.87167}
        schY={0.97098}
        capacitance="0.47uF"
        schRotation={270}
        manufacturerPartNumber="C1608X7R1H474K080AC"
      />
      <resistor
        name="R102"
        schX={-0.12778}
        schY={1.17072}
        resistance="100kohm"
        symbolName="resistor"
        schRotation={270}
        manufacturerPartNumber="CRCW0402100KFKED"
      />
      <resistor
        name="R104"
        schX={-0.12778}
        schY={-2.42372}
        resistance="23.7kohm"
        symbolName="resistor"
        schRotation={270}
        manufacturerPartNumber="ERJ-2RKF2372X"
      />
      <trace from="U10.pin7" to="net.GND" />
      <trace from="U10.pin19" to="net.GND" />
      <trace from="U10.pin23" to="net.GND" />
      <trace from="U10.pin27" to="net.GND" />
      <trace from="U10.pin28" to="net.GND" />
      <trace from="U10.pin29" to="net.GND" />
      <trace from="U10.pin30" to="net.GND" />
      <trace from="U10.pin17" to="net.GND" />
      <trace from="U10.pin13" to="net.GND" />
      <trace from="U10.pin14" to="net.GND" />
      <trace from="U10.pin15" to="net.GND" />
      <trace from="U10.pin9" to="net.GND" />
      <trace from="U10.pin31" to="net.GND" />
      <trace from="U10.pin26" to="net.GND" />
      <trace from="U10.pin24" to="net.GND" />
      <trace from="U10.pin25" to="net.GND" />
      <trace from="U10.pin5" to="U10.pin1" />
      <trace from="U10.pin5" to="U10.pin2" />
      <trace from="U10.pin5" to="U10.pin3" />
      <trace from="U10.pin5" to="U10.pin4" />
      <trace from="U10.pin5" to="L7.pin1" />
      <trace from="U10.pin5" to="C64.pin1" />
      <trace from="U10.pin6" to="C64.pin2" />
      <trace from="U10.pin12" to="R102.pin2" />
      <trace from="U10.pin12" to="R104.pin1" />
      <trace from="L7.pin2" to="net.PP5V" />
      <trace from="R102.pin1" to="net.PP5V" />
      <trace from="C65.pin1" to="net.PP5V" />
      <trace from="C66.pin1" to="net.PP5V" />
      <trace from="U10.pin20" to="net.VSYS" />
      <trace from="U10.pin21" to="net.VSYS" />
      <trace from="U10.pin22" to="net.VSYS" />
      <trace from="U10.pin16" to="net.GND" />
      <trace from="R104.pin2" to="net.GND" />
      <trace from="C65.pin2" to="net.GND" />
      <trace from="C66.pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
