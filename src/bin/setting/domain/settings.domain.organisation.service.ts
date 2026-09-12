import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { OrganizationDocument } from '../../organization/entity/organization.schema';
import { UpdateGeneralInfoDto } from '../organisation/dto/update-general-info.dto';
import { AppResponse } from '../../../common/response/app-response';

@Injectable()
export class SettingsDomainOrganisationService {
  private readonly logger = new Logger(SettingsDomainOrganisationService.name);

  constructor(
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
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
        (await this.organizationRepository.findById(organizationId)) ??
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
      const found = await this.organizationRepository.findById(organizationId);
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
   * @Responsibility: Placeholder for the Business details settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  async getBusinessDetails(organizationId: string): Promise<unknown> {
    return this.pendingSection('business-details', organizationId);
  }

  /**
   * @Responsibility: Placeholder for the Business details settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  async updateBusinessDetails(
    organizationId: string,
    dto: unknown,
  ): Promise<unknown> {
    return this.pendingSection('business-details', organizationId, dto);
  }

  /**
   * @Responsibility: Placeholder for the Locations settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  async getLocations(organizationId: string): Promise<unknown> {
    return this.pendingSection('locations', organizationId);
  }

  /**
   * @Responsibility: Placeholder for the Locations settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  async updateLocations(
    organizationId: string,
    dto: unknown,
  ): Promise<unknown> {
    return this.pendingSection('locations', organizationId, dto);
  }

  /**
   * @Responsibility: Placeholder for the Organisation hierarchy settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  async getOrganisationHierarchy(organizationId: string): Promise<unknown> {
    return this.pendingSection('organization-hierarchy', organizationId);
  }

  /**
   * @Responsibility: Placeholder for the Organisation hierarchy settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  async updateOrganisationHierarchy(
    organizationId: string,
    dto: unknown,
  ): Promise<unknown> {
    return this.pendingSection('organization-hierarchy', organizationId, dto);
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
   * @Responsibility: Placeholder for the Branding settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  async getBranding(organizationId: string): Promise<unknown> {
    return this.pendingSection('branding', organizationId);
  }

  /**
   * @Responsibility: Placeholder for the Branding settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  async updateBranding(organizationId: string, dto: unknown): Promise<unknown> {
    return this.pendingSection('branding', organizationId, dto);
  }

  /**
   * @Responsibility: Placeholder for the Departments settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  async getDepartments(organizationId: string): Promise<unknown> {
    return this.pendingSection('departments', organizationId);
  }

  /**
   * @Responsibility: Placeholder for the Departments settings section.
   * Not yet implemented — no design/data model provided yet.
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  async updateDepartments(
    organizationId: string,
    dto: unknown,
  ): Promise<unknown> {
    return this.pendingSection('departments', organizationId, dto);
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