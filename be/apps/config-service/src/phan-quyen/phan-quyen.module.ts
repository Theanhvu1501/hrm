import { Module } from '@nestjs/common';
import { PhanQuyen } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { PhanQuyen_Service } from './phan-quyen.service';
import { PhanQuyen_Controller } from './phan-quyen.controller';

@Module({
  // TenantModule: `PhanQuyen_Service.findByVaiTro()` lọc `tenantId` tường
  // minh qua `TenantContextService` (xem chú thích tại hàm đó).
  imports: [DatabaseModule.forFeature([PhanQuyen]), TenantModule],
  controllers: [PhanQuyen_Controller],
  providers: [PhanQuyen_Service],
  exports: [PhanQuyen_Service],
})
export class PhanQuyen_Module {}
