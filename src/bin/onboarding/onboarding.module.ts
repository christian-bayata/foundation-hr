import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { Employee, EmployeeSchema } from '../employee/entity/employee.schema';
import { EmployeeModule } from '../employee/employee.module';
import { SettingModule } from '../setting/setting.module';
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
      { name: Employee.name, schema: EmployeeSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    EmployeeModule,
    SettingModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, UserRoleRepository, OrganizationRepository],
  exports: [OnboardingService],
})
export class OnboardingModule {}
