import { BuckConverterNetworkPlacementSolver } from "../BuckConverterNetworkPlacementSolver/BuckConverterNetworkPlacementSolver"
import { ConnectorPlacementSolver } from "../ConnectorPlacementSolver/ConnectorPlacementSolver"
import {
  BasePipelineSolver,
  definePipelineStep,
  type PipelineStep,
} from "@tscircuit/solver-utils"
import type { CircuitJson } from "circuit-json"
import type { SchematicPlacementIssue } from "../../types"
import { buildSolverContext } from "../../utils/placements"
import { CapacitorOrientationSolver } from "../CapacitorOrientationSolver/CapacitorOrientationSolver"
import { ComponentNetLabelCollisionSolver } from "../ComponentNetLabelCollisionSolver/ComponentNetLabelCollisionSolver"
import { ComponentPinAlignmentSolver } from "../ComponentPinAlignmentSolver/ComponentPinAlignmentSolver"
import { CrystalLoadCapacitorPlacementSolver } from "../CrystalLoadCapacitorPlacementSolver/CrystalLoadCapacitorPlacementSolver"
import { DiodeResistorAlignmentSolver } from "../DiodeResistorAlignmentSolver/DiodeResistorAlignmentSolver"
import { FeedbackNetworkPlacementSolver } from "../FeedbackNetworkPlacementSolver/FeedbackNetworkPlacementSolver"
import { PullResistorPlacementSolver } from "../PullResistorPlacementSolver/PullResistorPlacementSolver"
import { TwoPinComponentRailOrientationSolver } from "../TwoPinComponentRailOrientationSolver/TwoPinComponentRailOrientationSolver"
import { SchematicBoxInnerLabelCollisionSolver } from "../SchematicBoxInnerLabelCollisionSolver/SchematicBoxInnerLabelCollisionSolver"
import { SchematicBoxOverlapSolver } from "../SchematicBoxOverlapSolver/SchematicBoxOverlapSolver"
import { SchematicBoxTooWideSolver } from "../SchematicBoxTooWideSolver/SchematicBoxTooWideSolver"
import { SchematicPinPaddingToEdgeSolver } from "../SchematicPinPaddingToEdgeSolver/SchematicPinPaddingToEdgeSolver"
import type { SolverContext } from "../SolverContext"
import { TraceSimplificationSolver } from "../TraceSimplificationSolver/TraceSimplificationSolver"
import { TwoPinComponentOrientationSolver } from "../TwoPinComponentOrientationSolver/TwoPinComponentOrientationSolver"
import { VerboseNetLabelSolver } from "../VerboseNetLabelSolver/VerboseNetLabelSolver"
import { SchematicTextClearanceSolver } from "../SchematicTextClearanceSolver/SchematicTextClearanceSolver"
import { ResetNetworkGroupingSolver } from "../ResetNetworkGroupingSolver/ResetNetworkGroupingSolver"

type SolverParams = { ctx: SolverContext; issues: SchematicPlacementIssue[] }

export class SchematicPlacementPipeline extends BasePipelineSolver<CircuitJson> {
  ctx!: SolverContext
  readonly issues: SchematicPlacementIssue[] = []

  pipelineDef: PipelineStep<any>[] = [
    definePipelineStep(
      "SchematicTextClearanceSolver",
      SchematicTextClearanceSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "ResetNetworkGroupingSolver",
      ResetNetworkGroupingSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "SchematicBoxOverlapSolver",
      SchematicBoxOverlapSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "CapacitorOrientationSolver",
      CapacitorOrientationSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "VerboseNetLabelSolver",
      VerboseNetLabelSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "SchematicBoxTooWideSolver",
      SchematicBoxTooWideSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "SchematicPinPaddingToEdgeSolver",
      SchematicPinPaddingToEdgeSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "SchematicBoxInnerLabelCollisionSolver",
      SchematicBoxInnerLabelCollisionSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "DiodeResistorAlignmentSolver",
      DiodeResistorAlignmentSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "ComponentPinAlignmentSolver",
      ComponentPinAlignmentSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "TraceSimplificationSolver",
      TraceSimplificationSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "CrystalLoadCapacitorPlacementSolver",
      CrystalLoadCapacitorPlacementSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "TwoPinComponentOrientationSolver",
      TwoPinComponentOrientationSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "FeedbackNetworkPlacementSolver",
      FeedbackNetworkPlacementSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "TwoPinComponentRailOrientationSolver",
      TwoPinComponentRailOrientationSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "PullResistorPlacementSolver",
      PullResistorPlacementSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "ComponentNetLabelCollisionSolver",
      ComponentNetLabelCollisionSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "BuckConverterNetworkPlacementSolver",
      BuckConverterNetworkPlacementSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
    definePipelineStep(
      "ConnectorPlacementSolver",
      ConnectorPlacementSolver,
      (p: SchematicPlacementPipeline): [SolverParams] => [
        { ctx: p.ctx, issues: p.issues },
      ],
    ),
  ]

  override _setup(): void {
    this.ctx = buildSolverContext(this.inputProblem)
  }

  override getOutput() {
    // Prefer the rail-aware rotation over a duplicate generic capacitor warning.
    // The capacitor solver still reports horizontal capacitors outside this rule.
    const railOrientationComponentIds = new Set(
      this.issues.flatMap((issue) =>
        issue.lineItemType === "TwoPinComponentShouldBeVertical" &&
        issue.schematicBox.schematicComponentId
          ? [issue.schematicBox.schematicComponentId]
          : [],
      ),
    )
    return {
      issues: this.issues.filter(
        (issue) =>
          issue.lineItemType !== "CapacitorSymbolHorizontal" ||
          !railOrientationComponentIds.has(
            issue.schematicBox.schematicComponentId ?? "",
          ),
      ),
      componentPlacements: this.ctx.componentPlacements,
    }
  }
}
