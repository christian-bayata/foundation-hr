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
import { RoleRepository } from './access-control/repository/role.repository';
import { UserRoleRepository } from './access-control/repository/user-role.repository';
import { InviteeUserRepository } from './access-control/repository/invitee-user.repository';
import { ROLE_SERVICE } from '../../common/guards/role.guard';
import { EmailModule } from '../../email/email.module';
import { OrganizationModule } from '../organization/organization.module';
import { EmployeeModule } from '../employee/employee.module';
import { User, UserSchema } from '../auth/entity/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EmailModule,
    OrganizationModule,
    EmployeeModule,
  ],
  controllers: [SettingController, OrganisationController],
  providers: [
    SettingService,
    SettingsDomainAccessControlService,
    SettingsDomainOrganisationService,
    RoleRepository,
    UserRoleRepository,
    InviteeUserRepository,
    { provide: ROLE_SERVICE, useExisting: SettingsDomainAccessControlService },
  ],
  exports: [
    SettingService,
    SettingsDomainAccessControlService,
    SettingsDomainOrganisationService,
    ROLE_SERVICE,
  ],
})
export class SettingModule {}
