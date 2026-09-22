import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './entity/organization.schema';
import {
  OrganizationDepartment,
  OrganizationDepartmentSchema,
} from './entity/organization-department.schema';
import { OrganizationRepository } from './repository/organization.repository';
import { OrganizationDepartmentRepository } from './repository/organization-department.repository';
import { AuthUtility } from '../auth/auth.utility';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      {
        name: OrganizationDepartment.name,
        schema: OrganizationDepartmentSchema,
      },
    ]),
  ],
  providers: [
    OrganizationRepository,
    OrganizationDepartmentRepository,
    AuthUtility,
  ],
  exports: [OrganizationRepository, OrganizationDepartmentRepository],
})
export class OrganizationModule {}
