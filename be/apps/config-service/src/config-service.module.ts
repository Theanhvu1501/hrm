import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { QuyChuan_Module } from './quy-chuan/quy-chuan.module';
import { PhanQuyen_Module } from './phan-quyen/phan-quyen.module';
import { NguoiDung_Module } from './nguoi-dung/nguoi-dung.module';
import { VaiTro_Module } from './vai-tro/vai-tro.module';
import { PhieuTemplate_Module } from './phieu-template/phieu-template.module';
import { TaiLieu_Module } from './tai-lieu/tai-lieu.module';
import { NhanVien_Module } from './nhan-vien/nhan-vien.module';
import { HopDong_Module } from './hop-dong/hop-dong.module';
import { QuaTrinhCongTac_Module } from './qua-trinh-cong-tac/qua-trinh-cong-tac.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    QuyChuan_Module,
    PhanQuyen_Module,
    NguoiDung_Module,
    VaiTro_Module,
    PhieuTemplate_Module,
    TaiLieu_Module,
    NhanVien_Module,
    HopDong_Module,
    QuaTrinhCongTac_Module,
  ],
})
export class ConfigServiceModule {}
