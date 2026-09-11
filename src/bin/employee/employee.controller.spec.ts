import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailService } from '../../email/email.service';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeRepository } from './repository/employee.repository';
import { EmployeeStatus } from './enum/employee.enum';

describe('EmployeeController (integration)', () => {
  let app: INestApplication<App>;
  let employeeRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findByEmployeeId: jest.Mock;
    updateByEmployeeId: jest.Mock;
    paginatedQuery: jest.Mock;
  };
  let emailService: { brevoEmailDispatcher: jest.Mock };

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

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        EmployeeService,
        { provide: EmployeeRepository, useValue: employeeRepository },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3000' },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /employees/step-one', () => {
    const payload = {
      employeeType: 'employee',
      firstName: 'Jane',
      lastName: 'Smith',
      employeeId: 'FHR0042',
      email: 'jane@example.com',
      employmentDate: '2024-03-01',
    };

    it('creates a draft employee', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      employeeRepository.findByEmployeeId.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        ...payload,
        employmentDate: new Date(payload.employmentDate),
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/step-one')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(EmployeeStatus.DRAFT);
    });

    it('rejects an invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/step-one')
        .send({ ...payload, email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid employee type', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/step-one')
        .send({ ...payload, employeeType: 'freelancer' });

      expect(res.status).toBe(400);
    });

    it('rejects a missing employee type', async () => {
      const { employeeType: _, ...payloadWithoutType } = payload;
      const res = await request(app.getHttpServer())
        .post('/employees/step-one')
        .send(payloadWithoutType);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /employees/step-two/:employeeId', () => {
    const employeeId = 'FHR0042';
    const payload = {
      contractDuration: 'indefinite',
      jobType: 'full-time',
      workMode: 'hybrid',
      department: 'engineering',
      jobTitle: 'Backend Engineer',
    };

    it('saves contract details', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        employeeId,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateByEmployeeId.mockResolvedValue({
        employeeId,
        ...payload,
        salaryCurrency: 'NGN',
      });

      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${employeeId}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(employeeRepository.updateByEmployeeId).toHaveBeenCalled();
    });

    it('rejects an invalid contract duration', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${employeeId}`)
        .send({ ...payload, contractDuration: 'not-a-duration' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid work mode', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${employeeId}`)
        .send({ ...payload, workMode: 'not-a-mode' });

      expect(res.status).toBe(400);
    });

    it('rejects a missing job title', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${employeeId}`)
        .send({ ...payload, jobTitle: '' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid probation period', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${employeeId}`)
        .send({ ...payload, probationPeriod: '7 years' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /employees/:employeeId', () => {
    it('returns the employee for the summary screen', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        employeeId: 'FHR0042',
      });

      const res = await request(app.getHttpServer()).get(
        '/employees/FHR0042',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.employeeId).toBe('FHR0042');
    });

    it('returns 404 for an unknown employee', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get(
        '/employees/FHR9999',
      );

      expect(res.status).toBe(404);
    });
  });

  describe('POST /employees/:employeeId/save-draft', () => {
    it('saves the employee as a draft', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        employeeId: 'FHR0042',
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateByEmployeeId.mockResolvedValue({
        employeeId: 'FHR0042',
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer()).post(
        '/employees/FHR0042/save-draft',
      );

      expect(res.status).toBe(200);
      expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
        'FHR0042',
        { status: EmployeeStatus.DRAFT },
      );
    });
  });

  describe('POST /employees/:employeeId/invite', () => {
    const employee = {
      employeeId: 'FHR0042',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      employmentDate: new Date('2024-03-01'),
      contractDuration: 'indefinite',
      jobType: 'full-time',
      workMode: 'hybrid',
      department: 'engineering',
      jobTitle: 'Backend Engineer',
      status: EmployeeStatus.DRAFT,
    };

    it('invites the employee', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue(employee);
      employeeRepository.updateByEmployeeId.mockResolvedValue({
        ...employee,
        status: EmployeeStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer()).post(
        '/employees/FHR0042/invite',
      );

      expect(res.status).toBe(200);
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalled();
      expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
        'FHR0042',
        { status: EmployeeStatus.ACTIVE },
      );
    });

    it('returns 404 for an unknown employee', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).post(
        '/employees/FHR9999/invite',
      );

      expect(res.status).toBe(404);
    });

    it('returns 400 when contract details are incomplete', async () => {
      employeeRepository.findByEmployeeId.mockResolvedValue({
        ...employee,
        jobTitle: null,
      });

      const res = await request(app.getHttpServer()).post(
        '/employees/FHR0042/invite',
      );

      expect(res.status).toBe(400);
    });
  });
});
