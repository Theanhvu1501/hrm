import { Module } from '@nestjs/common';
import {
  HopDong,
  TheoDoiHopDong,
  ThuTienHopDong,
  HoaDonBanRa,
} from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TheoDoiHopDongService } from './theo-doi-hop-dong.service';
import { TheoDoiHopDongController } from './theo-doi-hop-dong.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([TheoDoiHopDong, HopDong, ThuTienHopDong, HoaDonBanRa]),
  ],
  controllers: [TheoDoiHopDongController],
  providers: [TheoDoiHopDongService],
  exports: [TheoDoiHopDongService],
})
export class TheoDoiHopDongModule {}
