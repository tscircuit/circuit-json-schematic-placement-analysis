import {
  BasePipelineSolver,
  definePipelineStep,
  type PipelineStep,
} from "@tscircuit/solver-utils"
import type { CircuitJson } from "circuit-json"
import type { SchematicPlacementIssue } from "../../types"
import type { SolverContext } from "../SolverContext"
import { buildSolverContext } from "../../utils/placements"
import { CapacitorOrientationSolver } from "../CapacitorOrientationSolver/CapacitorOrientationSolver"
import { SchematicBoxOverlapSolver } from "../SchematicBoxOverlapSolver/SchematicBoxOverlapSolver"
import { SchematicBoxTooWideSolver } from "../SchematicBoxTooWideSolver/SchematicBoxTooWideSolver"
import { SchematicPinPaddingToEdgeSolver } from "../SchematicPinPaddingToEdgeSolver/SchematicPinPaddingToEdgeSolver"
import { VerboseNetLabelSolver } from "../VerboseNetLabelSolver/VerboseNetLabelSolver"

type SolverParams = { ctx: SolverContext; out: SchematicPlacementIssue[] }

export class SchematicPlacementPipeline extends BasePipelineSolver<CircuitJson> {
  ctx!: SolverContext
  readonly issues: SchematicPlacementIssue[] = []

  pipelineDef: PipelineStep<any>[] = [
    definePipelineStep(
      "SchematicBoxOverlapSolver",
      SchematicBoxOverlapSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, out: p.issues },
      ],
    ),
    definePipelineStep(
      "CapacitorOrientationSolver",
      CapacitorOrientationSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, out: p.issues },
      ],
    ),
    definePipelineStep(
      "VerboseNetLabelSolver",
      VerboseNetLabelSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, out: p.issues },
      ],
    ),
    definePipelineStep(
      "SchematicBoxTooWideSolver",
      SchematicBoxTooWideSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, out: p.issues },
      ],
    ),
    definePipelineStep(
      "SchematicPinPaddingToEdgeSolver",
      SchematicPinPaddingToEdgeSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, out: p.issues },
      ],
    ),
  ]

  override _setup(): void {
    this.ctx = buildSolverContext(this.inputProblem)
  }

  override getOutput() {
    return {
      issues: this.issues,
      componentPlacements: this.ctx.componentPlacements,
    }
  }
}
