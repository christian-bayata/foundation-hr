import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/response/app-exception';
import { EmailService } from '../../../email/email.service';
import { EmployeeRepository } from './repository/employee.repository';
import { EmployeeUtility } from './repository/employee.utility';
import { EmployeeService } from './employee.service';
import { EmployeeStatus } from './enum/employee.enum';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { UserRepository } from '../../generic/auth/repository/user.repository';
import { NotificationService } from '../../generic/notification/notification.service';

const INVITE_ID = '64f1b2c3d4e5f678901234ab';
const ORG_ID = '64f1b2c3d4e5f678901234ac';
const ADMIN_ID = '64f1b2c3d4e5f678901234ad';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('EmployeeService', () => {
  let service: EmployeeService;
  let employeeRepository: {
    create: jest.Mock<AnyPromiseFn>;
    findOne: jest.Mock<AnyPromiseFn>;
    findByEmployeeId: jest.Mock<AnyPromiseFn>;
    findByEmail: jest.Mock<AnyPromiseFn>;
    findByEmailWithPassword: jest.Mock<AnyPromiseFn>;
    findById: jest.Mock<AnyPromiseFn>;
    findByOrganization: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
    updateByEmployeeId: jest.Mock<AnyPromiseFn>;
    updateEmployee: jest.Mock<AnyPromiseFn>;
    paginatedQuery: jest.Mock<AnyPromiseFn>;
  };
  let emailService: { brevoEmailDispatcher: jest.Mock<AnyPromiseFn> };
  let employeeUtility: { generateUniqueId: jest.Mock };
  let configService: { get: jest.Mock<(key: string) => string> };
  let organizationRepository: {
    findOrg: jest.Mock<AnyPromiseFn>;
    findBySlug: jest.Mock<AnyPromiseFn>;
  };
  let userRepository: {
    findUser: jest.Mock<AnyPromiseFn>;
    updateUser: jest.Mock<AnyPromiseFn>;
  };
  let notificationService: { dispatch: jest.Mock<AnyPromiseFn> };

  beforeEach(async () => {
    jest.clearAllMocks();

    employeeRepository = {
      create: jest.fn<AnyPromiseFn>(),
      findOne: jest.fn<AnyPromiseFn>(),
      findByEmployeeId: jest.fn<AnyPromiseFn>(),
      findByEmail: jest.fn<AnyPromiseFn>(),
      findByEmailWithPassword: jest.fn<AnyPromiseFn>(),
      findById: jest.fn<AnyPromiseFn>(),
      findByOrganization: jest.fn<AnyPromiseFn>(),
      updateById: jest.fn<AnyPromiseFn>(),
      updateByEmployeeId: jest.fn<AnyPromiseFn>(),
      updateEmployee: jest.fn<AnyPromiseFn>(),
      paginatedQuery: jest.fn<AnyPromiseFn>(),
    };
    emailService = {
      brevoEmailDispatcher: jest
        .fn<AnyPromiseFn>()
        .mockResolvedValue(undefined),
    };
    employeeUtility = {
      generateUniqueId: jest.fn(() => 'UNIQUEID123'),
    };
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:3000',
          RESET_TOKEN_TTL: '30',
        };
        return map[key];
      }),
    };
    organizationRepository = {
      findOrg: jest.fn<AnyPromiseFn>(),
      findBySlug: jest.fn<AnyPromiseFn>(),
    };
    userRepository = {
      findUser: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
      updateUser: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
    };
    notificationService = {
      dispatch: jest.fn<AnyPromiseFn>().mockResolvedValue(null),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: EmployeeRepository, useValue: employeeRepository },
        { provide: OrganizationRepository, useValue: organizationRepository },
        { provide: EmployeeUtility, useValue: employeeUtility },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        { provide: UserRepository, useValue: userRepository },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  describe('createEmployee', () => {
    const dto = {
      employeeType: 'employee',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      employmentDate: '2024-01-15',
      contractDuration: 'indefinite',
      jobType: 'full_time',
      workMode: 'hybrid',
      departmentCode: 'engineering',
      jobTitleCode: 'ENG123',
    };

    it('creates a draft employee with basic info and contract details', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        ...dto,
        employmentDate: new Date(dto.employmentDate),
        status: EmployeeStatus.DRAFT,
      });

      const result: any = await service.createEmployee(dto as any);

      expect(employeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeType: 'employee',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          employeeUniqueId: 'UNIQUEID123',
          employmentDate: expect.any(Date),
          contractDuration: 'indefinite',
          jobType: 'full_time',
          workMode: 'hybrid',
          departmentCode: 'engineering',
          jobTitleCode: 'ENG123',
          status: EmployeeStatus.DRAFT,
        }),
      );
      expect(result.status).toBe(EmployeeStatus.DRAFT);
    });

    it('completes the details of an invited employee when inviteId is provided', async () => {
      const invited = {
        _id: INVITE_ID,
        email: 'john@example.com',
        status: EmployeeStatus.DRAFT,
      };
      employeeRepository.findById.mockResolvedValue(invited);
      employeeRepository.updateById.mockResolvedValue({
        ...invited,
        ...dto,
        employmentDate: new Date(dto.employmentDate),
      });

      const result: any = await service.createEmployee({
        ...dto,
        inviteId: INVITE_ID,
      } as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          firstName: 'John',
          employeeType: 'employee',
          employmentDate: expect.any(Date),
          departmentCode: 'engineering',
        }),
      );
      expect(result.firstName).toBe('John');
    });

    it('throws 400 when the invite email does not match', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'other@example.com',
        status: EmployeeStatus.DRAFT,
      });

      await expect(
        service.createEmployee({ ...dto, inviteId: INVITE_ID } as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 400 when the invited employee is already active', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        status: EmployeeStatus.ACTIVE,
      });

      await expect(
        service.createEmployee({ ...dto, inviteId: INVITE_ID } as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 409 when the email already exists', async () => {
      employeeRepository.findOne.mockResolvedValue({ email: dto.email });

      await expect(service.createEmployee(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 409 when the create hits a duplicate key', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      employeeRepository.create.mockRejectedValue({ code: 11000 });

      await expect(service.createEmployee(dto as any)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('getEmployee', () => {
    it('returns the employee', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
      });

      const result: any = await service.getEmployee(INVITE_ID);

      expect(result).toEqual({ _id: INVITE_ID });
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.getEmployee(INVITE_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateEmployeeDetails', () => {
    const user = {
      userId: ADMIN_ID,
      email: 'admin@example.com',
      employeeId: INVITE_ID,
    };

    it('merges nested profile sections and replaces contacts', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.ACTIVE,
        personalDetails: {
          phone: '08012345678',
          dateOfBirth: null,
          nationality: 'Nigerian',
        },
        homeAddress: {
          address: '1 Marina Road',
          country: 'Ghana',
          state: 'Accra',
        },
        academicInfo: null,
        financeInformation: {
          bankDetails: { bank: 'GTBank', accountNumber: '123' },
          pensionDetails: null,
          taxDetails: { tin: 'TIN-1' },
        },
        contacts: [{ type: 'guarantor', fullName: 'Old Contact' }],
      });
      employeeRepository.updateById.mockResolvedValue({ _id: INVITE_ID });

      await service.updateEmployeeDetails(
        INVITE_ID,
        {
          firstName: 'Jane',
          personalDetails: {
            phone: '',
            dateOfBirth: '1990-01-02',
            maritalStatus: 'single',
          },
          homeAddress: { country: 'Nigeria' },
          academicInfo: { institution: 'University of Lagos' },
          financeInformation: {
            bankDetails: { accountNumber: '456' },
            taxDetails: { stateOfResidence: 'Lagos' },
          },
          contacts: [
            {
              type: 'emergency_contact',
              fullName: 'New Contact',
              phone: '08087654321',
            },
          ],
        } as any,
        user,
      );

      const update = employeeRepository.updateById.mock.calls[0][1] as any;

      expect(update.firstName).toBe('Jane');
      expect(update.personalDetails).toEqual({
        phone: null,
        dateOfBirth: new Date('1990-01-02'),
        nationality: 'Nigerian',
        maritalStatus: 'single',
      });
      expect(update.homeAddress).toEqual({
        address: '1 Marina Road',
        country: 'Nigeria',
        state: 'Accra',
      });
      expect(update.academicInfo).toEqual({
        institution: 'University of Lagos',
      });
      expect(update.financeInformation).toEqual({
        bankDetails: { bank: 'GTBank', accountNumber: '456' },
        pensionDetails: null,
        taxDetails: { tin: 'TIN-1', stateOfResidence: 'Lagos' },
      });
      expect(update.contacts).toEqual([
        {
          type: 'emergency_contact',
          fullName: 'New Contact',
          phone: '08087654321',
        },
      ]);
    });

    it('only updates scalar fields when no profile section is supplied', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.ACTIVE,
        personalDetails: { phone: '08012345678' },
      });
      employeeRepository.updateById.mockResolvedValue({ _id: INVITE_ID });

      await service.updateEmployeeDetails(
        INVITE_ID,
        { firstName: 'Jane' } as any,
        user,
      );

      expect(employeeRepository.updateById).toHaveBeenCalledWith(INVITE_ID, {
        firstName: 'Jane',
      });
    });

    it('updates finance information and replaces documents', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.ACTIVE,
        financeInformation: null,
        documents: [],
      });
      employeeRepository.updateById.mockResolvedValue({ _id: INVITE_ID });

      await service.updateEmployeeDetails(
        INVITE_ID,
        {
          financeInformation: {
            bankDetails: { bank: 'First bank', accountNumber: '0123456789' },
          },
          documents: [
            {
              name: 'National ID',
              uploadedBy: INVITE_ID,
              type: 'national_id',
              uploadDate: '2024-01-01',
              url: 'https://example.com/id.pdf',
            },
          ],
        } as any,
        user,
      );

      const update = employeeRepository.updateById.mock.calls[0][1] as any;

      expect(update.financeInformation).toEqual({
        bankDetails: { bank: 'First bank', accountNumber: '0123456789' },
      });
      expect(update.documents).toEqual([
        {
          name: 'National ID',
          uploadedBy: INVITE_ID,
          type: 'national_id',
          uploadDate: new Date('2024-01-01'),
          url: 'https://example.com/id.pdf',
        },
      ]);
    });
  });

  describe('saveDraft', () => {
    it('persists the provided fields and marks the employee as a draft', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        firstName: 'Jane',
        status: EmployeeStatus.DRAFT,
      });

      const result: any = await service.saveDraft(INVITE_ID, {
        firstName: 'Jane',
      } as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(INVITE_ID, {
        firstName: 'Jane',
        status: EmployeeStatus.DRAFT,
      });
      expect(result.status).toBe(EmployeeStatus.DRAFT);
    });

    it('updates fields but preserves ACTIVE status', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.ACTIVE,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        firstName: 'Jane',
        status: EmployeeStatus.ACTIVE,
      });

      const result: any = await service.saveDraft(INVITE_ID, {
        firstName: 'Jane',
      } as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(INVITE_ID, {
        firstName: 'Jane',
      });
      expect(result.status).toBe(EmployeeStatus.ACTIVE);
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.saveDraft(INVITE_ID, {} as any)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('inviteEmployees', () => {
    it('creates sparse employee accounts and sends invite emails', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
        name: 'Acme Inc',
      });

      const result: any = await service.inviteEmployees(
        ['John@Example.com'],
        'org123',
      );

      expect(employeeRepository.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
        inviteExpiresAt: expect.any(Date),
      });
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'You have been invited to join',
          html: expect.stringContaining('orgSlug=acme'),
        }),
      );
      expect(result).toEqual({
        invited: [{ email: 'john@example.com', inviteId: INVITE_ID }],
        skipped: [],
        failed: [],
      });
    });

    it('deduplicates invitee emails and skips existing accounts', async () => {
      employeeRepository.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: 'jane@example.com' });
      employeeRepository.create.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: 'org123',
      });

      const result: any = await service.inviteEmployees(
        ['john@example.com', 'john@example.com', 'jane@example.com'],
        'org123',
      );

      expect(employeeRepository.create).toHaveBeenCalledTimes(1);
      expect(result.skipped).toEqual([{ email: 'jane@example.com' }]);
    });

    it('reports emails that fail to create or dispatch', async () => {
      employeeRepository.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      employeeRepository.create.mockResolvedValueOnce({
        _id: INVITE_ID,
        email: 'john@example.com',
      });
      emailService.brevoEmailDispatcher
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('SMTP down'));

      const result: any = await service.inviteEmployees(
        ['john@example.com', 'jane@example.com'],
        'org123',
      );

      expect(result.invited).toHaveLength(1);
      expect(result.failed).toEqual([{ email: 'jane@example.com' }]);
    });

    it('throws 400 when the organization ID is missing', async () => {
      await expect(
        service.inviteEmployees(['john@example.com']),
      ).rejects.toThrow(AppException);
    });

    it('marks step 1 ("Adding and inviting new employee") as completed when inviting', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        employeeOnboardingSteps: [
          {
            stepId: 'step-1',
            stepName: 'Adding and inviting new employee',
            isCompleted: false,
            startedAt: null,
            completedAt: null,
            completionRequirements: [
              {
                step: 'Admin adds employment details',
                isCompleted: false,
                completedAt: null,
              },
              {
                step: 'Admin invites employees to Foundation HR',
                isCompleted: false,
                completedAt: null,
              },
            ],
          },
          {
            stepId: 'step-2',
            stepName: 'Self-enrolment',
            isCompleted: false,
            startedAt: null,
            completedAt: null,
            completionRequirements: [],
          },
        ],
      });
      employeeRepository.updateEmployee.mockResolvedValue(undefined);
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
        name: 'Acme Inc',
      });

      await service.inviteEmployees(['john@example.com'], ORG_ID);

      const updateWithSteps = employeeRepository.updateEmployee.mock.calls.find(
        (args) => args[1] && args[1].employeeOnboardingSteps,
      );
      expect(updateWithSteps).toBeDefined();
      const steps = (updateWithSteps as any)[1]
        .employeeOnboardingSteps as any[];
      expect(steps[0].stepName).toBe('Adding and inviting new employee');
      expect(steps[0].isCompleted).toBe(true);
      expect(steps[0].completedAt).toBeInstanceOf(Date);
      expect(steps[0].startedAt).toBeInstanceOf(Date);
      expect(steps[0].completionRequirements.every((r: any) => r.isCompleted)).toBe(
        true,
      );
      expect(steps[0].completionRequirements.every((r: any) => r.completedAt)).toBe(
        true,
      );
      // Step 2 remains untouched
      expect(steps[1].isCompleted).toBe(false);
    });
  });

  describe('employeeAcceptInvite', () => {
    const dto = { email: 'John@Example.com', orgSlug: 'acme' };

    it('marks the employee as having joined the organization', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: true,
      });

      const result = (await service.employeeAcceptInvite(dto as any)) as any;

      expect(employeeRepository.findByEmail).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(organizationRepository.findBySlug).toHaveBeenCalledWith('acme');
      expect(employeeRepository.updateById).toHaveBeenCalledWith(INVITE_ID, {
        hasJoinedOrg: true,
        organizationId: ORG_ID,
      });
      expect(result.hasJoinedOrg).toBe(true);
    });

    it('sets the organizationId when the employee has none yet', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: null,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        hasJoinedOrg: true,
        organizationId: ORG_ID,
      });

      await service.employeeAcceptInvite(dto as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(INVITE_ID, {
        hasJoinedOrg: true,
        organizationId: ORG_ID,
      });
    });

    it('throws 404 when the employee does not exist', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 404 when the organization does not exist', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
      });
      organizationRepository.findBySlug.mockResolvedValue(null);

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 403 when the invite does not match the employee organization', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: 'another-org',
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('returns the employee unchanged when already joined', async () => {
      const joined = {
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: true,
      };
      employeeRepository.findByEmail.mockResolvedValue(joined);
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      const result: any = await service.employeeAcceptInvite(dto as any);

      expect(result).toEqual({ hasJoinedOrg: true });
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 410 when the invite link has expired', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() - 1000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 410 when no expiry was recorded on the invite', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: null,
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeAcceptInvite(dto as any)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('employeeSetPassword', () => {
    const dto = {
      email: 'John@Example.com',
      password: 'supersecret',
      confirmPassword: 'supersecret',
      orgSlug: 'acme',
    };

    it('stores a hashed password and marks the employee as joined', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        hasJoinedOrg: false,
        inviteExpiresAt: new Date(Date.now() + 3600000),
        onboarding: null,
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        hasJoinedOrg: true,
      });

      const result: any = await service.employeeSetPassword(dto as any);

      const [, update] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      expect(result).toEqual({
        email: 'john@example.com',
        isEmailVerified: true,
      });
      expect(update.password).not.toBe('supersecret');
      expect(update.hasJoinedOrg).toBe(true);
      expect(update.onboarding.startedAt).toEqual(expect.any(Date));
    });

    it('mirrors the password onto the admin user record', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        inviteExpiresAt: new Date(Date.now() + 3600000),
        onboarding: null,
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });
      userRepository.findUser.mockResolvedValue({
        _id: ADMIN_ID,
        email: 'john@example.com',
      });

      await service.employeeSetPassword(dto as any);

      expect(userRepository.updateUser).toHaveBeenCalledWith(
        { _id: ADMIN_ID },
        expect.objectContaining({
          password: expect.not.stringContaining('supersecret'),
          isEmailVerified: true,
          resetToken: null,
        }),
      );
      const [, employeeUpdate] = employeeRepository.updateById.mock
        .calls[0] as [string, Record<string, any>];
      const [, adminUpdate] = userRepository.updateUser.mock.calls[0] as [
        Record<string, any>,
        Record<string, any>,
      ];
      expect(adminUpdate.password).toBe(employeeUpdate.password);
    });

    it('does not touch the admin record when the invitee has none', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        inviteExpiresAt: new Date(Date.now() + 3600000),
        onboarding: null,
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });
      userRepository.findUser.mockResolvedValue(null);

      await service.employeeSetPassword(dto as any);

      expect(userRepository.updateUser).not.toHaveBeenCalled();
    });

    it('preserves the existing onboarding start date', async () => {
      const startedAt = new Date('2024-01-01');
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        inviteExpiresAt: new Date(Date.now() + 3600000),
        onboarding: { startedAt },
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await service.employeeSetPassword(dto as any);

      const [, update] = employeeRepository.updateById.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      expect(update.onboarding.startedAt).toEqual(startedAt);
    });

    it('throws 404 when the employee does not exist', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);

      await expect(service.employeeSetPassword(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 403 when the invite does not match the employee organization', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: 'another-org',
        inviteExpiresAt: new Date(Date.now() + 3600000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeSetPassword(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws 410 when the invite link has expired', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        organizationId: ORG_ID,
        inviteExpiresAt: new Date(Date.now() - 1000),
      });
      organizationRepository.findBySlug.mockResolvedValue({
        _id: ORG_ID,
        slug: 'acme',
      });

      await expect(service.employeeSetPassword(dto as any)).rejects.toThrow(
        AppException,
      );
      expect(employeeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('onboarding (self-service)', () => {
    const EMAIL = 'john@example.com';
    const employee = (overrides: any = {}) => ({
      _id: INVITE_ID,
      email: EMAIL,
      firstName: 'John',
      lastName: 'Doe',
      hasJoinedOrg: true,
      status: EmployeeStatus.DRAFT,
      onboarding: null,
      contacts: [],
      ...overrides,
    });

    describe('getOnboarding', () => {
      it('returns the onboarding payload for an employee who has accepted', async () => {
        employeeRepository.findByEmail.mockResolvedValue(employee());

        const result: any = await service.getOnboarding(EMAIL);

        expect(employeeRepository.findByEmail).toHaveBeenCalledWith(EMAIL);
        expect(result).toEqual(
          expect.objectContaining({
            employeeId: INVITE_ID,
            email: EMAIL,
            completedSteps: [],
            progress: 0,
            status: EmployeeStatus.DRAFT,
          }),
        );
      });

      it('throws 403 when the invite has not been accepted', async () => {
        employeeRepository.findByEmail.mockResolvedValue(
          employee({ hasJoinedOrg: false }),
        );

        await expect(service.getOnboarding(EMAIL)).rejects.toThrow(
          AppException,
        );
      });

      it('throws 404 when the employee does not exist', async () => {
        employeeRepository.findByEmail.mockResolvedValue(null);

        await expect(service.getOnboarding(EMAIL)).rejects.toThrow(
          AppException,
        );
      });
    });

    describe('saveOnboardingBasicInformation', () => {
      it('persists personal details and marks the step complete', async () => {
        employeeRepository.findByEmail.mockResolvedValue(employee());
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingBasicInformation(EMAIL, {
          personalDetails: {
            phone: '08012345678',
            dateOfBirth: '1990-05-20',
            sex: 'male',
          },
        } as any);

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            'personalDetails.phone': '08012345678',
            'personalDetails.dateOfBirth': expect.any(Date),
            'personalDetails.sex': 'male',
            'onboarding.completedSteps': ['basic_information'],
            'onboarding.startedAt': expect.any(Date),
          }),
        );
      });

      it('normalizes blank values and only writes provided fields', async () => {
        employeeRepository.findByEmail.mockResolvedValue(employee());
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingBasicInformation(EMAIL, {
          homeAddress: { country: '' },
        } as any);

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            'homeAddress.country': null,
          }),
        );
        expect(
          (employeeRepository.updateById.mock.calls[0][1] as any)[
            'personalDetails.phone'
          ],
        ).toBeUndefined();
      });
    });

    describe('saveOnboardingAssociatedContacts', () => {
      it('replaces the contacts list and marks the step complete', async () => {
        employeeRepository.findByEmail.mockResolvedValue(employee());
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingAssociatedContacts(EMAIL, {
          contacts: [
            {
              type: 'emergency_contact',
              fullName: 'Jane Doe',
              phone: '09011111111',
            },
          ],
        } as any);

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            contacts: [
              {
                type: 'emergency_contact',
                fullName: 'Jane Doe',
                phone: '09011111111',
                relationship: null,
                email: null,
                address: null,
              },
            ],
            'onboarding.completedSteps': ['associated_contacts'],
          }),
        );
      });
    });

    describe('saveOnboardingFinanceInformation', () => {
      it('merges finance details and activates the employee on completion', async () => {
        employeeRepository.findByEmail.mockResolvedValue(
          employee({
            onboarding: {
              startedAt: new Date(),
              completedSteps: ['basic_information', 'associated_contacts'],
              completedAt: null,
            },
          }),
        );
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingFinanceInformation(EMAIL, {
          bankDetails: { bank: 'First bank', accountNumber: '0123456789' },
        } as any);

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            financeInformation: expect.objectContaining({
              bankDetails: expect.objectContaining({
                bank: 'First bank',
                accountNumber: '0123456789',
              }),
            }),
            'onboarding.completedSteps': [
              'basic_information',
              'associated_contacts',
              'finance_information',
            ],
            'onboarding.completedAt': expect.any(Date),
            status: EmployeeStatus.ACTIVE,
          }),
        );
      });

      it('preserves previously saved finance fields when sending partial data', async () => {
        employeeRepository.findByEmail.mockResolvedValue(
          employee({
            financeInformation: {
              bankDetails: { bank: 'GTCO', accountHolderName: 'John Doe' },
              pensionDetails: null,
              taxDetails: null,
            },
          }),
        );
        employeeRepository.updateById.mockResolvedValue(employee());

        await service.saveOnboardingFinanceInformation(EMAIL, {
          bankDetails: { bank: 'Zenith' },
        } as any);

        expect(employeeRepository.updateById).toHaveBeenCalledWith(
          INVITE_ID,
          expect.objectContaining({
            financeInformation: expect.objectContaining({
              bankDetails: expect.objectContaining({
                bank: 'Zenith',
                accountHolderName: 'John Doe',
              }),
            }),
          }),
        );
      });

      it('throws 403 when the invite has not been accepted', async () => {
        employeeRepository.findByEmail.mockResolvedValue(
          employee({ hasJoinedOrg: false }),
        );

        await expect(
          service.saveOnboardingFinanceInformation(EMAIL, {} as any),
        ).rejects.toThrow(AppException);
      });
    });
  });

  describe('getOrganisationHierarchy', () => {
    const toDoc = (data: any) => ({
      _id: data._id,
      toObject: () => data,
    });

    it('returns a flat list of employees with department, job title and supervisorId', async () => {
      employeeRepository.findByOrganization.mockResolvedValue([
        toDoc({
          _id: 'emp1',
          firstName: 'Priscilla',
          lastName: 'Jobi',
          jobTitle: 'Art director',
          department: 'Engineering',
          supervisor: null,
        }),
        toDoc({
          _id: 'emp2',
          firstName: 'Adam',
          lastName: 'Smith',
          jobTitle: 'Designer',
          department: 'Design',
          supervisor: 'emp1',
        }),
        toDoc({
          _id: 'emp3',
          firstName: 'Eve',
          lastName: 'Jones',
          jobTitle: 'Junior designer',
          department: 'Design',
          supervisor: 'emp2',
        }),
      ]);

      const result: any = await service.getOrganisationHierarchy(ORG_ID);

      expect(employeeRepository.findByOrganization).toHaveBeenCalledWith(
        ORG_ID,
        '_id firstName lastName employeeUniqueId department jobTitle supervisor',
      );
      expect(result).toEqual([
        {
          _id: 'emp1',
          firstName: 'Priscilla',
          lastName: 'Jobi',
          jobTitle: 'Art director',
          department: 'Engineering',
          supervisorId: null,
        },
        {
          _id: 'emp2',
          firstName: 'Adam',
          lastName: 'Smith',
          jobTitle: 'Designer',
          department: 'Design',
          supervisorId: 'emp1',
        },
        {
          _id: 'emp3',
          firstName: 'Eve',
          lastName: 'Jones',
          jobTitle: 'Junior designer',
          department: 'Design',
          supervisorId: 'emp2',
        },
      ]);
    });

    it('returns supervisorId as null for root employees', async () => {
      employeeRepository.findByOrganization.mockResolvedValue([
        toDoc({ _id: 'emp1', supervisor: null }),
      ]);

      const result: any = await service.getOrganisationHierarchy(ORG_ID);

      expect(result[0].supervisorId).toBeNull();
    });

    it('returns an empty array when the org has no employees', async () => {
      employeeRepository.findByOrganization.mockResolvedValue([]);

      const result: any = await service.getOrganisationHierarchy(ORG_ID);

      expect(result).toEqual([]);
    });
  });
});
