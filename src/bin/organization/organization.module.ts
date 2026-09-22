import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './entity/organization.schema';
import {
  OrganizationDepartment,
  OrganizationDepartmentSchema,
} from './entity/organization-department.schema';
import { JobTitle, JobTitleSchema } from './entity/job-title.schema';
import { OrganizationRepository } from './repository/organization.repository';
import { OrganizationDepartmentRepository } from './repository/organization-department.repository';
import { JobTitleRepository } from './repository/job-title.repository';
import { AuthUtility } from '../auth/auth.utility';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      {
        name: OrganizationDepartment.name,
        schema: OrganizationDepartmentSchema,
      },
      { name: JobTitle.name, schema: JobTitleSchema },
    ]),
  ],
  providers: [
    OrganizationRepository,
    OrganizationDepartmentRepository,
    JobTitleRepository,
    AuthUtility,
  ],
  exports: [
    OrganizationRepository,
    OrganizationDepartmentRepository,
    JobTitleRepository,
  ],
})
export class OrganizationModule {}
