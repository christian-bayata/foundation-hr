import { KpiType } from '../../goal-setting/enums/goal.enums';
import {
  AppraisalPerspective,
  AppraisalRatingTag,
} from '../enums/appraisal.enums';
import { AppraisalRatingScaleEntry } from '../schemas/appraisal-cycle.schema';

export interface ScorableGoal {
  perspective?: AppraisalPerspective | string | null;
  weightage?: number | null;
  target?: string | null;
  targetValue?: number | null;
  kpiType?: KpiType | null;
  employeeActual?: number | null;
  reviewerActual?: number | null;
  managerActual?: number | null;
}

export interface GoalScoreSummary {
  employeeScore: number;
  reviewerScore: number;
  finalScore: number;
  totalWeightage: number;
  performanceScore: number;
}

export interface PerspectiveRollup {
  perspective: AppraisalPerspective | null;
  plannedWeight: number;
  actualWeight: number;
  score: number;
  goals: number;
}

export const DEFAULT_RATING_SCALE: AppraisalRatingScaleEntry[] = [
  {
    tag: AppraisalRatingTag.OUTSTANDING_PERFORMANCE,
    minScore: 90,
    maxScore: 100,
  },
  {
    tag: AppraisalRatingTag.EXCEEDS_EXPECTATIONS,
    minScore: 80,
    maxScore: 89.99,
  },
  {
    tag: AppraisalRatingTag.MEETS_EXPECTATIONS,
    minScore: 70,
    maxScore: 79.99,
  },
  {
    tag: AppraisalRatingTag.AVERAGE_PERFORMANCE,
    minScore: 60,
    maxScore: 69.99,
  },
  {
    tag: AppraisalRatingTag.IMPROVEMENT_NEEDED,
    minScore: 0,
    maxScore: 59.99,
  },
];

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, round(value)));
}

export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function parseTargetValue(target: string | null | undefined): number {
  if (!target) return 0;
  const cleaned = String(target).replace(/,/g, '').replace(/\s/g, '');
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return 0;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : 0;
}

export function scoreGoal(
  actual: number | null | undefined,
  targetValue: number,
  kpiType?: KpiType | null,
): number {
  if (actual === null || actual === undefined || !Number.isFinite(actual)) {
    return 0;
  }

  if (targetValue <= 0) {
    return actual > 0 ? 100 : 0;
  }

  switch (kpiType) {
    case KpiType.LESS_IS_MORE:
    case KpiType.MINIMALIST:
      if (actual <= 0) return 100;
      return clampScore((targetValue / actual) * 100);
    case KpiType.HIGHER_IS_BETTER:
    case KpiType.ALL_IN:
    case KpiType.NEGATIVE_SCORE:
    default:
      return clampScore((actual / targetValue) * 100);
  }
}

export function computeGoalScores(goals: ScorableGoal[]): GoalScoreSummary {
  const totalWeightage = round(
    goals.reduce((sum, goal) => sum + (goal.weightage ?? 0), 0),
  );

  if (goals.length === 0 || totalWeightage <= 0) {
    return {
      employeeScore: 0,
      reviewerScore: 0,
      finalScore: 0,
      totalWeightage,
      performanceScore: 0,
    };
  }

  let employeeWeighted = 0;
  let reviewerWeighted = 0;
  let finalWeighted = 0;

  for (const goal of goals) {
    const weight = goal.weightage ?? 0;
    const targetValue =
      goal.targetValue && goal.targetValue > 0
        ? goal.targetValue
        : parseTargetValue(goal.target);

    const employeeScore = scoreGoal(
      goal.employeeActual,
      targetValue,
      goal.kpiType,
    );
    const reviewerScore = scoreGoal(
      goal.reviewerActual,
      targetValue,
      goal.kpiType,
    );
    const finalActual = goal.managerActual ?? goal.reviewerActual;
    const finalScore = scoreGoal(finalActual, targetValue, goal.kpiType);

    employeeWeighted += weight * employeeScore;
    reviewerWeighted += weight * reviewerScore;
    finalWeighted += weight * finalScore;
  }

  const employeeScore = clampScore(employeeWeighted / totalWeightage);
  const reviewerScore = clampScore(reviewerWeighted / totalWeightage);
  const finalScore = clampScore(finalWeighted / totalWeightage);

  return {
    employeeScore,
    reviewerScore,
    finalScore,
    totalWeightage,
    performanceScore: finalScore,
  };
}

export function computePerspectiveRollups(
  goals: ScorableGoal[],
): PerspectiveRollup[] {
  const buckets = new Map<
    string,
    PerspectiveRollup & { weightedActualScore: number }
  >();

  for (const goal of goals) {
    const key = goal.perspective ?? 'unassigned';
    const targetValue =
      goal.targetValue && goal.targetValue > 0
        ? goal.targetValue
        : parseTargetValue(goal.target);
    const score = scoreGoal(
      goal.managerActual ?? goal.reviewerActual,
      targetValue,
      goal.kpiType,
    );
    const weight = goal.weightage ?? 0;

    if (!buckets.has(key)) {
      buckets.set(key, {
        perspective: (goal.perspective as AppraisalPerspective) ?? null,
        plannedWeight: 0,
        actualWeight: 0,
        score: 0,
        goals: 0,
        weightedActualScore: 0,
      });
    }

    const bucket = buckets.get(key)!;
    bucket.plannedWeight += weight;
    bucket.weightedActualScore += weight * score;
    bucket.goals += 1;
  }

  return Array.from(buckets.values()).map((bucket) => {
    const actualWeight = round(bucket.weightedActualScore / 100);
    return {
      perspective: bucket.perspective,
      plannedWeight: round(bucket.plannedWeight),
      actualWeight,
      score:
        bucket.plannedWeight > 0
          ? clampScore(bucket.weightedActualScore / bucket.plannedWeight)
          : 0,
      goals: bucket.goals,
    };
  });
}

export function resolveRatingTag(
  score: number,
  ratingScale: AppraisalRatingScaleEntry[] = DEFAULT_RATING_SCALE,
): AppraisalRatingTag {
  const normalized = clampScore(score);
  const scale =
    ratingScale.length > 0 ? ratingScale : DEFAULT_RATING_SCALE;

  const match = [...scale]
    .sort((a, b) => b.minScore - a.minScore)
    .find(
      (entry) =>
        normalized >= entry.minScore && normalized <= entry.maxScore,
    );

  return (match?.tag as AppraisalRatingTag) ??
    AppraisalRatingTag.IMPROVEMENT_NEEDED;
}
