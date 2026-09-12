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

const INVITE_ID = '64f1b2c3d4e5f678901234ab';

describe('EmployeeController (integration)', () => {
  let app: INestApplication<App>;
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
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            userId: 'usr123',
            email: 'admin@example.com',
            organizationId: 'org123',
          };
          return true;
        },
      })
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

    it('completes basic info for the employee invited via inviteId', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const res = await request(app.getHttpServer())
        .post('/employees/step-one')
        .send({ ...payload, inviteId: INVITE_ID });

      expect(res.status).toBe(201);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({ firstName: 'Jane' }),
      );
    });

    it('rejects when the email does not match the invited account', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'other@example.com',
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/step-one')
        .send({ ...payload, inviteId: INVITE_ID });

      expect(res.status).toBe(400);
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

  describe('POST /employees/step-two/:inviteId', () => {
    const payload = {
      contractDuration: 'indefinite',
      jobType: 'full-time',
      workMode: 'hybrid',
      department: 'engineering',
      jobTitle: 'Backend Engineer',
    };

    it('saves contract details and activates the employee', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        ...payload,
        salaryCurrency: 'NGN',
        status: EmployeeStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${INVITE_ID}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        expect.objectContaining({ status: EmployeeStatus.ACTIVE }),
      );
    });

    it('rejects an invalid inviteId', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/step-two/not-an-id')
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('rejects an invalid contract duration', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${INVITE_ID}`)
        .send({ ...payload, contractDuration: 'not-a-duration' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid work mode', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${INVITE_ID}`)
        .send({ ...payload, workMode: 'not-a-mode' });

      expect(res.status).toBe(400);
    });

    it('rejects a missing job title', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${INVITE_ID}`)
        .send({ ...payload, jobTitle: '' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid probation period', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/step-two/${INVITE_ID}`)
        .send({ ...payload, probationPeriod: '7 years' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /employees/:inviteId', () => {
    it('returns the employee for the summary screen', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
      });

      const res = await request(app.getHttpServer()).get(
        `/employees/${INVITE_ID}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('jane@example.com');
    });

    it('returns 404 for an unknown employee', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get(
        `/employees/${INVITE_ID}`,
      );

      expect(res.status).toBe(404);
    });
  });

  describe('POST /employees/:inviteId/save-draft', () => {
    it('saves the employee as a draft', async () => {
      employeeRepository.findById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });
      employeeRepository.updateById.mockResolvedValue({
        _id: INVITE_ID,
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer()).post(
        `/employees/${INVITE_ID}/save-draft`,
      );

      expect(res.status).toBe(200);
      expect(employeeRepository.updateById).toHaveBeenCalledWith(
        INVITE_ID,
        { status: EmployeeStatus.DRAFT },
      );
    });
  });

  describe('POST /employees/invite', () => {
    it('creates sparse employee accounts and sends invite emails', async () => {
      employeeRepository.findByEmail.mockResolvedValue(null);
      employeeRepository.create.mockResolvedValue({
        _id: INVITE_ID,
        email: 'jane@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .post('/employees/invite')
        .send({ invitees: ['Jane@Example.com'] });

      expect(res.status).toBe(200);
      expect(employeeRepository.create).toHaveBeenCalledWith({
        email: 'jane@example.com',
        organizationId: 'org123',
        status: EmployeeStatus.DRAFT,
      });
      expect(emailService.brevoEmailDispatcher).toHaveBeenCalled();
      expect(res.body.data.invited).toEqual([
        { email: 'jane@example.com', inviteId: INVITE_ID },
      ]);
    });

    it('skips emails that already have an employee account', async () => {
      employeeRepository.findByEmail.mockResolvedValue({
        email: 'jane@example.com',
      });

      const res = await request(app.getHttpServer())
        .post('/employees/invite')
        .send({ invitees: ['jane@example.com'] });

      expect(res.status).toBe(200);
      expect(employeeRepository.create).not.toHaveBeenCalled();
      expect(emailService.brevoEmailDispatcher).not.toHaveBeenCalled();
      expect(res.body.data.skipped).toEqual([
        { email: 'jane@example.com' },
      ]);
    });

    it('rejects an invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/invite')
        .send({ invitees: ['not-an-email'] });

      expect(res.status).toBe(400);
    });

    it('rejects an empty invite list', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees/invite')
        .send({ invitees: [] });

      expect(res.status).toBe(400);
    });
  });
});