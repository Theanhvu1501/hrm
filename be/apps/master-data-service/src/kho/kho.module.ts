import { Module } from '@nestjs/common';
import { Kho } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { KhoService } from './kho.service';
import { KhoController } from './kho.controller';

@Module({
  imports: [DatabaseModule.forFeature([Kho])],
  controllers: [KhoController],
  providers: [KhoService],
  exports: [KhoService],
})
export class KhoModule {}
