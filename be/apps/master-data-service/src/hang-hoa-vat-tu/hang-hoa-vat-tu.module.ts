import { Module } from '@nestjs/common';
import { HangHoaVatTu } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { HangHoaVatTuService } from './hang-hoa-vat-tu.service';
import { HangHoaVatTuController } from './hang-hoa-vat-tu.controller';

@Module({
  imports: [DatabaseModule.forFeature([HangHoaVatTu])],
  controllers: [HangHoaVatTuController],
  providers: [HangHoaVatTuService],
  exports: [HangHoaVatTuService],
})
export class HangHoaVatTuModule {}
