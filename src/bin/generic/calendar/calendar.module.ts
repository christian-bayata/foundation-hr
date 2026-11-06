import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from '../../core_hr/employee/employee.module';
import {
  CalendarEvent,
  CalendarEventSchema,
} from './entity/calendar-event.schema';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarEventRepository } from './repository/calendar-event.repository';
import {
  UserRole,
  UserRoleSchema,
} from '../setting/access-control/entity/user-role.schema';
import { UserRoleRepository } from '../setting/access-control/repository/user-role.repository';
import {
  Organization,
  OrganizationSchema,
} from '../../core_hr/organization/entity/organization.schema';
import { OrganizationRepository } from '../../core_hr/organization/repository/organization.repository';
import { UserRepository } from '../auth/repository/user.repository';
import { User, UserSchema } from '../auth/entity/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CalendarEvent.name, schema: CalendarEventSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EmployeeModule,
  ],
  controllers: [CalendarController],
  providers: [
    CalendarService,
    CalendarEventRepository,
    UserRoleRepository,
    OrganizationRepository,
    UserRepository,
  ],
  exports: [CalendarService],
})
export class CalendarModule {}
