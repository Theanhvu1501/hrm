import { Module } from '@nestjs/common';
import { LaborContract, ContractCounter } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { HopDong_Service } from './hop-dong.service';
import { HopDong_Controller } from './hop-dong.controller';

@Module({
  imports: [DatabaseModule.forFeature([LaborContract, ContractCounter]), TenantModule],
  controllers: [HopDong_Controller],
  providers: [HopDong_Service],
  exports: [HopDong_Service],
})
export class HopDong_Module {}
