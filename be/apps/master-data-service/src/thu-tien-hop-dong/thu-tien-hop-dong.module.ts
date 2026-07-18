import { Module } from '@nestjs/common';
import { ThuTienHopDong } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { ThuTienHopDongService } from './thu-tien-hop-dong.service';
import { ThuTienHopDongController } from './thu-tien-hop-dong.controller';

@Module({
  imports: [DatabaseModule.forFeature([ThuTienHopDong])],
  controllers: [ThuTienHopDongController],
  providers: [ThuTienHopDongService],
})
export class ThuTienHopDongModule {}
