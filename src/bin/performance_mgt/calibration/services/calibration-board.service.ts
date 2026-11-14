import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { AppraisalCycleRepository } from '../../appraisal/repositories/appraisal-cycle.repository';
import { CalibrationSessionRepository } from '../../appraisal/repositories/calibration-session.repository';
import { ParticipantAuditLogRepository } from '../../appraisal/repositories/participant-audit-log.repository';
import { CalibrationParticipantRepository } from '../repositories/calibration-participant.repository';
import { ListCalibrationParticipantsQueryDto } from '../dto/list-calibration-participants-query.dto';
import { CalibrateParticipantDto } from '../dto/calibrate-participant.dto';
import { UpdateJustificationDto } from '../dto/update-justification.dto';
import { UpdateCalibrationTargetsDto } from '../dto/update-targets.dto';
import { BulkCalibrateDto } from '../dto/bulk-calibrate.dto';
import {
  AppraisalCycleStatus,
  CalibrationParticipantStatus,
  CalibrationParticipantTab,
  CalibrationSessionStatus,
  CalibrationTimeInBox,
  ParticipantAuditAction,
} from '../../appraisal/enums/appraisal.enums';
import { CalibrationSessionDocument } from '../../appraisal/schemas/calibration-session.schema';
import { CalibrationParticipantDocument } from '../schemas/calibration-participant.schema';
import {
  CalibrationBandConfig,
  DEFAULT_CALIBRATION_BANDS,
  buildDepartmentDistribution,
  buildDistribution,
  buildGuidedDistribution,
  findOutOfRangeDepartments,
  normalizeBands,
  performanceLevelForBand,
  requiresJustification,
  resolveBandByScore,
} from '../util/calibration.util';

@Injectable()
export class CalibrationBoardService {
  private readonly logger = new Logger(CalibrationBoardService.name);

  constructor(
    private readonly cycleRepository: AppraisalCycleRepository,
    private readonly sessionRepository: CalibrationSessionRepository,
    private readonly participantRepository: CalibrationParticipantRepository,
    private readonly auditLogRepository: ParticipantAuditLogRepository,
  ) {}

  async getBoard(organizationId: string, sessionId: string) {
    const session = await this.requireSession(organizationId, sessionId);
    const participants = await this.participantRepository.findBySession(
      organizationId,
      sessionId,
    );
    const bands = this.bandsFor(session);
    const distribution = buildDistribution(
      participants,
      bands,
      session.tolerancePercent,
    );
    const departmentRows = await this.participantRepository.departmentDistribution(
      organizationId,
      sessionId,
    );

    return AppResponse.success('Calibration board retrieved', 200, {
      session: {
        sessionId: session._id.toString(),
        cycleId: session.cycleId,
        name: session.name,
        status: session.status,
        model: session.calibrationModel,
        tolerancePercent: session.tolerancePercent,
        guidedDistributionEnabled: session.guidedDistributionEnabled,
        targetDistribution: session.targetDistribution,
      },
      summary: this.buildBoardSummary(participants, distribution),
      distribution,
      departments: buildDepartmentDistribution(departmentRows),
      participants: participants.map((participant) =>
        this.toParticipantItem(participant),
      ),
    });
  }

  async listParticipants(
    organizationId: string,
    query: ListCalibrationParticipantsQueryDto,
  ) {
    await this.requireSession(organizationId, query.sessionId);

    const timeInBoxRange = this.timeInBoxRange(query.timeInBox);
    const result = await this.participantRepository.paginatedList(
      {
        sessionId: query.sessionId,
        tab: query.tab as unknown as
          | 'all'
          | 'needs_justification'
          | 'adjusted'
          | 'moved'
          | undefined,
        search: query.search,
        departmentCode: query.departmentCode,
        managerId: query.managerId,
        calibratedBand: query.calibratedBand,
        performanceLevel: query.performanceLevel,
        potential: query.potential,
        boxKey: query.boxKey,
        timeInBoxSinceBefore: timeInBoxRange.before,
        timeInBoxSinceAfter: timeInBoxRange.after,
        batch: query.batch,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      organizationId,
    );

    const [counts, departments] = await Promise.all([
      this.participantCounts(organizationId, query.sessionId),
      this.participantRepository.distinctValues(
        organizationId,
        query.sessionId,
        'departmentCode',
      ),
    ]);

    return AppResponse.success('Calibration participants retrieved', 200, {
      items: result.items.map((participant) =>
        this.toParticipantItem(participant),
      ),
      count: result.total,
      batch: query.batch ?? 1,
      limit: query.limit ?? 10,
      tabs: counts,
      departments: departments.filter(Boolean),
    });
  }

  async getDistribution(organizationId: string, sessionId: string) {
    const session = await this.requireSession(organizationId, sessionId);
    const participants = await this.participantRepository.findBySession(
      organizationId,
      sessionId,
    );
    const bands = this.bandsFor(session);
    const distribution = buildDistribution(
      participants,
      bands,
      session.tolerancePercent,
    );

    return AppResponse.success('Calibration distribution retrieved', 200, {
      sessionId,
      tolerancePercent: session.tolerancePercent,
      total: participants.length,
      distribution,
      outOfRange: distribution.filter((band) => !band.inRange),
    });
  }

  async getDepartmentDistribution(
    organizationId: string,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);
    const rows = await this.participantRepository.departmentDistribution(
      organizationId,
      sessionId,
    );
    const departments = buildDepartmentDistribution(rows);

    return AppResponse.success(
      'Calibration department distribution retrieved',
      200,
      {
        sessionId,
        departments,
        outOfRange: findOutOfRangeDepartments(
          departments,
          this.bandsFor(session),
          session.tolerancePercent,
        ),
      },
    );
  }

  async getOutOfRangeDepartments(
    organizationId: string,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);
    const rows = await this.participantRepository.departmentDistribution(
      organizationId,
      sessionId,
    );
    const outOfRange = findOutOfRangeDepartments(
      buildDepartmentDistribution(rows),
      this.bandsFor(session),
      session.tolerancePercent,
    );

    return AppResponse.success(
      'Out-of-range departments retrieved',
      200,
      {
        sessionId,
        count: outOfRange.length,
        items: outOfRange,
      },
    );
  }

  async getGuidedDistribution(organizationId: string, sessionId: string) {
    const session = await this.requireSession(organizationId, sessionId);
    const participants = await this.participantRepository.findBySession(
      organizationId,
      sessionId,
    );
    const suggestions = buildGuidedDistribution(
      participants,
      this.bandsFor(session),
    );

    return AppResponse.success('Guided distribution retrieved', 200, {
      sessionId,
      total: participants.length,
      suggestionCount: suggestions.length,
      suggestions,
    });
  }

  async calibrateParticipant(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
    appraisalId: string,
    dto: CalibrateParticipantDto,
  ) {
    const session = await this.requireActiveSession(organizationId, sessionId);
    const participant = await this.requireParticipant(
      organizationId,
      sessionId,
      appraisalId,
    );

    return AppResponse.success(
      'Participant calibrated',
      200,
      await this.applyCalibration(organizationId, user, session, participant, {
        calibratedRating: dto.calibratedRating,
        calibratedBand: dto.calibratedBand,
        justification: dto.justification,
      }),
    );
  }

  async updateJustification(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
    appraisalId: string,
    dto: UpdateJustificationDto,
  ) {
    const session = await this.requireActiveSession(organizationId, sessionId);
    const participant = await this.requireParticipant(
      organizationId,
      sessionId,
      appraisalId,
    );

    if (!participant.justificationRequired) {
      throw new BadRequestException(
        'This participant does not require a justification.',
      );
    }

    const previous = participant.justification;
    const justification = dto.justification.trim();
    const updated = await this.participantRepository.updateById(
      participant._id.toString(),
      {
        justification,
        status: CalibrationParticipantStatus.JUSTIFIED,
        updatedBy: user.userId,
      },
    );

    await this.auditLogRepository.create({
      organizationId,
      cycleId: session.cycleId,
      appraisalId: participant.appraisalId,
      employeeId: participant.employeeId,
      action: ParticipantAuditAction.JUSTIFICATION_ADDED,
      stage: 'final',
      previousValue: previous ?? null,
      newValue: justification,
      justification,
      actorId: user.userId,
      actorName: user.email ?? null,
      createdBy: user.userId,
    });

    return AppResponse.success(
      'Justification updated',
      200,
      updated ? this.toParticipantItem(updated) : null,
    );
  }

  async bulkCalibrate(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
    dto: BulkCalibrateDto,
  ) {
    const session = await this.requireActiveSession(organizationId, sessionId);
    const results: ReturnType<CalibrationBoardService['toParticipantItem']>[] =
      [];
    const errors: { appraisalId: string; message: string }[] = [];

    for (const item of dto.items) {
      const participant = await this.participantRepository.findBySessionAndAppraisal(
        organizationId,
        sessionId,
        item.appraisalId,
      );
      if (!participant) {
        errors.push({
          appraisalId: item.appraisalId,
          message: 'Participant not found in this session.',
        });
        continue;
      }

      const updated = await this.applyCalibration(
        organizationId,
        user,
        session,
        participant,
        {
          calibratedRating: item.calibratedRating,
          calibratedBand: item.calibratedBand,
          justification: item.justification,
        },
      );
      results.push(updated);
    }

    return AppResponse.success('Participants calibrated', 200, {
      updatedCount: results.length,
      skippedCount: errors.length,
      items: results,
      errors,
    });
  }

  async updateTargets(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
    dto: UpdateCalibrationTargetsDto,
  ) {
    const session = await this.requireSession(organizationId, sessionId);

    if (
      session.status === CalibrationSessionStatus.FINALISED ||
      session.status === CalibrationSessionStatus.LOCKED ||
      session.status === CalibrationSessionStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Targets cannot be changed after calibration is finalised.',
      );
    }

    const bands = dto.targetDistribution
      ? this.normalizeTargets(dto.targetDistribution)
      : undefined;

    const updated = await this.sessionRepository.updateById(sessionId, {
      ...(bands && { targetDistribution: bands }),
      ...(dto.guidedDistributionEnabled !== undefined && {
        guidedDistributionEnabled: dto.guidedDistributionEnabled,
      }),
      ...(dto.tolerancePercent !== undefined && {
        tolerancePercent: dto.tolerancePercent,
      }),
      updatedBy: user.userId,
    });

    return AppResponse.success('Calibration targets updated', 200, {
      sessionId,
      targetDistribution: updated?.targetDistribution ?? session.targetDistribution,
      guidedDistributionEnabled:
        updated?.guidedDistributionEnabled ?? session.guidedDistributionEnabled,
      tolerancePercent: updated?.tolerancePercent ?? session.tolerancePercent,
    });
  }

  async getAuditLog(organizationId: string, sessionId: string) {
    await this.requireSession(organizationId, sessionId);
    const participants = await this.participantRepository.findBySession(
      organizationId,
      sessionId,
    );

    const logs = (
      await Promise.all(
        participants.map((participant) =>
          this.auditLogRepository.findByAppraisal(
            organizationId,
            participant.appraisalId,
          ),
        ),
      )
    )
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      );

    return AppResponse.success('Calibration audit log retrieved', 200, {
      sessionId,
      count: logs.length,
      items: logs.map((log) => ({
        id: log._id.toString(),
        appraisalId: log.appraisalId,
        employeeId: log.employeeId,
        action: log.action,
        previousValue: log.previousValue,
        newValue: log.newValue,
        justification: log.justification,
        actorId: log.actorId,
        actorName: log.actorName,
        createdAt: log.createdAt,
      })),
    });
  }

  private async applyCalibration(
    organizationId: string,
    user: ICurrentUser,
    session: CalibrationSessionDocument,
    participant: CalibrationParticipantDocument,
    input: {
      calibratedRating?: number;
      calibratedBand?: string;
      justification?: string;
    },
  ) {
    const bands = this.bandsFor(session);
    const calibratedRating =
      input.calibratedRating ?? participant.calibratedRating;
    const calibratedBand =
      input.calibratedBand ??
      resolveBandByScore(calibratedRating, bands).key;
    const justification = input.justification?.trim()
      ? input.justification.trim()
      : participant.justification;
    const performanceLevel = performanceLevelForBand(calibratedBand, bands);
    const boxKey =
      performanceLevel && participant.potential
        ? `${performanceLevel}_${participant.potential}`
        : null;
    const performanceLevelChanged =
      performanceLevel !== participant.performanceLevel;
    const justificationRequired =
      participant.justificationRequired ||
      requiresJustification(participant.managerBand, calibratedBand, false);
    const isAdjusted =
      participant.managerBand !== calibratedBand ||
      participant.managerRating !== calibratedRating;

    const status = justificationRequired
      ? justification
        ? CalibrationParticipantStatus.JUSTIFIED
        : CalibrationParticipantStatus.ADJUSTED
      : isAdjusted
        ? CalibrationParticipantStatus.ADJUSTED
        : CalibrationParticipantStatus.PENDING;

    const updated = await this.participantRepository.updateById(
      participant._id.toString(),
      {
        calibratedRating,
        calibratedBand,
        performanceLevel,
        boxKey,
        justification: justification ?? null,
        justificationRequired,
        isAdjusted,
        status,
        ...(performanceLevelChanged && {
          previousBoxKey: participant.boxKey,
          movedThisSession: true,
          timeInBoxSince: new Date(),
        }),
        updatedBy: user.userId,
      },
    );

    if (
      participant.managerBand !== calibratedBand ||
      participant.calibratedRating !== calibratedRating
    ) {
      await this.auditLogRepository.create({
        organizationId,
        cycleId: session.cycleId,
        appraisalId: participant.appraisalId,
        employeeId: participant.employeeId,
        action: ParticipantAuditAction.RATING_ADJUSTED,
        stage: 'final',
        previousValue: `${participant.calibratedBand ?? ''}:${participant.calibratedRating}`,
        newValue: `${calibratedBand}:${calibratedRating}`,
        justification: justification ?? null,
        actorId: user.userId,
        actorName: user.email ?? null,
        createdBy: user.userId,
      });
    }

    return this.toParticipantItem(updated ?? participant);
  }

  private normalizeTargets(
    targets: {
      key: string;
      label: string;
      minScore: number;
      maxScore: number;
      targetPercent: number;
      performanceLevel: string;
    }[],
  ): CalibrationBandConfig[] {
    const bands = normalizeBands(
      targets.map((target) => ({
        key: target.key,
        label: target.label,
        minScore: target.minScore,
        maxScore: target.maxScore,
        targetPercent: target.targetPercent,
        performanceLevel:
          target.performanceLevel as CalibrationBandConfig['performanceLevel'],
      })),
    );

    const totalPercent = bands.reduce(
      (total, band) => total + band.targetPercent,
      0,
    );
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new BadRequestException(
        'Band target percentages must add up to 100.',
      );
    }

    return bands;
  }

  private bandsFor(session: CalibrationSessionDocument): CalibrationBandConfig[] {
    return session.targetDistribution && session.targetDistribution.length > 0
      ? normalizeBands(
          session.targetDistribution.map((band) => ({
            key: band.key,
            label: band.label,
            minScore: band.minScore,
            maxScore: band.maxScore,
            targetPercent: band.targetPercent,
            performanceLevel: band.performanceLevel,
          })),
        )
      : normalizeBands(DEFAULT_CALIBRATION_BANDS);
  }

  private async participantCounts(
    organizationId: string,
    sessionId: string,
  ): Promise<Record<string, number>> {
    const [all, needsJustification, adjusted, moved] = await Promise.all([
      this.participantRepository.countBySession(organizationId, sessionId),
      this.participantRepository.countAwaitingJustification(
        organizationId,
        sessionId,
      ),
      this.participantRepository.countAdjusted(organizationId, sessionId),
      this.participantRepository.countMoved(organizationId, sessionId),
    ]);

    return {
      [CalibrationParticipantTab.ALL]: all,
      [CalibrationParticipantTab.NEEDS_JUSTIFICATION]: needsJustification,
      [CalibrationParticipantTab.ADJUSTED]: adjusted,
      [CalibrationParticipantTab.MOVED]: moved,
    };
  }

  private buildBoardSummary(
    participants: CalibrationParticipantDocument[],
    distribution: { key: string; actualCount: number }[],
  ) {
    const awaitingJustification = participants.filter(
      (participant) =>
        participant.justificationRequired && !participant.justification,
    ).length;
    const averageScore =
      participants.length > 0
        ? participants.reduce(
            (total, participant) => total + participant.calibratedRating,
            0,
          ) / participants.length
        : 0;

    return {
      participantCount: participants.length,
      adjustedCount: participants.filter(
        (participant) => participant.isAdjusted,
      ).length,
      movedCount: participants.filter(
        (participant) => participant.movedThisSession,
      ).length,
      awaitingJustification,
      averageScore: Math.round(averageScore * 100) / 100,
      bandCounts: distribution.reduce<Record<string, number>>(
        (counts, band) => {
          counts[band.key] = band.actualCount;
          return counts;
        },
        {},
      ),
    };
  }

  private timeInBoxRange(timeInBox?: CalibrationTimeInBox): {
    before?: Date;
    after?: Date;
  } {
    if (!timeInBox) return {};
    const now = new Date();
    const monthsAgo = (months: number) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - months);
      return date;
    };

    switch (timeInBox) {
      case CalibrationTimeInBox.LT_3M:
        return { after: monthsAgo(3) };
      case CalibrationTimeInBox.FROM_3_6M:
        return { before: monthsAgo(3), after: monthsAgo(6) };
      case CalibrationTimeInBox.FROM_6_12M:
        return { before: monthsAgo(6), after: monthsAgo(12) };
      case CalibrationTimeInBox.GT_12M:
        return { before: monthsAgo(12) };
      default:
        return {};
    }
  }

  private toParticipantItem(participant: CalibrationParticipantDocument) {
    return {
      participantId: participant._id.toString(),
      appraisalId: participant.appraisalId,
      employeeId: participant.employeeId,
      employeeCode: participant.employeeCode,
      employeeName: participant.employeeName,
      employeeEmail: participant.employeeEmail,
      jobTitleName: participant.jobTitleName,
      departmentCode: participant.departmentCode,
      departmentName: participant.departmentName,
      managerId: participant.managerId,
      managerName: participant.managerName,
      baseScore: participant.baseScore,
      managerRating: participant.managerRating,
      managerBand: participant.managerBand,
      calibratedRating: participant.calibratedRating,
      calibratedBand: participant.calibratedBand,
      performanceLevel: participant.performanceLevel,
      potential: participant.potential,
      boxKey: participant.boxKey,
      previousBoxKey: participant.previousBoxKey,
      timeInBox: this.timeInBoxLabel(participant.timeInBoxSince),
      movedThisSession: participant.movedThisSession,
      justification: participant.justification,
      justificationRequired: participant.justificationRequired,
      isAdjusted: participant.isAdjusted,
      status: participant.status,
    };
  }

  private timeInBoxLabel(since: Date | null): CalibrationTimeInBox | null {
    if (!since) return null;
    const months =
      (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (months < 3) return CalibrationTimeInBox.LT_3M;
    if (months < 6) return CalibrationTimeInBox.FROM_3_6M;
    if (months < 12) return CalibrationTimeInBox.FROM_6_12M;
    return CalibrationTimeInBox.GT_12M;
  }

  private async requireParticipant(
    organizationId: string,
    sessionId: string,
    appraisalId: string,
  ): Promise<CalibrationParticipantDocument> {
    const participant =
      await this.participantRepository.findBySessionAndAppraisal(
        organizationId,
        sessionId,
        appraisalId,
      );
    if (!participant) {
      throw new NotFoundException(
        'Calibration participant not found in this session',
      );
    }
    return participant;
  }

  private async requireSession(
    organizationId: string,
    sessionId: string,
  ): Promise<CalibrationSessionDocument> {
    const session = await this.sessionRepository.findById(
      sessionId,
      organizationId,
    );
    if (!session) {
      throw new NotFoundException('Calibration session not found');
    }
    return session;
  }

  private async requireActiveSession(
    organizationId: string,
    sessionId: string,
  ): Promise<CalibrationSessionDocument> {
    const session = await this.requireSession(organizationId, sessionId);

    if (session.status !== CalibrationSessionStatus.ACTIVE) {
      throw new BadRequestException(
        'Calibration edits are only allowed while the session is active.',
      );
    }

    const cycle = await this.cycleRepository.findById(
      session.cycleId,
      organizationId,
    );
    if (!cycle || cycle.status === AppraisalCycleStatus.ENDED) {
      throw new BadRequestException(
        'Calibration cannot be changed for an ended appraisal cycle.',
      );
    }

    return session;
  }
}
