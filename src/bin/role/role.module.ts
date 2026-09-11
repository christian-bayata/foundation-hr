import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './entity/role.schema';
import { UserRole, UserRoleSchema } from './entity/user-role.schema';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleRepository } from './repository/role.repository';
import { UserRoleRepository } from './repository/user-role.repository';
import { ROLE_SERVICE } from '../../common/guards/role.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: UserRole.name, schema: UserRoleSchema },
    ]),
  ],
  controllers: [RoleController],
  providers: [
    RoleService,
    RoleRepository,
    UserRoleRepository,
    { provide: ROLE_SERVICE, useExisting: RoleService },
  ],
  exports: [RoleService, ROLE_SERVICE],
})
export class RoleModule {}
