import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './access-control/entity/role.schema';
import {
  UserRole,
  UserRoleSchema,
} from './access-control/entity/user-role.schema';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';
import { SettingsDomainAccessControlService } from './domain/settings.domain.access-control.service';
import { SettingsDomainOrganisationService } from './domain/settings.domain.organisation.service';
import { OrganisationController } from './organisation/organisation.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { RoleRepository } from './access-control/repository/role.repository';
import { UserRoleRepository } from './access-control/repository/user-role.repository';
import { InviteeUserRepository } from './access-control/repository/invitee-user.repository';
import { Invoice, InvoiceSchema } from './organisation/entity/invoice.schema';
import { InvoiceRepository } from './organisation/repository/invoice.repository';
import {
  OrganizationPolicy,
  OrganizationPolicySchema,
} from './organisation/entity/organization-policy.schema';
import { OrganizationPolicyRepository } from './organisation/repository/organization-policy.repository';
import { ROLE_SERVICE } from '../../common/guards/role.guard';
import { EmailModule } from '../../email/email.module';
import { OrganizationModule } from '../organization/organization.module';
import { EmployeeModule } from '../employee/employee.module';
import { FileUploadModule } from '../../file-upload/file-upload.module';
import { User, UserSchema } from '../auth/entity/user.schema';
import { AuthUtility } from '../auth/auth.utility';
import { JobTitleRepository } from '../organization/repository/job-title.repository';
import { EmployeeRepository } from '../employee/repository/employee.repository';
import {
  JobTitle,
  JobTitleSchema,
} from '../organization/entity/job-title.schema';
import { Employee, EmployeeSchema } from '../employee/entity/employee.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: OrganizationPolicy.name, schema: OrganizationPolicySchema },
      { name: JobTitle.name, schema: JobTitleSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    EmailModule,
    OrganizationModule,
    EmployeeModule,
    FileUploadModule,
  ],
  controllers: [SettingController, OrganisationController, NotificationsController],
  providers: [
    SettingService,
    SettingsDomainAccessControlService,
    SettingsDomainOrganisationService,
    RoleRepository,
    UserRoleRepository,
    InviteeUserRepository,
    InvoiceRepository,
    JobTitleRepository,
    EmployeeRepository,
    { provide: ROLE_SERVICE, useExisting: SettingsDomainAccessControlService },
    AuthUtility,
    JobTitleRepository,
    OrganizationPolicyRepository,
    EmployeeRepository,
  ],
  exports: [
    SettingService,
    SettingsDomainAccessControlService,
    SettingsDomainOrganisationService,
    ROLE_SERVICE,
  ],
})
export class SettingModule {}
