import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../employee/employee.module';
import { OrganizationModule } from '../organization/organization.module';
import { SettingModule } from '../../generic/setting/setting.module';
import { NotificationModule } from '../../generic/notification/notification.module';
import {
  EmployeeRequest,
  EmployeeRequestSchema,
} from './entity/request.schema';
import {
  RequestActivity,
  RequestActivitySchema,
  RequestCounter,
  RequestCounterSchema,
  RequestDelegation,
  RequestDelegationSchema,
  RequestDocument,
  RequestDocumentSchema,
  RequestSettings,
  RequestSettingsSchema,
  RequestTypeConfig,
  RequestTypeConfigSchema,
  RequestViewLog,
  RequestViewLogSchema,
} from './entity/request-flow.schema';
import { RequestController } from './request.controller';
import { RequestFlowController } from './request-flow.controller';
import { RequestFlowSettingsController } from './request-flow-settings.controller';
import { RequestService } from './request.service';
import { RequestFlowService } from './request-flow.service';
import { RequestRepository } from './repository/request.repository';
import {
  RequestActivityRepository,
  RequestCounterRepository,
  RequestDelegationRepository,
  RequestDocumentRepository,
  RequestSettingsRepository,
  RequestTypeConfigRepository,
  RequestViewLogRepository,
} from './repository/request-flow.repository';
import { RequestFormValidatorService } from './form/request-form-validator.service';
import { UserRoleRepository } from '../../generic/setting/access-control/repository/user-role.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../../generic/setting/access-control/entity/user-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployeeRequest.name, schema: EmployeeRequestSchema },
      { name: RequestActivity.name, schema: RequestActivitySchema },
      { name: RequestDocument.name, schema: RequestDocumentSchema },
      { name: RequestDelegation.name, schema: RequestDelegationSchema },
      { name: RequestViewLog.name, schema: RequestViewLogSchema },
      { name: RequestTypeConfig.name, schema: RequestTypeConfigSchema },
      { name: RequestSettings.name, schema: RequestSettingsSchema },
      { name: RequestCounter.name, schema: RequestCounterSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
    SettingModule,
    NotificationModule,
  ],
  controllers: [
    RequestController,
    RequestFlowController,
    RequestFlowSettingsController,
  ],
  providers: [
    RequestService,
    RequestFlowService,
    RequestRepository,
    RequestActivityRepository,
    RequestDocumentRepository,
    RequestDelegationRepository,
    RequestViewLogRepository,
    RequestTypeConfigRepository,
    RequestSettingsRepository,
    RequestCounterRepository,
    UserRoleRepository,
    RequestFormValidatorService,
  ],
  exports: [RequestService, RequestFlowService, RequestRepository],
})
export class RequestModule {}
