import { describe, expect, it } from '@jest/globals';
import { KpiType } from '../../goal-setting/enums/goal.enums';
import {
  AppraisalPerspective,
  AppraisalTargetPopulation,
} from '../enums/appraisal.enums';
import {
  buildAppraisalSnapshot,
  buildGoalScoreSnapshot,
  getEmployeeDisplayName,
  isEmployeeInScope,
} from './appraisal-participant.util';

const employee = {
  _id: 'emp-1',
  firstName: 'Babalola',
  lastName: 'Adedayo',
  email: 'babalola@example.com',
  employeeId: 'FHR2024',
  jobTitleCode: 'product_designer',
  departmentCode: 'design',
  supervisor: 'emp-2',
  status: 'active',
};

const manager = {
  _id: 'emp-2',
  firstName: 'Amara',
  lastName: 'Okafor',
  email: 'amara@example.com',
  employeeId: 'FHR1001',
  jobTitleCode: 'hr_manager',
  departmentCode: 'hr',
  supervisor: null,
  status: 'active',
};

const departmentMap = new Map([
  ['design', { _id: 'dept-1', code: 'design', name: 'Design' }],
  ['hr', { _id: 'dept-2', code: 'hr', name: 'HR' }],
]);

const jobTitleMap = new Map([
  ['product_designer', { code: 'product_designer', name: 'Product designer' }],
]);

describe('appraisal-participant.util', () => {
  describe('getEmployeeDisplayName', () => {
    it('joins first and last names', () => {
      expect(getEmployeeDisplayName(employee)).toBe('Babalola Adedayo');
    });

    it('falls back to email', () => {
      expect(
        getEmployeeDisplayName({ email: 'only@example.com' }),
      ).toBe('only@example.com');
    });
  });

  describe('isEmployeeInScope', () => {
    it('includes everyone when the target population is all employees', () => {
      expect(
        isEmployeeInScope(employee, {
          targetPopulation: AppraisalTargetPopulation.ALL_EMPLOYEES,
        }),
      ).toBe(true);
    });

    it('filters by department code', () => {
      expect(
        isEmployeeInScope(employee, {
          targetPopulation: AppraisalTargetPopulation.DEPARTMENTS,
          departmentCodes: ['design', 'hr'],
        }),
      ).toBe(true);
      expect(
        isEmployeeInScope(employee, {
          targetPopulation: AppraisalTargetPopulation.DEPARTMENTS,
          departmentCodes: ['marketing'],
        }),
      ).toBe(false);
    });

    it('includes all departments when the list is empty', () => {
      expect(
        isEmployeeInScope(employee, {
          targetPopulation: AppraisalTargetPopulation.DEPARTMENTS,
          departmentCodes: [],
        }),
      ).toBe(true);
    });

    it('filters by job title code', () => {
      expect(
        isEmployeeInScope(employee, {
          targetPopulation: AppraisalTargetPopulation.JOB_TITLES,
          jobTitleCodes: ['product_designer'],
        }),
      ).toBe(true);
      expect(
        isEmployeeInScope(employee, {
          targetPopulation: AppraisalTargetPopulation.JOB_TITLES,
          jobTitleCodes: ['data_analyst'],
        }),
      ).toBe(false);
    });
  });

  describe('buildAppraisalSnapshot', () => {
    it('snapshots the employee, department, role and manager', () => {
      const snapshot = buildAppraisalSnapshot({
        organizationId: 'org-1',
        cycleId: 'cycle-1',
        employee,
        employeeMap: new Map([
          ['emp-1', employee],
          ['emp-2', manager],
        ]),
        departmentMap,
        jobTitleMap,
        createdBy: 'user-1',
      });

      expect(snapshot.employeeId).toBe('emp-1');
      expect(snapshot.employeeCode).toBe('FHR2024');
      expect(snapshot.employeeName).toBe('Babalola Adedayo');
      expect(snapshot.departmentId).toBe('dept-1');
      expect(snapshot.departmentName).toBe('Design');
      expect(snapshot.jobTitleName).toBe('Product designer');
      expect(snapshot.managerId).toBe('emp-2');
      expect(snapshot.managerName).toBe('Amara Okafor');
      expect(snapshot.managerEmail).toBe('amara@example.com');
    });
  });

  describe('buildGoalScoreSnapshot', () => {
    it('maps goal perspective and parses the target', () => {
      const snapshot = buildGoalScoreSnapshot(
        'org-1',
        'cycle-1',
        'appraisal-1',
        {
          _id: 'goal-1',
          perspective: 'financial',
          title: 'Increase Company Revenue by 15%',
          weightage: 10,
          target: '10,000,000',
          targetUnit: 'NGN',
          kpiType: KpiType.HIGHER_IS_BETTER,
          kpiMetric: 'Revenue',
        },
        'user-1',
      );

      expect(snapshot.goalId).toBe('goal-1');
      expect(snapshot.perspective).toBe(AppraisalPerspective.FINANCIAL);
      expect(snapshot.targetValue).toBe(10000000);
      expect(snapshot.weightage).toBe(10);
      expect(snapshot.label).toBe('Revenue');
      expect(snapshot.employeeActual).toBeNull();
    });
  });
});
