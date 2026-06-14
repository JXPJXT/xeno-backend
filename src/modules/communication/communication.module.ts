import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../core/queue/queue.module';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { CommunicationProcessor } from './communication.processor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MESSAGE_DELIVERY }),
  ],
  controllers: [CommunicationController],
  providers: [CommunicationService, CommunicationProcessor],
  exports: [CommunicationService],
})
export class CommunicationModule {}
