import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventModule } from '../../event/event.module';
import {
  Notification,
  NotificationSchema,
} from './entity/notification.schema';
import {
  NotificationDelivery,
  NotificationDeliverySchema,
} from './entity/notification-delivery.schema';
import {
  Role,
  RoleSchema,
} from '../setting/access-control/entity/role.schema';
import {
  UserRole,
  UserRoleSchema,
} from '../setting/access-control/entity/user-role.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organization/entity/organization.schema';
import { User, UserSchema } from '../auth/entity/user.schema';
import { RoleRepository } from '../setting/access-control/repository/role.repository';
import { UserRoleRepository } from '../setting/access-control/repository/user-role.repository';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { UserRepository } from '../auth/repository/user.repository';
import { NotificationRepository } from './repository/notification.repository';
import { NotificationDeliveryRepository } from './repository/notification-delivery.repository';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AdminNotificationController } from './admin-notification.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationDelivery.name, schema: NotificationDeliverySchema },
      { name: Role.name, schema: RoleSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EventModule,
  ],
  controllers: [NotificationController, AdminNotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationDeliveryRepository,
    RoleRepository,
    UserRoleRepository,
    OrganizationRepository,
    UserRepository,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
