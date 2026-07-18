import { Module } from '@nestjs/common';
import { HopDong } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { HopDongService } from './hop-dong.service';
import { HopDongController } from './hop-dong.controller';

@Module({
  imports: [DatabaseModule.forFeature([HopDong])],
  controllers: [HopDongController],
  providers: [HopDongService],
  exports: [HopDongService],
})
export class HopDongModule {}
