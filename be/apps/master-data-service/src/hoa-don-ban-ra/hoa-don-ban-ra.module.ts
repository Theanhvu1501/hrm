import { Module } from '@nestjs/common';
import { HoaDonBanRa } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { HoaDonBanRaService } from './hoa-don-ban-ra.service';
import { HoaDonBanRaController } from './hoa-don-ban-ra.controller';

@Module({
  imports: [DatabaseModule.forFeature([HoaDonBanRa])],
  controllers: [HoaDonBanRaController],
  providers: [HoaDonBanRaService],
})
export class HoaDonBanRaModule {}
