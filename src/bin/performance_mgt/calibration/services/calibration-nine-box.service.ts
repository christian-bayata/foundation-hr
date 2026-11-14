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
import { SetPotentialDto } from '../dto/set-potential.dto';
import { MoveNineBoxDto } from '../dto/move-nine-box.dto';
import { BulkMoveNineBoxDto } from '../dto/bulk-move-nine-box.dto';
import {
  AppraisalCycleStatus,
  CalibrationParticipantStatus,
  CalibrationPerformanceLevel,
  CalibrationPotential,
  CalibrationSessionStatus,
  ParticipantAuditAction,
} from '../../appraisal/enums/appraisal.enums';
import { CalibrationSessionDocument } from '../../appraisal/schemas/calibration-session.schema';
import { CalibrationParticipantDocument } from '../schemas/calibration-participant.schema';
import {
  CalibrationBandConfig,
  DEFAULT_CALIBRATION_BANDS,
  buildBoxKey,
  boxPlacement,
  normalizeBands,
  performanceLevelForBand,
  performanceLevelForScore,
  resolveBandByScore,
} from '../util/calibration.util';

const PERFORMANCE_ROWS: CalibrationPerformanceLevel[] = [
  CalibrationPerformanceLevel.HIGH,
  CalibrationPerformanceLevel.MEDIUM,
  CalibrationPerformanceLevel.LOW,
];

const POTENTIAL_COLUMNS: CalibrationPotential[] = [
  CalibrationPotential.HIGH,
  CalibrationPotential.MEDIUM,
  CalibrationPotential.LOW,
];

@Injectable()
export class CalibrationNineBoxService {
  private readonly logger = new Logger(CalibrationNineBoxService.name);

  constructor(
    private readonly cycleRepository: AppraisalCycleRepository,
    private readonly sessionRepository: CalibrationSessionRepository,
    private readonly participantRepository: CalibrationParticipantRepository,
    private readonly auditLogRepository: ParticipantAuditLogRepository,
  ) {}

  async getNineBox(organizationId: string, sessionId: string) {
    const session = await this.requireSession(organizationId, sessionId);
    const participants = await this.participantRepository.findBySession(
      organizationId,
      sessionId,
    );

    return AppResponse.success('Nine-box roster retrieved', 200, {
      session: {
        sessionId: session._id.toString(),
        cycleId: session.cycleId,
        name: session.name,
        status: session.status,
        departmentCode: session.departmentCode,
      },
      summary: this.buildSummary(participants),
      grid: this.buildGrid(participants),
      unplaced: participants
        .filter(
          (participant) =>
            !participant.performanceLevel || !participant.potential,
        )
        .map((participant) => this.toParticipantItem(participant)),
    });
  }

  async listParticipants(
    organizationId: string,
    query: ListCalibrationParticipantsQueryDto,
  ) {
    await this.requireSession(organizationId, query.sessionId);

    const result = await this.participantRepository.paginatedList(
      {
        sessionId: query.sessionId,
        search: query.search,
        departmentCode: query.departmentCode,
        managerId: query.managerId,
        performanceLevel: query.performanceLevel,
        potential: query.potential,
        boxKey: query.boxKey,
        batch: query.batch,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      organizationId,
    );

    return AppResponse.success('Nine-box participants retrieved', 200, {
      items: result.items.map((participant) =>
        this.toParticipantItem(participant),
      ),
      count: result.total,
      batch: query.batch ?? 1,
      limit: query.limit ?? 10,
    });
  }

  async getDistribution(organizationId: string, sessionId: string) {
    await this.requireSession(organizationId, sessionId);
    const rows = await this.participantRepository.boxDistribution(
      organizationId,
      sessionId,
    );

    return AppResponse.success('Nine-box distribution retrieved', 200, {
      sessionId,
      total: rows.reduce((total, row) => total + row.count, 0),
      cells: rows.map((row) => ({
        boxKey: row.boxKey,
        performanceLevel: row.performanceLevel,
        potential: row.potential,
        position: boxPlacement(row.performanceLevel, row.potential),
        label: this.boxLabel(row.performanceLevel, row.potential),
        count: row.count,
      })),
    });
  }

  async getSummary(organizationId: string, sessionId: string) {
    await this.requireSession(organizationId, sessionId);
    const participants = await this.participantRepository.findBySession(
      organizationId,
      sessionId,
    );

    return AppResponse.success('Nine-box summary retrieved', 200, {
      sessionId,
      ...this.buildSummary(participants),
    });
  }

  async getOptions(organizationId: string, sessionId?: string) {
    const bands = sessionId
      ? this.bandsFor(await this.requireSession(organizationId, sessionId))
      : normalizeBands(DEFAULT_CALIBRATION_BANDS);

    return AppResponse.success('Nine-box options retrieved', 200, {
      performanceLevels: PERFORMANCE_ROWS.map((value) => ({
        value,
        label: this.humanize(value),
      })),
      potentials: POTENTIAL_COLUMNS.map((value) => ({
        value,
        label: this.humanize(value),
      })),
      boxes: PERFORMANCE_ROWS.flatMap((performanceLevel) =>
        POTENTIAL_COLUMNS.map((potential) => ({
          performanceLevel,
          potential,
          boxKey: buildBoxKey(performanceLevel, potential),
          position: boxPlacement(performanceLevel, potential),
          label: this.boxLabel(performanceLevel, potential),
        })),
      ),
      bands,
    });
  }

  async setPotential(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
    appraisalId: string,
    dto: SetPotentialDto,
  ) {
    const session = await this.requireActiveSession(organizationId, sessionId);
    const participant = await this.requireParticipant(
      organizationId,
      sessionId,
      appraisalId,
    );

    const potentialChanged = participant.potential !== dto.potential;
    const boxKey = buildBoxKey(participant.performanceLevel, dto.potential);
    const justification = dto.justification?.trim() || participant.justification;
    const justificationRequired =
      participant.justificationRequired ||
      (potentialChanged && !justification);

    const updated = await this.participantRepository.updateById(
      participant._id.toString(),
      {
        potential: dto.potential,
        boxKey,
        previousBoxKey: participant.boxKey,
        movedThisSession: participant.movedThisSession || potentialChanged,
        potentialSetBy: user.userId,
        potentialSetByName: user.email ?? null,
        potentialSetAt: new Date(),
        justification: justification ?? null,
        justificationRequired,
        status: this.statusFor(participant.isAdjusted, justificationRequired, justification),
        updatedBy: user.userId,
      },
    );

    if (potentialChanged) {
      await this.auditLogRepository.create({
        organizationId,
        cycleId: session.cycleId,
        appraisalId: participant.appraisalId,
        employeeId: participant.employeeId,
        action: ParticipantAuditAction.POTENTIAL_SET,
        stage: 'final',
        previousValue: participant.potential ?? null,
        newValue: dto.potential,
        justification: justification ?? null,
        actorId: user.userId,
        actorName: user.email ?? null,
        createdBy: user.userId,
      });
    }

    return AppResponse.success(
      'Participant potential updated',
      200,
      this.toParticipantItem(updated ?? participant),
    );
  }

  async moveParticipant(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
    appraisalId: string,
    dto: MoveNineBoxDto,
  ) {
    const session = await this.requireActiveSession(organizationId, sessionId);
    const participant = await this.requireParticipant(
      organizationId,
      sessionId,
      appraisalId,
    );

    return AppResponse.success(
      'Participant moved',
      200,
      await this.applyMove(organizationId, user, session, participant, dto),
    );
  }

  async bulkMove(
    organizationId: string,
    user: ICurrentUser,
    sessionId: string,
    dto: BulkMoveNineBoxDto,
  ) {
    const session = await this.requireActiveSession(organizationId, sessionId);
    const results: ReturnType<CalibrationNineBoxService['toParticipantItem']>[] =
      [];
    const errors: { appraisalId: string; message: string }[] = [];

    for (const item of dto.items) {
      const participant =
        await this.participantRepository.findBySessionAndAppraisal(
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

      results.push(
        await this.applyMove(organizationId, user, session, participant, item),
      );
    }

    return AppResponse.success('Participants moved', 200, {
      updatedCount: results.length,
      skippedCount: errors.length,
      items: results,
      errors,
    });
  }

  private async applyMove(
    organizationId: string,
    user: ICurrentUser,
    session: CalibrationSessionDocument,
    participant: CalibrationParticipantDocument,
    input: MoveNineBoxDto,
  ) {
    const bands = this.bandsFor(session);
    const previousPerformanceLevel = participant.performanceLevel;
    const previousPotential = participant.potential;
    const previousBoxKey = participant.boxKey;

    const calibratedRating =
      input.calibratedRating ?? participant.calibratedRating;
    const calibratedBand =
      input.calibratedBand ??
      (input.calibratedRating !== undefined
        ? resolveBandByScore(calibratedRating, bands).key
        : input.performanceLevel
          ? this.bandForPerformanceLevel(
              input.performanceLevel,
              calibratedRating,
              bands,
            )
          : participant.calibratedBand ??
            resolveBandByScore(calibratedRating, bands).key);
    const performanceLevel =
      input.performanceLevel ??
      performanceLevelForBand(calibratedBand, bands) ??
      performanceLevelForScore(calibratedRating, bands);
    const potential = input.potential ?? participant.potential;
    const boxKey = buildBoxKey(performanceLevel, potential);
    const justification =
      input.justification?.trim() || participant.justification;
    const boxChanged =
      previousBoxKey !== boxKey ||
      previousPerformanceLevel !== performanceLevel ||
      previousPotential !== potential;
    const bandChanged = participant.managerBand !== calibratedBand;
    const justificationRequired =
      (participant.justificationRequired || boxChanged || bandChanged) &&
      !justification;
    const isAdjusted =
      bandChanged || participant.managerRating !== calibratedRating;

    const updated = await this.participantRepository.updateById(
      participant._id.toString(),
      {
        calibratedRating,
        calibratedBand,
        performanceLevel,
        potential,
        previousBoxKey,
        boxKey,
        movedThisSession: participant.movedThisSession || boxChanged,
        justification: justification ?? null,
        justificationRequired,
        isAdjusted,
        status: this.statusFor(isAdjusted, justificationRequired, justification),
        ...(boxChanged && { timeInBoxSince: new Date() }),
        updatedBy: user.userId,
      },
    );

    if (boxChanged) {
      await this.auditLogRepository.create({
        organizationId,
        cycleId: session.cycleId,
        appraisalId: participant.appraisalId,
        employeeId: participant.employeeId,
        action: ParticipantAuditAction.MOVED_BOX,
        stage: 'final',
        previousValue: previousBoxKey ?? null,
        newValue: boxKey ?? null,
        justification: justification ?? null,
        actorId: user.userId,
        actorName: user.email ?? null,
        createdBy: user.userId,
      });
    }

    if (bandChanged) {
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

  private statusFor(
    isAdjusted: boolean,
    justificationRequired: boolean,
    justification?: string | null,
  ): CalibrationParticipantStatus {
    if (justificationRequired && !justification) {
      return CalibrationParticipantStatus.ADJUSTED;
    }
    if (justification) {
      return CalibrationParticipantStatus.JUSTIFIED;
    }
    return isAdjusted
      ? CalibrationParticipantStatus.ADJUSTED
      : CalibrationParticipantStatus.PENDING;
  }

  private bandForPerformanceLevel(
    performanceLevel: CalibrationPerformanceLevel,
    score: number,
    bands: CalibrationBandConfig[],
  ): string {
    const candidates = bands.filter(
      (band) => band.performanceLevel === performanceLevel,
    );
    if (candidates.length === 0) {
      return resolveBandByScore(score, bands).key;
    }
    const containing = candidates.find(
      (band) => score >= band.minScore && score <= band.maxScore,
    );
    return (containing ?? candidates[0]).key;
  }

  private bandsFor(
    session: CalibrationSessionDocument,
  ): CalibrationBandConfig[] {
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

  private buildGrid(participants: CalibrationParticipantDocument[]) {
    return PERFORMANCE_ROWS.map((performanceLevel) => ({
      performanceLevel,
      label: this.humanize(performanceLevel),
      cells: POTENTIAL_COLUMNS.map((potential) => {
        const boxKey = buildBoxKey(performanceLevel, potential);
        const cellParticipants = participants.filter(
          (participant) =>
            participant.performanceLevel === performanceLevel &&
            participant.potential === potential,
        );
        return {
          performanceLevel,
          potential,
          boxKey,
          position: boxPlacement(performanceLevel, potential),
          label: this.boxLabel(performanceLevel, potential),
          count: cellParticipants.length,
          participants: cellParticipants.map((participant) =>
            this.toParticipantItem(participant),
          ),
        };
      }),
    }));
  }

  private buildSummary(participants: CalibrationParticipantDocument[]) {
    const placed = participants.filter(
      (participant) => participant.performanceLevel && participant.potential,
    );
    const averageScore =
      participants.length > 0
        ? participants.reduce(
            (total, participant) => total + participant.calibratedRating,
            0,
          ) / participants.length
        : 0;

    return {
      totalParticipants: participants.length,
      placedCount: placed.length,
      unplacedCount: participants.length - placed.length,
      highPotentialCount: participants.filter(
        (participant) => participant.potential === CalibrationPotential.HIGH,
      ).length,
      averageScore: Math.round(averageScore * 100) / 100,
      performanceLevelCounts: PERFORMANCE_ROWS.reduce<Record<string, number>>(
        (counts, level) => {
          counts[level] = participants.filter(
            (participant) => participant.performanceLevel === level,
          ).length;
          return counts;
        },
        {},
      ),
      potentialCounts: POTENTIAL_COLUMNS.reduce<Record<string, number>>(
        (counts, level) => {
          counts[level] = participants.filter(
            (participant) => participant.potential === level,
          ).length;
          return counts;
        },
        {},
      ),
    };
  }

  private toParticipantItem(participant: CalibrationParticipantDocument) {
    return {
      participantId: participant._id.toString(),
      appraisalId: participant.appraisalId,
      employeeId: participant.employeeId,
      employeeCode: participant.employeeCode,
      employeeName: participant.employeeName,
      jobTitleName: participant.jobTitleName,
      departmentCode: participant.departmentCode,
      departmentName: participant.departmentName,
      managerName: participant.managerName,
      calibratedRating: participant.calibratedRating,
      calibratedBand: participant.calibratedBand,
      managerBand: participant.managerBand,
      performanceLevel: participant.performanceLevel,
      potential: participant.potential,
      boxKey: participant.boxKey,
      position: boxPlacement(
        participant.performanceLevel,
        participant.potential,
      ),
      previousBoxKey: participant.previousBoxKey,
      movedThisSession: participant.movedThisSession,
      justification: participant.justification,
      justificationRequired: participant.justificationRequired,
      status: participant.status,
    };
  }

  private boxLabel(
    performanceLevel: CalibrationPerformanceLevel | null,
    potential: CalibrationPotential | null,
  ): string {
    if (!performanceLevel || !potential) return 'Unplaced';
    return `${this.humanize(performanceLevel)} performance · ${this.humanize(potential)} potential`;
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

  private humanize(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
