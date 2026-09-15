import { Injectable } from '@nestjs/common';
import { SettingsDomainAccessControlService } from './domain/settings.domain.access-control.service';
import { SettingsDomainOrganisationService } from './domain/settings.domain.organisation.service';
import { CreateRoleDto } from './access-control/dto/create-role.dto';
import { RoleDocument } from './access-control/entity/role.schema';
import { UpdateGeneralInfoDto } from './organisation/dto/update-general-info.dto';
import { UpdateBusinessDetailsDto } from './organisation/dto/update-business-details.dto';
import {
  BusinessDetails,
  OrganizationDocument,
} from '../organization/entity/organization.schema';
import { SystemRole } from '../auth/enum/role.enum';

@Injectable()
export class SettingService {
  constructor(
    private readonly accessControlDomainService: SettingsDomainAccessControlService,
    private readonly organisationDomainService: SettingsDomainOrganisationService,
  ) {}

  /**
   * @Responsibility: Module-level facade to seed the default system roles for a newly created organization
   *
   * @param organizationId - The organization to seed system roles for
   * @returns {Promise<void>}
   */
  initializeSystemRoles(organizationId: string): Promise<void> {
    return this.accessControlDomainService.initializeSystemRoles(
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to assign the COMPANY_OWNER role to the first signup user
   *
   * @param userId - The user to assign the owner role to
   * @param organizationId - The organization the user owns
   * @returns {Promise<void>}
   */
  assignCompanyOwner(userId: string, organizationId: string): Promise<void> {
    return this.accessControlDomainService.assignCompanyOwner(
      userId,
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to resolve a user's system roles within an organization
   *
   * @param userId - The user to resolve roles for
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<SystemRole[]>}
   */
  getUserSystemRoles(
    userId: string,
    organizationId: string,
  ): Promise<SystemRole[]> {
    return this.accessControlDomainService.getUserSystemRoles(
      userId,
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to retrieve all roles (system + custom) for an organization
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<RoleDocument[]>}
   */
  getRolesByOrganization(organizationId: string): Promise<RoleDocument[]> {
    return this.accessControlDomainService.getRolesByOrganization(
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to retrieve a single role by its id
   *
   * @param roleId - The role id to look up
   * @returns {Promise<RoleDocument>}
   */
  getRoleById(roleId: string): Promise<RoleDocument> {
    return this.accessControlDomainService.getRoleById(roleId);
  }

  /**
   * @Responsibility: Module-level facade to create a custom role within an organization
   *
   * @param organizationId - The organization the role belongs to
   * @param dto - The role creation payload
   * @returns {Promise<RoleDocument>}
   */
  createCustomRole(
    organizationId: string,
    dto: CreateRoleDto,
  ): Promise<RoleDocument> {
    return this.accessControlDomainService.createCustomRole(
      organizationId,
      dto,
    );
  }

  /**
   * @Responsibility: Module-level facade to update a custom role within an organization
   *
   * @param roleId - The role id to update
   * @param dto - The partial role update payload
   * @returns {Promise<RoleDocument>}
   */
  updateCustomRole(
    roleId: string,
    dto: Partial<CreateRoleDto>,
  ): Promise<string> {
    return this.accessControlDomainService.updateCustomRole(roleId, dto);
  }

  /**
   * @Responsibility: Module-level facade to delete a custom role within an organization
   *
   * @param roleId - The role id to delete
   * @returns {Promise<void>}
   */
  deleteCustomRole(roleId: string): Promise<void> {
    return this.accessControlDomainService.deleteCustomRole(roleId);
  }

  /**
   * @Responsibility: Module-level facade to assign a role to a user within an organization
   *
   * @param userId - The user to assign the role to
   * @param roleId - The role to assign
   * @param organizationId - The organization to scope the assignment to
   * @returns {Promise<void>}
   */
  assignRole(
    userId: string,
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    return this.accessControlDomainService.assignRole(
      userId,
      roleId,
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to remove a role from a user within an organization
   *
   * @param userId - The user to remove the role from
   * @param roleId - The role to remove
   * @param organizationId - The organization to scope the removal to
   * @returns {Promise<void>}
   */
  removeRole(
    userId: string,
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    return this.accessControlDomainService.removeRole(
      userId,
      roleId,
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to retrieve all roles assigned to a specific user in an organization
   *
   * @param userId - The user to resolve roles for
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<RoleDocument[]>}
   */
  getUserRoles(
    userId: string,
    organizationId: string,
  ): Promise<RoleDocument[]> {
    return this.accessControlDomainService.getUserRoles(userId, organizationId);
  }

  /**
   * @Responsibility: Module-level facade to retrieve all users assigned to a specific role in an organization
   *
   * @param roleId - The role to resolve users for
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<string[]>}
   */
  getUsersByRole(roleId: string, organizationId: string): Promise<string[]> {
    return this.accessControlDomainService.getUsersByRole(
      roleId,
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to resolve the organization a user belongs to via their role assignments
   *
   * @param userId - The user to resolve the organization for
   * @returns {Promise<string | null>}
   */
  findOrganizationForUser(userId: string): Promise<string | null> {
    return this.accessControlDomainService.findOrganizationForUser(userId);
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's general information settings
   *
   * @param organizationId - The organization to retrieve settings for
   * @returns {Promise<OrganizationDocument>}
   */
  getOrgGeneralInfo(organizationId: string): Promise<OrganizationDocument> {
    return this.organisationDomainService.getGeneralInfo(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's general information settings
   *
   * @param organizationId - The organization to update settings for
   * @param dto - The partial general information payload
   * @returns {Promise<OrganizationDocument>}
   */
  updateOrgGeneralInfo(
    organizationId: string,
    dto: UpdateGeneralInfoDto,
  ): Promise<OrganizationDocument> {
    return this.organisationDomainService.updateGeneralInfo(
      organizationId,
      dto,
    );
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's business details settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<BusinessDetails | null>}
   */
  getOrgBusinessDetails(
    organizationId: string,
  ): Promise<BusinessDetails | null> {
    return this.organisationDomainService.getBusinessDetails(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's business details settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<BusinessDetails | null>}
   */
  updateOrgBusinessDetails(
    organizationId: string,
    dto: UpdateBusinessDetailsDto,
  ): Promise<BusinessDetails | null> {
    return this.organisationDomainService.updateBusinessDetails(
      organizationId,
      dto,
    );
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's locations settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  getOrgLocations(organizationId: string): Promise<unknown> {
    return this.organisationDomainService.getLocations(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's locations settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  updateOrgLocations(organizationId: string, dto: unknown): Promise<unknown> {
    return this.organisationDomainService.updateLocations(organizationId, dto);
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's organisation hierarchy settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  getOrgOrganisationHierarchy(organizationId: string): Promise<unknown> {
    return this.organisationDomainService.getOrganisationHierarchy(
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to update an organization's organisation hierarchy settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  updateOrgOrganisationHierarchy(
    organizationId: string,
    dto: unknown,
  ): Promise<unknown> {
    return this.organisationDomainService.updateOrganisationHierarchy(
      organizationId,
      dto,
    );
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's policy management settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  getOrgPolicyManagement(organizationId: string): Promise<unknown> {
    return this.organisationDomainService.getPolicyManagement(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's policy management settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  updateOrgPolicyManagement(
    organizationId: string,
    dto: unknown,
  ): Promise<unknown> {
    return this.organisationDomainService.updatePolicyManagement(
      organizationId,
      dto,
    );
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's branding settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  getOrgBranding(organizationId: string): Promise<unknown> {
    return this.organisationDomainService.getBranding(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's branding settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  updateOrgBranding(organizationId: string, dto: unknown): Promise<unknown> {
    return this.organisationDomainService.updateBranding(organizationId, dto);
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's departments settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  getOrgDepartments(organizationId: string): Promise<unknown> {
    return this.organisationDomainService.getDepartments(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's departments settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  updateOrgDepartments(
    organizationId: string,
    dto: unknown,
  ): Promise<unknown> {
    return this.organisationDomainService.updateDepartments(
      organizationId,
      dto,
    );
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's billing settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<unknown>}
   */
  getOrgBilling(organizationId: string): Promise<unknown> {
    return this.organisationDomainService.getBilling(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's billing settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The section payload
   * @returns {Promise<unknown>}
   */
  updateOrgBilling(organizationId: string, dto: unknown): Promise<unknown> {
    return this.organisationDomainService.updateBilling(organizationId, dto);
  }
}
