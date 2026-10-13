import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { OrganizationDepartmentRepository } from '../../organization/repository/organization-department.repository';
import { JobTitleRepository } from '../../organization/repository/job-title.repository';
import {
  Billing,
  Branding,
  BusinessDetails,
  EmployeeProfileSettings,
  EmployeeWorkflowSettings,
  EmployerIssuedDocument,
  ExitChecklistItem,
  LeaveCategory,
  LeaveEntitlementSettings,
  LeaveManagementSettings,
  LeaveRestrictedPeriod,
  Location,
  NotificationPreferences,
  OffboardingSettings,
  OnboardingDocument,
  OnboardingSettings,
  OrganizationDocument,
  PaymentMethod,
  PensionFundAdministrator,
  Plan,
  RequestWorkflow,
  RequestWorkflowStep,
  WorkflowStep,
} from '../../organization/entity/organization.schema';
import { OrganizationDepartment } from '../../organization/entity/organization-department.schema';
import { JobTitle } from '../../organization/entity/job-title.schema';
import { Invoice } from '../organisation/entity/invoice.schema';
import { InvoiceRepository } from '../organisation/repository/invoice.repository';
import { OrganizationPolicy } from '../organisation/entity/organization-policy.schema';
import { OrganizationPolicyRepository } from '../organisation/repository/organization-policy.repository';
import { AddPolicyDto } from '../organisation/dto/add-policy.dto';
import { UpdatePolicyDto } from '../organisation/dto/update-policy.dto';
import { FileUploadService } from '../../../file-upload/file-upload.service';
import { FileExtensionType } from '../../../file-upload/enum/file-upload.enum';
import { EmployeeRepository } from '../../employee/repository/employee.repository';
import { EmployeeService } from '../../employee/employee.service';
import { EmployeeDocument } from '../../employee/entity/employee.schema';
import { HierarchyTreeNode } from '../../employee/interface/employee.interface';
import { UpdateGeneralInfoDto } from '../organisation/dto/update-general-info.dto';
import { UpdateBusinessDetailsDto } from '../organisation/dto/update-business-details.dto';
import { UpdateLocationsDto } from '../organisation/dto/update-locations.dto';
import { UpdateHierarchyDto } from '../organisation/dto/organization-hierarchy.dto';
import { UpdateBrandingDto } from '../organisation/dto/update-branding.dto';
import { UpdateBillingDto } from '../organisation/dto/update-billing.dto';
import { UpdateDepartmentDto } from '../organisation/dto/update-departments.dto';
import { UpdateNotificationPreferencesDto } from '../notifications/dto/update-notification-preferences.dto';
import { UpdateEmployeeProfileSettingsDto } from '../employee-profiles/dto/update-employee-profile-settings.dto';
import { AddWorkflowStepDto } from '../employee-profiles/dto/add-workflow-step.dto';
import { UpdateWorkflowStepDto } from '../employee-profiles/dto/update-workflow-step.dto';
import { AddResponsiblePartyDto } from '../employee-profiles/dto/add-responsible-party.dto';
import { AddPensionFundAdministratorDto } from '../employee-profiles/dto/add-pension-fund-administrator.dto';
import {
  DocumentFormat,
  EmploymentType,
  WorkflowType,
} from '../employee-profiles/enum/employee-profile.enum';
import { UpdateOnboardingSettingsDto } from '../onboarding/dto/update-onboarding-settings.dto';
import { AddOnboardingDocumentDto } from '../onboarding/dto/add-onboarding-document.dto';
import { UpdateOnboardingDocumentDto } from '../onboarding/dto/update-onboarding-document.dto';
import { AddEmployerIssuedDocumentDto } from '../onboarding/dto/add-employer-issued-document.dto';
import { UpdateEmployerIssuedDocumentDto } from '../onboarding/dto/update-employer-issued-document.dto';
import { OnboardingDocumentCategory } from '../onboarding/enum/onboarding.enum';
import { AddRequestWorkflowDto } from '../request-management/dto/add-request-workflow.dto';
import { UpdateRequestWorkflowDto } from '../request-management/dto/update-request-workflow.dto';
import { RequestWorkflowStepDto } from '../request-management/dto/request-workflow-step.dto';
import {
  REQUEST_TYPE_LABELS,
  REQUEST_TYPES,
  RequestType,
} from '../request-management/enum/request-management.enum';
import { UpdateLeaveManagementDto } from '../leave-management/dto/update-leave-management.dto';
import { AddLeaveCategoryDto } from '../leave-management/dto/add-leave-category.dto';
import { UpdateLeaveEntitlementDto } from '../leave-management/dto/update-leave-entitlement.dto';
import { AddLeaveRestrictedPeriodDto } from '../leave-management/dto/add-leave-restricted-period.dto';
import { UpdateLeaveRestrictedPeriodDto } from '../leave-management/dto/update-leave-restricted-period.dto';
import { LEAVE_ALLOCATION_METHOD_LABELS } from '../leave-management/enum/leave-management.enum';
import { AddOffboardingTypeDto } from '../offboarding/dto/add-offboarding-type.dto';
import { AddExitReasonDto } from '../offboarding/dto/add-exit-reason.dto';
import { AddExitChecklistItemDto } from '../offboarding/dto/add-exit-checklist-item.dto';
import { UpdateExitChecklistItemDto } from '../offboarding/dto/update-exit-checklist-item.dto';
import { AddJobTitleDto } from '../organisation/dto/add-job-title.dto';
import { UpdateJobTitleDto } from '../organisation/dto/update-job-title.dto';
import {
  AddDepartmentDto,
  AddDepartmentsDto,
  AddSingleDepartmentDto,
} from '../organisation/dto/add-department.dto';
import { AppResponse } from '../../../common/response/app-response';
import { AuthUtility } from '../../auth/auth.utility';

export type DepartmentView = OrganizationDepartment & {
  headOfDepartmentName: string | null;
  parentDepartmentName: string | null;
};

const DEFAULT_PLAN: Plan = {
  name: 'Basic plan',
  interval: 'monthly',
  description: 'Our most popular plan for small teams.',
  priceAmount: 10,
  priceCurrency: 'USD',
  seatsUsed: 0,
  seatsLimit: 20,
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newsAndUpdates: true,
  remindersAndEvents: true,
  promotionsAndOffers: false,
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  leaveAndAttendance: true,
  deadlineNotification: true,
};

export const DEFAULT_EMPLOYEE_PROFILE_SETTINGS: EmployeeProfileSettings = {
  useEmployeeIdGenerator: true,
  documentFormats: [
    DocumentFormat.PDF,
    DocumentFormat.DOCX,
    DocumentFormat.XLSX,
    DocumentFormat.CSV,
    DocumentFormat.ODS,
    DocumentFormat.PPTX,
    DocumentFormat.ODP,
    DocumentFormat.JPG,
    DocumentFormat.PNG,
    DocumentFormat.TIFF,
    DocumentFormat.GIF,
    DocumentFormat.MP3,
    DocumentFormat.WAV,
    DocumentFormat.MP4,
  ],
  employmentTypes: [
    EmploymentType.FULL_TIME,
    EmploymentType.PART_TIME,
    EmploymentType.INTERN,
    EmploymentType.CONTRACT,
  ],
};

export const DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS: EmployeeWorkflowSettings = {
  onboarding: [],
  leave: [],
  offboarding: [],
};

export const DEFAULT_ONBOARDING_SETTINGS: OnboardingSettings = {
  welcomeMessageEnabled: false,
  welcomeMessage: null,
  defaultDurationEnabled: false,
  defaultDuration: null,
  personalIdentificationDocuments: [],
  educationalProfessionalCerts: [],
  medicalHealthRecords: [],
  employerIssuedDocuments: [],
};

export const DEFAULT_LEAVE_MANAGEMENT_SETTINGS: LeaveManagementSettings = {
  leaveCategories: [],
  allowCarryover: false,
  autoApprovalEnabled: false,
  approvalDeadline: null,
  holidaysCountAsLeave: false,
};

export const DEFAULT_LEAVE_ENTITLEMENT_SETTINGS: LeaveEntitlementSettings = {
  allocationMethod: null,
  employmentTypes: [],
  restrictedPeriods: [],
};

export const DEFAULT_OFFBOARDING_SETTINGS: OffboardingSettings = {
  offboardingTypes: [],
  exitReasons: [],
  exitChecklist: [],
};

@Injectable()
export class SettingsDomainOrganisationService {
  private readonly logger = new Logger(SettingsDomainOrganisationService.name);

  constructor(
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(OrganizationDepartmentRepository)
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    @Inject(JobTitleRepository)
    private readonly jobTitleRepository: JobTitleRepository,
    @Inject(EmployeeService)
    private readonly employeeService: EmployeeService,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(InvoiceRepository)
    private readonly invoiceRepository: InvoiceRepository,
    @Inject(OrganizationPolicyRepository)
    private readonly organizationPolicyRepository: OrganizationPolicyRepository,
    @Inject(FileUploadService)
    private readonly fileUploadService: FileUploadService,
    @Inject(AuthUtility)
    private readonly authUtility: AuthUtility,
  ) {}

  /**
   * @Responsibility: Retrieve an organization's general information settings
   *
   * @param organizationId - The organization to retrieve settings for
   * @returns {Promise<OrganizationDocument>}
   *
   * @throws {404} Organization not found
   */
  async getGeneralInfo(organizationId: string): Promise<OrganizationDocument> {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return organization!;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getGeneralInfo.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's general information settings
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial general information payload
   * @returns {Promise<OrganizationDocument>}
   *
   * @throws {404} Organization not found
   */
  async updateGeneralInfo(
    organizationId: string,
    dto: UpdateGeneralInfoDto,
  ): Promise<OrganizationDocument> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const updateData: Partial<OrganizationDocument> = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.registrationNumber !== undefined)
        updateData.registrationNumber = dto.registrationNumber;
      if (dto.website !== undefined) updateData.website = dto.website;
      if (dto.primaryContactEmail !== undefined)
        updateData.primaryContactEmail = dto.primaryContactEmail;
      if (dto.phoneNumber !== undefined)
        updateData.phoneNumber = dto.phoneNumber;
      if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
      if (dto.language !== undefined) updateData.language = dto.language;
      if (dto.fiscalYearStartDate !== undefined)
        updateData.fiscalYearStartDate = dto.fiscalYearStartDate;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        updateData,
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization general information',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Updated general info for org ${organizationId}`);
      return updated! as unknown as OrganizationDocument;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateGeneralInfo.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's business details settings
   *
   * @param organizationId - The organization to retrieve settings for
   * @returns {Promise<BusinessDetails | null>}
   *
   * @throws {404} Organization not found
   */
  async getBusinessDetails(
    organizationId: string,
  ): Promise<BusinessDetails | null> {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return organization!.businessDetails ?? null;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getBusinessDetails.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's business details settings.
   * Nested tax details are merged with any existing values so partial updates are safe.
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial business details payload
   * @returns {Promise<BusinessDetails | null>}
   *
   * @throws {404} Organization not found
   */
  async updateBusinessDetails(
    organizationId: string,
    dto: UpdateBusinessDetailsDto,
  ): Promise<BusinessDetails | null> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current: BusinessDetails = found!.businessDetails ?? {
        businessType: null,
        industry: null,
        incorporationDate: null,
        currency: null,
        companySize: null,
        tin: null,
      };

      const merged: BusinessDetails = { ...current };

      if (dto.businessType !== undefined)
        merged.businessType = dto.businessType;
      if (dto.industry !== undefined) merged.industry = dto.industry;
      if (dto.companySize !== undefined) merged.companySize = dto.companySize;
      if (dto.currency !== undefined) merged.currency = dto.currency;
      if (dto.tin !== undefined) merged.tin = dto.tin;

      // if (dto.tax) {
      //   merged.tax = {
      //     taxIdentificationNumber:
      //       dto.tax.taxIdentificationNumber !== undefined
      //         ? dto.tax.taxIdentificationNumber
      //         : (current.tax?.taxIdentificationNumber ?? null),
      //     vatNumber:
      //       dto.tax.vatNumber !== undefined
      //         ? dto.tax.vatNumber
      //         : (current.tax?.vatNumber ?? null),
      //   };
      // }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { businessDetails: merged },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization business details',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Updated business details for org ${organizationId}`);
      return updated!.businessDetails ?? null;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateBusinessDetails.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's locations settings.
   * When a search term is provided, locations are filtered case-insensitively
   * against name, address, phone number and email.
   *
   * @param organizationId - The organization to scope the query to
   * @param search - Optional location search term
   * @returns {Promise<Location[]>}
   *
   * @throws {404} Organization not found
   */
  async getLocations(
    organizationId: string,
    search?: string,
  ): Promise<Location[]> {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      const locations = organization!.locations ?? [];

      const term = search?.trim().toLowerCase();
      if (!term) {
        return locations;
      }

      return locations.filter((location) =>
        [
          location.name,
          location.address,
          location.phoneNumber,
          location.email,
        ].some((value) => value !== null && value.toLowerCase().includes(term)),
      );
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getLocations.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Replace an organization's locations settings.
   * The submitted list represents the full desired state and is saved as-is.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The full locations list payload
   * @returns {Promise<Location[]>}
   *
   * @throws {404} Organization not found
   */
  async updateLocations(
    organizationId: string,
    dto: UpdateLocationsDto,
  ): Promise<Location[]> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const locationsPayload = (dto.locations ?? []).map((loc) => ({
        name: loc.name,
        address: loc.address,
        phoneNumber: loc.phoneNumber ?? null,
        email: loc.email ?? null,
      }));

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { locations: locationsPayload },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization locations',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Updated locations for org ${organizationId}`);
      return updated!.locations ?? [];
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateLocations.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's hierarchy as a nested tree.
   * Employees reference their manager through the supervisor field, so the
   * roots are the employees at the top of the reporting structure and children
   * are the employees reporting to each node.
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<HierarchyTreeNode[]>}
   */
  async getOrganisationHierarchy(
    organizationId: string,
  ): Promise<HierarchyTreeNode[]> {
    try {
      return await this.employeeService.getOrganisationHierarchy(
        organizationId,
      );
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getOrganisationHierarchy.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Reassign an employee's supervisor to update the
   * organization's reporting structure. The employee whose supervisor field
   * is null is the root of the hierarchy (e.g. the CEO).
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The employee and their new supervisor
   * @returns {Promise<EmployeeDocument>}
   *
   * @throws {400} Self-assignment or circular reporting line
   * @throws {404} Employee or supervisor not found
   */
  async updateOrganisationHierarchy(
    organizationId: string,
    dto: UpdateHierarchyDto,
  ): Promise<EmployeeDocument> {
    try {
      return await this.employeeService.updateSupervisor(
        dto.employeeId,
        dto.supervisorId ?? null,
        organizationId,
      );
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateOrganisationHierarchy.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's policy documents, optionally
   * filtered by a name search term. Documents are returned most recently
   * uploaded first. When a policy document is uploaded through the generic
   * file upload flow, this list exposes the stored metadata for the UI.
   *
   * @param organizationId - The organization to scope the query to
   * @param search - Optional document name search term
   * @returns {Promise<OrganizationPolicy[]>}
   *
   * @throws {404} Organization not found
   */
  async getPolicyManagement(
    organizationId: string,
    search?: string,
  ): Promise<OrganizationPolicy[]> {
    try {
      if (
        !(await this.organizationRepository.findOrg({ _id: organizationId }))
      ) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      return (await this.organizationPolicyRepository.findByOrganization(
        organizationId,
        search ?? '',
      )) as unknown as OrganizationPolicy[];
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getPolicyManagement.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Register a policy document whose file has already been
   * uploaded through the generic file upload flow. Only the document name and
   * file URL are provided; the document code and Cloudinary public id (used for
   * later deletion) are generated server-side, and the uploader is captured
   * from the authenticated user.
   *
   * @param organizationId - The organization to scope the creation to
   * @param dto - The document name and uploaded file URL
   * @param actor - The authenticated user that performed the upload
   * @returns {Promise<OrganizationPolicy>}
   *
   * @throws {400} Empty document name
   * @throws {404} Organization not found
   */
  async addPolicy(
    organizationId: string,
    dto: AddPolicyDto,
    actor?: { userId?: string; email?: string },
  ): Promise<OrganizationPolicy> {
    try {
      if (
        !(await this.organizationRepository.findOrg({ _id: organizationId }))
      ) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const name = dto.name.trim();
      if (name.length === 0) {
        AppResponse.error({
          message: 'Document name must not be empty.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const created = await this.organizationPolicyRepository.create({
        organizationId,
        code: this.authUtility.generateRandomString(),
        name,
        url: dto.url,
        publicId: this.fileUploadService.derivePublicId(dto.url),
        uploadedByUserId: actor?.userId ?? null,
        uploadedByEmail: actor?.email ?? null,
      } as OrganizationPolicy);

      this.logger.log(
        `Added policy document "${name}" for org ${organizationId}`,
      );
      return created as unknown as OrganizationPolicy;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addPolicy.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Rename a policy document matched by its unique code.
   * The stored file itself is immutable and must be deleted and re-uploaded to
   * change it.
   *
   * @param organizationId - The organization to scope the update to
   * @param code - The unique policy document code to match
   * @param dto - The new document name
   * @returns {Promise<OrganizationPolicy>}
   *
   * @throws {400} Empty document name
   * @throws {404} Organization or policy document not found
   */
  async updatePolicy(
    organizationId: string,
    code: string,
    dto: UpdatePolicyDto,
  ): Promise<OrganizationPolicy> {
    try {
      if (
        !(await this.organizationRepository.findOrg({ _id: organizationId }))
      ) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const policy = await this.organizationPolicyRepository.findByCode(
        organizationId,
        code,
      );
      if (!policy) {
        AppResponse.error({
          message: 'Policy document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const update: Partial<OrganizationPolicy> = {};
      if (dto.name !== undefined) {
        const name = dto.name.trim();
        if (name.length === 0) {
          AppResponse.error({
            message: 'Document name must not be empty.',
            status: HttpStatus.BAD_REQUEST,
          });
        }
        update.name = name;
      }

      const updated = await this.organizationPolicyRepository.updateByCode(
        organizationId,
        code,
        update,
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update policy document',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated policy document ${code} for org ${organizationId}`,
      );
      return updated! as unknown as OrganizationPolicy;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updatePolicy.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Delete a policy document matched by its unique code and
   * remove its asset from storage. Storage deletion is best-effort so a
   * storage failure never blocks removing the organization's record.
   *
   * @param organizationId - The organization to scope the deletion to
   * @param code - The unique policy document code to match
   * @returns {Promise<string>}
   *
   * @throws {404} Organization or policy document not found
   */
  async deletePolicy(organizationId: string, code: string): Promise<string> {
    try {
      const policy = await this.organizationPolicyRepository.findByCode(
        organizationId,
        code,
      );
      if (!policy) {
        AppResponse.error({
          message: 'Policy document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      await this.organizationPolicyRepository.deleteWhere({
        organizationId,
        code,
      });

      await this.fileUploadService.deleteAsset(
        policy!.publicId,
        FileExtensionType.DOCUMENTS,
      );

      this.logger.log(
        `Deleted policy document ${code} for org ${organizationId}`,
      );
      return 'Policy document deleted';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.deletePolicy.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's branding settings
   *
   * @param organizationId - The organization to retrieve settings for
   * @returns {Promise<Branding | null>}
   *
   * @throws {404} Organization not found
   */
  async getBranding(organizationId: string): Promise<Branding | null> {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return organization!.branding ?? null;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getBranding.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's branding settings.
   * Scalar fields (logo, brand colors) are merged with existing values, so
   * partial updates are safe and an explicit null logoUrl clears the logo.
   * Array fields (custom domains, login page images) represent the full
   * desired state and are replaced as-is.
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial branding payload
   * @returns {Promise<Branding | null>}
   *
   * @throws {404} Organization not found
   */
  async updateBranding(
    organizationId: string,
    dto: UpdateBrandingDto,
  ): Promise<any> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current: Branding = found!.branding ?? {
        logoUrl: null,
        navigationBackgroundColor: null,
        buttonColor: null,
        customDomains: [],
        loginPageImages: [],
      };

      const merged: Branding = { ...current };

      if (dto.logoUrl !== undefined) merged.logoUrl = dto.logoUrl;
      if (dto.navigationBackgroundColor !== undefined)
        merged.navigationBackgroundColor = dto.navigationBackgroundColor;
      if (dto.buttonColor !== undefined) merged.buttonColor = dto.buttonColor;
      if (dto.customDomains !== undefined)
        merged.customDomains = dto.customDomains;
      if (dto.loginPageImages !== undefined)
        merged.loginPageImages = dto.loginPageImages;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { branding: merged },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization branding',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Updated branding for org ${organizationId}`);
      return updated!.branding ?? merged;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateBranding.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's notification preferences.
   * When the organization has never saved its preferences, the design defaults
   * are returned so the UI always receives a complete set of flags.
   *
   * @param organizationId - The organization to retrieve settings for
   * @returns {Promise<NotificationPreferences>}
   *
   * @throws {404} Organization not found
   */
  async getNotifications(
    organizationId: string,
  ): Promise<NotificationPreferences> {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return (
        organization!.notifications ?? { ...DEFAULT_NOTIFICATION_PREFERENCES }
      );
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getNotifications.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's notification preferences. Only
   * the provided flags are changed; the remaining flags keep their current
   * value (or the design default when none have been saved yet).
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial notification preferences payload
   * @returns {Promise<NotificationPreferences>}
   *
   * @throws {404} Organization not found
   */
  async updateNotifications(
    organizationId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current: NotificationPreferences = found!.notifications ?? {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      };

      const merged: NotificationPreferences = { ...current };

      if (dto.newsAndUpdates !== undefined)
        merged.newsAndUpdates = dto.newsAndUpdates;
      if (dto.remindersAndEvents !== undefined)
        merged.remindersAndEvents = dto.remindersAndEvents;
      if (dto.promotionsAndOffers !== undefined)
        merged.promotionsAndOffers = dto.promotionsAndOffers;
      if (dto.emailNotifications !== undefined)
        merged.emailNotifications = dto.emailNotifications;
      if (dto.pushNotifications !== undefined)
        merged.pushNotifications = dto.pushNotifications;
      if (dto.smsNotifications !== undefined)
        merged.smsNotifications = dto.smsNotifications;
      if (dto.leaveAndAttendance !== undefined)
        merged.leaveAndAttendance = dto.leaveAndAttendance;
      if (dto.deadlineNotification !== undefined)
        merged.deadlineNotification = dto.deadlineNotification;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { notifications: merged },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization notification preferences',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated notification preferences for org ${organizationId}`,
      );
      return updated!.notifications ?? merged;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateNotifications.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's employee profile settings.
   * When the organization has never saved its settings, the design defaults are
   * returned so the UI always receives a complete configuration.
   *
   * @param organizationId - The organization to retrieve settings for
   * @returns {Promise<EmployeeProfileSettings>}
   *
   * @throws {404} Organization not found
   */
  async getEmployeeProfileSettings(
    organizationId: string,
  ): Promise<EmployeeProfileSettings> {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return (
        organization!.employeeProfiles ?? {
          ...DEFAULT_EMPLOYEE_PROFILE_SETTINGS,
        }
      );
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getEmployeeProfileSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's employee profile settings. Only
   * the provided fields are changed; the remaining fields keep their current
   * value (or the design default when none have been saved yet). Array fields
   * represent the full desired state and are replaced as-is.
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial employee profile settings payload
   * @returns {Promise<EmployeeProfileSettings>}
   *
   * @throws {404} Organization not found
   */
  async updateEmployeeProfileSettings(
    organizationId: string,
    dto: UpdateEmployeeProfileSettingsDto,
  ): Promise<EmployeeProfileSettings> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current: EmployeeProfileSettings = found!.employeeProfiles ?? {
        ...DEFAULT_EMPLOYEE_PROFILE_SETTINGS,
      };

      const merged: EmployeeProfileSettings = { ...current };

      if (dto.useEmployeeIdGenerator !== undefined)
        merged.useEmployeeIdGenerator = dto.useEmployeeIdGenerator;
      if (dto.documentFormats !== undefined)
        merged.documentFormats = dto.documentFormats;
      if (dto.employmentTypes !== undefined)
        merged.employmentTypes = dto.employmentTypes;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { employeeProfiles: merged },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization employee profile settings',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated employee profile settings for org ${organizationId}`,
      );
      return updated!.employeeProfiles ?? merged;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateEmployeeProfileSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Convert a persisted workflow step into its API
   * representation, exposing the sub-document `_id` as `id` so clients can
   * edit or delete individual steps.
   *
   * @param step - The persisted workflow step
   */
  private toWorkflowStepView(step: WorkflowStep) {
    return {
      id: String(step._id),
      stepName: step.stepName,
      responsibleParty: step.responsibleParty ?? null,
      taskType: step.taskType ?? null,
      dueDate: step.dueDate ?? null,
      instructions: step.instructions ?? null,
      attachmentUrls: step.attachmentUrls ?? [],
      completionRequirements: step.completionRequirements ?? [],
    };
  }

  /**
   * @Responsibility: Normalise a stored workflow step into a mutable plain
   * object so it can be safely modified without touching Mongoose internals or
   * the shared default constant.
   *
   * @param step - The persisted workflow step
   */
  private toWorkflowStepPlain(step: WorkflowStep): WorkflowStep {
    return {
      _id: step._id,
      stepName: step.stepName,
      responsibleParty: step.responsibleParty ?? null,
      taskType: step.taskType ?? null,
      dueDate: step.dueDate ?? null,
      instructions: step.instructions ?? null,
      attachmentUrls: [...(step.attachmentUrls ?? [])],
      completionRequirements: [...(step.completionRequirements ?? [])],
    };
  }

  /**
   * @Responsibility: Deep-clone workflow settings into mutable plain objects so
   * the shared default constant is never mutated by add/update/delete.
   */
  private cloneWorkflowSettings(
    settings: EmployeeWorkflowSettings,
  ): EmployeeWorkflowSettings {
    return {
      onboarding: (settings.onboarding ?? []).map((step) =>
        this.toWorkflowStepPlain(step),
      ),
      leave: (settings.leave ?? []).map((step) =>
        this.toWorkflowStepPlain(step),
      ),
      offboarding: (settings.offboarding ?? []).map((step) =>
        this.toWorkflowStepPlain(step),
      ),
    };
  }

  /**
   * @Responsibility: Retrieve an organization's employee workflow settings.
   * When the organization has never saved its workflows, the design defaults
   * are returned so the UI always receives a complete configuration.
   *
   * @param organizationId - The organization to retrieve settings for
   *
   * @throws {404} Organization not found
   */
  async getEmployeeWorkflow(organizationId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      const settings =
        organization!.employeeWorkflow ?? DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS;

      return {
        onboarding: (settings.onboarding ?? []).map((step) =>
          this.toWorkflowStepView(step),
        ),
        leave: (settings.leave ?? []).map((step) =>
          this.toWorkflowStepView(step),
        ),
        offboarding: (settings.offboarding ?? []).map((step) =>
          this.toWorkflowStepView(step),
        ),
      };
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getEmployeeWorkflow.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Append a new step to one of an organization's employee
   * workflows.
   *
   * @param organizationId - The organization to update
   * @param dto - The new workflow step payload (including its target type)
   * @returns The created step
   *
   * @throws {404} Organization not found
   */
  async addWorkflowStep(organizationId: string, dto: AddWorkflowStepDto) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneWorkflowSettings(
        found!.employeeWorkflow ?? DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS,
      );

      const step: WorkflowStep = {
        _id: new Types.ObjectId(),
        stepName: dto.stepName,
        responsibleParty: dto.responsibleParty ?? null,
        taskType: dto.taskType ?? null,
        dueDate: dto.dueDate ?? null,
        instructions: dto.instructions ?? null,
        attachmentUrls: dto.attachmentUrls ?? [],
        completionRequirements: dto.completionRequirements ?? [],
      };

      current[dto.type].push(step);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { employeeWorkflow: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization employee workflow step',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Added employee workflow step for org ${organizationId}`);
      return this.toWorkflowStepView(step);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addWorkflowStep.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update a single step within any of an organization's
   * employee workflows. Only the provided fields are changed.
   *
   * @param organizationId - The organization to update
   * @param stepId - The id of the step to update
   * @param dto - The partial workflow step payload
   * @returns The updated step
   *
   * @throws {404} Organization or step not found
   */
  async updateWorkflowStep(
    organizationId: string,
    stepId: string,
    dto: UpdateWorkflowStepDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneWorkflowSettings(
        found!.employeeWorkflow ?? DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS,
      );

      const target = this.findWorkflowStep(current, stepId);
      if (!target) {
        AppResponse.error({
          message: 'Workflow step not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (dto.stepName !== undefined) target!.stepName = dto.stepName;
      if (dto.responsibleParty !== undefined)
        target!.responsibleParty = dto.responsibleParty;
      if (dto.taskType !== undefined) target!.taskType = dto.taskType;
      if (dto.dueDate !== undefined) target!.dueDate = dto.dueDate;
      if (dto.instructions !== undefined)
        target!.instructions = dto.instructions;
      if (dto.attachmentUrls !== undefined)
        target!.attachmentUrls = dto.attachmentUrls;
      if (dto.completionRequirements !== undefined)
        target!.completionRequirements = dto.completionRequirements;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { employeeWorkflow: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization employee workflow step',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return 'Updated employee workflow step';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateWorkflowStep.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove a single step from any of an organization's
   * employee workflows.
   *
   * @param organizationId - The organization to update
   * @param stepId - The id of the step to delete
   *
   * @throws {404} Organization or step not found
   */
  async deleteWorkflowStep(organizationId: string, stepId: string) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneWorkflowSettings(
        found!.employeeWorkflow ?? DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS,
      );

      const types: WorkflowType[] = [
        WorkflowType.ONBOARDING,
        WorkflowType.LEAVE,
        WorkflowType.OFFBOARDING,
      ];

      let removed = false;
      for (const type of types) {
        const index = current[type].findIndex(
          (step) => String(step._id) === stepId,
        );
        if (index !== -1) {
          current[type].splice(index, 1);
          removed = true;
          break;
        }
      }

      if (!removed) {
        AppResponse.error({
          message: 'Workflow step not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { employeeWorkflow: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to delete organization employee workflow step',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return 'Deleted employee workflow step';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.deleteWorkflowStep.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Locate a workflow step by id across all workflow types.
   */
  private findWorkflowStep(
    settings: EmployeeWorkflowSettings,
    stepId: string,
  ): WorkflowStep | undefined {
    const types: WorkflowType[] = [
      WorkflowType.ONBOARDING,
      WorkflowType.LEAVE,
      WorkflowType.OFFBOARDING,
    ];
    for (const type of types) {
      const step = (settings[type] ?? []).find(
        (candidate) => String(candidate._id) === stepId,
      );
      if (step) return step;
    }
    return undefined;
  }

  /**
   * @Responsibility: Retrieve the responsible party options available for
   * workflow steps. Custom parties added by the organization are returned
   * alongside the built-in defaults.
   *
   * @param organizationId - The organization to retrieve options for
   *
   * @throws {404} Organization not found
   */
  async getResponsibleParties(organizationId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return {
        customParties: organization!.customResponsibleParties ?? [],
      };
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getResponsibleParties.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add a custom responsible party to the organization-wide
   * list of available workflow responsible parties.
   *
   * @param organizationId - The organization to update
   * @param dto - The new party payload
   *
   * @throws {404} Organization not found
   * @throws {409} Party already exists
   */
  async addResponsibleParty(
    organizationId: string,
    dto: AddResponsiblePartyDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const name = dto.name.trim();
      if (!name) {
        AppResponse.error({
          message: 'Party name is required',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const customParties = [...(found!.customResponsibleParties ?? []), name];

      await this.organizationRepository.updateById(organizationId, {
        customResponsibleParties: customParties,
      });

      return 'Added responsible party';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addResponsibleParty.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Convert a persisted pension fund administrator into its
   * API representation, exposing the sub-document `_id` as `id`.
   *
   * @param administrator - The persisted pension fund administrator
   */
  private toPensionFundAdministratorView(
    administrator: PensionFundAdministrator,
  ) {
    return {
      id: String(administrator._id),
      name: administrator.name,
    };
  }

  /**
   * @Responsibility: Retrieve the pension fund administrators configured for
   * an organization. The list starts empty until administrators are added.
   *
   * @param organizationId - The organization to retrieve administrators for
   *
   * @throws {404} Organization not found
   */
  async getPensionFundAdministrators(organizationId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return {
        administrators: (organization!.pensionFundAdministrators ?? []).map(
          (administrator) => this.toPensionFundAdministratorView(administrator),
        ),
      };
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getPensionFundAdministrators.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add a pension fund administrator to an organization's
   * list of administrators.
   *
   * @param organizationId - The organization to update
   * @param dto - The new administrator payload
   * @returns The created administrator
   *
   * @throws {404} Organization not found
   */
  async addPensionFundAdministrator(
    organizationId: string,
    dto: AddPensionFundAdministratorDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const administrator: PensionFundAdministrator = {
        _id: new Types.ObjectId(),
        name: dto.name.trim(),
      };

      const administrators = [
        ...(found!.pensionFundAdministrators ?? []),
        administrator,
      ];

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { pensionFundAdministrators: administrators },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization pension fund administrator',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Added pension fund administrator for org ${organizationId}`,
      );
      return this.toPensionFundAdministratorView(administrator);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addPensionFundAdministrator.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Convert an onboarding document into its API representation.
   *
   * @param document - The stored onboarding document
   */
  private toOnboardingDocumentView(document: OnboardingDocument) {
    return {
      id: document.id,
      label: document.label,
      selected: document.selected ?? true,
      optional: document.optional ?? false,
    };
  }

  /**
   * @Responsibility: Normalise a stored onboarding document into a mutable
   * plain object so it can be safely modified without touching Mongoose
   * internals or a shared default.
   */
  private toOnboardingDocumentPlain(
    document: OnboardingDocument,
  ): OnboardingDocument {
    return {
      id: document.id,
      label: document.label,
      selected: document.selected ?? true,
      optional: document.optional ?? false,
    };
  }

  /**
   * @Responsibility: Normalise a stored employer-issued document into a
   * mutable plain object.
   */
  private toEmployerIssuedDocumentPlain(
    document: EmployerIssuedDocument,
  ): EmployerIssuedDocument {
    return {
      id: document.id,
      name: document.name,
      fileType: document.fileType ?? null,
      requiresSignature: document.requiresSignature ?? false,
    };
  }

  /**
   * @Responsibility: Deep-clone onboarding settings into mutable plain objects
   * so the shared default constant is never mutated.
   */
  private cloneOnboardingSettings(
    settings: OnboardingSettings,
  ): OnboardingSettings {
    return {
      welcomeMessageEnabled: settings.welcomeMessageEnabled ?? false,
      welcomeMessage: settings.welcomeMessage ?? null,
      defaultDurationEnabled: settings.defaultDurationEnabled ?? false,
      defaultDuration: settings.defaultDuration ?? null,
      personalIdentificationDocuments: (
        settings.personalIdentificationDocuments ?? []
      ).map((document) => this.toOnboardingDocumentPlain(document)),
      educationalProfessionalCerts: (
        settings.educationalProfessionalCerts ?? []
      ).map((document) => this.toOnboardingDocumentPlain(document)),
      medicalHealthRecords: (settings.medicalHealthRecords ?? []).map(
        (document) => this.toOnboardingDocumentPlain(document),
      ),
      employerIssuedDocuments: (settings.employerIssuedDocuments ?? []).map(
        (document) => this.toEmployerIssuedDocumentPlain(document),
      ),
    };
  }

  /**
   * @Responsibility: Present onboarding settings in the shape consumed by the
   * client, exposing welcome message and default duration as grouped toggles
   * and each documentation category as a flat list of documents.
   */
  private toOnboardingSettingsView(settings: OnboardingSettings) {
    return {
      welcomeMessage: {
        enabled: settings.welcomeMessageEnabled ?? false,
        message: settings.welcomeMessage ?? null,
      },
      defaultOnboardingDuration: {
        enabled: settings.defaultDurationEnabled ?? false,
        value: settings.defaultDuration ?? null,
      },
      personalIdentificationDocuments: (
        settings.personalIdentificationDocuments ?? []
      ).map((document) => this.toOnboardingDocumentView(document)),
      educationalProfessionalCerts: (
        settings.educationalProfessionalCerts ?? []
      ).map((document) => this.toOnboardingDocumentView(document)),
      medicalHealthRecords: (settings.medicalHealthRecords ?? []).map(
        (document) => this.toOnboardingDocumentView(document),
      ),
      employerIssuedDocuments: (settings.employerIssuedDocuments ?? []).map(
        (document) => ({
          id: document.id,
          name: document.name,
          fileType: document.fileType ?? null,
          requiresSignature: document.requiresSignature ?? false,
        }),
      ),
    };
  }

  /**
   * @Responsibility: Generate a URL/id-safe slug from a free-text value.
   */
  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return slug || 'document';
  }

  /**
   * @Responsibility: Produce a document id that is unique across all three
   * documentation categories.
   */
  private uniqueOnboardingDocumentId(
    settings: OnboardingSettings,
    label: string,
  ): string {
    const existing = new Set<string>([
      ...settings.personalIdentificationDocuments.map((d) => d.id),
      ...settings.educationalProfessionalCerts.map((d) => d.id),
      ...settings.medicalHealthRecords.map((d) => d.id),
    ]);
    const base = this.slugify(label);
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base}_${counter}`)) counter += 1;
    return `${base}_${counter}`;
  }

  /**
   * @Responsibility: Locate an onboarding document by id across every
   * documentation category.
   */
  private findOnboardingDocument(
    settings: OnboardingSettings,
    documentId: string,
  ): OnboardingDocument | undefined {
    const categories: OnboardingDocumentCategory[] = [
      OnboardingDocumentCategory.PERSONAL_IDENTIFICATION_DOCUMENTS,
      OnboardingDocumentCategory.EDUCATIONAL_PROFESSIONAL_CERTS,
      OnboardingDocumentCategory.MEDICAL_HEALTH_RECORDS,
    ];
    for (const category of categories) {
      const document = settings[category].find(
        (candidate) => candidate.id === documentId,
      );
      if (document) return document;
    }
    return undefined;
  }

  /**
   * @Responsibility: Retrieve an organization's onboarding settings. The three
   * documentation categories and the employer-issued documents start empty and
   * grow as the organization adds documents.
   *
   * @param organizationId - The organization to retrieve settings for
   *
   * @throws {404} Organization not found
   */
  async getOnboardingSettings(organizationId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      const settings = organization!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS;

      return this.toOnboardingSettingsView(settings);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getOnboardingSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's onboarding settings. Only the
   * provided fields are changed; the remaining fields keep their current value.
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial onboarding settings payload
   *
   * @throws {404} Organization not found
   */
  async updateOnboardingSettings(
    organizationId: string,
    dto: UpdateOnboardingSettingsDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOnboardingSettings(
        found!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS,
      );

      if (dto.welcomeMessageEnabled !== undefined)
        current.welcomeMessageEnabled = dto.welcomeMessageEnabled;
      if (dto.welcomeMessage !== undefined)
        current.welcomeMessage = dto.welcomeMessage;
      if (dto.defaultDurationEnabled !== undefined)
        current.defaultDurationEnabled = dto.defaultDurationEnabled;
      if (dto.defaultDuration !== undefined)
        current.defaultDuration = dto.defaultDuration;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { onboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization onboarding settings',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Updated onboarding settings for org ${organizationId}`);
      return this.toOnboardingSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateOnboardingSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Append a new required document to one of an
   * organization's onboarding documentation categories.
   *
   * @param organizationId - The organization to update
   * @param dto - The new document payload (category + label)
   * @returns The created document
   *
   * @throws {404} Organization not found
   */
  async addOnboardingDocument(
    organizationId: string,
    dto: AddOnboardingDocumentDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOnboardingSettings(
        found!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS,
      );

      const document: OnboardingDocument = {
        id: this.uniqueOnboardingDocumentId(current, dto.label),
        label: dto.label.trim(),
        selected: true,
        optional: false,
      };

      current[dto.category].push(document);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { onboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization onboarding document',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Added onboarding document for org ${organizationId}`);
      return this.toOnboardingDocumentView(document);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addOnboardingDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update a single onboarding document. Only the provided
   * fields are changed.
   *
   * @param organizationId - The organization to update
   * @param documentId - The id of the document to update
   * @param dto - The partial document payload
   *
   * @throws {404} Organization or document not found
   */
  async updateOnboardingDocument(
    organizationId: string,
    documentId: string,
    dto: UpdateOnboardingDocumentDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOnboardingSettings(
        found!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS,
      );

      const target = this.findOnboardingDocument(current, documentId);
      if (!target) {
        AppResponse.error({
          message: 'Onboarding document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (dto.label !== undefined) target!.label = dto.label;
      if (dto.selected !== undefined) target!.selected = dto.selected;
      if (dto.optional !== undefined) target!.optional = dto.optional;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { onboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization onboarding document',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return this.toOnboardingDocumentView(target!);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateOnboardingDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove a single onboarding document from whichever
   * documentation category contains it.
   *
   * @param organizationId - The organization to update
   * @param documentId - The id of the document to delete
   *
   * @throws {404} Organization or document not found
   */
  async deleteOnboardingDocument(organizationId: string, documentId: string) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOnboardingSettings(
        found!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS,
      );

      const categories: OnboardingDocumentCategory[] = [
        OnboardingDocumentCategory.PERSONAL_IDENTIFICATION_DOCUMENTS,
        OnboardingDocumentCategory.EDUCATIONAL_PROFESSIONAL_CERTS,
        OnboardingDocumentCategory.MEDICAL_HEALTH_RECORDS,
      ];

      let removed = false;
      for (const category of categories) {
        const index = current[category].findIndex(
          (document) => document.id === documentId,
        );
        if (index !== -1) {
          current[category].splice(index, 1);
          removed = true;
          break;
        }
      }

      if (!removed) {
        AppResponse.error({
          message: 'Onboarding document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { onboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to delete organization onboarding document',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return 'Deleted onboarding document';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.deleteOnboardingDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Produce an employer-issued document id that is unique
   * within the organization's list.
   */
  private uniqueEmployerIssuedDocumentId(
    settings: OnboardingSettings,
    name: string,
  ): string {
    const existing = new Set(
      settings.employerIssuedDocuments.map((document) => document.id),
    );
    const base = this.slugify(name);
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base}_${counter}`)) counter += 1;
    return `${base}_${counter}`;
  }

  /**
   * @Responsibility: Append a new employer-issued document to an
   * organization's list.
   *
   * @param organizationId - The organization to update
   * @param dto - The new document payload
   * @returns The created document
   *
   * @throws {404} Organization not found
   */
  async addEmployerIssuedDocument(
    organizationId: string,
    dto: AddEmployerIssuedDocumentDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOnboardingSettings(
        found!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS,
      );

      const document: EmployerIssuedDocument = {
        id: this.uniqueEmployerIssuedDocumentId(current, dto.name),
        name: dto.name.trim(),
        fileType: dto.fileType ?? null,
        requiresSignature: false,
      };

      current.employerIssuedDocuments.push(document);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { onboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization employer-issued document',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Added employer-issued document for org ${organizationId}`,
      );
      return {
        id: document.id,
        name: document.name,
        fileType: document.fileType,
        requiresSignature: document.requiresSignature,
      };
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addEmployerIssuedDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update a single employer-issued document. Only the
   * provided fields are changed.
   *
   * @param organizationId - The organization to update
   * @param documentId - The id of the document to update
   * @param dto - The partial document payload
   *
   * @throws {404} Organization or document not found
   */
  async updateEmployerIssuedDocument(
    organizationId: string,
    documentId: string,
    dto: UpdateEmployerIssuedDocumentDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOnboardingSettings(
        found!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS,
      );

      const target = current.employerIssuedDocuments.find(
        (document) => document.id === documentId,
      );
      if (!target) {
        AppResponse.error({
          message: 'Employer-issued document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (dto.name !== undefined) target!.name = dto.name;
      if (dto.fileType !== undefined) target!.fileType = dto.fileType;
      if (dto.requiresSignature !== undefined)
        target!.requiresSignature = dto.requiresSignature;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { onboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization employer-issued document',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return {
        id: target!.id,
        name: target!.name,
        fileType: target!.fileType ?? null,
        requiresSignature: target!.requiresSignature ?? false,
      };
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateEmployerIssuedDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove a single employer-issued document.
   *
   * @param organizationId - The organization to update
   * @param documentId - The id of the document to delete
   *
   * @throws {404} Organization or document not found
   */
  async deleteEmployerIssuedDocument(
    organizationId: string,
    documentId: string,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOnboardingSettings(
        found!.onboarding ?? DEFAULT_ONBOARDING_SETTINGS,
      );

      const index = current.employerIssuedDocuments.findIndex(
        (document) => document.id === documentId,
      );
      if (index === -1) {
        AppResponse.error({
          message: 'Employer-issued document not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      current.employerIssuedDocuments.splice(index, 1);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { onboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to delete organization employer-issued document',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return 'Deleted employer-issued document';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.deleteEmployerIssuedDocument.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's departments settings.
   * Departments are returned enriched with the head of department and parent
   * department display names so the UI can render them directly.
   *
   * @param organizationId - The organization to scope the query to
   * @param search - Optional department name search term
   * @returns {Promise<DepartmentView[]>}
   *
   * @throws {404} Organization not found
   */
  async getDepartments(
    organizationId: string,
    search?: string,
  ): Promise<DepartmentView[]> {
    try {
      if (
        !(await this.organizationRepository.findOrg({ _id: organizationId }))
      ) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const departments =
        (await this.organizationDepartmentRepository.findByOrganization(
          organizationId,
          '',
          search,
        )) ?? [];

      return await this.enrichDepartments(organizationId, departments);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getDepartments.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update a single department matched by its unique code.
   * Only the fields present in the payload are applied; omitted fields keep
   * their current values. An explicit null clears headOfDepartmentId /
   * parentCode. Parent references are resolved against the organization's
   * existing departments by code or name; an unresolvable or self-referencing
   * parent never blocks the update and falls back to null.
   *
   * @param organizationId - The organization to scope the update to
   * @param code - The unique department code to match
   * @param dto - Partial department payload
   * @returns {Promise<OrganizationDepartment>}
   *
   * @throws {400} Duplicate department name
   * @throws {404} Organization or department not found
   */
  async updateDepartments(
    organizationId: string,
    code: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<string> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      await this.organizationDepartmentRepository.updateOrgDept(
        {
          organizationId,
          code,
        },
        updateDepartmentDto,
      );

      this.logger.log(`Updated department ${code} for org ${organizationId}`);
      return 'Updated departmen';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateDepartments.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add one or more new departments additively. Unlike
   * updateDepartments (which updates a single department by code), this
   * creates fresh documents for each entry without deleting existing ones.
   * Validates duplicates against both the payload and the existing collection,
   * and resolves parent references additively.
   *
   * @param organizationId - The organization to scope the creation to
   * @param dto - Bulk add payload
   * @returns {Promise<OrganizationDepartment[]>}
   *
   * @throws {400} Duplicate department name (in payload or already exists)
   * @throws {404} Organization not found
   */
  async addDepartments(
    organizationId: string,
    dto: AddDepartmentsDto,
  ): Promise<OrganizationDepartment[]> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const incoming = (dto.departments ?? []).map((dept) => ({
        name: dept.name.trim(),
        headOfDepartmentId: dept.headOfDepartmentId ?? null,
        parentCode: dept.parentCode?.trim() || null,
      }));

      if (incoming.length === 0) {
        AppResponse.error({
          message: 'At least one department is required.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const existing =
        (await this.organizationDepartmentRepository.findByOrganization(
          organizationId,
        )) ?? [];

      const resolved = this.buildAddDepartmentPayload(
        organizationId,
        incoming,
        existing,
      );

      const created =
        await this.organizationDepartmentRepository.createMany(resolved);

      this.logger.log(
        `Added ${created.length} department(s) for org ${organizationId}`,
      );
      return created as unknown as OrganizationDepartment[];
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addDepartments.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Delete a department.
   *
   * @param organizationId - The organization to scope the creation to
   * @param code - code query param
   * @returns {Promise<string>}
   *
   * @throws {400} Duplicate department name (in payload or already exists)
   * @throws {404} Organization not found
   */
  async deleteDepartments(
    organizationId: string,
    code: string,
  ): Promise<string> {
    try {
      await this.organizationDepartmentRepository.deleteOrgDepartment({
        organizationId,
        code,
      });

      return 'Organization department deleted';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.deleteDepartments.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Convenience single-add wrapper around addDepartments.
   * Validates and creates a single department document.
   *
   * @param organizationId - The organization to scope the creation to
   * @param dto - Single department payload
   * @returns {Promise<OrganizationDepartment>}
   */
  async addDepartment(
    organizationId: string,
    dto: AddSingleDepartmentDto | AddDepartmentDto,
  ): Promise<OrganizationDepartment> {
    const result = await this.addDepartments(organizationId, {
      departments: [dto as AddDepartmentDto],
    });
    return result[0];
  }

  /**
   * @Responsibility: Validate an additive departments payload. Unlike
   * buildDepartmentPayload (which preserves existing ids), this always
   * generates fresh ids/codes and rejects duplicates that already exist in
   * the collection or collide within the payload. Parent references are
   * resolved additively against existing departments plus siblings in the
   * same payload; unresolvable/self refs fall back to null.
   */
  private buildAddDepartmentPayload(
    organizationId: string,
    incoming: {
      name: string;
      headOfDepartmentId: string | null;
      parentCode: string | null;
    }[],
    existing: OrganizationDepartment[] = [],
  ): OrganizationDepartment[] {
    const existingNames = new Set(
      existing.map((dept) => dept.name.toLowerCase()),
    );
    const existingCodes = new Set(
      existing.map((dept) => dept.code.toLowerCase()),
    );
    const seen = new Set<string>();
    for (const dept of incoming) {
      const key = dept.name.toLowerCase();
      if (seen.has(key)) {
        AppResponse.error({
          message: `A department named "${dept.name}" already exists`,
          status: HttpStatus.BAD_REQUEST,
        });
      }
      if (existingNames.has(key) || existingCodes.has(key)) {
        AppResponse.error({
          message: `A department named "${dept.name}" already exists`,
          status: HttpStatus.BAD_REQUEST,
        });
      }
      seen.add(key);
    }

    const rows = incoming.map((dept) => {
      const id = new Types.ObjectId();
      const generatedCode = this.authUtility.generateRandomString();
      return { department: dept, id, code: generatedCode };
    });

    // Build parent lookup: existing (by name + by code) + incoming siblings
    const combinedByName = new Map<string, { id: Types.ObjectId }>();
    const combinedByCode = new Map<string, { id: Types.ObjectId }>();
    for (const dept of existing) {
      combinedByName.set(dept.name.toLowerCase(), {
        id: dept._id as Types.ObjectId,
      });
      combinedByCode.set(dept.code.toLowerCase(), {
        id: dept._id as Types.ObjectId,
      });
    }
    for (const row of rows) {
      combinedByName.set(row.department.name.toLowerCase(), { id: row.id });
      combinedByCode.set(row.code.toLowerCase(), { id: row.id });
    }

    return rows.map(({ department, id, code }) => {
      let parentDepartmentId: string | null = null;
      const parentCode = department.parentCode;
      if (parentCode != null) {
        const key = parentCode.toLowerCase();
        const parent =
          combinedByName.get(key) ?? combinedByCode.get(key) ?? null;
        if (!parent) {
          this.logger.warn(
            `Unresolvable parent code "${parentCode}" for department "${department.name}" — ignoring parent`,
          );
        } else if (parent.id.toString() === id.toString()) {
          this.logger.warn(
            `Department "${department.name}" cannot be its own parent — ignoring parent`,
          );
        } else {
          parentDepartmentId = parent.id.toString();
        }
      }
      return {
        _id: id,
        organizationId,
        code,
        name: department.name,
        headOfDepartmentId: department.headOfDepartmentId,
        parentDepartmentId,
      } as OrganizationDepartment;
    });
  }

  /**
   * @Responsibility: Resolve head of department and parent department display
   * names for a list of departments. Employee names are loaded in a single
   * org-scoped query and parent names are resolved from the list itself.
   *
   * @param organizationId - The organization to scope employee lookups to
   * @param departments - The departments to enrich
   * @returns {Promise<DepartmentView[]>}
   */
  private async enrichDepartments(
    organizationId: string,
    departments: OrganizationDepartment[],
  ): Promise<DepartmentView[]> {
    const hodIds = departments
      .map((department) => department.headOfDepartmentId?.toString())
      .filter((id): id is string => !!id);

    let employeeNames = new Map<string, string>();
    if (hodIds.length > 0) {
      const employees = await this.employeeRepository.findByOrganization(
        organizationId,
        'firstName lastName',
      );
      employeeNames = new Map(
        employees.map((employee) => [
          employee._id.toString(),
          [employee.firstName, employee.lastName]
            .filter((part) => part !== null && part !== '')
            .join(' '),
        ]),
      );
    }

    const departmentNames = new Map(
      departments.map((department) => [
        department._id?.toString(),
        department.name,
      ]),
    );

    return departments.map((department) => ({
      ...department,
      headOfDepartmentName:
        department.headOfDepartmentId != null
          ? (employeeNames.get(department.headOfDepartmentId.toString()) ??
            null)
          : null,
      parentDepartmentName:
        department.parentDepartmentId != null
          ? (departmentNames.get(department.parentDepartmentId.toString()) ??
            null)
          : null,
    }));
  }

  /**
   * @Responsibility: Retrieve an organization's billing settings. When no
   * billing sub-document exists yet, the default plan is returned alongside
   * null payment method and billing email so the UI can render the section.
   *
   * @param organizationId - The organization to retrieve settings for
   * @returns {Promise<Billing | null>}
   *
   * @throws {404} Organization not found
   */
  async getBilling(organizationId: string): Promise<Billing | null> {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return (
        organization!.billing ?? {
          plan: { ...DEFAULT_PLAN },
          paymentMethod: null,
          billingEmail: null,
        }
      );
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getBilling.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's billing settings.
   * Editable fields are the payment method details and the billing email.
   * The plan is read-only (managed externally) and is therefore not part of
   * the update payload. Editable scalars are merged with existing values so
   * partial updates are safe and an explicit null billingEmail clears it.
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial billing payload
   * @returns {Promise<Billing | null>}
   *
   * @throws {404} Organization not found
   */
  async updateBilling(
    organizationId: string,
    dto: UpdateBillingDto,
  ): Promise<Billing | null> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current: Billing = found!.billing ?? {
        plan: { ...DEFAULT_PLAN },
        paymentMethod: null,
        billingEmail: null,
      };

      const merged: Billing = {
        plan: current.plan ?? { ...DEFAULT_PLAN },
        paymentMethod: current.paymentMethod
          ? { ...current.paymentMethod }
          : null,
        billingEmail: current.billingEmail,
      };

      if (dto.billingEmail !== undefined)
        merged.billingEmail = dto.billingEmail;

      if (dto.paymentMethod !== undefined) {
        const paymentMethod: PaymentMethod = {
          brand: merged.paymentMethod?.brand ?? null,
          last4: merged.paymentMethod?.last4 ?? null,
          expiry: merged.paymentMethod?.expiry ?? null,
        };
        if (dto.paymentMethod.brand !== undefined)
          paymentMethod.brand = dto.paymentMethod.brand;
        if (dto.paymentMethod.last4 !== undefined)
          paymentMethod.last4 = dto.paymentMethod.last4;
        if (dto.paymentMethod.expiry !== undefined)
          paymentMethod.expiry = dto.paymentMethod.expiry;
        merged.paymentMethod = paymentMethod;
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { billing: merged },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization billing',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Updated billing for org ${organizationId}`);
      return updated!.billing ?? merged;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateBilling.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve an organization's invoice history. The invoice
   * list is read-only within the settings section and can be filtered by a
   * search term matching the invoice number, plan name or billing date.
   *
   * @param organizationId - The organization to scope the query to
   * @param search - Optional invoice search term
   * @returns {Promise<Invoice[]>}
   *
   * @throws {404} Organization not found
   */
  async getInvoices(
    organizationId: string,
    search?: string,
  ): Promise<Invoice[]> {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      return (await this.invoiceRepository.findByOrganization(
        String(organization!._id),
        search,
      )) as Invoice[];
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getInvoices.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve all job titles belonging to an organization
   *
   * @param organizationId - The organization to scope the query to
   * @param search - Optional job title name search term
   * @returns {Promise<JobTitle[]>}
   *
   * @throws {404} Organization not found
   */
  async getJobTitles(
    organizationId: string,
    search?: string,
  ): Promise<JobTitle[]> {
    try {
      if (
        !(await this.organizationRepository.findOrg({ _id: organizationId }))
      ) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      return (await this.jobTitleRepository.findByOrganization(
        organizationId,
        '',
        search,
      )) as JobTitle[];
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getJobTitles.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Create a single job title for an organization. The code
   * is generated server-side and names are unique (case-insensitive) within
   * the organization.
   *
   * @param organizationId - The organization to scope the creation to
   * @param dto - The job title payload
   * @returns {Promise<JobTitle>}
   *
   * @throws {400} Duplicate job title name
   * @throws {404} Organization not found
   */
  async addJobTitle(
    organizationId: string,
    dto: AddJobTitleDto,
  ): Promise<JobTitle> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const name = dto.name.trim();
      if (name.length === 0) {
        AppResponse.error({
          message: 'Job title name must not be empty.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const existing =
        (await this.jobTitleRepository.findByOrganization(organizationId)) ??
        [];
      const collision = existing.find(
        (jobTitle) => jobTitle.name.toLowerCase() === name.toLowerCase(),
      );
      if (collision) {
        AppResponse.error({
          message: `A job title named "${name}" already exists`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const created = await this.jobTitleRepository.create({
        organizationId,
        code: this.authUtility.generateRandomString(),
        name,
      } as JobTitle);

      this.logger.log(`Added job title "${name}" for org ${organizationId}`);
      return created as unknown as JobTitle;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addJobTitle.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update a single job title matched by its unique code.
   * Only the fields present in the payload are applied; omitted fields keep
   * their current values.
   *
   * @param organizationId - The organization to scope the update to
   * @param code - The unique job title code to match
   * @param dto - Partial job title payload
   * @returns {Promise<JobTitle>}
   *
   * @throws {400} Duplicate job title name
   * @throws {404} Organization or job title not found
   */
  async updateJobTitle(
    organizationId: string,
    code: string,
    dto: UpdateJobTitleDto,
  ): Promise<JobTitle> {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const jobTitle = await this.jobTitleRepository.findByCode(
        organizationId,
        code,
      );
      if (!jobTitle) {
        AppResponse.error({
          message: 'Job title not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const jobTitleId = (jobTitle!._id as Types.ObjectId).toString();
      const update: Partial<JobTitle> = {};

      if (dto.name !== undefined) {
        const name = dto.name.trim();
        if (name.length === 0) {
          AppResponse.error({
            message: 'Job title name must not be empty.',
            status: HttpStatus.BAD_REQUEST,
          });
        }
        const existing =
          (await this.jobTitleRepository.findByOrganization(organizationId)) ??
          [];
        const collision = existing.find(
          (item) =>
            item._id?.toString() !== jobTitleId &&
            item.name.toLowerCase() === name.toLowerCase(),
        );
        if (collision) {
          AppResponse.error({
            message: `A job title named "${name}" already exists`,
            status: HttpStatus.BAD_REQUEST,
          });
        }
        update.name = name;
      }

      const updated = await this.jobTitleRepository.updateByCode(
        organizationId,
        code,
        update,
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update job title',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Updated job title ${code} for org ${organizationId}`);
      return updated!;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateJobTitle.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Delete a job title matched by its unique code within an
   * organization.
   *
   * @param organizationId - The organization to scope the deletion to
   * @param code - The unique job title code to match
   * @returns {Promise<string>}
   *
   * @throws {404} Organization or job title not found
   */
  async deleteJobTitle(organizationId: string, code: string): Promise<string> {
    try {
      const jobTitle = await this.jobTitleRepository.findByCode(
        organizationId,
        code,
      );
      if (!jobTitle) {
        AppResponse.error({
          message: 'Job title not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      await this.jobTitleRepository.deleteWhere({ organizationId, code });

      this.logger.log(`Deleted job title ${code} for org ${organizationId}`);
      return 'Job title deleted';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.deleteJobTitle.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Convert a stored request-workflow step into its API shape.
   */
  private toRequestWorkflowStepView(step: RequestWorkflowStep) {
    return {
      id: String(step._id),
      order: step.order ?? 1,
      responsibleParty: step.responsibleParty ?? null,
    };
  }

  /**
   * @Responsibility: Normalise a stored request-workflow step into a mutable
   * plain object.
   */
  private toRequestWorkflowStepPlain(
    step: RequestWorkflowStep,
  ): RequestWorkflowStep {
    return {
      _id: step._id,
      order: step.order ?? 1,
      responsibleParty: step.responsibleParty ?? null,
    };
  }

  /**
   * @Responsibility: Normalise a stored request workflow into a mutable plain
   * object so it can be safely modified without touching Mongoose internals.
   */
  private toRequestWorkflowPlain(workflow: RequestWorkflow): RequestWorkflow {
    return {
      _id: workflow._id,
      requestType: workflow.requestType,
      name: workflow.name,
      isDefault: workflow.isDefault ?? false,
      steps: (workflow.steps ?? []).map((step) =>
        this.toRequestWorkflowStepPlain(step),
      ),
    };
  }

  /**
   * @Responsibility: Present a request workflow in the shape consumed by the
   * client.
   */
  private toRequestWorkflowView(workflow: RequestWorkflow) {
    return {
      id: String(workflow._id),
      requestType: workflow.requestType,
      name: workflow.name,
      isDefault: workflow.isDefault ?? false,
      steps: (workflow.steps ?? []).map((step) =>
        this.toRequestWorkflowStepView(step),
      ),
    };
  }

  /**
   * @Responsibility: Build the ordered step list from a payload, defaulting the
   * order to the position in the array when it is not supplied.
   */
  private buildRequestWorkflowSteps(
    steps: RequestWorkflowStepDto[] | undefined,
  ): RequestWorkflowStep[] {
    return (steps ?? []).map((step, index) => ({
      _id: new Types.ObjectId(),
      order: step.order ?? index + 1,
      responsibleParty: step.responsibleParty.trim(),
    }));
  }

  /**
   * @Responsibility: Locate a request workflow by id.
   */
  private findRequestWorkflow(
    workflows: RequestWorkflow[],
    workflowId: string,
  ): RequestWorkflow | undefined {
    return workflows.find((workflow) => String(workflow._id) === workflowId);
  }

  /**
   * @Responsibility: Retrieve the request workflows for an organization grouped
   * by request type. Every request type is always returned (with an empty
   * workflow list when none are configured) so the client can render the tab
   * navigation. An optional request type narrows the response to a single tab.
   *
   * @param organizationId - The organization to retrieve settings for
   * @param requestType - Optional request type to narrow the response to
   *
   * @throws {404} Organization not found
   */
  async getRequestWorkflows(organizationId: string, requestType?: RequestType) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      const workflows = organization!.requestWorkflows ?? [];
      const types = requestType ? [requestType] : REQUEST_TYPES;

      return {
        requestTypes: types.map((type) => ({
          type,
          label: REQUEST_TYPE_LABELS[type],
          workflows: workflows
            .filter((workflow) => workflow.requestType === type)
            .map((workflow) => this.toRequestWorkflowView(workflow)),
        })),
      };
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getRequestWorkflows.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve a single request workflow by id.
   *
   * @param organizationId - The organization to retrieve settings for
   * @param workflowId - The id of the workflow to retrieve
   *
   * @throws {404} Organization or workflow not found
   */
  async getRequestWorkflow(organizationId: string, workflowId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      const workflow = this.findRequestWorkflow(
        organization!.requestWorkflows ?? [],
        workflowId,
      );
      if (!workflow) {
        AppResponse.error({
          message: 'Request workflow not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      return this.toRequestWorkflowView(workflow!);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getRequestWorkflow.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Create a request workflow for one of an organization's
   * request types. The workflow name defaults to "<Label> workflow".
   *
   * @param organizationId - The organization to update
   * @param dto - The new workflow payload (request type + optional name/steps)
   *
   * @throws {404} Organization not found
   */
  async addRequestWorkflow(organizationId: string, dto: AddRequestWorkflowDto) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const workflows = (found!.requestWorkflows ?? []).map((workflow) =>
        this.toRequestWorkflowPlain(workflow),
      );

      const name =
        dto.name?.trim() || `${REQUEST_TYPE_LABELS[dto.requestType]} workflow`;

      const workflow: RequestWorkflow = {
        _id: new Types.ObjectId(),
        requestType: dto.requestType,
        name,
        isDefault: false,
        steps: this.buildRequestWorkflowSteps(dto.steps),
      };

      workflows.push(workflow);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { requestWorkflows: workflows },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization request workflow',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Added request workflow "${name}" for org ${organizationId}`,
      );
      return this.toRequestWorkflowView(workflow);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addRequestWorkflow.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update a request workflow. Only the provided fields are
   * changed; when steps are supplied they replace the existing list. Setting
   * isDefault to true clears the flag on every sibling workflow of the same
   * request type so a single default is always kept.
   *
   * @param organizationId - The organization to update
   * @param workflowId - The id of the workflow to update
   * @param dto - The partial workflow payload
   *
   * @throws {404} Organization or workflow not found
   */
  async updateRequestWorkflow(
    organizationId: string,
    workflowId: string,
    dto: UpdateRequestWorkflowDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const workflows = (found!.requestWorkflows ?? []).map((workflow) =>
        this.toRequestWorkflowPlain(workflow),
      );

      const target = this.findRequestWorkflow(workflows, workflowId);
      if (!target) {
        AppResponse.error({
          message: 'Request workflow not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (dto.name !== undefined) target!.name = dto.name.trim();
      if (dto.steps !== undefined)
        target!.steps = this.buildRequestWorkflowSteps(dto.steps);
      if (dto.isDefault !== undefined) target!.isDefault = dto.isDefault;

      if (dto.isDefault === true) {
        for (const workflow of workflows) {
          if (
            String(workflow._id) !== workflowId &&
            workflow.requestType === target!.requestType
          ) {
            workflow.isDefault = false;
          }
        }
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { requestWorkflows: workflows },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization request workflow',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated request workflow ${workflowId} for org ${organizationId}`,
      );
      return this.toRequestWorkflowView(target!);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateRequestWorkflow.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Delete a request workflow by id.
   *
   * @param organizationId - The organization to update
   * @param workflowId - The id of the workflow to delete
   *
   * @throws {404} Organization or workflow not found
   */
  async deleteRequestWorkflow(organizationId: string, workflowId: string) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const workflows = (found!.requestWorkflows ?? []).map((workflow) =>
        this.toRequestWorkflowPlain(workflow),
      );

      const index = workflows.findIndex(
        (workflow) => String(workflow._id) === workflowId,
      );
      if (index === -1) {
        AppResponse.error({
          message: 'Request workflow not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      workflows.splice(index, 1);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { requestWorkflows: workflows },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to delete organization request workflow',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Deleted request workflow ${workflowId} for org ${organizationId}`,
      );
      return 'Request workflow deleted';
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.deleteRequestWorkflow.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Deep-clone leave management settings into mutable plain
   * objects so the shared default constant is never mutated.
   */
  private cloneLeaveManagementSettings(
    settings: LeaveManagementSettings,
  ): LeaveManagementSettings {
    return {
      leaveCategories: (settings.leaveCategories ?? []).map((category) =>
        this.toLeaveCategoryPlain(category),
      ),
      allowCarryover: settings.allowCarryover ?? false,
      autoApprovalEnabled: settings.autoApprovalEnabled ?? false,
      approvalDeadline: settings.approvalDeadline ?? null,
      holidaysCountAsLeave: settings.holidaysCountAsLeave ?? false,
    };
  }

  /**
   * @Responsibility: Normalise a stored leave category into a mutable plain
   * object.
   */
  private toLeaveCategoryPlain(category: LeaveCategory): LeaveCategory {
    return {
      id: category.id,
      label: category.label,
    };
  }

  /**
   * @Responsibility: Present a leave category in the shape consumed by the
   * client.
   */
  private toLeaveCategoryView(category: LeaveCategory) {
    return {
      id: category.id,
      label: category.label,
    };
  }

  /**
   * @Responsibility: Generate a leave category id that is unique within an
   * organization's categories.
   */
  private uniqueLeaveCategoryId(
    settings: LeaveManagementSettings,
    label: string,
  ): string {
    const existing = new Set(
      (settings.leaveCategories ?? []).map((category) => category.id),
    );
    const base = this.slugify(label);
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base}_${counter}`)) counter += 1;
    return `${base}_${counter}`;
  }

  /**
   * @Responsibility: Present leave management settings in the shape consumed by
   * the client.
   */
  private toLeaveManagementSettingsView(settings: LeaveManagementSettings) {
    return {
      leaveCategories: (settings.leaveCategories ?? []).map((category) =>
        this.toLeaveCategoryView(category),
      ),
      allowCarryover: settings.allowCarryover ?? false,
      autoApprovalEnabled: settings.autoApprovalEnabled ?? false,
      approvalDeadline: settings.approvalDeadline ?? null,
      holidaysCountAsLeave: settings.holidaysCountAsLeave ?? false,
    };
  }

  /**
   * @Responsibility: Retrieve an organization's leave management settings. The
   * leave categories start empty and grow as the organization adds them.
   *
   * @param organizationId - The organization to retrieve settings for
   *
   * @throws {404} Organization not found
   */
  async getLeaveManagementSettings(organizationId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      const settings =
        organization!.leaveManagement ?? DEFAULT_LEAVE_MANAGEMENT_SETTINGS;

      return this.toLeaveManagementSettingsView(settings);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getLeaveManagementSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's leave management settings. Only
   * the provided fields are changed; the remaining fields keep their current
   * value.
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial leave management settings payload
   *
   * @throws {404} Organization not found
   */
  async updateLeaveManagementSettings(
    organizationId: string,
    dto: UpdateLeaveManagementDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneLeaveManagementSettings(
        found!.leaveManagement ?? DEFAULT_LEAVE_MANAGEMENT_SETTINGS,
      );

      if (dto.allowCarryover !== undefined)
        current.allowCarryover = dto.allowCarryover;
      if (dto.autoApprovalEnabled !== undefined)
        current.autoApprovalEnabled = dto.autoApprovalEnabled;
      if (dto.approvalDeadline !== undefined)
        current.approvalDeadline = dto.approvalDeadline;
      if (dto.holidaysCountAsLeave !== undefined)
        current.holidaysCountAsLeave = dto.holidaysCountAsLeave;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { leaveManagement: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization leave management settings',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated leave management settings for org ${organizationId}`,
      );
      return this.toLeaveManagementSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateLeaveManagementSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add a leave category to an organization's leave
   * management settings. The category id is generated from the label; existing
   * categories are kept and duplicates (by label, ignoring case) are ignored.
   *
   * @param organizationId - The organization to update
   * @param dto - The new category payload
   *
   * @throws {404} Organization not found
   */
  async addLeaveCategory(organizationId: string, dto: AddLeaveCategoryDto) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneLeaveManagementSettings(
        found!.leaveManagement ?? DEFAULT_LEAVE_MANAGEMENT_SETTINGS,
      );

      const label = dto.label.trim();
      const exists = current.leaveCategories.some(
        (category) => category.label.toLowerCase() === label.toLowerCase(),
      );
      if (!exists) {
        current.leaveCategories.push({
          id: this.uniqueLeaveCategoryId(current, label),
          label,
        });
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { leaveManagement: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization leave category',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Added leave category "${label}" for org ${organizationId}`,
      );
      return this.toLeaveManagementSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addLeaveCategory.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove a leave category from an organization's leave
   * management settings by its id.
   *
   * @param organizationId - The organization to update
   * @param id - The category id to remove
   *
   * @throws {404} Organization or leave category not found
   */
  async removeLeaveCategory(organizationId: string, id: string) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneLeaveManagementSettings(
        found!.leaveManagement ?? DEFAULT_LEAVE_MANAGEMENT_SETTINGS,
      );

      const index = current.leaveCategories.findIndex(
        (category) => category.id === id,
      );
      if (index === -1) {
        AppResponse.error({
          message: 'Leave category not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      current.leaveCategories.splice(index, 1);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { leaveManagement: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to remove organization leave category',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Removed leave category "${id}" for org ${organizationId}`,
      );
      return this.toLeaveManagementSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.removeLeaveCategory.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Deep-clone leave entitlement settings into mutable plain
   * objects so the shared default constant is never mutated.
   */
  private cloneLeaveEntitlementSettings(
    settings: LeaveEntitlementSettings,
  ): LeaveEntitlementSettings {
    return {
      allocationMethod: settings.allocationMethod ?? null,
      employmentTypes: [...(settings.employmentTypes ?? [])],
      restrictedPeriods: (settings.restrictedPeriods ?? []).map((period) =>
        this.toLeaveRestrictedPeriodPlain(period),
      ),
    };
  }

  /**
   * @Responsibility: Normalise a stored restricted period into a mutable plain
   * object.
   */
  private toLeaveRestrictedPeriodPlain(
    period: LeaveRestrictedPeriod,
  ): LeaveRestrictedPeriod {
    return {
      id: period.id,
      name: period.name,
      startDate: period.startDate ?? null,
      endDate: period.endDate ?? null,
      departmentCodes: [...(period.departmentCodes ?? [])],
    };
  }

  /**
   * @Responsibility: Present a restricted period in the shape consumed by the
   * client.
   */
  private toLeaveRestrictedPeriodView(period: LeaveRestrictedPeriod) {
    return {
      id: period.id,
      name: period.name,
      startDate: period.startDate ?? null,
      endDate: period.endDate ?? null,
      departmentCodes: period.departmentCodes ?? [],
    };
  }

  /**
   * @Responsibility: Generate a restricted period id that is unique within an
   * organization's restricted periods.
   */
  private uniqueLeaveRestrictedPeriodId(
    settings: LeaveEntitlementSettings,
    name: string,
  ): string {
    const existing = new Set(
      (settings.restrictedPeriods ?? []).map((period) => period.id),
    );
    const base = this.slugify(name);
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base}_${counter}`)) counter += 1;
    return `${base}_${counter}`;
  }

  /**
   * @Responsibility: Present leave entitlement settings in the shape consumed
   * by the client.
   */
  private toLeaveEntitlementSettingsView(settings: LeaveEntitlementSettings) {
    const allocationMethod = settings.allocationMethod ?? null;
    return {
      allocationMethod,
      allocationMethodLabel: allocationMethod
        ? LEAVE_ALLOCATION_METHOD_LABELS[allocationMethod]
        : null,
      employmentTypes: settings.employmentTypes ?? [],
      restrictedPeriods: (settings.restrictedPeriods ?? []).map((period) =>
        this.toLeaveRestrictedPeriodView(period),
      ),
    };
  }

  /**
   * @Responsibility: Retrieve an organization's leave entitlement settings.
   * The employment types and restricted periods start empty and grow as the
   * organization configures them.
   *
   * @param organizationId - The organization to retrieve settings for
   *
   * @throws {404} Organization not found
   */
  async getLeaveEntitlementSettings(organizationId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      const settings =
        organization!.leaveEntitlement ?? DEFAULT_LEAVE_ENTITLEMENT_SETTINGS;

      return this.toLeaveEntitlementSettingsView(settings);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getLeaveEntitlementSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an organization's leave entitlement settings. Only
   * the provided fields are changed; the remaining fields keep their current
   * value.
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial leave entitlement settings payload
   *
   * @throws {404} Organization not found
   */
  async updateLeaveEntitlementSettings(
    organizationId: string,
    dto: UpdateLeaveEntitlementDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneLeaveEntitlementSettings(
        found!.leaveEntitlement ?? DEFAULT_LEAVE_ENTITLEMENT_SETTINGS,
      );

      if (dto.allocationMethod !== undefined)
        current.allocationMethod = dto.allocationMethod;
      if (dto.employmentTypes !== undefined)
        current.employmentTypes = [...new Set(dto.employmentTypes)];

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { leaveEntitlement: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization leave entitlement settings',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated leave entitlement settings for org ${organizationId}`,
      );
      return this.toLeaveEntitlementSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateLeaveEntitlementSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add a leave restricted period to an organization's leave
   * entitlement settings. The period id is generated from the name and the
   * department codes are de-duplicated.
   *
   * @param organizationId - The organization to update
   * @param dto - The new restricted period payload
   *
   * @throws {400} End date is before the start date
   * @throws {404} Organization not found
   */
  async addLeaveRestrictedPeriod(
    organizationId: string,
    dto: AddLeaveRestrictedPeriodDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      // if (dto.endDate < dto.startDate) {
      //   AppResponse.error({
      //     message: 'Restricted period end date cannot be before the start date',
      //     status: HttpStatus.BAD_REQUEST,
      //   });
      // }

      const current = this.cloneLeaveEntitlementSettings(
        found!.leaveEntitlement ?? DEFAULT_LEAVE_ENTITLEMENT_SETTINGS,
      );

      const name = dto.name.trim();
      current.restrictedPeriods.push({
        id: this.uniqueLeaveRestrictedPeriodId(current, name),
        name,
        startDate: dto.startDate,
        endDate: dto.endDate,
        departmentCodes: [...new Set(dto.departmentCodes ?? [])],
      });

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { leaveEntitlement: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization leave restricted period',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Added leave restricted period "${name}" for org ${organizationId}`,
      );
      return this.toLeaveEntitlementSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addLeaveRestrictedPeriod.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update a leave restricted period of an organization's
   * leave entitlement settings. Only the provided fields are changed.
   *
   * @param organizationId - The organization to update
   * @param id - The restricted period id to update
   * @param dto - The partial restricted period payload
   *
   * @throws {400} End date is before the start date
   * @throws {404} Organization or restricted period not found
   */
  async updateLeaveRestrictedPeriod(
    organizationId: string,
    id: string,
    dto: UpdateLeaveRestrictedPeriodDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneLeaveEntitlementSettings(
        found!.leaveEntitlement ?? DEFAULT_LEAVE_ENTITLEMENT_SETTINGS,
      );

      const period = current.restrictedPeriods.find((item) => item.id === id);
      if (!period) {
        AppResponse.error({
          message: 'Leave restricted period not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (dto.name !== undefined) period!.name = dto.name.trim();
      if (dto.startDate !== undefined) period!.startDate = dto.startDate;
      if (dto.endDate !== undefined) period!.endDate = dto.endDate;
      if (dto.departmentCodes !== undefined)
        period!.departmentCodes = [...new Set(dto.departmentCodes)];

      if (
        period!.startDate &&
        period!.endDate &&
        period!.endDate < period!.startDate
      ) {
        AppResponse.error({
          message: 'Restricted period end date cannot be before the start date',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { leaveEntitlement: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization leave restricted period',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated leave restricted period "${id}" for org ${organizationId}`,
      );
      return this.toLeaveEntitlementSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateLeaveRestrictedPeriod.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove a leave restricted period from an organization's
   * leave entitlement settings by its id.
   *
   * @param organizationId - The organization to update
   * @param id - The restricted period id to remove
   *
   * @throws {404} Organization or restricted period not found
   */
  async removeLeaveRestrictedPeriod(organizationId: string, id: string) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneLeaveEntitlementSettings(
        found!.leaveEntitlement ?? DEFAULT_LEAVE_ENTITLEMENT_SETTINGS,
      );

      const index = current.restrictedPeriods.findIndex(
        (period) => period.id === id,
      );
      if (index === -1) {
        AppResponse.error({
          message: 'Leave restricted period not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      current.restrictedPeriods.splice(index, 1);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { leaveEntitlement: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to remove organization leave restricted period',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Removed leave restricted period "${id}" for org ${organizationId}`,
      );
      return this.toLeaveEntitlementSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.removeLeaveRestrictedPeriod.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Deep-clone off-boarding settings into mutable plain
   * objects so the shared default constant is never mutated.
   */
  private cloneOffboardingSettings(
    settings: OffboardingSettings,
  ): OffboardingSettings {
    return {
      offboardingTypes: (settings.offboardingTypes ?? []).map((type) => ({
        id: type.id,
        label: type.label,
      })),
      exitReasons: (settings.exitReasons ?? []).map((reason) => ({
        id: reason.id,
        label: reason.label,
      })),
      exitChecklist: (settings.exitChecklist ?? []).map((item) =>
        this.toExitChecklistItemPlain(item),
      ),
    };
  }

  /**
   * @Responsibility: Normalise a stored exit checklist item into a mutable
   * plain object.
   */
  private toExitChecklistItemPlain(item: ExitChecklistItem): ExitChecklistItem {
    return {
      id: item.id,
      label: item.label,
      description: item.description ?? null,
      selected: item.selected ?? true,
    };
  }

  /**
   * @Responsibility: Present an exit checklist item in the shape consumed by
   * the client.
   */
  private toExitChecklistItemView(item: ExitChecklistItem) {
    return {
      id: item.id,
      label: item.label,
      description: item.description ?? null,
      selected: item.selected ?? true,
    };
  }

  /**
   * @Responsibility: Present off-boarding settings in the shape consumed by
   * the client.
   */
  private toOffboardingSettingsView(settings: OffboardingSettings) {
    return {
      offboardingTypes: (settings.offboardingTypes ?? []).map((type) => ({
        id: type.id,
        label: type.label,
      })),
      exitReasons: (settings.exitReasons ?? []).map((reason) => ({
        id: reason.id,
        label: reason.label,
      })),
      exitChecklist: (settings.exitChecklist ?? []).map((item) =>
        this.toExitChecklistItemView(item),
      ),
    };
  }

  /**
   * @Responsibility: Generate an id that is unique within a list of off-boarding
   * items, derived from a label.
   */
  private uniqueOffboardingItemId(
    items: { id: string }[],
    label: string,
  ): string {
    const existing = new Set((items ?? []).map((item) => item.id));
    const base = this.slugify(label);
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base}_${counter}`)) counter += 1;
    return `${base}_${counter}`;
  }

  /**
   * @Responsibility: Retrieve an organization's off-boarding settings. The
   * off-boarding types, exit reasons and exit checklist start empty and grow as
   * the organization configures them.
   *
   * @param organizationId - The organization to retrieve settings for
   *
   * @throws {404} Organization not found
   */
  async getOffboardingSettings(organizationId: string) {
    try {
      const organization =
        (await this.organizationRepository.findOrg({ _id: organizationId })) ??
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });

      const settings =
        organization!.offboarding ?? DEFAULT_OFFBOARDING_SETTINGS;

      return this.toOffboardingSettingsView(settings);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getOffboardingSettings.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add an off-boarding type. The type id is generated from the
   * label; duplicates (by label, ignoring case) are ignored.
   *
   * @param organizationId - The organization to update
   * @param dto - The new type payload
   *
   * @throws {404} Organization not found
   */
  async addOffboardingType(organizationId: string, dto: AddOffboardingTypeDto) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOffboardingSettings(
        found!.offboarding ?? DEFAULT_OFFBOARDING_SETTINGS,
      );

      const label = dto.label.trim();
      const exists = current.offboardingTypes.some(
        (type) => type.label.toLowerCase() === label.toLowerCase(),
      );
      if (!exists) {
        current.offboardingTypes.push({
          id: this.uniqueOffboardingItemId(current.offboardingTypes, label),
          label,
        });
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { offboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization off-boarding type',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Added off-boarding type "${label}" for org ${organizationId}`,
      );
      return this.toOffboardingSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addOffboardingType.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove an off-boarding type by its id.
   *
   * @param organizationId - The organization to update
   * @param id - The type id to remove
   *
   * @throws {404} Organization or off-boarding type not found
   */
  async removeOffboardingType(organizationId: string, id: string) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOffboardingSettings(
        found!.offboarding ?? DEFAULT_OFFBOARDING_SETTINGS,
      );

      const index = current.offboardingTypes.findIndex(
        (type) => type.id === id,
      );
      if (index === -1) {
        AppResponse.error({
          message: 'Off-boarding type not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      current.offboardingTypes.splice(index, 1);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { offboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to remove organization off-boarding type',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Removed off-boarding type "${id}" for org ${organizationId}`,
      );
      return this.toOffboardingSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.removeOffboardingType.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add a reason for exit. The reason id is generated from the
   * label; duplicates (by label, ignoring case) are ignored.
   *
   * @param organizationId - The organization to update
   * @param dto - The new reason payload
   *
   * @throws {404} Organization not found
   */
  async addExitReason(organizationId: string, dto: AddExitReasonDto) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOffboardingSettings(
        found!.offboarding ?? DEFAULT_OFFBOARDING_SETTINGS,
      );

      const label = dto.label.trim();
      const exists = current.exitReasons.some(
        (reason) => reason.label.toLowerCase() === label.toLowerCase(),
      );
      if (!exists) {
        current.exitReasons.push({
          id: this.uniqueOffboardingItemId(current.exitReasons, label),
          label,
        });
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { offboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization exit reason',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Added exit reason "${label}" for org ${organizationId}`);
      return this.toOffboardingSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addExitReason.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove a reason for exit by its id.
   *
   * @param organizationId - The organization to update
   * @param id - The reason id to remove
   *
   * @throws {404} Organization or exit reason not found
   */
  async removeExitReason(organizationId: string, id: string) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOffboardingSettings(
        found!.offboarding ?? DEFAULT_OFFBOARDING_SETTINGS,
      );

      const index = current.exitReasons.findIndex((reason) => reason.id === id);
      if (index === -1) {
        AppResponse.error({
          message: 'Exit reason not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      current.exitReasons.splice(index, 1);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { offboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to remove organization exit reason',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(`Removed exit reason "${id}" for org ${organizationId}`);
      return this.toOffboardingSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.removeExitReason.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add an exit checklist item. The item id is generated from
   * the label and the item is selected by default.
   *
   * @param organizationId - The organization to update
   * @param dto - The new exit checklist item payload
   *
   * @throws {404} Organization not found
   */
  async addExitChecklistItem(
    organizationId: string,
    dto: AddExitChecklistItemDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOffboardingSettings(
        found!.offboarding ?? DEFAULT_OFFBOARDING_SETTINGS,
      );

      const label = dto.label.trim();
      const exists = current.exitChecklist.some(
        (item) => item.label.toLowerCase() === label.toLowerCase(),
      );
      if (!exists) {
        current.exitChecklist.push({
          id: this.uniqueOffboardingItemId(current.exitChecklist, label),
          label,
          description: dto.description?.trim() || null,
          selected: true,
        });
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { offboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to add organization exit checklist item',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Added exit checklist item "${label}" for org ${organizationId}`,
      );
      return this.toOffboardingSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.addExitChecklistItem.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Update an exit checklist item. Only the provided fields
   * are changed.
   *
   * @param organizationId - The organization to update
   * @param id - The exit checklist item id to update
   * @param dto - The partial exit checklist item payload
   *
   * @throws {404} Organization or exit checklist item not found
   */
  async updateExitChecklistItem(
    organizationId: string,
    id: string,
    dto: UpdateExitChecklistItemDto,
  ) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOffboardingSettings(
        found!.offboarding ?? DEFAULT_OFFBOARDING_SETTINGS,
      );

      const item = current.exitChecklist.find((entry) => entry.id === id);
      if (!item) {
        AppResponse.error({
          message: 'Exit checklist item not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (dto.label !== undefined) item!.label = dto.label.trim();
      if (dto.description !== undefined)
        item!.description = dto.description?.trim() || null;
      if (dto.selected !== undefined) item!.selected = dto.selected;

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { offboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update organization exit checklist item',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated exit checklist item "${id}" for org ${organizationId}`,
      );
      return this.toOffboardingSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateExitChecklistItem.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Remove an exit checklist item by its id.
   *
   * @param organizationId - The organization to update
   * @param id - The exit checklist item id to remove
   *
   * @throws {404} Organization or exit checklist item not found
   */
  async removeExitChecklistItem(organizationId: string, id: string) {
    try {
      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });
      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const current = this.cloneOffboardingSettings(
        found!.offboarding ?? DEFAULT_OFFBOARDING_SETTINGS,
      );

      const index = current.exitChecklist.findIndex((item) => item.id === id);
      if (index === -1) {
        AppResponse.error({
          message: 'Exit checklist item not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      current.exitChecklist.splice(index, 1);

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { offboarding: current },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to remove organization exit checklist item',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Removed exit checklist item "${id}" for org ${organizationId}`,
      );
      return this.toOffboardingSettingsView(current);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.removeExitChecklistItem.name}`;
      AppResponse.error(error);
      throw error;
    }
  }
}
