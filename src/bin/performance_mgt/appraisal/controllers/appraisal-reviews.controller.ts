import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { SystemRole } from '../../../generic/auth/enum/role.enum';
import { AppraisalReviewsService } from '../services/appraisal-reviews.service';
import { SubmitSelfAssessmentDto } from '../dto/submit-self-assessment.dto';
import { SubmitManagerReviewDto } from '../dto/submit-manager-review.dto';
import { SubmitFinalReviewDto } from '../dto/submit-final-review.dto';
import { SubmitBehaviouralDto } from '../dto/submit-behavioural.dto';
import { UpdateGoalActualsDto } from '../dto/update-goal-actuals.dto';

const REVIEW_ROLES = [
  SystemRole.COMPANY_OWNER,
  SystemRole.HR_ADMIN,
  SystemRole.HR_OPS,
  SystemRole.DEPT_MANAGER,
  SystemRole.EMPLOYEE,
] as const;

@Controller('performance-management/appraisals')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AppraisalReviewsController {
  constructor(
    private readonly appraisalReviewsService: AppraisalReviewsService,
  ) {}

  @Patch('self-assessment/submit')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  async submitSelfAssessment(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: SubmitSelfAssessmentDto,
  ) {
    return this.appraisalReviewsService.submitSelfAssessment(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }

  @Patch('manager-review/submit')
  @Roles(
    SystemRole.COMPANY_OWNER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_OPS,
    SystemRole.DEPT_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  async submitManagerReview(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: SubmitManagerReviewDto,
  ) {
    return this.appraisalReviewsService.submitManagerReview(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }

  @Patch('final-review/submit')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN, SystemRole.HR_OPS)
  @HttpCode(HttpStatus.OK)
  async submitFinalReview(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: SubmitFinalReviewDto,
  ) {
    return this.appraisalReviewsService.submitFinalReview(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }

  @Patch('behavioural-assessment/submit')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  async submitBehavioural(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: SubmitBehaviouralDto,
  ) {
    return this.appraisalReviewsService.submitBehavioural(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }

  @Patch('goals/actuals/update')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  async updateGoalActuals(
    @CurrentUser() user: ICurrentUser,
    @Query('appraisalId') appraisalId: string,
    @Body() dto: UpdateGoalActualsDto,
  ) {
    return this.appraisalReviewsService.updateGoalActuals(
      user.organizationId!,
      user,
      appraisalId,
      dto,
    );
  }
}
