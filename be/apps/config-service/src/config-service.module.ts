import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { QuyChuan_Module } from './quy-chuan/quy-chuan.module';
import { PhanQuyen_Module } from './phan-quyen/phan-quyen.module';
import { NguoiDung_Module } from './nguoi-dung/nguoi-dung.module';
import { Tenant_Module } from './tenant/tenant.module';
import { VaiTro_Module } from './vai-tro/vai-tro.module';
import { PhieuTemplate_Module } from './phieu-template/phieu-template.module';
import { TaiLieu_Module } from './tai-lieu/tai-lieu.module';
import { NhanVien_Module } from './nhan-vien/nhan-vien.module';
import { HopDong_Module } from './hop-dong/hop-dong.module';
import { QuaTrinhCongTac_Module } from './qua-trinh-cong-tac/qua-trinh-cong-tac.module';
import { ThoiViec_Module } from './thoi-viec/thoi-viec.module';
import { CaLamViec_Module } from './ca-lam-viec/ca-lam-viec.module';
import { DiaDiemChamCong_Module } from './dia-diem-cham-cong/dia-diem-cham-cong.module';
import { DonChamCong_Module } from './don-cham-cong/don-cham-cong.module';
import { BangCong_Module } from './bang-cong/bang-cong.module';
import { NgayLe_Module } from './ngay-le/ngay-le.module';
import { ThietBiChamCong_Module } from './thiet-bi-cham-cong/thiet-bi-cham-cong.module';
import { BanGhiChamCong_Module } from './ban-ghi-cham-cong/ban-ghi-cham-cong.module';

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
    Tenant_Module,
    VaiTro_Module,
    PhieuTemplate_Module,
    TaiLieu_Module,
    NhanVien_Module,
    HopDong_Module,
    QuaTrinhCongTac_Module,
    ThoiViec_Module,
    CaLamViec_Module,
    DiaDiemChamCong_Module,
    DonChamCong_Module,
    BangCong_Module,
    NgayLe_Module,
    ThietBiChamCong_Module,
    BanGhiChamCong_Module,
  ],
})
export class ConfigServiceModule {}
