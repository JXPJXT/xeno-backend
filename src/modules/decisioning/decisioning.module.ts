import { Module } from '@nestjs/common';
import { DecisioningController } from './decisioning.controller';
import { DecisioningService } from './decisioning.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DecisioningController],
  providers: [DecisioningService],
  exports: [DecisioningService],
})
export class DecisioningModule {}
