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
import { EmployeeUtility } from './repository/employee.utility';

interface MongooseDuplicateError {
  code?: number;
}

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @Inject(EmployeeRepository)
    private readonly employeeRepository: EmployeeRepository,
    @Inject(EmployeeUtility)
    private readonly employeeUtility: EmployeeUtility,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  /**
   * @Responsibility: Step 1 — Create a new employee draft with basic info, or
   * complete the basic info of an employee invited via an inviteId link
   *
   * @param stepOneDto - Basic info: firstName, lastName, middleName(optional),
   * employeeId, email, employmentDate, inviteId(optional)
   * @returns The created/updated employee draft
   *
   * @throws {409} Email or employee ID already exists
   */
  async createBasicInfo(stepOneDto: StepOneDto): Promise<unknown> {
    const {
      inviteId,
      employeeType,
      firstName,
      lastName,
      middleName,
      email,
      employmentDate,
    } = stepOneDto;

    try {
      if (inviteId) {
        const invited =
          (await this.employeeRepository.findById(inviteId)) ??
          AppResponse.error({
            message: `Employee not found`,
            status: HttpStatus.NOT_FOUND,
          });

        if (invited.status === EmployeeStatus.ACTIVE) {
          AppResponse.error({
            message: `Employee already completed onboarding`,
            status: HttpStatus.BAD_REQUEST,
          });
        }

        if (email?.toLowerCase() !== invited.email) {
          AppResponse.error({
            message: `Email does not match the invited account`,
            status: HttpStatus.BAD_REQUEST,
          });
        }

        const updated = await this.employeeRepository.updateById(inviteId, {
          employeeType,
          firstName,
          lastName,
          middleName: middleName ?? null,
          employmentDate: new Date(employmentDate),
        });

        this.logger.log(
          `Basic info completed for invited employee: ${inviteId}`,
        );

        return updated;
      }

      const existingEmail = await this.employeeRepository.findOne({ email });
      if (existingEmail) {
        AppResponse.error({
          message: `An employee with this email already exists`,
          status: HttpStatus.CONFLICT,
        });
      }

      const employee = await this.employeeRepository.create({
        employeeType,
        firstName,
        lastName,
        middleName: middleName ?? null,
        email: email.toLowerCase(),
        employeeUniqueId: this.employeeUtility.generateUniqueId(),
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
   * @Responsibility: Step 2 — Save contract details for a draft employee and
   * mark them active once onboarding is complete
   *
   * @param inviteId - Mongo ID of the employee (invite/onboarding reference)
   * @param stepTwoDto - Contract details: contractDuration, jobType, workMode,
   * probationPeriod(optional), department, jobTitle, supervisor(optional),
   * salary(optional), salaryCurrency(optional)
   * @returns The updated employee
   *
   * @throws {404} Employee not found
   * @throws {400} Employee already finalized
   */
  async saveContractDetails(
    inviteId: string,
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
        (await this.employeeRepository.findById(inviteId)) ??
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

      const updated = await this.employeeRepository.updateById(inviteId, {
        contractDuration,
        jobType,
        workMode,
        probationPeriod: probationPeriod ?? null,
        department,
        jobTitle,
        supervisor: supervisor ?? null,
        salary: salary ?? null,
        salaryCurrency: salaryCurrency ?? 'NGN',
        status: EmployeeStatus.ACTIVE,
      });

      this.logger.log(`Contract details saved for employee: ${inviteId}`);

      return updated;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveContractDetails.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Fetch a single employee by Mongo ID (summary screen)
   *
   * @param inviteId - Mongo ID of the employee (invite/onboarding reference)
   * @returns The employee document
   *
   * @throws {404} Employee not found
   */
  async getEmployee(inviteId: string): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findById(inviteId)) ??
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
   * @param inviteId - Mongo ID of the employee (invite/onboarding reference)
   * @returns The draft employee
   *
   * @throws {404} Employee not found
   */
  async saveDraft(inviteId: string): Promise<unknown> {
    try {
      const employee =
        (await this.employeeRepository.findById(inviteId)) ??
        AppResponse.error({
          message: `Employee not found`,
          status: HttpStatus.NOT_FOUND,
        });

      if (employee.status === EmployeeStatus.ACTIVE) {
        return employee;
      }

      const updated = await this.employeeRepository.updateById(inviteId, {
        status: EmployeeStatus.DRAFT,
      });

      this.logger.log(`Employee draft saved: ${inviteId}`);

      return updated;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.saveDraft.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Invite employees by email — for each new email a sparse
   * employee account (email + organizationId, status DRAFT) is created the
   * moment the invite email is dispatched. Existing accounts are skipped. The
   * employee completes the remaining details during onboarding.
   *
   * @param invitees - Array of invitee email addresses
   * @param organizationId - Organization that issues the invites
   * @returns Per-email result: invited, skipped, failed
   *
   * @throws {400} Organization ID missing
   */
  async inviteEmployees(
    invitees: string[],
    organizationId?: string,
  ): Promise<unknown> {
    try {
      if (!organizationId) {
        AppResponse.error({
          message: `Organization not set up. Please complete organization setup first.`,
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const emails = [
        ...new Set(invitees.map((email) => email.trim().toLowerCase())),
      ];

      const result = {
        invited: [] as { email: string; inviteId: string }[],
        skipped: [] as { email: string }[],
        failed: [] as { email: string }[],
      };

      for (const email of emails) {
        try {
          const existing = await this.employeeRepository.findByEmail(email);
          if (existing) {
            result.skipped.push({ email });
            continue;
          }

          const employee = await this.employeeRepository.create({
            email,
            organizationId,
            status: EmployeeStatus.DRAFT,
          });

          await this.dispatchInvite(employee);

          result.invited.push({
            email,
            inviteId: employee._id?.toString() ?? '',
          });
        } catch (error: any) {
          if (error?.code === 11000) {
            result.skipped.push({ email });
            continue;
          }
          this.logger.error(`Failed to invite ${email}: ${error?.message}`);
          result.failed.push({ email });
        }
      }

      this.logger.log(
        `Invited ${result.invited.length}, skipped ${result.skipped.length}, failed ${result.failed.length}`,
      );

      return result;
    } catch (error: any) {
      error.location = `EmployeeServices.${this.inviteEmployees.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Build and dispatch the employee invitation email
   */
  private async dispatchInvite(employee: any): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const inviteLink = `${frontendUrl}/invite?inviteId=${employee._id}`;

    const payload: MailDispatcherDto = {
      to: employee.email,
      from: 'Foundation HR <no-reply@foundationhr.com>',
      subject: 'You have been invited to join',
      html: employeeInviteTemplate(inviteLink),
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
      const batch = query?.batch ?? 1;
      const limit = query?.limit ?? 10;

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
        batch,
        limit,
      );

      return { data: items, count: total };
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
