import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../employee/employee.module';
import { OrganizationModule } from '../organization/organization.module';
import { NotificationModule } from '../../generic/notification/notification.module';
import {
  LeaveBalance,
  LeaveBalanceSchema,
} from './entity/leave-balance.schema';
import {
  LeaveRequest,
  LeaveRequestSchema,
} from './entity/leave-request.schema';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveBalanceRepository } from './repository/leave-balance.repository';
import { LeaveRequestRepository } from './repository/leave-request.repository';
import { UserRoleRepository } from '../../generic/setting/access-control/repository/user-role.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../../generic/setting/access-control/entity/user-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
    NotificationModule,
  ],
  controllers: [LeaveController],
  providers: [
    LeaveService,
    LeaveRequestRepository,
    LeaveBalanceRepository,
    UserRoleRepository,
  ],
  exports: [LeaveService],
})
export class LeaveModule {}
