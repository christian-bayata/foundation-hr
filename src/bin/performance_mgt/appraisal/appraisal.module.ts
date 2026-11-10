import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../../core_hr/employee/employee.module';
import { OrganizationModule } from '../../core_hr/organization/organization.module';
import { GoalSettingModule } from '../goal-setting/goal-settings.module';
import {
  AppraisalCycle,
  AppraisalCycleSchema,
} from './schemas/appraisal-cycle.schema';
import { Appraisal, AppraisalSchema } from './schemas/appraisal.schema';
import {
  AppraisalGoalScore,
  AppraisalGoalScoreSchema,
} from './schemas/appraisal-goal-score.schema';
import {
  AppraisalReview,
  AppraisalReviewSchema,
} from './schemas/appraisal-review.schema';
import {
  AppraisalBehavioural,
  AppraisalBehaviouralSchema,
} from './schemas/appraisal-behavioural.schema';
import {
  AppraisalComment,
  AppraisalCommentSchema,
} from './schemas/appraisal-comment.schema';
import { AppraisalCycleRepository } from './repositories/appraisal-cycle.repository';
import { AppraisalRepository } from './repositories/appraisal.repository';
import { AppraisalGoalScoreRepository } from './repositories/appraisal-goal-score.repository';
import { AppraisalReviewRepository } from './repositories/appraisal-review.repository';
import { AppraisalBehaviouralRepository } from './repositories/appraisal-behavioural.repository';
import { AppraisalCommentRepository } from './repositories/appraisal-comment.repository';
import { AppraisalCyclesService } from './services/appraisal-cycles.service';
import { AppraisalsService } from './services/appraisals.service';
import { AppraisalReviewsService } from './services/appraisal-reviews.service';
import { AppraisalCommentsService } from './services/appraisal-comments.service';
import { AppraisalCyclesController } from './controllers/appraisal-cycles.controller';
import { AppraisalsController } from './controllers/appraisals.controller';
import { AppraisalReviewsController } from './controllers/appraisal-reviews.controller';
import { AppraisalCommentsController } from './controllers/appraisal-comments.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppraisalCycle.name, schema: AppraisalCycleSchema },
      { name: Appraisal.name, schema: AppraisalSchema },
      { name: AppraisalGoalScore.name, schema: AppraisalGoalScoreSchema },
      { name: AppraisalReview.name, schema: AppraisalReviewSchema },
      {
        name: AppraisalBehavioural.name,
        schema: AppraisalBehaviouralSchema,
      },
      { name: AppraisalComment.name, schema: AppraisalCommentSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
    GoalSettingModule,
  ],
  controllers: [
    AppraisalCyclesController,
    AppraisalsController,
    AppraisalReviewsController,
    AppraisalCommentsController,
  ],
  providers: [
    AppraisalCycleRepository,
    AppraisalRepository,
    AppraisalGoalScoreRepository,
    AppraisalReviewRepository,
    AppraisalBehaviouralRepository,
    AppraisalCommentRepository,
    AppraisalCyclesService,
    AppraisalsService,
    AppraisalReviewsService,
    AppraisalCommentsService,
  ],
  exports: [
    AppraisalCycleRepository,
    AppraisalRepository,
    AppraisalCyclesService,
    AppraisalsService,
  ],
})
export class AppraisalModule {}
