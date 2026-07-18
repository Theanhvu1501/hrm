import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaoCaoService } from './bao-cao.service';
import { BaoCaoController } from './bao-cao.controller';

@Module({
  imports: [ConfigModule],
  controllers: [BaoCaoController],
  providers: [BaoCaoService],
  exports: [BaoCaoService],
})
export class BaoCaoModule {}
