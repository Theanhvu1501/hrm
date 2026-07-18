import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CongNoTongHopService } from './cong-no-tong-hop.service';
import { CongNoTongHopController } from './cong-no-tong-hop.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CongNoTongHopController],
  providers: [CongNoTongHopService],
})
export class CongNoTongHopModule {}
