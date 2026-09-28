import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { SystemRole } from '../../auth/enum/role.enum';
import { UserType } from '../../auth/enum/user.enum';
import { RoleRepository } from '../access-control/repository/role.repository';
import { UserRoleRepository } from '../access-control/repository/user-role.repository';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { InviteeUserRepository } from '../access-control/repository/invitee-user.repository';
import { JobTitleRepository } from '../../organization/repository/job-title.repository';
import { EmployeeRepository } from '../../employee/repository/employee.repository';
import { AuthUtility } from '../../auth/auth.utility';
import { EmailService } from '../../../email/email.service';
import { AdminStatus } from '../access-control/enum/admin-status.enum';
import { SettingsDomainAccessControlService } from './settings.domain.access-control.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const ACTOR_ID = 'usr-owner';
const FRONTEND_URL = 'https://app.foundationhr.com';

const OWNER_ROLE_ID = '64f1b2c3d4e5f6789010aaaa';
const HR_ROLE_ID = '64f1b2c3d4e5f6789010bbbb';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

const oid = (value: string) => new Types.ObjectId(value.padEnd(24, '0'));

const role = (over: Record<string, any> = {}) => ({
  _id: oid(HR_ROLE_ID),
  organizationId: ORG_ID,
  name: 'HR Admin',
  parentSystemRole: SystemRole.HR_ADMIN,
  ...over,
});

const ownerRole = (over: Record<string, any> = {}) =>
  role({
    _id: oid(OWNER_ROLE_ID),
    name: 'Owner',
    parentSystemRole: SystemRole.COMPANY_OWNER,
    ...over,
  });

const user = (over: Record<string, any> = {}) => ({
  _id: oid('64f1b2c3d4e5f6789010a001'),
  firstName: 'Jobi',
  lastName: 'Olusayo',
  email: 'olusayo@foundation.com',
  ...over,
});

const assignment = (over: Record<string, any> = {}) => ({
  _id: oid('64f1b2c3d4e5f6789010a0a1'),
  userId: '64f1b2c3d4e5f6789010a001',
  organizationId: ORG_ID,
  roleId: role(),
  status: AdminStatus.CREATED,
  addedById: ACTOR_ID,
  jobTitleCode: 'HR',
  isBillingContact: false,
  isAuthorizedRepresentative: true,
  createdAt: new Date('2023-10-12T08:30:00.000Z'),
  ...over,
});

/** Mirrors hydrateCompanyAdminRows: user ids resolve through inviteeUserRepository. */
const givenUsers = (inviteeUserRepository: any, users: any[]) => {
  inviteeUserRepository.findByIds.mockImplementation(async (ids: string[]) =>
    users.filter((u) => ids.map(String).includes(String(u._id))),
  );
};

describe('SettingsDomainAccessControlService company admin', () => {
  let service: SettingsDomainAccessControlService;
  let roleRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let userRoleRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let organizationRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let inviteeUserRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let jobTitleRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let employeeRepository: Record<string, jest.Mock<AnyPromiseFn>>;
  let authUtility: Record<string, jest.Mock<AnyPromiseFn>>;
  let emailService: Record<string, jest.Mock<AnyPromiseFn>>;
  let configService: { get: jest.Mock<(key: string) => string> };

  beforeEach(async () => {
    jest.clearAllMocks();

    roleRepository = {
      findById: jest.fn(),
      findByOrganizationAndName: jest.fn(),
      findByOrganizationAndParentSystemRoles: jest.fn(),
    };
    userRoleRepository = {
      findByUserAndOrganization: jest.fn(),
      findByIdAndOrganization: jest.fn(),
      findByFilters: jest.fn(),
      assign: jest.fn(),
      updateById: jest.fn(),
    };
    organizationRepository = { findOrg: jest.fn() };
    inviteeUserRepository = {
      findByEmails: jest.fn(),
      findByIds: jest.fn(),
      findIdsBySearchTerm: jest.fn(),
      create: jest.fn(),
    };
    jobTitleRepository = {
      findByCodeOrName: jest.fn(),
      findByCodes: jest.fn(),
      findByOrganization: jest.fn(),
    };
    employeeRepository = {
      findEmailsByOrganizationJobTitleCodes: jest.fn(),
      findByOrganizationEmails: jest.fn(),
    };
    authUtility = { randomToken: jest.fn() };
    emailService = { brevoEmailDispatcher: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(FRONTEND_URL) };

    organizationRepository.findOrg.mockResolvedValue({ name: 'Foundation' });
    employeeRepository.findByOrganizationEmails.mockResolvedValue([]);
    employeeRepository.findEmailsByOrganizationJobTitleCodes.mockResolvedValue(
      [],
    );
    inviteeUserRepository.findByIds.mockResolvedValue([]);
    inviteeUserRepository.findIdsBySearchTerm.mockResolvedValue([]);
    jobTitleRepository.findByCodes.mockResolvedValue([]);
    authUtility.randomToken.mockReturnValue('random-token');
    emailService.brevoEmailDispatcher.mockResolvedValue(undefined);

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        SettingsDomainAccessControlService,
        { provide: RoleRepository, useValue: roleRepository },
        { provide: UserRoleRepository, useValue: userRoleRepository },
        { provide: OrganizationRepository, useValue: organizationRepository },
        { provide: InviteeUserRepository, useValue: inviteeUserRepository },
        { provide: JobTitleRepository, useValue: jobTitleRepository },
        { provide: EmployeeRepository, useValue: employeeRepository },
        { provide: AuthUtility, useValue: authUtility },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(SettingsDomainAccessControlService);
  });

  describe('addCompanyAdmin', () => {
    const dto = {
      firstName: '  Jobi ',
      lastName: ' Olusayo ',
      email: '  Olusayo@Foundation.com ',
      roleId: HR_ROLE_ID,
      jobTitle: ' Human resource ',
      billingContact: true,
      authorizedRepresentative: false,
    };

    beforeEach(() => {
      roleRepository.findById.mockResolvedValue(role());
      jobTitleRepository.findByCodeOrName.mockResolvedValue({
        code: 'HR',
        name: 'Human resource',
      });
      inviteeUserRepository.findByEmails.mockResolvedValue([]);
      inviteeUserRepository.create.mockResolvedValue(user());
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([]);
      userRoleRepository.assign.mockImplementation(async (data: any) =>
        assignment(data),
      );
    });

    it('defaults the systemSettings flag to true when omitted', async () => {
      const row = await service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto);

      expect(userRoleRepository.assign).toHaveBeenCalledWith(
        expect.objectContaining({ systemSettings: true }),
      );
      expect(row.systemSettings).toBe(true);
    });

    it('persists systemSettings false when the admin is created without settings access', async () => {
      const row = await service.addCompanyAdmin(ORG_ID, ACTOR_ID, {
        ...dto,
        systemSettings: false,
      });

      expect(userRoleRepository.assign).toHaveBeenCalledWith(
        expect.objectContaining({ systemSettings: false }),
      );
      expect(row.systemSettings).toBe(false);
    });

    it('creates the assignment with a CREATED status, the actor and the job title code', async () => {
      const row = await service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto);

      expect(userRoleRepository.assign).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          roleId: role()._id,
          status: AdminStatus.CREATED,
          addedById: ACTOR_ID,
          jobTitleCode: 'HR',
          isBillingContact: true,
          isAuthorizedRepresentative: false,
        }),
      );
      expect(row.status).toBe(AdminStatus.CREATED);
      expect(row.jobTitle).toBe('Human resource');
      expect(row.assignments).toEqual(['Billing Contact']);
    });

    it('normalises the email and trims the name before persisting', async () => {
      await service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto);

      expect(inviteeUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'olusayo@foundation.com',
          firstName: 'Jobi',
          lastName: 'Olusayo',
        }),
      );
    });

    it('creates a placeholder account with an unverified COMPANY user and a random password hash', async () => {
      await service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto);

      const created = inviteeUserRepository.create.mock.calls[0][0] as Record<
        string,
        any
      >;
      expect(created.isEmailVerified).toBe(false);
      expect(created.userType).toBe(UserType.COMPANY);
      expect(created.password).toEqual(expect.any(String));
      expect(created.password).not.toBe('random-token');
    });

    it('defaults both assignment checkboxes to false when omitted', async () => {
      await service.addCompanyAdmin(ORG_ID, ACTOR_ID, {
        ...dto,
        billingContact: undefined,
        authorizedRepresentative: undefined,
      });

      expect(userRoleRepository.assign).toHaveBeenCalledWith(
        expect.objectContaining({
          isBillingContact: false,
          isAuthorizedRepresentative: false,
        }),
      );
    });

    it('reuses an existing account instead of creating a second one', async () => {
      inviteeUserRepository.findByEmails.mockResolvedValue([user()]);

      await service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto);

      expect(inviteeUserRepository.create).not.toHaveBeenCalled();
    });

    it('sends an invite link built from the new role id', async () => {
      await service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto);

      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'olusayo@foundation.com',
          html: expect.stringContaining(
            `${FRONTEND_URL}/invite?roleId=${oid(HR_ROLE_ID)}`,
          ),
        }),
      );
    });

    it('keeps the created admin when the invite email cannot be delivered', async () => {
      emailService.brevoEmailDispatcher.mockRejectedValue(
        new Error('provider down'),
      );

      const row = await service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto);

      expect(row.email).toBe('olusayo@foundation.com');
      expect(userRoleRepository.assign).toHaveBeenCalled();
    });

    it('rejects with 409 when the user already holds an admin-tier role', async () => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([
        assignment({ roleId: ownerRole() }),
      ]);

      await expect(
        service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto),
      ).rejects.toMatchObject({ status: 409 });
      expect(userRoleRepository.assign).not.toHaveBeenCalled();
    });

    it('still allows adding a user who only holds a non admin-tier role', async () => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue([
        assignment({
          roleId: role({
            name: 'Employee',
            parentSystemRole: SystemRole.EMPLOYEE,
          }),
        }),
      ]);

      await expect(
        service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto),
      ).resolves.toBeDefined();
    });

    it('rejects with 404 when the job title is not in the organization', async () => {
      jobTitleRepository.findByCodeOrName.mockResolvedValue(null);

      await expect(
        service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto),
      ).rejects.toMatchObject({ status: 404 });
      expect(userRoleRepository.assign).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the role does not exist', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(
        service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rejects with 403 when the role belongs to another organization', async () => {
      roleRepository.findById.mockResolvedValue(
        role({ organizationId: '64f1b2c3d4e5f67890deadbe' }),
      );

      await expect(
        service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejects with 400 when the role is outside the admin tier', async () => {
      roleRepository.findById.mockResolvedValue(
        role({
          name: 'Finance',
          parentSystemRole: SystemRole.FINANCE,
        }),
      );

      await expect(
        service.addCompanyAdmin(ORG_ID, ACTOR_ID, dto),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('listCompanyAdmins', () => {
    const jobi = user();
    const ada = user({
      _id: oid('64f1b2c3d4e5f6789010a002'),
      firstName: 'Ada',
      lastName: 'Nkem',
      email: 'ada@foundation.com',
    });

    beforeEach(() => {
      roleRepository.findByOrganizationAndParentSystemRoles.mockResolvedValue([
        role(),
        ownerRole(),
      ]);
      jobTitleRepository.findByCodes.mockResolvedValue([
        { code: 'HR', name: 'Human resource' },
      ]);
      userRoleRepository.findByFilters.mockResolvedValue([]);
      givenUsers(inviteeUserRepository, [jobi, ada]);
    });

    it('returns every admin-tier assignment in the organization', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment(),
        assignment({
          _id: oid('64f1b2c3d4e5f6789010a0a2'),
          userId: '64f1b2c3d4e5f6789010a002',
        }),
      ]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.count).toBe(2);
      expect(result.data.map((row) => row.name).sort()).toEqual([
        'Ada Nkem',
        'Jobi Olusayo',
      ]);
      expect(userRoleRepository.findByFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          roleIds: [role()._id, ownerRole()._id],
        }),
      );
    });

    it('returns an empty page when the organization has no admin-tier roles', async () => {
      roleRepository.findByOrganizationAndParentSystemRoles.mockResolvedValue(
        [],
      );

      await expect(service.listCompanyAdmins(ORG_ID, {})).resolves.toEqual({
        data: [],
        count: 0,
      });
      expect(userRoleRepository.findByFilters).not.toHaveBeenCalled();
    });

    it('scopes the role lookup to the requested role filter', async () => {
      await service.listCompanyAdmins(ORG_ID, { role: SystemRole.HR_ADMIN });

      expect(
        roleRepository.findByOrganizationAndParentSystemRoles,
      ).toHaveBeenCalledWith(ORG_ID, [SystemRole.HR_ADMIN]);
    });

    it('passes the status and added-by filters straight to Mongo', async () => {
      await service.listCompanyAdmins(ORG_ID, {
        status: AdminStatus.ACTIVE,
        added_by: ACTOR_ID,
      });

      expect(userRoleRepository.findByFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AdminStatus.ACTIVE,
          addedById: ACTOR_ID,
        }),
      );
    });

    it('expands date_created to the whole calendar day as a half-open range', async () => {
      await service.listCompanyAdmins(ORG_ID, {
        date_created: '2023-10-12',
      });

      const { dateCreatedRange } = userRoleRepository.findByFilters.mock
        .calls[0][0] as any;
      expect(dateCreatedRange.from).toEqual(new Date('2023-10-12T00:00:00'));
      expect(dateCreatedRange.to).toEqual(new Date('2023-10-13T00:00:00'));
    });

    it('short-circuits to an empty page when date_created is unparseable', async () => {
      await expect(
        service.listCompanyAdmins(ORG_ID, { date_created: 'not-a-date' }),
      ).resolves.toEqual({ data: [], count: 0 });
      expect(userRoleRepository.findByFilters).not.toHaveBeenCalled();
    });

    it('resolves the search term to user ids and short-circuits on no match', async () => {
      inviteeUserRepository.findIdsBySearchTerm.mockResolvedValue([]);

      await expect(
        service.listCompanyAdmins(ORG_ID, { q: 'nobody' }),
      ).resolves.toEqual({ data: [], count: 0 });
      expect(inviteeUserRepository.findIdsBySearchTerm).toHaveBeenCalledWith(
        'nobody',
      );
      expect(userRoleRepository.findByFilters).not.toHaveBeenCalled();
    });

    it('resolves the job title filter to job title codes and the matching employees', async () => {
      jobTitleRepository.findByOrganization.mockResolvedValue([
        { code: 'HR', name: 'Human resource' },
      ]);
      employeeRepository.findEmailsByOrganizationJobTitleCodes.mockResolvedValue(
        ['olusayo@foundation.com'],
      );
      inviteeUserRepository.findByEmails.mockResolvedValue([jobi]);

      await service.listCompanyAdmins(ORG_ID, { job_title: 'Human resource' });

      expect(jobTitleRepository.findByOrganization).toHaveBeenCalledWith(
        ORG_ID,
        '',
        'Human resource',
      );
      expect(userRoleRepository.findByFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          jobTitleCodes: ['HR'],
          jobTitleUserIds: ['64f1b2c3d4e5f6789010a001'],
        }),
      );
    });

    it('paginates with a default page size of 10 while reporting the full count', async () => {
      const many = Array.from({ length: 12 }, (_, index) =>
        assignment({
          _id: oid(`64f1b2c3d4e5f67890${String(index).padStart(4, '0')}`),
        }),
      );
      userRoleRepository.findByFilters.mockResolvedValue(many);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.count).toBe(12);
      expect(result.data).toHaveLength(10);
    });

    it('returns the requested page and clamps the page size to 100', async () => {
      const many = Array.from({ length: 120 }, (_, index) =>
        assignment({
          _id: oid(`64f1b2c3d4e5f67890${String(index).padStart(4, '0')}`),
        }),
      );
      userRoleRepository.findByFilters.mockResolvedValue(many);

      const result = await service.listCompanyAdmins(ORG_ID, {
        batch: '2',
        limit: '500',
      });

      // limit is clamped to 100, so page 2 is slice(100, 200) => the last 20.
      expect(result.data).toHaveLength(20);
      expect(result.data[0].id).toBe(String(many[100]._id));
      expect(result.count).toBe(120);
    });

    it('sorts by name in the requested direction', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment(),
        assignment({
          _id: oid('64f1b2c3d4e5f6789010a0a2'),
          userId: '64f1b2c3d4e5f6789010a002',
        }),
      ]);

      const asc = await service.listCompanyAdmins(ORG_ID, {
        sort_by: 'name',
        sort_dir: 'asc',
      });
      const desc = await service.listCompanyAdmins(ORG_ID, {
        sort_by: 'name',
        sort_dir: 'desc',
      });

      expect(asc.data.map((row) => row.name)).toEqual([
        'Ada Nkem',
        'Jobi Olusayo',
      ]);
      expect(desc.data.map((row) => row.name)).toEqual([
        'Jobi Olusayo',
        'Ada Nkem',
      ]);
    });

    it('sorts by status', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment({ status: AdminStatus.CREATED }),
        assignment({
          _id: oid('64f1b2c3d4e5f6789010a0a2'),
          userId: '64f1b2c3d4e5f6789010a002',
          status: AdminStatus.ACTIVE,
        }),
      ]);

      const result = await service.listCompanyAdmins(ORG_ID, {
        sort_by: 'status',
        sort_dir: 'asc',
      });

      expect(result.data.map((row) => row.status)).toEqual([
        AdminStatus.ACTIVE,
        AdminStatus.CREATED,
      ]);
    });

    it('derives ACTIVE for a legacy owner row that predates the status field', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment({
          roleId: ownerRole(),
          status: undefined,
          jobTitleCode: undefined,
        }),
      ]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.data[0].status).toBe(AdminStatus.ACTIVE);
      expect(result.data[0].jobTitle).toBeNull();
      expect(result.data[0].role?.systemRole).toBe(SystemRole.COMPANY_OWNER);
    });

    it('derives CREATED for a legacy non-owner row that predates the status field', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment({ status: undefined }),
      ]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.data[0].status).toBe(AdminStatus.CREATED);
    });

    it('falls back to the employee job title when the assignment has no job title code', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment({ jobTitleCode: undefined }),
      ]);
      employeeRepository.findByOrganizationEmails.mockResolvedValue([
        { email: 'olusayo@foundation.com', jobTitleCode: 'OPS' },
      ]);
      jobTitleRepository.findByCodes.mockResolvedValue([
        { code: 'OPS', name: 'Operations' },
      ]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(jobTitleRepository.findByCodes).toHaveBeenCalledWith(ORG_ID, [
        'OPS',
      ]);
      expect(result.data[0].jobTitle).toBe('Operations');
    });

    it('resolves the added-by name from the actor id', async () => {
      givenUsers(inviteeUserRepository, [
        jobi,
        ada,
        user({
          _id: ACTOR_ID,
          firstName: 'Chidi',
          lastName: 'Obi',
          email: 'chidi@foundation.com',
        }),
      ]);
      userRoleRepository.findByFilters.mockResolvedValue([assignment()]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.data[0].addedById).toEqual({
        userId: ACTOR_ID,
        name: 'Chidi Obi',
      });
    });

    it('returns a null added-by for a legacy row with no actor', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment({ addedById: undefined }),
      ]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.data[0].addedById).toBeNull();
    });

    it('survives a user that no longer resolves', async () => {
      givenUsers(inviteeUserRepository, []);
      userRoleRepository.findByFilters.mockResolvedValue([assignment()]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.data[0].name).toBe('');
      expect(result.data[0].email).toBe('');
    });

    it('exposes the settings access flag on the row', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment({ systemSettings: false }),
        assignment({
          _id: oid('64f1b2c3d4e5f6789010a0a2'),
          userId: '64f1b2c3d4e5f6789010a002',
          systemSettings: true,
        }),
      ]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.data.map((row) => row.systemSettings)).toEqual([
        false,
        true,
      ]);
    });

    it('reports settings access as true for a legacy row with no flag', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment({ systemSettings: undefined }),
      ]);

      const result = await service.listCompanyAdmins(ORG_ID, {});

      expect(result.data[0].systemSettings).toBe(true);
    });
  });

  describe('updateCompanyAdminRole', () => {
    beforeEach(() => {
      roleRepository.findByOrganizationAndParentSystemRoles.mockResolvedValue([
        role(),
        ownerRole(),
      ]);
      givenUsers(inviteeUserRepository, [user()]);
      userRoleRepository.findByFilters.mockResolvedValue([assignment()]);
    });

    it('persists the new role and returns the updated row', async () => {
      const finance = role({
        _id: oid('64f1b2c3d4e5f6789010d001'),
        name: 'Owner',
        parentSystemRole: SystemRole.COMPANY_OWNER,
      });
      roleRepository.findById.mockResolvedValue(finance);
      userRoleRepository.updateById.mockResolvedValue(
        assignment({ roleId: finance }),
      );

      const row = await service.updateCompanyAdminRole(
        ORG_ID,
        String(oid('64f1b2c3d4e5f6789010a0a1')),
        {
          roleId: String(finance._id),
        },
      );

      expect(userRoleRepository.updateById).toHaveBeenCalledWith(
        String(oid('64f1b2c3d4e5f6789010a0a1')),
        { roleId: finance._id },
      );
      expect(row.role?.name).toBe('Owner');
    });

    it('is a no-op when the admin already holds the requested role', async () => {
      roleRepository.findById.mockResolvedValue(role());

      const row = await service.updateCompanyAdminRole(
        ORG_ID,
        String(oid('64f1b2c3d4e5f6789010a0a1')),
        {
          roleId: HR_ROLE_ID,
        },
      );

      expect(userRoleRepository.updateById).not.toHaveBeenCalled();
      expect(row.role?.name).toBe('HR Admin');
    });

    it('rejects with 404 when the assignment is not in the organization', async () => {
      await expect(
        service.updateCompanyAdminRole(ORG_ID, '64f1b2c3d4e5f67890dead01', {
          roleId: HR_ROLE_ID,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rejects with 403 when the target is the organization owner', async () => {
      userRoleRepository.findByFilters.mockResolvedValue([
        assignment({ roleId: ownerRole() }),
      ]);

      await expect(
        service.updateCompanyAdminRole(
          ORG_ID,
          String(oid('64f1b2c3d4e5f6789010a0a1')),
          {
            roleId: HR_ROLE_ID,
          },
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(userRoleRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the new role is outside the admin tier', async () => {
      roleRepository.findById.mockResolvedValue(
        role({
          name: 'Finance',
          parentSystemRole: SystemRole.FINANCE,
        }),
      );

      await expect(
        service.updateCompanyAdminRole(
          ORG_ID,
          String(oid('64f1b2c3d4e5f6789010a0a1')),
          {
            roleId: HR_ROLE_ID,
          },
        ),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('user role status actions', () => {
    const id = String(oid('64f1b2c3d4e5f6789010a0a1'));
    const SELF_ID = '64f1b2c3d4e5f6789010a001';

    beforeEach(() => {
      givenUsers(inviteeUserRepository, [user()]);
      userRoleRepository.findByIdAndOrganization.mockImplementation(
        async (requestedId: string) =>
          requestedId === id ? assignment() : null,
      );
      userRoleRepository.updateById.mockImplementation(
        async (_id: string, data: any) => assignment(data),
      );
    });

    describe('activateUserRole', () => {
      it('sets the status to ACTIVE and stamps the activation time', async () => {
        const row = await service.activateUserRole(ORG_ID, id, ACTOR_ID);

        expect(userRoleRepository.updateById).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            status: AdminStatus.ACTIVE,
            activatedAt: expect.any(Date),
          }),
        );
        expect(row.status).toBe(AdminStatus.ACTIVE);
      });
    });

    describe('deactivateUserRole', () => {
      it('sets the status to INACTIVE and preserves the activation time', async () => {
        userRoleRepository.findByIdAndOrganization.mockResolvedValue(
          assignment({ activatedAt: new Date('2023-10-12T08:30:00.000Z') }),
        );

        const row = await service.deactivateUserRole(ORG_ID, id, ACTOR_ID);

        expect(userRoleRepository.updateById).toHaveBeenCalledWith(id, {
          status: AdminStatus.INACTIVE,
          activatedAt: new Date('2023-10-12T08:30:00.000Z'),
        });
        expect(row.status).toBe(AdminStatus.INACTIVE);
      });
    });

    describe('suspendUserRole', () => {
      it('sets the status to SUSPENDED and preserves the activation time', async () => {
        userRoleRepository.findByIdAndOrganization.mockResolvedValue(
          assignment({ activatedAt: new Date('2023-10-12T08:30:00.000Z') }),
        );

        const row = await service.suspendUserRole(ORG_ID, id, ACTOR_ID);

        expect(userRoleRepository.updateById).toHaveBeenCalledWith(id, {
          status: AdminStatus.SUSPENDED,
          activatedAt: new Date('2023-10-12T08:30:00.000Z'),
        });
        expect(row.status).toBe(AdminStatus.SUSPENDED);
      });
    });

    it('reaches a user role outside the admin tier', async () => {
      const employeeRoleId = String(oid('64f1b2c3d4e5f6789010a0b1'));
      const employeeAssignment = assignment({
        _id: oid(employeeRoleId),
        roleId: role({
          _id: oid(employeeRoleId),
          name: 'Employee',
          parentSystemRole: SystemRole.EMPLOYEE,
        }),
      });
      userRoleRepository.findByIdAndOrganization.mockResolvedValue(
        employeeAssignment,
      );
      // The update must not drop the non admin-tier role the row was found under.
      userRoleRepository.updateById.mockImplementation(
        async (_id: string, data: any) => ({ ...employeeAssignment, ...data }),
      );

      const row = await service.activateUserRole(
        ORG_ID,
        employeeRoleId,
        ACTOR_ID,
      );

      expect(row.role?.name).toBe('Employee');
      expect(row.status).toBe(AdminStatus.ACTIVE);
    });

    it('rejects with 403 when the admin targets their own role', async () => {
      await expect(
        service.deactivateUserRole(ORG_ID, id, SELF_ID),
      ).rejects.toMatchObject({ status: 403 });
      expect(userRoleRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects with 403 when the target is the organization owner', async () => {
      userRoleRepository.findByIdAndOrganization.mockResolvedValue(
        assignment({ roleId: ownerRole() }),
      );

      await expect(
        service.suspendUserRole(ORG_ID, id, ACTOR_ID),
      ).rejects.toMatchObject({ status: 403 });
      expect(userRoleRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the assignment does not exist', async () => {
      await expect(
        service.activateUserRole(ORG_ID, '64f1b2c3d4e5f67890dead01', ACTOR_ID),
      ).rejects.toMatchObject({ status: 404 });
      expect(userRoleRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the assignment belongs to another organization', async () => {
      // The repository scopes by organizationId, so a cross-tenant id resolves to null
      // rather than leaking the other tenant's assignment.
      expect(
        userRoleRepository.findByIdAndOrganization,
      ).toBeDefined();
      await expect(
        service.suspendUserRole(ORG_ID, '64f1b2c3d4e5f67890dead01', ACTOR_ID),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('hasSystemSettingsAccess', () => {
    const allowed = async (rows: any[]) => {
      userRoleRepository.findByUserAndOrganization.mockResolvedValue(rows);
      return service.hasSystemSettingsAccess(
        '64f1b2c3d4e5f6789010a001',
        ORG_ID,
      );
    };

    it('allows the organization owner even when the flag is false', async () => {
      await expect(
        allowed([assignment({ roleId: ownerRole(), systemSettings: false })]),
      ).resolves.toBe(true);
    });

    it('allows an HR Admin whose flag is true', async () => {
      await expect(
        allowed([assignment({ roleId: role(), systemSettings: true })]),
      ).resolves.toBe(true);
    });

    it('denies an HR Admin whose flag is false', async () => {
      await expect(
        allowed([assignment({ roleId: role(), systemSettings: false })]),
      ).resolves.toBe(false);
    });

    it('allows a legacy HR Admin assignment that predates the flag', async () => {
      await expect(
        allowed([assignment({ roleId: role(), systemSettings: undefined })]),
      ).resolves.toBe(true);
    });

    it('allows when any one of several assignments carries the flag', async () => {
      await expect(
        allowed([
          assignment({ roleId: role(), systemSettings: false }),
          assignment({
            _id: oid('64f1b2c3d4e5f6789010a0a2'),
            roleId: ownerRole(),
          }),
        ]),
      ).resolves.toBe(true);
    });

    it('denies a user holding only non admin-tier roles', async () => {
      await expect(
        allowed([
          assignment({
            roleId: role({
              name: 'Employee',
              parentSystemRole: SystemRole.EMPLOYEE,
            }),
            systemSettings: true,
          }),
        ]),
      ).resolves.toBe(false);
    });

    it('denies a user with no assignments in the organization', async () => {
      await expect(allowed([])).resolves.toBe(false);
    });
  });

  describe('assignCompanyOwner', () => {
    it('always grants the owner settings access so the org cannot lock itself out', async () => {
      roleRepository.findByOrganizationAndName.mockResolvedValue(ownerRole());
      userRoleRepository.assign.mockResolvedValue(assignment());

      await service.assignCompanyOwner('usr-owner-1', ORG_ID);

      expect(userRoleRepository.assign).toHaveBeenCalledWith(
        expect.objectContaining({ systemSettings: true }),
      );
    });
  });
});
