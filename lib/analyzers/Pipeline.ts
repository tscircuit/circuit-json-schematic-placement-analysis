import type { GraphicsObject } from "graphics-debug"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  SchematicPlacementLineItem,
} from "../utils/types"
import type { AnalyzerContext } from "./AnalyzerContext"
import { BaseAnalyzer } from "./BaseAnalyzer"
import { CapacitorOrientationAnalyzer } from "./CapacitorOrientationAnalyzer"
import { ComponentOverlapAnalyzer } from "./ComponentOverlapAnalyzer"
import { PinPaddingToEdgeAnalyzer } from "./PinPaddingToEdgeAnalyzer"
import { SchematicPlacement } from "./SchematicPlacement"
import { SchematicBoxTooWideAnalyzer } from "./SchematicBoxTooWideAnalyzer"
import { VerboseNetLabelAnalyzer } from "./VerboseNetLabelAnalyzer"
import { visualizeCircuitJson } from "../utils/graphics"

export type SchematicAnalysisPhase =
  | "placementGeneration"
  | "componentOverlap"
  | "capacitorOrientation"
  | "verboseNetLabel"
  | "schematicBoxTooWide"
  | "pinPaddingToEdge"

type AnalyzerConstructor = new (...args: any[]) => BaseAnalyzer

export type SchematicAnalysisPipelineStep<T extends AnalyzerConstructor> = {
  solverName: SchematicAnalysisPhase
  analyzerClass: T
  getConstructorParams: (
    instance: SchematicAnalysisPipeline,
  ) => ConstructorParameters<T>
  onSolved?: (instance: SchematicAnalysisPipeline) => void
  shouldSkip?: (instance: SchematicAnalysisPipeline) => boolean
}

export function definePipelineStep<
  T extends AnalyzerConstructor,
  const P extends ConstructorParameters<T>,
>(
  solverName: SchematicAnalysisPhase,
  analyzerClass: T,
  getConstructorParams: (instance: SchematicAnalysisPipeline) => P,
  opts: {
    onSolved?: (instance: SchematicAnalysisPipeline) => void
    shouldSkip?: (instance: SchematicAnalysisPipeline) => boolean
  } = {},
): SchematicAnalysisPipelineStep<T> {
  return {
    solverName,
    analyzerClass,
    getConstructorParams,
    onSolved: opts.onSolved,
    shouldSkip: opts.shouldSkip,
  }
}

class PlacementGenerationAnalyzer extends BaseAnalyzer {
  placements: SchematicBoxPlacement[] = []

  constructor(private readonly ctx: AnalyzerContext) {
    super()
  }

  protected override _step(): void {
    this.placements = new SchematicPlacement(this.ctx).createPlacements()
    this.isComplete = true
  }

  override visualize(): GraphicsObject {
    return visualizeCircuitJson(this.ctx.circuitJson)
  }
}

export class SchematicAnalysisPipeline {
  placementGeneration?: BaseAnalyzer
  componentOverlap?: ComponentOverlapAnalyzer
  capacitorOrientation?: CapacitorOrientationAnalyzer
  verboseNetLabel?: VerboseNetLabelAnalyzer
  schematicBoxTooWide?: SchematicBoxTooWideAnalyzer
  pinPaddingToEdge?: PinPaddingToEdgeAnalyzer

  placements: SchematicBoxPlacement[] = []
  readonly issues: SchematicPlacementIssue[] = []

  activeSubAnalyzer: BaseAnalyzer | null = null
  currentPipelineStepIndex = 0
  startTimeOfPhase: Record<string, number> = {}
  endTimeOfPhase: Record<string, number> = {}
  timeSpentOnPhase: Record<string, number> = {}
  firstIterationOfPhase: Record<string, number> = {}
  iterations = 0
  failed = false
  error: string | null = null
  isComplete = false

  readonly pipelineDef = [
    definePipelineStep(
      "placementGeneration",
      PlacementGenerationAnalyzer,
      ({ ctx }) => [ctx],
      {
        onSolved: (instance) => {
          instance.placements = [
            ...(instance.placementGeneration as PlacementGenerationAnalyzer)
              .placements,
          ]
        },
      },
    ),
    definePipelineStep(
      "componentOverlap",
      ComponentOverlapAnalyzer,
      ({ ctx, issues }) => [ctx, issues],
    ),
    definePipelineStep(
      "capacitorOrientation",
      CapacitorOrientationAnalyzer,
      ({ ctx, issues }) => [ctx, issues],
    ),
    definePipelineStep(
      "verboseNetLabel",
      VerboseNetLabelAnalyzer,
      ({ ctx, issues }) => [ctx, issues],
    ),
    definePipelineStep(
      "schematicBoxTooWide",
      SchematicBoxTooWideAnalyzer,
      ({ ctx, issues }) => [ctx, issues],
    ),
    definePipelineStep(
      "pinPaddingToEdge",
      PinPaddingToEdgeAnalyzer,
      ({ ctx, issues }) => [ctx, issues],
    ),
  ] as const

  constructor(public readonly ctx: AnalyzerContext) {}

  step(): void {
    if (this.isComplete || this.failed) return
    this.iterations += 1

    const pipelineStepDef = this.pipelineDef[this.currentPipelineStepIndex]
    if (!pipelineStepDef) {
      this.isComplete = true
      return
    }

    if (pipelineStepDef.shouldSkip?.(this)) {
      this.currentPipelineStepIndex += 1
      if (this.currentPipelineStepIndex >= this.pipelineDef.length) {
        this.isComplete = true
      }
      return
    }

    if (this.activeSubAnalyzer) {
      try {
        this.activeSubAnalyzer.step()
      } catch (error) {
        this.error = this.activeSubAnalyzer.error
        this.failed = true
        throw error
      }

      if (this.activeSubAnalyzer.isComplete) {
        this.endTimeOfPhase[pipelineStepDef.solverName] = performance.now()
        this.timeSpentOnPhase[pipelineStepDef.solverName] =
          this.endTimeOfPhase[pipelineStepDef.solverName]! -
          this.startTimeOfPhase[pipelineStepDef.solverName]!
        pipelineStepDef.onSolved?.(this)
        this.activeSubAnalyzer = null
        this.currentPipelineStepIndex += 1
        if (this.currentPipelineStepIndex >= this.pipelineDef.length) {
          this.isComplete = true
        }
      } else if (this.activeSubAnalyzer.failed) {
        this.error = this.activeSubAnalyzer.error
        this.failed = true
        this.activeSubAnalyzer = null
      }

      return
    }

    const constructorParams = pipelineStepDef.getConstructorParams(this)
    const AnalyzerClass = pipelineStepDef.analyzerClass as new (
      ...args: any[]
    ) => BaseAnalyzer
    this.activeSubAnalyzer = new AnalyzerClass(...constructorParams)
    ;(this as Record<string, unknown>)[pipelineStepDef.solverName] =
      this.activeSubAnalyzer
    this.timeSpentOnPhase[pipelineStepDef.solverName] = 0
    this.startTimeOfPhase[pipelineStepDef.solverName] = performance.now()
    this.firstIterationOfPhase[pipelineStepDef.solverName] = this.iterations
  }

  solveUntilPhase(phase: SchematicAnalysisPhase | string): this {
    const normalizedPhase = phase.toLowerCase()
    const hasPhase = this.pipelineDef.some(
      (step) => step.solverName.toLowerCase() === normalizedPhase,
    )
    if (!hasPhase) {
      throw new Error(`Unknown schematic analysis phase: ${phase}`)
    }

    while (
      !this.isComplete &&
      !this.failed &&
      this.getCurrentPhase().toLowerCase() !== normalizedPhase
    ) {
      this.step()
    }

    return this
  }

  solve(): this {
    while (!this.isComplete && !this.failed) {
      this.step()
    }

    return this
  }

  getCurrentPhase(): SchematicAnalysisPhase | "none" {
    return this.pipelineDef[this.currentPipelineStepIndex]?.solverName ?? "none"
  }

  visualize(): GraphicsObject {
    if (!this.isComplete && this.activeSubAnalyzer) {
      return this.activeSubAnalyzer.visualize()
    }

    return visualizeCircuitJson(this.ctx.circuitJson)
  }

  preview(): GraphicsObject {
    if (this.activeSubAnalyzer) {
      return this.activeSubAnalyzer.preview()
    }

    return this.visualize()
  }

  getLineItems(): SchematicPlacementLineItem[] {
    return [
      ...this.placements.map((placement) => ({
        ...placement,
        lineItemType: "SchematicBoxPlacement" as const,
      })),
      ...(this.issues.length > 0
        ? [
            {
              lineItemType: "SchematicPlacementIssues" as const,
              issues: this.issues,
            },
          ]
        : []),
    ]
  }
}
