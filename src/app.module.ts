import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './bin/core_hr/analytics/analytics.module';
import { AuthModule } from './bin/generic/auth/auth.module';
import { CalendarModule } from './bin/generic/calendar/calendar.module';
import { DashboardModule } from './bin/core_hr/dashboard/dashboard.module';
import { EmployeeModule } from './bin/core_hr/employee/employee.module';
import { LeaveModule } from './bin/core_hr/leave/leave.module';
import { NotificationModule } from './bin/generic/notification/notification.module';
import { OffboardingModule } from './bin/core_hr/offboarding/offboarding.module';
import { OnboardingModule } from './bin/core_hr/onboarding/onboarding.module';
import { RequestModule } from './bin/core_hr/request/request.module';
import { SettingModule } from './bin/generic/setting/setting.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { EventModule } from './event/event.module';
import { HttpExceptionFilter } from './common';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RoleGuard } from './common/guards/role.guard';
import { GoalSettingModule } from './bin/performance_mgt/goal-setting/goal-settings.module';

// export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AnalyticsModule,
    AuthModule,
    CalendarModule,
    DashboardModule,
    EmployeeModule,
    EventModule,
    LeaveModule,
    NotificationModule,
    OffboardingModule,
    OnboardingModule,
    GoalSettingModule,
    RequestModule,
    SettingModule,
    FileUploadModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URL'),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // { provide: APP_GUARD, useClass: RoleGuard },
  ],
})
export class AppModule {}
