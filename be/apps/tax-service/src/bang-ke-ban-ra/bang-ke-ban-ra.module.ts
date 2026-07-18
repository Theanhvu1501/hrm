import { Module } from '@nestjs/common';
import { BangKeBanRa } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { BangKeBanRaService } from './bang-ke-ban-ra.service';
import { BangKeBanRaController } from './bang-ke-ban-ra.controller';

@Module({
  imports: [DatabaseModule.forFeature([BangKeBanRa])],
  controllers: [BangKeBanRaController],
  providers: [BangKeBanRaService],
  exports: [BangKeBanRaService],
})
export class BangKeBanRaModule {}
