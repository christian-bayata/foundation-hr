import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../../core_hr/employee/employee.module';
import { OrganizationModule } from '../../core_hr/organization/organization.module';
import { Goal, GoalSchema } from './schemas/goal.schema';
import {
  GoalProgress,
  GoalProgressSchema,
} from './schemas/goal-progress.schema';
import { GoalRepository } from './repositories/goal.repository';
import { GoalProgressRepository } from './repositories/goal-progress.repository';
import { GoalSettingsService } from './services/goal-settings.service';
import { OrganisationGoalsController } from './controllers/organisation-goals.controller';
import { DepartmentGoalsController } from './controllers/department-goals.controller';
import { EmployeeGoalsController } from './controllers/employee-goals.controller';
import { GoalSettingsController } from './controllers/goal-settings.controller';
import { UserRoleRepository } from '../../generic/setting/access-control/repository/user-role.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../../generic/setting/access-control/entity/user-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Goal.name, schema: GoalSchema },
      { name: GoalProgress.name, schema: GoalProgressSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
  ],
  controllers: [
    OrganisationGoalsController,
    DepartmentGoalsController,
    EmployeeGoalsController,
    GoalSettingsController,
  ],
  providers: [
    GoalRepository,
    GoalProgressRepository,
    GoalSettingsService,
    UserRoleRepository,
  ],
  exports: [GoalRepository, GoalProgressRepository, GoalSettingsService],
})
export class GoalSettingModule {}
