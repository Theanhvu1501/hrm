import { Module } from '@nestjs/common';
import { NhomVatTu } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhomVatTuService } from './nhom-vat-tu.service';
import { NhomVatTuController } from './nhom-vat-tu.controller';

@Module({
  imports: [DatabaseModule.forFeature([NhomVatTu])],
  controllers: [NhomVatTuController],
  providers: [NhomVatTuService],
  exports: [NhomVatTuService],
})
export class NhomVatTuModule {}
