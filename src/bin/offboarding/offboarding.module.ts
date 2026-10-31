import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../employee/employee.module';
import { RequestModule } from '../request/request.module';
import { SettingModule } from '../setting/setting.module';
import {
  ExitTracking,
  ExitTrackingSchema,
} from './entity/exit-tracking.schema';
import { OffboardingController } from './offboarding.controller';
import { OffboardingService } from './offboarding.service';
import { ExitTrackingRepository } from './repository/exit-tracking.repository';
import { UserRoleRepository } from '../setting/access-control/repository/user-role.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../setting/access-control/entity/user-role.schema';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import {
  Organization,
  OrganizationSchema,
} from '../organization/entity/organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExitTracking.name, schema: ExitTrackingSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    RequestModule,
    EmployeeModule,
    SettingModule,
  ],
  controllers: [OffboardingController],
  providers: [
    OffboardingService,
    ExitTrackingRepository,
    UserRoleRepository,
    OrganizationRepository,
  ],
  exports: [OffboardingService],
})
export class OffboardingModule {}
