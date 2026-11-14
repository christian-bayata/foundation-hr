import { Module } from '@nestjs/common';
import { AppraisalModule } from '../appraisal/appraisal.module';
import { CalibrationSessionsService } from './services/calibration-sessions.service';
import { CalibrationBoardService } from './services/calibration-board.service';
import { CalibrationNineBoxService } from './services/calibration-nine-box.service';
import { CalibrationSessionsController } from './controllers/calibration-sessions.controller';
import { CalibrationBoardController } from './controllers/calibration-board.controller';
import { CalibrationNineBoxController } from './controllers/calibration-nine-box.controller';
import { UserRoleRepository } from '../../generic/setting/access-control/repository/user-role.repository';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserRole,
  UserRoleSchema,
} from '../../generic/setting/access-control/entity/user-role.schema';
import { OrganizationRepository } from '../../core_hr/organization/repository/organization.repository';
import {
  Organization,
  OrganizationSchema,
} from '../../core_hr/organization/entity/organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    AppraisalModule,
  ],
  controllers: [
    CalibrationSessionsController,
    CalibrationBoardController,
    CalibrationNineBoxController,
  ],
  providers: [
    CalibrationSessionsService,
    CalibrationBoardService,
    CalibrationNineBoxService,
    UserRoleRepository,
    OrganizationRepository,
  ],
  exports: [
    CalibrationSessionsService,
    CalibrationBoardService,
    CalibrationNineBoxService,
  ],
})
export class CalibrationModule {}
