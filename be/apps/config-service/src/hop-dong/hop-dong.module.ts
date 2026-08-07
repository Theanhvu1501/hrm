import { Module } from '@nestjs/common';
import {
  LaborContract,
  ContractCounter,
  PhieuTemplate,
  LaborContractTemplate,
  TenantAppConfig,
  Employee,
} from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { HopDong_Service } from './hop-dong.service';
import { HopDong_Controller } from './hop-dong.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([
      LaborContract,
      ContractCounter,
      // Mẫu in HĐLĐ nay ở bảng riêng `hop_dong_mau_in` (nhiều mẫu/tenant).
      // PhieuTemplate giữ lại DUY NHẤT để di trú mẫu cũ một lần trong
      // `dsMauIn()`; thông tin công ty (letterhead) tái dùng TenantAppConfig
      // (xem entity đó); Employee cần đọc để lấy hồ sơ NLĐ lúc render —
      // module này chỉ ĐỌC, không có route ghi nào cho Employee ở đây (đã có
      // ở nhan-vien module riêng).
      PhieuTemplate,
      LaborContractTemplate,
      TenantAppConfig,
      Employee,
    ]),
    TenantModule,
  ],
  controllers: [HopDong_Controller],
  providers: [HopDong_Service],
  exports: [HopDong_Service],
})
export class HopDong_Module {}
