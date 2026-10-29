import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../employee/employee.module';
import { OrganizationModule } from '../organization/organization.module';
import { SettingModule } from '../setting/setting.module';
import {
  EmployeeRequest,
  EmployeeRequestSchema,
} from './entity/request.schema';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { RequestRepository } from './repository/request.repository';
import { RequestFormValidatorService } from './form/request-form-validator.service';
import { UserRoleRepository } from '../setting/access-control/repository/user-role.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../setting/access-control/entity/user-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployeeRequest.name, schema: EmployeeRequestSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
    SettingModule,
  ],
  controllers: [RequestController],
  providers: [
    RequestService,
    RequestRepository,
    UserRoleRepository,
    RequestFormValidatorService,
  ],
  exports: [RequestService],
})
export class RequestModule {}
