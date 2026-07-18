import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { HoSoChungTu } from '@app/entities';
import { HoSoChungTuController } from './ho-so-chung-tu.controller';
import { HoSoChungTuService } from './ho-so-chung-tu.service';

@Module({
  imports: [DatabaseModule.forFeature([HoSoChungTu])],
  controllers: [HoSoChungTuController],
  providers: [HoSoChungTuService],
  exports: [HoSoChungTuService],
})
export class HoSoChungTuModule {}
