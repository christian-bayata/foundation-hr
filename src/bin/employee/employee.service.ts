import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppResponse } from '../../common/response/app-response';
import { EmailService } from '../../email/email.service';
import { MailDispatcherDto } from '../../email/dto/send-mail.dto';
import { employeeInviteTemplate } from '../../email/template/employee-invite.template';
import { StepOneDto } from './dto/step-one.dto';
import { StepTwoDto } from './dto/step-two.dto';
import { EmployeeStatus } from './enum/employee.enum';
import { EmployeeRepository } from './repository/employee.repository';
import {
  ListEmployeeFilters,
  ListEmployeeQuery,
  PaginatedResult,
} from './interface/employee.interface';

interface MongooseDuplicateError {
  code?: number;
}

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  /**
   * @Responsibility: Step 1 — Create a new employee draft with basic info
   *
   * @param stepOneDto - Basic info: firstName, lastName, middleName(optional),
   * employeeId, email, employmentDate
   * @returns The created employee draft
   *
   * @throws {409} Email or employee ID already exists
   */
  async createBasicInfo(stepOneDto: StepOneDto): Promise<unknown> {
    const {
      employeeType,
      firstName,
      lastName,
      middleName,
      employeeId,
      email,
      employmentDate,
    } = stepOneDto;

    try {
      const existingEmail = await this.employeeRepository.findOne({ email });
      const existingId = await this.employeeRepository.findByEmployeeId(
        employeeId,
      );

      if (existingEmail) {
        AppResponse.error({
          message: `An employee with this email already exists`,
          status: HttpStatus.CONFLICT,
        });
      }

      if (existingId) {
        AppResponse.error({
          message: `An employee with this ID already exists`,
          status: HttpStatus.CONFLICT,
        });
      }

      const employee = await this.employeeRepository.create({
        employeeType,
        firstName,
        lastName,
        middleName: middleName ?? null,
        employeeId,
        email: email.toLowerCase(),
        employmentDate: new Date(employmentDate),
        status: EmployeeStatus.DRAFT,
      });

      this.logger.log(`Employee draft created: ${email}`);

      return employee;
    } catch (error: any) {
      const duplicate = error as MongooseDuplicateError;
      if (duplicate?.code === 11000) {
        AppResponse.error({
          message: `An employee with this email or employee ID already exists`,
          status: HttpStatus.CONFLICT,
        });
      }
      error.location = `EmployeeServices.${this.createBasicInfo.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Step 2 — Save contract details for a draft employee
   *
   * @param employeeId - User-entered employee ID from basic info
   * @param stepTwoDto - Contract details: contractDuration, jobType, workMode,
   * probationPeriod(optional), department, jobTitle, supervisor(optional),
   * salary(optional), salaryCurrency(optional)
   * @returns The updated employee
   *
   * @throws {404} Employee not found
   * @throws {400} Employee already finalized
   */
  async saveContractDetails(
    employeeId: string,
    stepTwoDto: StepTwoDto,
  ): Promise<unknown> {
    const {
      contractDuration,
      jobType,
      workMode,
      probationPeriod,
      department,
      jobTitle,
      supervisor,
      salary,
      salaryCurrency,
    } = stepTwoDto;

    try {
      const employee =
        (await this.employeeRepository.findByEmployeeId(employeeId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (employee.status === EmployeeStatus.ACTIVE) {
        AppResponse.error({
          message: `Employee already finalized. Contract details cannot be updated.`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const updated = await this.employeeRepository.updateByEmployeeId(
        employeeId,
        {
          contractDuration,
          jobType,
          workMode,
          probationPeriod: probationPeriod ?? null,
          department,
          jobTitle,
          supervisor: supervisor ?? null,
          salary: salary ?? null,
          salaryCurrency: salaryCurrency ?? 'NGN',
        },
      );

      this.logger.log(`Contract details saved for employee: ${employeeId}`);

      return updated;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveContractDetails.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Fetch a single employee by employee ID (summary screen)
   *
   * @param employeeId - User-entered employee ID
   * @returns The employee document
   *
   * @throws {404} Employee not found
   */
  async getEmployee(employeeId: string): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findByEmployeeId(employeeId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      return employee;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.getEmployee.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Step 3 (Save draft) — Persist the employee as a draft,
   * ready to be invited later from the Onboarding page
   *
   * @param employeeId - User-entered employee ID
   * @returns The draft employee
   *
   * @throws {404} Employee not found
   */
  async saveDraft(employeeId: string): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findByEmployeeId(employeeId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (employee.status === EmployeeStatus.ACTIVE) {
        return employee;
      }

      const updated = await this.employeeRepository.updateByEmployeeId(
        employeeId,
        { status: EmployeeStatus.DRAFT },
      );

      this.logger.log(`Employee draft saved: ${employeeId}`);

      return updated;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveDraft.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Step 3 (Invite now) — Validate the employee is complete,
   * dispatch the invitation email, and mark the employee as active
   *
   * @param employeeId - User-entered employee ID
   * @returns The invited (active) employee
   *
   * @throws {404} Employee not found
   * @throws {400} Incomplete basics (Step 1) or contract details (Step 2)
   */
  async inviteEmployee(employeeId: string): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findByEmployeeId(employeeId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (employee.status === EmployeeStatus.ACTIVE) {
        AppResponse.error({
          message: `Employee already invited`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const missingBasics = [
        employee.firstName,
        employee.lastName,
        employee.employeeId,
        employee.email,
        employee.employmentDate,
      ].some((field) => !field);

      if (missingBasics) {
        AppResponse.error({
          message: `Basic information is incomplete. Please complete step 1.`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const missingContract = [
        employee.contractDuration,
        employee.jobType,
        employee.workMode,
        employee.department,
        employee.jobTitle,
      ].some((field) => !field);

      if (missingContract) {
        AppResponse.error({
          message: `Contract details are incomplete. Please complete step 2.`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const updated = await this.employeeRepository.updateByEmployeeId(
        employeeId,
        { status: EmployeeStatus.ACTIVE },
      );

      await this.dispatchInvite(
        employee.firstName,
        employee.email,
        employee.employeeId,
      );

      this.logger.log(`Employee invited: ${employeeId}`);

      return updated;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.inviteEmployee.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Build and dispatch the employee invitation email
   */
  private async dispatchInvite(
    firstName: string,
    email: string,
    employeeId: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const inviteLink = `${frontendUrl}/invite?employeeId=${employeeId}`;

    const payload: MailDispatcherDto = {
      to: email,
      from: 'Foundation HR <no-reply@foundationhr.com>',
      subject: 'You have been invited to join',
      html: employeeInviteTemplate(firstName, inviteLink),
    };

    await this.emailService.brevoEmailDispatcher(payload);
  }

  /**
   * @Responsibility: Retrieve employees in batches with free-text search,
   * filters, sorting and pagination
   *
   * @param query - Search/filter/sort/page parameters
   * @returns Paginated result: items, total, page, pageSize, totalPages
   */
  async listEmployees(
    query: ListEmployeeQuery,
  ): Promise<PaginatedResult<unknown>> {
    try {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 10;

      const filters: ListEmployeeFilters = {
        q: query.q,
        employeeType: query.employeeType,
        department: query.department,
        jobTitle: query.jobTitle,
        jobType: query.jobType,
        status: query.status,
        location: query.location,
      };

      const sort = this.buildSort(
        query.sortBy ?? 'createdAt',
        query.sortDir ?? 'desc',
      );

      const { items, total } = await this.employeeRepository.paginatedQuery(
        filters,
        sort,
        page,
        pageSize,
      );

      const totalPages = Math.ceil(total / pageSize);

      this.logger.log(`Retrieved ${items.length} employees (page ${page})`);

      return { items, total, page, pageSize, totalPages };
    } catch (error: any) {
      error.location = `EmployeeServices.${this.listEmployees.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Build a Mongo sort specifier, resolving the UI's sortable
   * 'name' alias to firstName+lastName
   */
  private buildSort(sortBy: string, sortDir: string): Record<string, 1 | -1> {
    const direction = sortDir === 'asc' ? 1 : -1;

    if (sortBy === 'name') {
      return { firstName: direction, lastName: direction };
    }

    return { [sortBy]: direction };
  }
}
