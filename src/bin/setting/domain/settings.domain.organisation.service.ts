import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { OrganizationDepartmentRepository } from '../../organization/repository/organization-department.repository';
import {
  Branding,
  BusinessDetails,
  Location,
  OrganizationDocument,
} from '../../organization/entity/organization.schema';
import { OrganizationDepartment } from '../../organization/entity/organization-department.schema';
import { EmployeeRepository } from '../../employee/repository/employee.repository';
import { EmployeeService } from '../../employee/employee.service';
import { EmployeeDocument } from '../../employee/entity/employee.schema';
import { HierarchyTreeNode } from '../../employee/interface/employee.interface';
import { UpdateGeneralInfoDto } from '../organisation/dto/update-general-info.dto';
import { UpdateBusinessDetailsDto } from '../organisation/dto/update-business-details.dto';
import { UpdateLocationsDto } from '../organisation/dto/update-locations.dto';
import { UpdateHierarchyDto } from '../organisation/dto/organization-hierarchy.dto';
import { UpdateBrandingDto } from '../organisation/dto/update-branding.dto';
import { UpdateDepartmentsDto } from '../organisation/dto/update-departments.dto';
import {
  AddDepartmentDto,
  AddDepartmentsDto,
  AddSingleDepartmentDto,
} from '../organisation/dto/add-department.dto';
import { AppResponse } from '../../../common/response/app-response';

export type DepartmentView = OrganizationDepartment & {
  headOfDepartmentName: string | null;
  parentDepartmentName: string | null;
};

@Injectable()
export class SettingsDomainOrganisationService {
  private readonly logger = new Logger(SettingsDomainOrganisationService.name);

  constructor(
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(OrganizationDepartmentRepository)
    private readonly organizationDepartmentRepository: OrganizationDepartmentRepository,
    @Inject(EmployeeService)
    private readonly employeeService: EmployeeService,
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
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
   * @Responsibility: Placeholder for the Policy management settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  async getPolicyManagement(organizationId: string): Promise<unknown> {
    return this.pendingSection('policy-management', organizationId);
  }

  /**
   * @Responsibility: Placeholder for the Policy management settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  async updatePolicyManagement(
    organizationId: string,
    dto: unknown,
  ): Promise<unknown> {
    return this.pendingSection('policy-management', organizationId, dto);
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
        )) ?? [];

      const term = search?.trim().toLowerCase();
      const filtered = term
        ? departments.filter((department) =>
            department.name?.toLowerCase().includes(term),
          )
        : departments;

      return await this.enrichDepartments(organizationId, filtered);
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.getDepartments.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Persist an organization's departments settings.
   * The submitted list represents the full desired state. Existing departments
   * are replaced: every submitted department is created as a fresh document
   * with a newly generated id — nothing is ever matched or updated, regardless
   * of name, head of department or parent code. Parent references are
   * best-effort and never block creation.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The full departments list payload
   * @returns {Promise<Department[]>}
   *
   * @throws {400} Duplicate department name
   * @throws {404} Organization not found
   */
  async updateDepartments(
    organizationId: string,
    dto: UpdateDepartmentsDto,
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

      const incoming = (dto.departments ?? []).map((department) => ({
        name: department.name.trim(),
        headOfDepartmentId: department.headOfDepartmentId ?? null,
        parentCode: department.parentCode?.trim() || null,
      }));

      const existing =
        (await this.organizationDepartmentRepository.findByOrganization(
          organizationId,
        )) ?? [];

      const resolved = this.buildDepartmentPayload(
        organizationId,
        incoming,
        existing,
      );

      await this.organizationDepartmentRepository.synchronizeDepartments(
        organizationId,
        resolved,
      );

      this.logger.log(`Replaced departments for org ${organizationId}`);
      return resolved;
    } catch (error: any) {
      error.location = `SettingsDomainOrganisationService.${this.updateDepartments.name}`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Add one or more new departments additively. Unlike
   * updateDepartments (which reconciles the full list), this creates fresh
   * documents for each entry without deleting existing ones. Validates
   * duplicates against both the payload and the existing collection, and
   * resolves parent references additively.
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
   * @Responsibility: Validate a departments payload, preserve existing
   * departments matched by name (case-insensitive) so their ids and codes stay
   * stable, and assign freshly generated ids only to new departments. Parent
   * references are resolved against the combined set of existing + incoming
   * departments; an unresolvable or self-referencing parent never blocks
   * creation and falls back to null.
   *
   * @param organizationId - The organization to scope the query to
   * @param incoming - The normalized departments payload
   * @param existing - Existing departments for the organization
   * @returns {OrganizationDepartment[]}
   */
  private buildDepartmentPayload(
    organizationId: string,
    incoming: {
      name: string;
      headOfDepartmentId: string | null;
      parentCode: string | null;
    }[],
    existing: OrganizationDepartment[] = [],
  ): OrganizationDepartment[] {
    const names = new Set<string>();
    for (const department of incoming) {
      const nameKey = department.name.toLowerCase();
      if (names.has(nameKey)) {
        AppResponse.error({
          message: `A department named "${department.name}" already exists`,
          status: HttpStatus.BAD_REQUEST,
        });
      }
      names.add(nameKey);
    }

    const existingByName = new Map(
      existing.map((dept) => [dept.name.toLowerCase(), dept]),
    );

    const rows = incoming.map((department) => {
      const matched = existingByName.get(department.name.toLowerCase());
      if (matched) {
        return {
          department,
          id: matched._id as Types.ObjectId,
          code: matched.code,
        };
      }
      const id = new Types.ObjectId();
      return { department, id, code: id.toString() };
    });

    // Combined lookup for parent resolution: existing + incoming (incoming overrides)
    const combinedByName = new Map<string, { id: Types.ObjectId }>();
    for (const dept of existing) {
      combinedByName.set(dept.name.toLowerCase(), {
        id: dept._id as Types.ObjectId,
      });
    }
    for (const row of rows) {
      combinedByName.set(row.department.name.toLowerCase(), { id: row.id });
    }

    return rows.map(({ department, id, code }) => {
      let parentDepartmentId: string | null = null;
      const parentCode = department.parentCode;
      if (parentCode != null) {
        const parent = combinedByName.get(parentCode.toLowerCase());
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
      return { department: dept, id, code: id.toString() };
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
      ...(department as OrganizationDepartment),
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
   * @Responsibility: Placeholder for the Billing settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  async getBilling(organizationId: string): Promise<unknown> {
    return this.pendingSection('billing', organizationId);
  }

  /**
   * @Responsibility: Placeholder for the Billing settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  async updateBilling(organizationId: string, dto: unknown): Promise<unknown> {
    return this.pendingSection('billing', organizationId, dto);
  }

  /**
   * @Responsibility: Build the standardized placeholder payload for a not-yet-implemented settings section
   *
   * @param section - The settings section identifier
   * @param organizationId - The organization the section belongs to
   * @param dto - Optional submitted payload (discarded until the section is implemented)
   * @returns {unknown}
   */
  private pendingSection(
    section: string,
    organizationId: string,
    dto?: unknown,
  ): unknown {
    return {
      section,
      organizationId,
      implemented: false,
      ...(dto !== undefined ? { receivedPayload: dto } : null),
    };
  }
}
