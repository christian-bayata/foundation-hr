import { Types } from 'mongoose';
import { KpiType } from '../../goal-setting/enums/goal.enums';
import {
  AppraisalPerspective,
  AppraisalTargetPopulation,
} from '../enums/appraisal.enums';
import { parseTargetValue } from './appraisal-scoring.util';
import { Appraisal } from '../schemas/appraisal.schema';
import { AppraisalGoalScore } from '../schemas/appraisal-goal-score.schema';

export interface ParticipantEmployeeLike {
  _id?: Types.ObjectId | string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  employeeId?: string | null;
  jobTitleCode?: string | null;
  departmentCode?: string | null;
  supervisor?: string | null;
  status?: string | null;
}

export interface ParticipantDepartmentLike {
  _id?: Types.ObjectId | string;
  code: string;
  name: string;
}

export interface ParticipantJobTitleLike {
  code: string;
  name: string;
}

export interface ParticipantTargetLike {
  targetPopulation?: AppraisalTargetPopulation | null;
  includeAllDepartments?: boolean;
  departmentIds?: string[];
  departmentCodes?: string[];
  jobTitleCodes?: string[];
}

export interface ParticipantGoalLike {
  _id?: Types.ObjectId | string;
  perspective?: string | null;
  title?: string | null;
  weightage?: number | null;
  target?: string | null;
  targetUnit?: string | null;
  kpiType?: KpiType | null;
  kpiMetric?: string | null;
}

export interface AppraisalSnapshotInput {
  organizationId: string;
  cycleId: string;
  employee: ParticipantEmployeeLike;
  employeeMap: Map<string, ParticipantEmployeeLike>;
  departmentMap: Map<string, ParticipantDepartmentLike>;
  jobTitleMap: Map<string, ParticipantJobTitleLike>;
  createdBy?: string | null;
}

const PERSPECTIVE_MAP: Record<string, AppraisalPerspective> = {
  financial: AppraisalPerspective.FINANCIAL,
  internal_process: AppraisalPerspective.INTERNAL_PROCESS,
  customer: AppraisalPerspective.CUSTOMER,
  learning_and_growth: AppraisalPerspective.LEARNING_AND_GROWTH,
  core_values: AppraisalPerspective.CORE_VALUES,
};

export function getEmployeeDisplayName(
  employee: ParticipantEmployeeLike,
): string {
  return (
    `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
    employee.email ||
    'Unknown employee'
  );
}

export function isEmployeeInScope(
  employee: ParticipantEmployeeLike,
  target: ParticipantTargetLike,
): boolean {
  if (target.targetPopulation === AppraisalTargetPopulation.ALL_EMPLOYEES) {
    return true;
  }

  if (target.targetPopulation === AppraisalTargetPopulation.JOB_TITLES) {
    const jobTitleCodes = target.jobTitleCodes ?? [];
    if (jobTitleCodes.length === 0) return true;
    return Boolean(
      employee.jobTitleCode && jobTitleCodes.includes(employee.jobTitleCode),
    );
  }

  if (!target.includeAllDepartments) {
    const departmentCodes = target.departmentCodes ?? [];
    if (departmentCodes.length === 0) return true;
    return Boolean(
      employee.departmentCode && departmentCodes.includes(employee.departmentCode),
    );
  }

  return true;
}

export function buildAppraisalSnapshot(
  input: AppraisalSnapshotInput,
): Partial<Appraisal> {
  const { employee, employeeMap, departmentMap, jobTitleMap } = input;
  const employeeId = String(employee._id ?? '');
  const departmentCode = employee.departmentCode ?? null;
  const department = departmentCode
    ? departmentMap.get(departmentCode)
    : undefined;
  const jobTitle = employee.jobTitleCode
    ? jobTitleMap.get(employee.jobTitleCode)
    : undefined;

  const manager = employee.supervisor
    ? employeeMap.get(String(employee.supervisor))
    : undefined;

  return {
    organizationId: input.organizationId,
    cycleId: input.cycleId,
    employeeId,
    employeeCode: employee.employeeId ?? null,
    employeeName: getEmployeeDisplayName(employee),
    employeeEmail: employee.email ?? null,
    jobTitleCode: employee.jobTitleCode ?? null,
    jobTitleName: jobTitle?.name ?? null,
    departmentId: department ? String(department._id ?? '') : null,
    departmentCode,
    departmentName: department?.name ?? null,
    managerId: employee.supervisor ?? null,
    managerName: manager ? getEmployeeDisplayName(manager) : null,
    managerEmail: manager?.email ?? null,
    createdBy: input.createdBy ?? null,
    updatedBy: input.createdBy ?? null,
  };
}

export function buildGoalScoreSnapshot(
  organizationId: string,
  cycleId: string,
  appraisalId: string,
  goal: ParticipantGoalLike,
  createdBy?: string | null,
): Partial<AppraisalGoalScore> {
  const targetValue = parseTargetValue(goal.target);
  const perspective = goal.perspective
    ? PERSPECTIVE_MAP[goal.perspective] ?? null
    : null;

  return {
    organizationId,
    cycleId,
    appraisalId,
    goalId: String(goal._id ?? ''),
    perspective,
    title: goal.title ?? null,
    weightage: goal.weightage ?? 0,
    target: goal.target ?? null,
    targetValue,
    targetUnit: goal.targetUnit ?? null,
    kpiType: goal.kpiType ?? null,
    label: goal.kpiMetric ?? null,
    employeeActual: null,
    reviewerActual: null,
    managerActual: null,
    employeeScore: 0,
    reviewerScore: 0,
    finalScore: 0,
    createdBy: createdBy ?? null,
    updatedBy: createdBy ?? null,
  };
}
