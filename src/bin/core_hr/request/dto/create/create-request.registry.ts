import { RequestType } from '../../../../generic/setting/request-management/enum/request-management.enum';
import {
  CancelHireBeforeStartDateCreateRequestDto,
  ChangeOfAddressCreateRequestDto,
  ConfirmationRequestCreateRequestDto,
  EmployeeMobilityCreateRequestDto,
  EmployeeTerminationCreateRequestDto,
  EmploymentAgreementAmendmentCreateRequestDto,
  EmploymentAgreementExtensionCreateRequestDto,
  EmploymentAgreementRenewalCreateRequestDto,
  EmploymentLetterRequestCreateRequestDto,
  PerformanceImprovementPlanCreateRequestDto,
  ProbationConfirmationLetterCreateRequestDto,
  ProbationExtensionCreateRequestDto,
  QueryRequestCreateRequestDto,
  ReimbursementCreateRequestDto,
  RightToWorkCreateRequestDto,
  StaffDataUpdateCreateRequestDto,
} from '.';

export type CreateRequestDtoClass = new () => object;

const CREATE_REQUEST_DTO_CLASSES: Record<RequestType, CreateRequestDtoClass> = {
  [RequestType.EMPLOYEE_TERMINATION]: EmployeeTerminationCreateRequestDto,
  [RequestType.CANCEL_HIRE_BEFORE_START_DATE]:
    CancelHireBeforeStartDateCreateRequestDto,
  [RequestType.CONFIRMATION_REQUEST]: ConfirmationRequestCreateRequestDto,
  [RequestType.PROBATION_CONFIRMATION_LETTER]:
    ProbationConfirmationLetterCreateRequestDto,
  [RequestType.EMPLOYMENT_AGREEMENT_AMENDMENT]:
    EmploymentAgreementAmendmentCreateRequestDto,
  [RequestType.EMPLOYMENT_AGREEMENT_EXTENSION]:
    EmploymentAgreementExtensionCreateRequestDto,
  [RequestType.EMPLOYMENT_AGREEMENT_RENEWAL]:
    EmploymentAgreementRenewalCreateRequestDto,
  [RequestType.EMPLOYEE_MOBILITY]: EmployeeMobilityCreateRequestDto,
  [RequestType.PROBATION_EXTENSION]: ProbationExtensionCreateRequestDto,
  [RequestType.STAFF_DATA_UPDATE]: StaffDataUpdateCreateRequestDto,
  [RequestType.CHANGE_OF_ADDRESS]: ChangeOfAddressCreateRequestDto,
  [RequestType.REIMBURSEMENT]: ReimbursementCreateRequestDto,
  [RequestType.EMPLOYMENT_LETTER_REQUEST]:
    EmploymentLetterRequestCreateRequestDto,
  [RequestType.RIGHT_TO_WORK]: RightToWorkCreateRequestDto,
  [RequestType.PERFORMANCE_IMPROVEMENT_PLAN]:
    PerformanceImprovementPlanCreateRequestDto,
  [RequestType.QUERY_REQUEST]: QueryRequestCreateRequestDto,
};

export const getCreateRequestDtoClass = (
  requestType: RequestType,
): CreateRequestDtoClass => CREATE_REQUEST_DTO_CLASSES[requestType];
