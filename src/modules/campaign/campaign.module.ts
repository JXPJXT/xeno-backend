import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { AnalyticsController } from './analytics.controller';
import { CampaignService } from './campaign.service';
import { CommunicationModule } from '../communication/communication.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, CommunicationModule],
  controllers: [CampaignController, AnalyticsController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
