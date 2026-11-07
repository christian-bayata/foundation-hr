import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../core_hr/employee/employee.module';
import { OrganizationModule } from '../core_hr/organization/organization.module';
import { Goal, GoalSchema } from './entity/goal.schema';
import {
  GoalProgress,
  GoalProgressSchema,
} from './entity/goal-progress.schema';
import { GoalPlan, GoalPlanSchema } from './entity/goal-plan.schema';
import { GoalRepository } from './repository/goal.repository';
import { GoalProgressRepository } from './repository/goal-progress.repository';
import { GoalPlanRepository } from './repository/goal-plan.repository';
import { GoalSettingsService } from './services/goal-settings.service';
import { GoalsService } from './services/goals.service';
import { GoalPlansService } from './services/goal-plans.service';
import { GoalSettingsController } from './controllers/goal-settings.controller';
import { GoalsController } from './controllers/goals.controller';
import { GoalPlansController } from './controllers/goal-plans.controller';
import { UserRoleRepository } from '../generic/setting/access-control/repository/user-role.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../generic/setting/access-control/entity/user-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Goal.name, schema: GoalSchema },
      { name: GoalProgress.name, schema: GoalProgressSchema },
      { name: GoalPlan.name, schema: GoalPlanSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
  ],
  controllers: [GoalSettingsController, GoalsController, GoalPlansController],
  providers: [
    GoalRepository,
    GoalProgressRepository,
    GoalPlanRepository,
    GoalSettingsService,
    GoalsService,
    GoalPlansService,
    UserRoleRepository,
  ],
  exports: [
    GoalRepository,
    GoalProgressRepository,
    GoalPlanRepository,
    GoalSettingsService,
    GoalsService,
    GoalPlansService,
  ],
})
export class PerformanceMgtModule {}
