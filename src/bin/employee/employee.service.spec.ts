import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/response/app-exception';
import { EmailService } from '../../email/email.service';
import { EmployeeRepository } from './repository/employee.repository';
import { EmployeeService } from './employee.service';
import { EmployeeStatus } from './enum/employee.enum';

const INVITE_ID = '64f1b2c3d4e5f678901234ab';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let employeeRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findByEmployeeId: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
    updateById: jest.Mock;
    updateByEmployeeId: jest.Mock;
    paginatedQuery: jest.Mock;
  };
  let emailService: { brevoEmailDispatcher: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    employeeRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      updateByEmployeeId: jest.fn(),
      paginatedQuery: jest.fn(),
    };
    emailService = {
      brevoEmailDispatcher: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:3000',
        };
        return map[key];
      }),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: EmployeeRepository, useValue: employeeRepository },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  describe('createBasicInfo', () => {
    const dto = {
      employeeType: 'employee',
      firstName: 'John',
      lastName: 'Doe',
      employeeId: 'FHR0001',
      email: 'john@example.com',
      employmentDate: '2024-01-15',
    };

    it('creates a draft employee', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      employeeRepository.findByEmployeeId.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        ...dto,
        status: EmployeeStatus.DRAFT,
      });

      const result = await service.createBasicInfo(dto as any);

      expect(employeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeType: 'employee',
          firstName: 'John',
          lastName: 'Doe',
          employeeId: 'FHR0001',
          email: 'john@example.com',
          employmentDate: expect.any(Date),
          status: EmployeeStatus.DRAFT,
        }),
      );
      expect(result.status).toBe(EmployeeStatus.DRAFT);
    });

    it('completes the basics of an invited employee when inviteId is provided', async () => {
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

      const result = await service.createBasicInfo({ ...dto, inviteId: INVITE_ID } as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          firstName: 'John',
          employeeType: 'employee',
          employmentDate: expect.any(Date),
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
        service.createBasicInfo({ ...dto, inviteId: INVITE_ID } as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 400 when the invited employee is already active', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'john@example.com',
        status: EmployeeStatus.ACTIVE,
      });

      await expect(
        service.createBasicInfo({ ...dto, inviteId: INVITE_ID } as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 409 when the email already exists', async () => {
      employeeRepository.findOne.mockResolvedValue({ email: dto.email });

      await expect(service.createBasicInfo(dto as any)).rejects.toThrow(
        AppException,
      );
    });

    it('throws 409 when the employee ID already exists', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      employeeRepository.findByEmployeeId.mockResolvedValue({
        employeeId: dto.employeeId,
      });

      await expect(service.createBasicInfo(dto as any)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('saveContractDetails', () => {
    const dto = {
      contractDuration: 'indefinite',
      jobType: 'full-time',
      workMode: 'hybrid',
      department: 'engineering',
      jobTitle: 'Backend Engineer',
    };

    it('updates contract details on a draft employee and activates it', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        ...dto,
        status: EmployeeStatus.ACTIVE,
      });

      const result = await service.saveContractDetails(INVITE_ID, dto as any);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({
          ...dto,
          salaryCurrency: 'NGN',
          status: EmployeeStatus.ACTIVE,
        }),
      );
      expect(result.jobTitle).toBe('Backend Engineer');
      expect(result.status).toBe(EmployeeStatus.ACTIVE);
    });

    it('throws 404 when the employee is not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(
        service.saveContractDetails(INVITE_ID, dto as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 400 when the employee is already active', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.ACTIVE,
      });

      await expect(
        service.saveContractDetails(INVITE_ID, dto as any),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getEmployee', () => {
    it('returns the employee', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
      });

      const result = await service.getEmployee(INVITE_ID);

      expect(result).toEqual({ _id: INVITE_ID });
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.getEmployee(INVITE_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('saveDraft', () => {
    it('persists the employee as a draft', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });

      const result = await service.saveDraft(INVITE_ID);

      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        { status: EmployeeStatus.DRAFT },
      );
      expect(result.status).toBe(EmployeeStatus.DRAFT);
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.saveDraft(INVITE_ID)).rejects.toThrow(AppException);
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
      });

      const result = await service.inviteEmployees(
        ['John@Example.com'],
        'org123',
      );

      expect(employeeRepository.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
      });
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'You have been invited to join',
          html: expect.stringContaining(`inviteId=${INVITE_ID}`),
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

      const result = await service.inviteEmployees(
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

      const result = await service.inviteEmployees(
        ['john@example.com', 'jane@example.com'],
        'org123',
      );

      expect(result.invited).toHaveLength(1);
      expect(result.failed).toEqual([{ email: 'jane@example.com' }]);
    });

    it('throws 400 when the organization ID is missing', async () => {
      await expect(service.inviteEmployees(['john@example.com'])).rejects.toThrow(
        AppException,
      );
    });
  });
});