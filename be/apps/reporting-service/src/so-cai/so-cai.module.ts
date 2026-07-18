import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SoCaiService } from './so-cai.service';
import { SoCaiController } from './so-cai.controller';

@Module({
  imports: [ConfigModule],
  controllers: [SoCaiController],
  providers: [SoCaiService],
  exports: [SoCaiService],
})
export class SoCaiModule {}
