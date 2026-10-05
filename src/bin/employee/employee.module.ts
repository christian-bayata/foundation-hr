import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../../email/email.module';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeRepository } from './repository/employee.repository';
import { Employee, EmployeeSchema } from './entity/employee.schema';
import { EmployeeUtility } from './repository/employee.utility';
import {
  Organization,
  OrganizationSchema,
} from '../organization/entity/organization.schema';
import { OrganizationRepository } from '../organization/repository/organization.repository';
import { User, UserSchema } from '../auth/entity/user.schema';
import { UserRepository } from '../auth/repository/user.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EmailModule,
  ],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    EmployeeRepository,
    EmployeeUtility,
    OrganizationRepository,
    UserRepository,
  ],
  exports: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}