import { Module } from '@nestjs/common';
import { LyDoKhongHopLe } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { LyDoKhongHopLeService } from './ly-do-khong-hop-le.service';
import { LyDoKhongHopLeController } from './ly-do-khong-hop-le.controller';

@Module({
  imports: [DatabaseModule.forFeature([LyDoKhongHopLe])],
  controllers: [LyDoKhongHopLeController],
  providers: [LyDoKhongHopLeService],
  exports: [LyDoKhongHopLeService],
})
export class LyDoKhongHopLeModule {}
