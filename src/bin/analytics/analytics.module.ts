import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../employee/employee.module';
import {
  LeaveBalance,
  LeaveBalanceSchema,
} from '../leave/entity/leave-balance.schema';
import {
  LeaveRequest,
  LeaveRequestSchema,
} from '../leave/entity/leave-request.schema';
import { LeaveBalanceRepository } from '../leave/repository/leave-balance.repository';
import { LeaveRequestRepository } from '../leave/repository/leave-request.repository';
import {
  ExitTracking,
  ExitTrackingSchema,
} from '../offboarding/entity/exit-tracking.schema';
import { ExitTrackingRepository } from '../offboarding/repository/exit-tracking.repository';
import { OrganizationModule } from '../organization/organization.module';
import {
  EmployeeRequest,
  EmployeeRequestSchema,
} from '../request/entity/request.schema';
import { RequestRepository } from '../request/repository/request.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../setting/access-control/entity/user-role.schema';
import { UserRoleRepository } from '../setting/access-control/repository/user-role.repository';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: EmployeeRequest.name, schema: EmployeeRequestSchema },
      { name: ExitTracking.name, schema: ExitTrackingSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    LeaveRequestRepository,
    LeaveBalanceRepository,
    RequestRepository,
    ExitTrackingRepository,
    UserRoleRepository,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
