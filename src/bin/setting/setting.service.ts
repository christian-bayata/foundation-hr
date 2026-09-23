import { Injectable } from '@nestjs/common';
import { SettingsDomainAccessControlService } from './domain/settings.domain.access-control.service';
import { SettingsDomainOrganisationService } from './domain/settings.domain.organisation.service';
import { CreateRoleDto } from './access-control/dto/create-role.dto';
import { RoleDocument } from './access-control/entity/role.schema';
import { UpdateGeneralInfoDto } from './organisation/dto/update-general-info.dto';
import { UpdateBusinessDetailsDto } from './organisation/dto/update-business-details.dto';
import { UpdateLocationsDto } from './organisation/dto/update-locations.dto';
import { UpdateHierarchyDto } from './organisation/dto/organization-hierarchy.dto';
import { UpdateBrandingDto } from './organisation/dto/update-branding.dto';
import { UpdateBillingDto } from './organisation/dto/update-billing.dto';
import { UpdateDepartmentDto } from './organisation/dto/update-departments.dto';
import {
  AddDepartmentDto,
  AddDepartmentsDto,
  AddSingleDepartmentDto,
} from './organisation/dto/add-department.dto';
import {
  Billing,
  Branding,
  BusinessDetails,
  Location,
  OrganizationDocument,
} from '../organization/entity/organization.schema';
import { OrganizationDepartment } from '../organization/entity/organization-department.schema';
import { Invoice } from './organisation/entity/invoice.schema';
import { DepartmentView } from './domain/settings.domain.organisation.service';
import { EmployeeDocument } from '../employee/entity/employee.schema';
import { HierarchyTreeNode } from '../employee/interface/employee.interface';
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
   * @param search - Optional location search term
   * @returns {Promise<Location[]>}
   */
  getOrgLocations(
    organizationId: string,
    search?: string,
  ): Promise<Location[]> {
    return this.organisationDomainService.getLocations(organizationId, search);
  }

  /**
   * @Responsibility: Module-level facade to replace an organization's locations settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The full locations list payload
   * @returns {Promise<Location[]>}
   */
  updateOrgLocations(
    organizationId: string,
    dto: UpdateLocationsDto,
  ): Promise<Location[]> {
    return this.organisationDomainService.updateLocations(organizationId, dto);
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's organisation hierarchy settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<HierarchyTreeNode[]>}
   */
  getOrgOrganisationHierarchy(
    organizationId: string,
  ): Promise<HierarchyTreeNode[]> {
    return this.organisationDomainService.getOrganisationHierarchy(
      organizationId,
    );
  }

  /**
   * @Responsibility: Module-level facade to update an organization's organisation hierarchy settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The employee reassignment payload
   * @returns {Promise<EmployeeDocument>}
   */
  updateOrgOrganisationHierarchy(
    organizationId: string,
    dto: UpdateHierarchyDto,
  ): Promise<EmployeeDocument> {
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
   * @returns {Promise<Branding | null>}
   */
  getOrgBranding(organizationId: string): Promise<Branding | null> {
    return this.organisationDomainService.getBranding(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's branding settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The partial branding payload
   * @returns {Promise<Branding | null>}
   */
  updateOrgBranding(
    organizationId: string,
    dto: UpdateBrandingDto,
  ): Promise<Branding | null> {
    return this.organisationDomainService.updateBranding(organizationId, dto);
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's departments settings
   *
   * @param organizationId - The organization to scope the query to
   * @param search - Optional department name search term
   * @returns {Promise<DepartmentView[]>}
   */
  getOrgDepartments(
    organizationId: string,
    search?: string,
  ): Promise<DepartmentView[]> {
    return this.organisationDomainService.getDepartments(
      organizationId,
      search,
    );
  }

  /**
   * @Responsibility: Module-level facade to update a single department matched
   * by its unique code
   *
   * @param organizationId - The organization to scope the query to
   * @param code - The unique department code to match
   * @param dto - Partial department payload
   * @returns {Promise<OrganizationDepartment>}
   */
  updateOrgDepartments(
    organizationId: string,
    code: string,
    dto: UpdateDepartmentDto,
  ): Promise<string> {
    return this.organisationDomainService.updateDepartments(
      organizationId,
      code,
      dto,
    );
  }

  /**
   * @Responsibility: Module-level facade to add new department(s) additively
   *
   * @param organizationId - The organization to scope the creation to
   * @param dto - Bulk add payload
   * @returns {Promise<OrganizationDepartment[]>}
   */
  addOrgDepartments(
    organizationId: string,
    dto: AddDepartmentsDto,
  ): Promise<OrganizationDepartment[]> {
    return this.organisationDomainService.addDepartments(organizationId, dto);
  }

  /**
   * @Responsibility: Module-level facade to add a single department additively
   *
   * @param organizationId - The organization to scope the creation to
   * @param dto - Single department payload
   * @returns {Promise<OrganizationDepartment>}
   */
  addOrgDepartment(
    organizationId: string,
    dto: AddDepartmentDto | AddSingleDepartmentDto,
  ): Promise<OrganizationDepartment> {
    return this.organisationDomainService.addDepartment(organizationId, dto);
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's billing settings
   *
   * @param organizationId - The organization to scope the query to
   * @returns {Promise<Billing | null>}
   */
  getOrgBilling(organizationId: string): Promise<Billing | null> {
    return this.organisationDomainService.getBilling(organizationId);
  }

  /**
   * @Responsibility: Module-level facade to update an organization's billing settings
   *
   * @param organizationId - The organization to scope the query to
   * @param dto - The partial billing payload
   * @returns {Promise<Billing | null>}
   */
  updateOrgBilling(
    organizationId: string,
    dto: UpdateBillingDto,
  ): Promise<Billing | null> {
    return this.organisationDomainService.updateBilling(organizationId, dto);
  }

  /**
   * @Responsibility: Module-level facade to retrieve an organization's invoice history
   *
   * @param organizationId - The organization to scope the query to
   * @param search - Optional invoice search term
   * @returns {Promise<Invoice[]>}
   */
  getOrgInvoices(organizationId: string, search?: string): Promise<Invoice[]> {
    return this.organisationDomainService.getInvoices(organizationId, search);
  }
}
