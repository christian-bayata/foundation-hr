import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventAuthService } from './event.auth';
import { EventGateway } from './event.gateway';
import { EventService } from './event.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EventAuthService, EventService, EventGateway],
  exports: [EventAuthService, EventService],
})
export class EventModule {}
