import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser as ICurrentUser } from '../../../../common';
import { AppResponse } from '../../../../common/response/app-response';
import { AppraisalCycleRepository } from '../../appraisal/repositories/appraisal-cycle.repository';
import { AppraisalRepository } from '../../appraisal/repositories/appraisal.repository';
import { CalibrationSessionRepository } from '../../appraisal/repositories/calibration-session.repository';
import { ParticipantAuditLogRepository } from '../../appraisal/repositories/participant-audit-log.repository';
import { CalibrationParticipantRepository } from '../repositories/calibration-participant.repository';
import { CreateCalibrationSessionDto } from '../dto/create-calibration-session.dto';
import { UpdateCalibrationSessionDto } from '../dto/update-calibration-session.dto';
import { ListCalibrationSessionsQueryDto } from '../dto/list-calibration-sessions-query.dto';
import {
  AppraisalRatingTag,
  CalibrationModel,
  CalibrationParticipantStatus,
  CalibrationSessionStatus,
  ParticipantAuditAction,
} from '../../appraisal/enums/appraisal.enums';
import { CalibrationSessionDocument } from '../../appraisal/schemas/calibration-session.schema';
import { AppraisalCycleDocument } from '../../appraisal/schemas/appraisal-cycle.schema';
import { AppraisalCycleStatus } from '../../appraisal/enums/appraisal.enums';
import { resolveRatingTag } from '../../appraisal/util/appraisal-scoring.util';
import {
  CalibrationBandConfig,
  DEFAULT_CALIBRATION_BANDS,
  normalizeBands,
  performanceLevelForBand,
  resolveBandByScore,
} from '../util/calibration.util';

const EDITABLE_SESSION_STATUSES: CalibrationSessionStatus[] = [
  CalibrationSessionStatus.DRAFT,
  CalibrationSessionStatus.SCHEDULED,
  CalibrationSessionStatus.ACTIVE,
];

@Injectable()
export class CalibrationSessionsService {
  private readonly logger = new Logger(CalibrationSessionsService.name);

  constructor(
    private readonly cycleRepository: AppraisalCycleRepository,
    private readonly appraisalRepository: AppraisalRepository,
    private readonly sessionRepository: CalibrationSessionRepository,
    private readonly participantRepository: CalibrationParticipantRepository,
    private readonly auditLogRepository: ParticipantAuditLogRepository,
  ) {}

  async listSessions(
    organizationId: string,
    query: ListCalibrationSessionsQueryDto,
  ) {
    if (query.cycleId) {
      await this.requireCycle(organizationId, query.cycleId);
    }

    const result = await this.sessionRepository.paginatedList(
      {
        cycleId: query.cycleId,
        search: query.search,
        status: query.status,
        model: query.model,
        departmentCode: query.departmentCode,
        ownerId: query.ownerId,
        batch: query.batch,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      organizationId,
    );
    const statusCounts = await this.sessionRepository.countByStatus(
      organizationId,
      query.cycleId,
    );

    return AppResponse.success('Calibration sessions retrieved', 200, {
      items: result.items.map((session) => this.toListItem(session)),
      count: result.total,
      batch: query.batch ?? 1,
      limit: query.limit ?? 10,
      summary: this.buildStatusSummary(statusCounts),
    });
  }

  async getSession(organizationId: string, sessionId: string) {
    const session = await this.requireSession(organizationId, sessionId);
    const [cycle, participantCount, adjustedCount, awaitingJustification] =
      await Promise.all([
        this.cycleRepository.findById(session.cycleId, organizationId),
        this.participantRepository.countBySession(organizationId, sessionId),
        this.participantRepository.countAdjusted(organizationId, sessionId),
        this.participantRepository.countAwaitingJustification(
          organizationId,
          sessionId,
        ),
      ]);

    return AppResponse.success('Calibration session retrieved', 200, {
      ...this.toDetail(session),
      cycle: cycle
        ? {
            id: cycle._id.toString(),
            name: cycle.name,
            code: cycle.code,
            status: cycle.status,
            startDate: cycle.startDate,
            endDate: cycle.endDate,
          }
        : null,
      stats: {
        participantCount,
        adjustedCount,
        awaitingJustification,
        finalisedCount: session.finalisedCount,
      },
    });
  }

  async createSession(
    organizationId: string,
    user: ICurrentUser,
    dto: CreateCalibrationSessionDto,
  ) {
    const cycle = await this.requireEditableCycle(
      organizationId,
      dto.cycleId,
    );

    const bands = this.resolveBands(dto.targetDistribution);
    const session = await this.sessionRepository.create({
      organizationId,
      cycleId: cycle._id.toString(),
      name: dto.name,
      description: dto.description ?? null,
      calibrationModel: dto.model ?? CalibrationModel.RATING_DISTRIBUTION,
      status: dto.status ?? CalibrationSessionStatus.DRAFT,
      sessionOwnerId: dto.sessionOwnerId ?? user.userId,
      sessionOwnerName: dto.sessionOwnerName ?? user.email,
      departmentCode: dto.departmentCode ?? null,
      departmentIds: dto.departmentIds ?? [],
      departmentCodes: dto.departmentCodes ?? [],
      includeAllDepartments: dto.includeAllDepartments ?? true,
      targetDistribution: bands,
      guidedDistributionEnabled: dto.guidedDistributionEnabled ?? true,
      tolerancePercent: dto.tolerancePercent ?? 5,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      participantCount: 0,
      finalisedCount: 0,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const participantCount = await this.populateParticipants(
      organizationId,
      session,
      bands,
    );
    const updated = await this.sessionRepository.updateById(
      session._id.toString(),
      { participantCount },
    );

    return AppResponse.success(
      'Calibration session created',
      201,
      updated ?? session,
    );
  }

  async updateSession(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
    dto: UpdateCalibrationSessionDto,
  ) {
    const session = await this.requireSession(organizationId, sessionId);

    if (!EDITABLE_SESSION_STATUSES.includes(session.status)) {
      throw new BadRequestException(
        'This calibration session can no longer be edited.',
      );
    }

    const bands = dto.targetDistribution
      ? this.resolveBands(dto.targetDistribution)
      : undefined;

    const updated = await this.sessionRepository.updateById(sessionId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && {
        description: dto.description ?? null,
      }),
      ...(dto.model !== undefined && { calibrationModel: dto.model }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.sessionOwnerId !== undefined && {
        sessionOwnerId: dto.sessionOwnerId ?? null,
      }),
      ...(dto.sessionOwnerName !== undefined && {
        sessionOwnerName: dto.sessionOwnerName ?? null,
      }),
      ...(dto.departmentCode !== undefined && {
        departmentCode: dto.departmentCode ?? null,
      }),
      ...(dto.departmentIds !== undefined && {
        departmentIds: dto.departmentIds,
      }),
      ...(dto.departmentCodes !== undefined && {
        departmentCodes: dto.departmentCodes,
      }),
      ...(dto.includeAllDepartments !== undefined && {
        includeAllDepartments: dto.includeAllDepartments,
      }),
      ...(bands && { targetDistribution: bands }),
      ...(dto.guidedDistributionEnabled !== undefined && {
        guidedDistributionEnabled: dto.guidedDistributionEnabled,
      }),
      ...(dto.tolerancePercent !== undefined && {
        tolerancePercent: dto.tolerancePercent,
      }),
      ...(dto.startsAt !== undefined && {
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      }),
      ...(dto.endsAt !== undefined && {
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      }),
      updatedBy: user.userId,
    });

    return AppResponse.success(
      'Calibration session updated',
      200,
      updated ?? session,
    );
  }

  async removeSession(
    organizationId: string,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);

    if (session.status === CalibrationSessionStatus.LOCKED) {
      throw new BadRequestException(
        'Locked calibration sessions cannot be removed.',
      );
    }

    await this.participantRepository.deleteBySession(organizationId, sessionId);
    await this.sessionRepository.deleteById(sessionId);

    return AppResponse.success('Calibration session removed', 200, {
      sessionId,
    });
  }

  async startSession(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);
    await this.requireEditableCycle(organizationId, session.cycleId);

    if (
      session.status !== CalibrationSessionStatus.DRAFT &&
      session.status !== CalibrationSessionStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Only draft or scheduled sessions can be started.',
      );
    }

    const now = new Date();
    const updated = await this.sessionRepository.updateById(sessionId, {
      status: CalibrationSessionStatus.ACTIVE,
      startedAt: now,
      updatedBy: user.userId,
    });

    await this.writeParticipantAudits(
      organizationId,
      session,
      user,
      ParticipantAuditAction.SESSION_STARTED,
      'Calibration session started',
    );

    return AppResponse.success(
      'Calibration session started',
      200,
      updated ?? session,
    );
  }

  async finaliseSession(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);
    await this.requireEditableCycle(organizationId, session.cycleId);

    if (session.status !== CalibrationSessionStatus.ACTIVE) {
      throw new BadRequestException(
        'Only active sessions can be finalised.',
      );
    }

    const participants = await this.participantRepository.findBySession(
      organizationId,
      sessionId,
    );

    if (participants.length === 0) {
      throw new BadRequestException(
        'This session has no participants to finalise.',
      );
    }

    const missingJustification = participants.filter(
      (participant) =>
        participant.justificationRequired &&
        !participant.justification?.trim(),
    );

    if (missingJustification.length > 0) {
      throw new BadRequestException(
        `${missingJustification.length} participant(s) still require a justification before finalising.`,
      );
    }

    const now = new Date();
    const audits: Parameters<
      ParticipantAuditLogRepository['createMany']
    >[0] = [];

    for (const participant of participants) {
      const calibratedTag = Object.values(AppraisalRatingTag).includes(
        participant.calibratedBand as AppraisalRatingTag,
      )
        ? (participant.calibratedBand as AppraisalRatingTag)
        : resolveRatingTag(participant.calibratedRating);

      await this.appraisalRepository.updateById(participant.appraisalId, {
        calibratedRating: participant.calibratedRating,
        ratingTag: calibratedTag,
        updatedBy: user.userId,
      });

      await this.participantRepository.updateById(
        participant._id.toString(),
        {
          status: this.participantStatusFor(participant),
          finalisedAt: now,
          finalisedBy: user.userId,
          updatedBy: user.userId,
        },
      );

      if (participant.isAdjusted) {
        audits.push({
          organizationId,
          cycleId: session.cycleId,
          appraisalId: participant.appraisalId,
          employeeId: participant.employeeId,
          action: ParticipantAuditAction.CALIBRATE,
          stage: 'final',
          previousValue: String(participant.managerRating ?? ''),
          newValue: String(participant.calibratedRating ?? ''),
          justification: participant.justification ?? null,
          actorId: user.userId,
          actorName: user.email ?? null,
          createdBy: user.userId,
        });
      }
    }

    if (audits.length > 0) {
      await this.auditLogRepository.createMany(audits);
    }

    const updated = await this.sessionRepository.updateById(sessionId, {
      status: CalibrationSessionStatus.FINALISED,
      finalisedAt: now,
      finalisedBy: user.userId,
      finalisedCount: participants.length,
      updatedBy: user.userId,
    });

    await this.writeParticipantAudits(
      organizationId,
      session,
      user,
      ParticipantAuditAction.SESSION_FINALISED,
      'Calibration session finalised',
    );

    return AppResponse.success(
      'Calibration session finalised',
      200,
      updated ?? session,
    );
  }

  async lockSession(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);

    if (session.status !== CalibrationSessionStatus.FINALISED) {
      throw new BadRequestException(
        'Only finalised sessions can be locked.',
      );
    }

    const now = new Date();
    const updated = await this.sessionRepository.updateById(sessionId, {
      status: CalibrationSessionStatus.LOCKED,
      lockedAt: now,
      lockedBy: user.userId,
      updatedBy: user.userId,
    });

    await this.writeParticipantAudits(
      organizationId,
      session,
      user,
      ParticipantAuditAction.SESSION_LOCKED,
      'Calibration session locked',
    );

    return AppResponse.success(
      'Calibration session locked',
      200,
      updated ?? session,
    );
  }

  async closeSession(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);

    if (
      session.status !== CalibrationSessionStatus.FINALISED &&
      session.status !== CalibrationSessionStatus.LOCKED
    ) {
      throw new BadRequestException(
        'Only finalised or locked sessions can be closed.',
      );
    }

    const updated = await this.sessionRepository.updateById(sessionId, {
      status: CalibrationSessionStatus.CLOSED,
      updatedBy: user.userId,
    });

    return AppResponse.success(
      'Calibration session closed',
      200,
      updated ?? session,
    );
  }

  async reopenSession(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);
    await this.requireEditableCycle(organizationId, session.cycleId);

    if (session.status !== CalibrationSessionStatus.FINALISED) {
      throw new BadRequestException(
        'Only finalised sessions can be reopened.',
      );
    }

    const updated = await this.sessionRepository.updateById(sessionId, {
      status: CalibrationSessionStatus.ACTIVE,
      finalisedAt: null,
      finalisedBy: null,
      updatedBy: user.userId,
    });

    return AppResponse.success(
      'Calibration session reopened',
      200,
      updated ?? session,
    );
  }

  async getSummary(
    organizationId: string,
    cycleId?: string,
  ) {
    if (cycleId) {
      await this.requireCycle(organizationId, cycleId);
    }

    const statusCounts = await this.sessionRepository.countByStatus(
      organizationId,
      cycleId,
    );

    return AppResponse.success('Calibration summary retrieved', 200, {
      totalSessions: Object.values(statusCounts).reduce(
        (total, count) => total + count,
        0,
      ),
      ...this.buildStatusSummary(statusCounts),
    });
  }

  async duplicateSession(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
  ) {
    const session = await this.requireSession(organizationId, sessionId);
    await this.requireEditableCycle(organizationId, session.cycleId);

    const copy = await this.sessionRepository.create({
      organizationId,
      cycleId: session.cycleId,
      name: `${session.name} (copy)`,
      description: session.description,
      calibrationModel: session.calibrationModel,
      status: CalibrationSessionStatus.DRAFT,
      sessionOwnerId: session.sessionOwnerId,
      sessionOwnerName: session.sessionOwnerName,
      departmentCode: session.departmentCode,
      departmentIds: session.departmentIds,
      departmentCodes: session.departmentCodes,
      includeAllDepartments: session.includeAllDepartments,
      targetDistribution: session.targetDistribution,
      guidedDistributionEnabled: session.guidedDistributionEnabled,
      tolerancePercent: session.tolerancePercent,
      participantCount: 0,
      finalisedCount: 0,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const participants = await this.participantRepository.findBySession(
      organizationId,
      sessionId,
    );

    if (participants.length > 0) {
      await this.participantRepository.createMany(
        participants.map((participant) => ({
          organizationId,
          cycleId: participant.cycleId,
          sessionId: copy._id.toString(),
          appraisalId: participant.appraisalId,
          employeeId: participant.employeeId,
          employeeCode: participant.employeeCode,
          employeeName: participant.employeeName,
          employeeEmail: participant.employeeEmail,
          jobTitleCode: participant.jobTitleCode,
          jobTitleName: participant.jobTitleName,
          departmentId: participant.departmentId,
          departmentCode: participant.departmentCode,
          departmentName: participant.departmentName,
          managerId: participant.managerId,
          managerName: participant.managerName,
          managerEmail: participant.managerEmail,
          baseScore: participant.baseScore,
          managerRating: participant.managerRating,
          managerRatingTag: participant.managerRatingTag,
          managerBand: participant.managerBand,
          calibratedRating: participant.calibratedRating,
          calibratedBand: participant.calibratedBand,
          performanceLevel: participant.performanceLevel,
          potential: participant.potential,
          boxKey: participant.boxKey,
          previousBoxKey: participant.previousBoxKey,
          timeInBoxSince: participant.timeInBoxSince,
          movedThisSession: participant.movedThisSession,
          potentialSetBy: participant.potentialSetBy,
          potentialSetByName: participant.potentialSetByName,
          potentialSetAt: participant.potentialSetAt,
          justification: participant.justification,
          justificationRequired: participant.justificationRequired,
          isAdjusted: participant.isAdjusted,
          createdBy: user.userId,
          updatedBy: user.userId,
        })),
      );
    }

    await this.sessionRepository.updateById(copy._id.toString(), {
      participantCount: participants.length,
    });

    return AppResponse.success('Calibration session duplicated', 201, {
      ...copy.toObject(),
      participantCount: participants.length,
    });
  }

  async getOptions(organizationId: string) {
    const statusCounts = await this.sessionRepository.countByStatus(
      organizationId,
    );

    return AppResponse.success('Calibration options retrieved', 200, {
      models: Object.values(CalibrationModel).map((value) => ({
        value,
        label: this.humanize(value),
      })),
      statuses: Object.values(CalibrationSessionStatus).map((value) => ({
        value,
        label: this.humanize(value),
        count: statusCounts[value] ?? 0,
      })),
      defaultBands: DEFAULT_CALIBRATION_BANDS,
      tolerancePercent: 5,
    });
  }

  private async populateParticipants(
    organizationId: string,
    session: CalibrationSessionDocument,
    bands: CalibrationBandConfig[],
  ): Promise<number> {
    const appraisals = await this.appraisalRepository.findByCycle(
      organizationId,
      session.cycleId,
    );

    const departmentCodes = this.sessionDepartmentCodes(session);
    const eligible = session.includeAllDepartments
      ? appraisals
      : appraisals.filter(
          (appraisal) =>
            appraisal.departmentCode &&
            departmentCodes.includes(appraisal.departmentCode),
        );

    if (eligible.length === 0) {
      return 0;
    }

    await this.participantRepository.createMany(
      eligible.map((appraisal) => {
        const managerRating =
          appraisal.managerRating ?? appraisal.managerScore ?? 0;
        const managerBand =
          appraisal.ratingTag !== null && appraisal.ratingTag !== undefined
            ? this.bandKeyForTag(appraisal.ratingTag)
            : resolveBandByScore(managerRating, bands).key;
        const calibratedRating =
          appraisal.calibratedRating && appraisal.calibratedRating > 0
            ? appraisal.calibratedRating
            : managerRating;
        const calibratedBand =
          appraisal.ratingTag && appraisal.calibratedRating
            ? this.bandKeyForTag(appraisal.ratingTag)
            : resolveBandByScore(calibratedRating, bands).key;

        return {
          organizationId,
          cycleId: session.cycleId,
          sessionId: session._id.toString(),
          appraisalId: appraisal._id.toString(),
          employeeId: appraisal.employeeId,
          employeeCode: appraisal.employeeCode,
          employeeName: appraisal.employeeName,
          employeeEmail: appraisal.employeeEmail,
          jobTitleCode: appraisal.jobTitleCode,
          jobTitleName: appraisal.jobTitleName,
          departmentId: appraisal.departmentId,
          departmentCode: appraisal.departmentCode,
          departmentName: appraisal.departmentName,
          managerId: appraisal.managerId,
          managerName: appraisal.managerName,
          managerEmail: appraisal.managerEmail,
          baseScore: appraisal.performanceScore ?? 0,
          managerRating,
          managerRatingTag: appraisal.ratingTag,
          managerBand,
          calibratedRating,
          calibratedBand,
          performanceLevel: performanceLevelForBand(calibratedBand, bands),
          potential: null,
          boxKey: null,
          timeInBoxSince: new Date(),
          movedThisSession: false,
          justification: null,
          justificationRequired: managerBand !== calibratedBand,
          isAdjusted: managerBand !== calibratedBand,
          createdBy: session.createdBy,
          updatedBy: session.createdBy,
        };
      }),
    );

    return eligible.length;
  }

  private sessionDepartmentCodes(
    session: CalibrationSessionDocument,
  ): string[] {
    const codes = new Set<string>();
    if (session.departmentCode) {
      codes.add(session.departmentCode);
    }
    for (const code of session.departmentCodes ?? []) {
      codes.add(code);
    }
    return Array.from(codes);
  }

  private bandKeyForTag(tag: AppraisalRatingTag | string): string {
    if (tag === AppraisalRatingTag.AVERAGE_PERFORMANCE) {
      return AppraisalRatingTag.MEETS_EXPECTATIONS;
    }
    return tag;
  }

  private participantStatusFor(participant: {
    justificationRequired: boolean;
    justification: string | null;
    isAdjusted: boolean;
  }): CalibrationParticipantStatus {
    if (participant.justificationRequired && participant.justification) {
      return CalibrationParticipantStatus.JUSTIFIED;
    }
    return participant.isAdjusted
      ? CalibrationParticipantStatus.ADJUSTED
      : CalibrationParticipantStatus.FINALISED;
  }

  private async writeParticipantAudits(
    organizationId: string,
    session: CalibrationSessionDocument,
    user: ICurrentUser,
    action: ParticipantAuditAction,
    message: string,
  ): Promise<void> {
    const participants = await this.participantRepository.findBySession(
      organizationId,
      session._id.toString(),
    );

    if (participants.length === 0) return;

    await this.auditLogRepository.createMany(
      participants.map((participant) => ({
        organizationId,
        cycleId: session.cycleId,
        appraisalId: participant.appraisalId,
        employeeId: participant.employeeId,
        action,
        stage: 'final',
        previousValue: null,
        newValue: message,
        justification: null,
        actorId: user.userId,
        actorName: user.email ?? null,
        createdBy: user.userId,
      })),
    );
  }

  private resolveBands(
    targets?: { key: string; label: string; minScore: number; maxScore: number; targetPercent: number; performanceLevel: string }[],
  ): CalibrationBandConfig[] {
    if (!targets || targets.length === 0) {
      return normalizeBands(DEFAULT_CALIBRATION_BANDS);
    }
    return normalizeBands(
      targets.map((target) => ({
        key: target.key,
        label: target.label,
        minScore: target.minScore,
        maxScore: target.maxScore,
        targetPercent: target.targetPercent,
        performanceLevel: target.performanceLevel as CalibrationBandConfig['performanceLevel'],
      })),
    );
  }

  private async requireCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<AppraisalCycleDocument> {
    if (!cycleId) {
      throw new BadRequestException('Cycle id is required.');
    }
    const cycle = await this.cycleRepository.findById(
      cycleId,
      organizationId,
    );
    if (!cycle) {
      throw new NotFoundException('Appraisal cycle not found');
    }
    return cycle;
  }

  private async requireEditableCycle(
    organizationId: string,
    cycleId: string,
  ): Promise<AppraisalCycleDocument> {
    const cycle = await this.requireCycle(organizationId, cycleId);
    if (cycle.status === AppraisalCycleStatus.ENDED) {
      throw new BadRequestException(
        'Calibration cannot be changed for an ended appraisal cycle.',
      );
    }
    return cycle;
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

  private buildStatusSummary(statusCounts: Record<string, number>) {
    return Object.values(CalibrationSessionStatus).reduce<
      Record<string, number>
    >(
      (summary, status) => {
        summary[status] = statusCounts[status] ?? 0;
        return summary;
      },
      { total: Object.values(statusCounts).reduce((sum, n) => sum + n, 0) },
    );
  }

  private toListItem(session: CalibrationSessionDocument) {
    return {
      sessionId: session._id.toString(),
      cycleId: session.cycleId,
      name: session.name,
      description: session.description,
      model: session.calibrationModel,
      status: session.status,
      ownerName: session.sessionOwnerName,
      departmentCode: session.departmentCode,
      participantCount: session.participantCount,
      finalisedCount: session.finalisedCount,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      createdAt: (session as unknown as { createdAt?: Date }).createdAt ?? null,
    };
  }

  private toDetail(session: CalibrationSessionDocument) {
    return {
      ...this.toListItem(session),
      sessionOwnerId: session.sessionOwnerId,
      departmentIds: session.departmentIds,
      departmentCodes: session.departmentCodes,
      includeAllDepartments: session.includeAllDepartments,
      targetDistribution: session.targetDistribution,
      guidedDistributionEnabled: session.guidedDistributionEnabled,
      tolerancePercent: session.tolerancePercent,
      startedAt: session.startedAt,
      finalisedAt: session.finalisedAt,
      finalisedBy: session.finalisedBy,
      lockedAt: session.lockedAt,
      lockedBy: session.lockedBy,
      createdBy: session.createdBy,
      updatedBy: session.updatedBy,
    };
  }

  private humanize(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
