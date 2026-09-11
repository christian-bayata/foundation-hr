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

describe('EmployeeService', () => {
  let service: EmployeeService;
  let employeeRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findByEmployeeId: jest.Mock;
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
    const employeeId = 'FHR0001';
    const dto = {
      contractDuration: 'indefinite',
      jobType: 'full-time',
      workMode: 'hybrid',
      department: 'engineering',
      jobTitle: 'Backend Engineer',
    };

    it('updates contract details on a draft employee', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        employeeId,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateByEmployeeId.mockResolvedValue({
        employeeId,
        ...dto,
      });

      const result = await service.saveContractDetails(employeeId, dto as any);

      expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
        employeeId,
        expect.objectContaining({
          ...dto,
          salaryCurrency: 'NGN',
        }),
      );
      expect(result.jobTitle).toBe('Backend Engineer');
    });

    it('throws 404 when the employee is not found', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(
        service.saveContractDetails(employeeId, dto as any),
      ).rejects.toThrow(AppException);
    });

    it('throws 400 when the employee is already active', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        employeeId,
        status: EmployeeStatus.ACTIVE,
      });

      await expect(
        service.saveContractDetails(employeeId, dto as any),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getEmployee', () => {
    it('returns the employee', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        employeeId: 'FHR0001',
      });

      const result = await service.getEmployee('FHR0001');

      expect(result).toEqual({ employeeId: 'FHR0001' });
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(service.getEmployee('FHR9999')).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('saveDraft', () => {
    it('persists the employee as a draft', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        employeeId: 'FHR0001',
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateByEmployeeId.mockResolvedValue({
        employeeId: 'FHR0001',
        status: EmployeeStatus.DRAFT,
      });

      const result = await service.saveDraft('FHR0001');

      expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
        'FHR0001',
        { status: EmployeeStatus.DRAFT },
      );
      expect(result.status).toBe(EmployeeStatus.DRAFT);
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(service.saveDraft('FHR9999')).rejects.toThrow(AppException);
    });
  });

  describe('inviteEmployee', () => {
    const employee = {
      employeeId: 'FHR0001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      employmentDate: new Date('2024-01-15'),
      contractDuration: 'indefinite',
      jobType: 'full-time',
      workMode: 'hybrid',
      department: 'engineering',
      jobTitle: 'Backend Engineer',
      status: EmployeeStatus.DRAFT,
    };

    it('marks the employee active and sends an invite email', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue(employee);
      employeeRepository.updateByEmployeeId.mockResolvedValue({
        ...employee,
        status: EmployeeStatus.ACTIVE,
      });

      const result = await service.inviteEmployee('FHR0001');

      expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
        'FHR0001',
        { status: EmployeeStatus.ACTIVE },
      );
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'You have been invited to join',
        }),
      );
      expect(result.status).toBe(EmployeeStatus.ACTIVE);
    });

    it('throws 404 when not found', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(service.inviteEmployee('FHR9999')).rejects.toThrow(
        AppException,
      );
    });

    it('throws 400 when already active', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        ...employee,
        status: EmployeeStatus.ACTIVE,
      });

      await expect(service.inviteEmployee('FHR0001')).rejects.toThrow(
        AppException,
      );
    });

    it('throws 400 when basics are incomplete', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        ...employee,
        firstName: '',
      });

      await expect(service.inviteEmployee('FHR0001')).rejects.toThrow(
        AppException,
      );
    });

    it('throws 400 when contract details are incomplete', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        ...employee,
        jobTitle: null,
      });

      await expect(service.inviteEmployee('FHR0001')).rejects.toThrow(
        AppException,
      );
    });
  });
});
