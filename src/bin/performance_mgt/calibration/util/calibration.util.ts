import {
  AppraisalRatingTag,
  CalibrationPerformanceLevel,
  CalibrationPotential,
} from '../../appraisal/enums/appraisal.enums';

export interface CalibrationBandConfig {
  key: string;
  label: string;
  minScore: number;
  maxScore: number;
  targetPercent: number;
  performanceLevel: CalibrationPerformanceLevel;
}

export interface CalibrationParticipantScoreLike {
  appraisalId?: string;
  employeeId?: string;
  employeeName?: string | null;
  calibratedRating?: number | null;
  baseScore?: number | null;
  managerRating?: number | null;
  calibratedBand?: string | null;
  potential?: CalibrationPotential | null;
}

export interface CalibrationDistributionBand {
  key: string;
  label: string;
  performanceLevel: CalibrationPerformanceLevel;
  targetPercent: number;
  actualCount: number;
  actualPercent: number;
  targetCount: number;
  deltaPercent: number;
  inRange: boolean;
}

export interface CalibrationGuidedSuggestion {
  appraisalId: string | null;
  employeeId: string | null;
  employeeName: string | null;
  currentBand: string | null;
  suggestedBand: string;
  suggestedLabel: string;
}

export const DEFAULT_CALIBRATION_BANDS: CalibrationBandConfig[] = [
  {
    key: AppraisalRatingTag.OUTSTANDING_PERFORMANCE,
    label: 'Outstanding performance',
    minScore: 90,
    maxScore: 100,
    targetPercent: 15,
    performanceLevel: CalibrationPerformanceLevel.HIGH,
  },
  {
    key: AppraisalRatingTag.EXCEEDS_EXPECTATIONS,
    label: 'Exceeds expectations',
    minScore: 80,
    maxScore: 89.99,
    targetPercent: 25,
    performanceLevel: CalibrationPerformanceLevel.HIGH,
  },
  {
    key: AppraisalRatingTag.MEETS_EXPECTATIONS,
    label: 'Meets expectations',
    minScore: 60,
    maxScore: 79.99,
    targetPercent: 50,
    performanceLevel: CalibrationPerformanceLevel.MEDIUM,
  },
  {
    key: AppraisalRatingTag.IMPROVEMENT_NEEDED,
    label: 'Improvement needed',
    minScore: 0,
    maxScore: 59.99,
    targetPercent: 10,
    performanceLevel: CalibrationPerformanceLevel.LOW,
  },
];

export function normalizeBands(
  bands?: CalibrationBandConfig[] | null,
): CalibrationBandConfig[] {
  if (!bands || bands.length === 0) {
    return DEFAULT_CALIBRATION_BANDS;
  }
  return [...bands].sort((a, b) => b.minScore - a.minScore);
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

export function resolveBandByScore(
  score: number,
  bands?: CalibrationBandConfig[] | null,
): CalibrationBandConfig {
  const normalized = normalizeBands(bands);
  const clamped = clampScore(score);
  const match = normalized.find(
    (band) => clamped >= band.minScore && clamped <= band.maxScore,
  );
  return match ?? normalized[normalized.length - 1];
}

export function bandKeyForRatingTag(
  tag: AppraisalRatingTag | string | null | undefined,
): string {
  if (!tag) {
    return AppraisalRatingTag.MEETS_EXPECTATIONS;
  }
  if (tag === AppraisalRatingTag.AVERAGE_PERFORMANCE) {
    return AppraisalRatingTag.MEETS_EXPECTATIONS;
  }
  return tag;
}

export function performanceLevelForBand(
  bandKey: string | null | undefined,
  bands?: CalibrationBandConfig[] | null,
): CalibrationPerformanceLevel | null {
  if (!bandKey) return null;
  const normalized = normalizeBands(bands);
  const match = normalized.find((band) => band.key === bandKey);
  if (match) return match.performanceLevel;

  switch (bandKey) {
    case AppraisalRatingTag.OUTSTANDING_PERFORMANCE:
    case AppraisalRatingTag.EXCEEDS_EXPECTATIONS:
      return CalibrationPerformanceLevel.HIGH;
    case AppraisalRatingTag.MEETS_EXPECTATIONS:
    case AppraisalRatingTag.AVERAGE_PERFORMANCE:
      return CalibrationPerformanceLevel.MEDIUM;
    case AppraisalRatingTag.IMPROVEMENT_NEEDED:
    default:
      return CalibrationPerformanceLevel.LOW;
  }
}

export function performanceLevelForScore(
  score: number,
  bands?: CalibrationBandConfig[] | null,
): CalibrationPerformanceLevel {
  return resolveBandByScore(score, bands).performanceLevel;
}

export function buildBoxKey(
  performanceLevel: CalibrationPerformanceLevel | null | undefined,
  potential: CalibrationPotential | null | undefined,
): string | null {
  if (!performanceLevel || !potential) return null;
  return `${performanceLevel}_${potential}`;
}

const PERFORMANCE_ROWS: CalibrationPerformanceLevel[] = [
  CalibrationPerformanceLevel.HIGH,
  CalibrationPerformanceLevel.MEDIUM,
  CalibrationPerformanceLevel.LOW,
];

const POTENTIAL_COLUMNS: CalibrationPotential[] = [
  CalibrationPotential.HIGH,
  CalibrationPotential.MEDIUM,
  CalibrationPotential.LOW,
];

export function boxPlacement(
  performanceLevel: CalibrationPerformanceLevel | null | undefined,
  potential: CalibrationPotential | null | undefined,
): number | null {
  if (!performanceLevel || !potential) return null;
  const row = PERFORMANCE_ROWS.indexOf(performanceLevel);
  const column = POTENTIAL_COLUMNS.indexOf(potential);
  if (row < 0 || column < 0) return null;
  return row * 3 + column + 1;
}

export function requiresJustification(
  managerBand: string | null | undefined,
  calibratedBand: string | null | undefined,
  potentialChanged = false,
): boolean {
  return (
    potentialChanged ||
    (Boolean(managerBand) && Boolean(calibratedBand) && managerBand !== calibratedBand)
  );
}

export function buildDistribution(
  participants: CalibrationParticipantScoreLike[],
  bands?: CalibrationBandConfig[] | null,
  tolerancePercent = 5,
): CalibrationDistributionBand[] {
  const normalized = normalizeBands(bands);
  const total = participants.length;
  const counts = new Map<string, number>();
  for (const participant of participants) {
    const band =
      participant.calibratedBand ??
      resolveBandByScore(
        participant.calibratedRating ?? participant.baseScore ?? 0,
        normalized,
      ).key;
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }

  return normalized.map((band) => {
    const actualCount = counts.get(band.key) ?? 0;
    const actualPercent = total > 0 ? (actualCount / total) * 100 : 0;
    const targetCount = Math.round((band.targetPercent / 100) * total);
    const deltaPercent = actualPercent - band.targetPercent;
    return {
      key: band.key,
      label: band.label,
      performanceLevel: band.performanceLevel,
      targetPercent: band.targetPercent,
      actualCount,
      actualPercent: round(actualPercent),
      targetCount,
      deltaPercent: round(deltaPercent),
      inRange: Math.abs(deltaPercent) <= tolerancePercent,
    };
  });
}

export function targetCountsForBands(
  total: number,
  bands?: CalibrationBandConfig[] | null,
): Record<string, number> {
  const normalized = normalizeBands(bands);
  const raw = normalized.map((band) => ({
    key: band.key,
    exact: (band.targetPercent / 100) * total,
  }));
  const counts: Record<string, number> = {};
  let assigned = 0;
  for (const item of raw) {
    const base = Math.floor(item.exact);
    counts[item.key] = base;
    assigned += base;
  }
  const remainder = total - assigned;
  const ranked = [...raw].sort(
    (a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)),
  );
  for (let index = 0; index < remainder; index += 1) {
    const item = ranked[index % ranked.length];
    counts[item.key] = (counts[item.key] ?? 0) + 1;
  }
  return counts;
}

export function buildGuidedDistribution(
  participants: CalibrationParticipantScoreLike[],
  bands?: CalibrationBandConfig[] | null,
): CalibrationGuidedSuggestion[] {
  const normalized = normalizeBands(bands);
  const targetCounts = targetCountsForBands(participants.length, normalized);
  const ascendingBands = [...normalized].sort((a, b) => a.minScore - b.minScore);
  const sorted = [...participants].sort(
    (a, b) =>
      (a.calibratedRating ?? a.baseScore ?? 0) -
      (b.calibratedRating ?? b.baseScore ?? 0),
  );

  const suggestions: CalibrationGuidedSuggestion[] = [];
  let cursor = 0;
  for (const band of ascendingBands) {
    const count = targetCounts[band.key] ?? 0;
    for (let index = 0; index < count; index += 1) {
      const participant = sorted[cursor];
      cursor += 1;
      if (!participant) break;
      if (participant.calibratedBand === band.key) continue;
      suggestions.push({
        appraisalId: participant.appraisalId ?? null,
        employeeId: participant.employeeId ?? null,
        employeeName: participant.employeeName ?? null,
        currentBand: participant.calibratedBand ?? null,
        suggestedBand: band.key,
        suggestedLabel: band.label,
      });
    }
  }

  return suggestions;
}

export interface CalibrationDepartmentRow {
  departmentCode: string | null;
  departmentName: string | null;
  count: number;
  bands: { band: string | null; count: number }[];
}

export function buildDepartmentDistribution(
  rows: { departmentCode: string | null; departmentName: string | null; band: string | null; count: number }[],
): CalibrationDepartmentRow[] {
  const map = new Map<string, CalibrationDepartmentRow>();
  for (const row of rows) {
    const key = row.departmentCode ?? 'unassigned';
    if (!map.has(key)) {
      map.set(key, {
        departmentCode: row.departmentCode,
        departmentName: row.departmentName,
        count: 0,
        bands: [],
      });
    }
    const entry = map.get(key)!;
    entry.count += row.count;
    entry.bands.push({ band: row.band, count: row.count });
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.departmentName ?? '').localeCompare(b.departmentName ?? ''),
  );
}

export interface CalibrationOutOfRangeDepartment {
  departmentCode: string | null;
  departmentName: string | null;
  total: number;
  breaches: {
    band: string;
    label: string;
    actualPercent: number;
    targetPercent: number;
    deltaPercent: number;
  }[];
}

export function findOutOfRangeDepartments(
  rows: CalibrationDepartmentRow[],
  bands?: CalibrationBandConfig[] | null,
  tolerancePercent = 5,
): CalibrationOutOfRangeDepartment[] {
  const normalized = normalizeBands(bands);
  const result: CalibrationOutOfRangeDepartment[] = [];

  for (const row of rows) {
    if (row.count === 0) continue;
    const breaches: CalibrationOutOfRangeDepartment['breaches'] = [];
    for (const band of normalized) {
      const count =
        row.bands.find((item) => item.band === band.key)?.count ?? 0;
      const actualPercent = (count / row.count) * 100;
      const deltaPercent = actualPercent - band.targetPercent;
      if (Math.abs(deltaPercent) > tolerancePercent) {
        breaches.push({
          band: band.key,
          label: band.label,
          actualPercent: round(actualPercent),
          targetPercent: band.targetPercent,
          deltaPercent: round(deltaPercent),
        });
      }
    }
    if (breaches.length > 0) {
      result.push({
        departmentCode: row.departmentCode,
        departmentName: row.departmentName,
        total: row.count,
        breaches,
      });
    }
  }

  return result;
}

export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
