import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../employee/employee.module';
import {
  LeaveRequest,
  LeaveRequestSchema,
} from '../leave/entity/leave-request.schema';
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
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User, UserSchema } from '../auth/entity/user.schema';
import { UserRoleRepository } from '../setting/access-control/repository/user-role.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../setting/access-control/entity/user-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: EmployeeRequest.name, schema: EmployeeRequestSchema },
      { name: ExitTracking.name, schema: ExitTrackingSchema },
      { name: User.name, schema: UserSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    LeaveRequestRepository,
    RequestRepository,
    ExitTrackingRepository,
    UserRoleRepository,
    UserRoleRepository,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
