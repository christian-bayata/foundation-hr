import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { UserRepository } from './repository/user.repository';
import { User, UserSchema } from './entity/user.schema';
import { AuthUtility } from './auth.utility';
import { EmailModule } from '../../email/email.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({ global: true }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    EmailModule,
    OrganizationModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, UserRepository, AuthUtility],
  exports: [AuthService],
})
export class AuthModule {}
