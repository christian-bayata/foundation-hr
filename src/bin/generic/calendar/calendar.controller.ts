import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppResponse, Roles } from '../../../common';
import type { CurrentUser as ICurrentUser } from '../../../common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequiresSystemSettings } from '../../../common/decorators/requires-system-settings.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { SystemRole } from '../auth/enum/role.enum';
import {
  CreateCalendarEventDto,
  ListCalendarEventQueryDto,
  RetrieveCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarWidgetQueryDto,
  CalendarBirthdaysQueryDto,
} from './dto/calendar.dto';
import { CalendarService } from './calendar.service';
@Controller('calendar')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequiresSystemSettings()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('events/add')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addEvent(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateCalendarEventDto,
  ) {
    const data = await this.calendarService.addEvent(
      user.organizationId!,
      user,
      dto,
    );

    return AppResponse.success(
      'Calendar event created successfully',
      201,
      data,
    );
  }

  @Get('events/retrieve/all')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveEvents(
    @CurrentUser() user: ICurrentUser,
    @Query() query: ListCalendarEventQueryDto,
  ) {
    const data = await this.calendarService.listEvents(
      user.organizationId!,
      query,
    );

    return AppResponse.success(
      'Calendar events retrieved successfully',
      200,
      data,
    );
  }

  @Get('events/retrieve/single')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveEvent(
    @CurrentUser() user: ICurrentUser,
    @Query() dto: RetrieveCalendarEventDto,
  ) {
    const data = await this.calendarService.retrieveEvent(
      user.organizationId!,
      dto,
    );

    return AppResponse.success(
      'Calendar event retrieved successfully',
      200,
      data,
    );
  }

  @Patch('events/update')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateEvent(
    @CurrentUser() user: ICurrentUser,
    @Query() params: RetrieveCalendarEventDto,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    const data = await this.calendarService.updateEvent(user.organizationId!, {
      ...dto,
      eventId: params.eventId,
    });

    return AppResponse.success(
      'Calendar event updated successfully',
      200,
      data,
    );
  }

  @Delete('events/remove')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteEvent(
    @CurrentUser() user: ICurrentUser,
    @Query() dto: RetrieveCalendarEventDto,
  ) {
    const data = await this.calendarService.deleteEvent(
      user.organizationId!,
      dto,
    );

    return AppResponse.success(
      'Calendar event deleted successfully',
      200,
      data,
    );
  }

  @Get('widget/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveWidget(
    @CurrentUser() user: ICurrentUser,
    @Query() query: CalendarWidgetQueryDto,
  ) {
    const data = await this.calendarService.retrieveWidget(
      user.organizationId!,
      query,
    );

    return AppResponse.success(
      'Calendar widget retrieved successfully',
      200,
      data,
    );
  }

  @Get('birthdays/retrieve')
  @Roles(SystemRole.COMPANY_OWNER, SystemRole.HR_ADMIN)
  async retrieveBirthdays(
    @CurrentUser() user: ICurrentUser,
    @Query() query: CalendarBirthdaysQueryDto,
  ) {
    const data = await this.calendarService.retrieveBirthdays(
      user.organizationId!,
      query,
    );

    return AppResponse.success('Birthdays retrieved successfully', 200, data);
  }
}
