import { RequestType } from '../../../setting/request-management/enum/request-management.enum';
import {
  CancelHireBeforeStartDateCreateRequestDto,
  ConfirmationRequestCreateRequestDto,
  EmployeeMobilityCreateRequestDto,
  EmployeeTerminationCreateRequestDto,
  EmploymentAgreementExtensionCreateRequestDto,
  EmploymentAgreementRenewalCreateRequestDto,
  PerformanceImprovementPlanCreateRequestDto,
  ProbationExtensionCreateRequestDto,
  QueryRequestCreateRequestDto,
  StaffDataUpdateCreateRequestDto,
} from '.';

export type CreateRequestDtoClass = new () => object;

const CREATE_REQUEST_DTO_CLASSES: Record<RequestType, CreateRequestDtoClass> = {
  [RequestType.EMPLOYEE_TERMINATION]: EmployeeTerminationCreateRequestDto,
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]:
    CancelHireBeforeStartDateCreateRequestDto,
  [RequestType.CONFIRMATION_REQUEST]: ConfirmationRequestCreateRequestDto,
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]:
    EmploymentAgreementExtensionCreateRequestDto,
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]:
    EmploymentAgreementRenewalCreateRequestDto,
  [RequestType.EMPLOYEE_MOBILITY]: EmployeeMobilityCreateRequestDto,
  [RequestType.PROBATION_EXTENSION]: ProbationExtensionCreateRequestDto,
  [RequestType.STAFF_DATA_UPDATE]: StaffDataUpdateCreateRequestDto,
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]:
    PerformanceImprovementPlanCreateRequestDto,
  [RequestType.QUERY_REQUEST]: QueryRequestCreateRequestDto,
};

export const getCreateRequestDtoClass = (
  requestType: RequestType,
): CreateRequestDtoClass => CREATE_REQUEST_DTO_CLASSES[requestType];
