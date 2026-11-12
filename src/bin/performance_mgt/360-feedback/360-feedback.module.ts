import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../../core_hr/employee/employee.module';
import { OrganizationModule } from '../../core_hr/organization/organization.module';
import {
  FeedbackCycle,
  FeedbackCycleSchema,
} from './schemas/360-feedback.schema';
import { Feedback, FeedbackSchema } from './schemas/360-feedback.schema';
import {
  FeedbackComment,
  FeedbackCommentSchema,
} from './schemas/360-feedback.schema';
import { FeedbackCycleRepository } from './repositories/feedback-cycle.repository';
import { FeedbackRepository } from './repositories/feedback.repository';
import { FeedbackCommentRepository } from './repositories/feedback-comment.repository';
import { FeedbackCyclesService } from './services/feedback-cycles.service';
import { FeedbackService } from './services/feedback.service';
import { FeedbackCommentsService } from './services/feedback-comments.service';
import { FeedbackCyclesController } from './controllers/feedback-cycles.controller';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackCommentsController } from './controllers/feedback-comments.controller';
import {
  UserRole,
  UserRoleSchema,
} from '../../generic/setting/access-control/entity/user-role.schema';
import { UserRoleRepository } from '../../generic/setting/access-control/repository/user-role.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedbackCycle.name, schema: FeedbackCycleSchema },
      { name: Feedback.name, schema: FeedbackSchema },
      { name: FeedbackComment.name, schema: FeedbackCommentSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
    EmployeeModule,
    OrganizationModule,
  ],
  controllers: [
    FeedbackCyclesController,
    FeedbackController,
    FeedbackCommentsController,
  ],
  providers: [
    FeedbackCycleRepository,
    FeedbackRepository,
    FeedbackCommentRepository,
    FeedbackCyclesService,
    FeedbackService,
    FeedbackCommentsService,
    UserRoleRepository,
  ],
  exports: [
    FeedbackCycleRepository,
    FeedbackRepository,
    FeedbackCommentRepository,
    FeedbackCyclesService,
    FeedbackService,
  ],
})
export class FeedbackModule {}
