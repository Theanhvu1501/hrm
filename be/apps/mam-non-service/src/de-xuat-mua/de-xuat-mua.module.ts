import { Module } from '@nestjs/common';
import { DeXuatMuaThucPham, MamNonSequence } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DeXuatMuaService } from './de-xuat-mua.service';
import { DeXuatMuaController } from './de-xuat-mua.controller';
import { MamNonSequenceService } from './mam-non-sequence.service';

@Module({
  imports: [DatabaseModule.forFeature([DeXuatMuaThucPham, MamNonSequence])],
  controllers: [DeXuatMuaController],
  providers: [DeXuatMuaService, MamNonSequenceService],
  exports: [DeXuatMuaService],
})
export class DeXuatMuaModule {}
