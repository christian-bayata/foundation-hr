import { describe, expect, it } from '@jest/globals';
import { KpiType } from '../../goal-setting/enums/goal.enums';
import {
  AppraisalPerspective,
  AppraisalRatingTag,
} from '../enums/appraisal.enums';
import {
  computeGoalScores,
  computePerspectiveRollups,
  parseTargetValue,
  resolveRatingTag,
  scoreGoal,
} from './appraisal-scoring.util';

describe('appraisal-scoring.util', () => {
  describe('parseTargetValue', () => {
    it('parses formatted currency targets', () => {
      expect(parseTargetValue('10,000,000')).toBe(10000000);
    });

    it('parses targets with units', () => {
      expect(parseTargetValue('15 %')).toBe(15);
    });

    it('returns 0 for empty targets', () => {
      expect(parseTargetValue(null)).toBe(0);
      expect(parseTargetValue('no numbers')).toBe(0);
    });
  });

  describe('scoreGoal', () => {
    it('scores higher-is-better goals against the target', () => {
      expect(scoreGoal(8922000, 10000000)).toBe(89.22);
      expect(scoreGoal(7500000, 10000000)).toBe(75);
    });

    it('scores lower-is-better goals inversely', () => {
      expect(scoreGoal(50, 100, KpiType.LESS_IS_MORE)).toBe(100);
      expect(scoreGoal(200, 100, KpiType.LESS_IS_MORE)).toBe(50);
    });

    it('caps scores at 100 and floors them at 0', () => {
      expect(scoreGoal(200, 100)).toBe(100);
      expect(scoreGoal(-10, 100)).toBe(0);
    });

    it('returns 0 when no actual is supplied', () => {
      expect(scoreGoal(null, 100)).toBe(0);
    });
  });

  describe('computeGoalScores', () => {
    it('returns a weighted average across goals', () => {
      const result = computeGoalScores([
        { weightage: 60, targetValue: 100, employeeActual: 90 },
        { weightage: 40, targetValue: 100, employeeActual: 50 },
      ]);

      expect(result.totalWeightage).toBe(100);
      expect(result.employeeScore).toBe(74);
      expect(result.reviewerScore).toBe(0);
      expect(result.finalScore).toBe(0);
      expect(result.performanceScore).toBe(0);
    });

    it('uses reviewer actuals for the manager score', () => {
      const result = computeGoalScores([
        {
          weightage: 100,
          targetValue: 100,
          employeeActual: 80,
          reviewerActual: 60,
          managerActual: 50,
        },
      ]);

      expect(result.employeeScore).toBe(80);
      expect(result.reviewerScore).toBe(60);
      expect(result.finalScore).toBe(50);
      expect(result.performanceScore).toBe(50);
    });

    it('handles an empty goal set', () => {
      const result = computeGoalScores([]);
      expect(result.totalWeightage).toBe(0);
      expect(result.performanceScore).toBe(0);
    });
  });

  describe('computePerspectiveRollups', () => {
    it('groups goals by perspective with planned and actual weights', () => {
      const rollups = computePerspectiveRollups([
        {
          perspective: AppraisalPerspective.FINANCIAL,
          weightage: 10,
          targetValue: 10000000,
          reviewerActual: 8922000,
        },
        {
          perspective: AppraisalPerspective.FINANCIAL,
          weightage: 10,
          targetValue: 10000000,
          reviewerActual: 7500000,
        },
        {
          perspective: AppraisalPerspective.CUSTOMER,
          weightage: 20,
          targetValue: 100,
          reviewerActual: 80,
        },
      ]);

      expect(rollups).toHaveLength(2);
      const financial = rollups.find(
        (item) => item.perspective === AppraisalPerspective.FINANCIAL,
      );
      expect(financial?.plannedWeight).toBe(20);
      expect(financial?.goals).toBe(2);
      expect(financial?.score).toBe(82.11);

      const customer = rollups.find(
        (item) => item.perspective === AppraisalPerspective.CUSTOMER,
      );
      expect(customer?.plannedWeight).toBe(20);
      expect(customer?.actualWeight).toBe(16);
      expect(customer?.score).toBe(80);
    });
  });

  describe('resolveRatingTag', () => {
    it('maps scores to the default rating tags', () => {
      expect(resolveRatingTag(95)).toBe(
        AppraisalRatingTag.OUTSTANDING_PERFORMANCE,
      );
      expect(resolveRatingTag(85)).toBe(
        AppraisalRatingTag.EXCEEDS_EXPECTATIONS,
      );
      expect(resolveRatingTag(75)).toBe(
        AppraisalRatingTag.MEETS_EXPECTATIONS,
      );
      expect(resolveRatingTag(65)).toBe(
        AppraisalRatingTag.AVERAGE_PERFORMANCE,
      );
      expect(resolveRatingTag(40)).toBe(
        AppraisalRatingTag.IMPROVEMENT_NEEDED,
      );
    });

    it('supports a custom rating scale', () => {
      expect(
        resolveRatingTag(70, [
          {
            tag: AppraisalRatingTag.OUTSTANDING_PERFORMANCE,
            minScore: 70,
            maxScore: 100,
          },
          {
            tag: AppraisalRatingTag.IMPROVEMENT_NEEDED,
            minScore: 0,
            maxScore: 69.99,
          },
        ]),
      ).toBe(AppraisalRatingTag.OUTSTANDING_PERFORMANCE);
    });
  });
});
