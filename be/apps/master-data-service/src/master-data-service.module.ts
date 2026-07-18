import { Module } from '@nestjs/common';
import { AuthModule } from '@app/auth';
import { TenantModule as CoreTenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { TaiKhoanModule } from './tai-khoan/tai-khoan.module';
import { DoiTuongModule } from './doi-tuong/doi-tuong.module';
import { DuAnModule } from './du-an/du-an.module';
import { BoPhanModule } from './bo-phan/bo-phan.module';
import { SanPhamModule } from './san-pham/san-pham.module';
import { KhoanMucModule } from './khoan-muc/khoan-muc.module';
import { NganHangModule } from './ngan-hang/ngan-hang.module';
import { DongTienModule } from './dong-tien/dong-tien.module';
import { ChuDauTuModule } from './chu-dau-tu/chu-dau-tu.module';
import { NhomKhuyenMaiModule } from './nhom-khuyen-mai/nhom-khuyen-mai.module';
import { NhomQuanLyModule } from './nhom-quan-ly/nhom-quan-ly.module';
import { LoaiChungTuModule } from './loai-chung-tu/loai-chung-tu.module';
import { NhomKhoanMucModule } from './nhom-khoan-muc/nhom-khoan-muc.module';
import { LoaiGiaoDichModule } from './loai-giao-dich/loai-giao-dich.module';
import { HopDongModule } from './hop-dong/hop-dong.module';
import { TheoDoiHopDongModule } from './theo-doi-hop-dong/theo-doi-hop-dong.module';
import { ThuTienHopDongModule } from './thu-tien-hop-dong/thu-tien-hop-dong.module';
import { HoaDonBanRaModule } from './hoa-don-ban-ra/hoa-don-ban-ra.module';
import { SoDuDauKyModule } from './so-du-dau-ky/so-du-dau-ky.module';
import { TenantModule } from './tenant/tenant.module';
import { CloneMasterDataModule } from './clone-master-data/clone-master-data.module';
import { LinhVucModule } from './linh-vuc/linh-vuc.module';
import { NganhModule } from './nganh/nganh.module';
import { KhoModule } from './kho/kho.module';
import { DonViTinhModule } from './don-vi-tinh/don-vi-tinh.module';
import { NhomVatTuModule } from './nhom-vat-tu/nhom-vat-tu.module';
import { HangHoaVatTuModule } from './hang-hoa-vat-tu/hang-hoa-vat-tu.module';
import { HoSoChungTuModule } from './ho-so-chung-tu/ho-so-chung-tu.module';
import { LyDoKhongHopLeModule } from './ly-do-khong-hop-le/ly-do-khong-hop-le.module';
import {
  TaiKhoan,
  DoiTuong,
  DuAn,
  BoPhan,
  SanPham,
  KhoanMuc,
  NganHang,
  DongTien,
  ChuDauTu,
  NhomKhuyenMai,
  NhomQuanLy,
  LoaiChungTuMaster,
  NhomKhoanMuc,
  LoaiGiaoDich,
  HopDong,
  TheoDoiHopDong,
  ThuTienHopDong,
  HoaDonBanRa,
  SoDuDauKy,
  Kho,
  DonViTinh,
  NhomVatTu,
  HangHoaVatTu,
  HoSoChungTu,
  LyDoKhongHopLe,
} from '@app/entities';

@Module({
  imports: [
    CoreTenantModule,
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forFeature([
      TaiKhoan,
      DoiTuong,
      DuAn,
      BoPhan,
      SanPham,
      KhoanMuc,
      NganHang,
      DongTien,
      ChuDauTu,
      NhomKhuyenMai,
      NhomQuanLy,
      LoaiChungTuMaster,
      NhomKhoanMuc,
      LoaiGiaoDich,
      HopDong,
      TheoDoiHopDong,
      ThuTienHopDong,
      HoaDonBanRa,
      SoDuDauKy,
      Kho,
      DonViTinh,
      NhomVatTu,
      HangHoaVatTu,
      HoSoChungTu,
      LyDoKhongHopLe,
    ]),
    TaiKhoanModule,
    DoiTuongModule,
    DuAnModule,
    BoPhanModule,
    SanPhamModule,
    KhoanMucModule,
    NganHangModule,
    DongTienModule,
    ChuDauTuModule,
    NhomKhuyenMaiModule,
    NhomQuanLyModule,
    LoaiChungTuModule,
    NhomKhoanMucModule,
    LoaiGiaoDichModule,
    HopDongModule,
    TheoDoiHopDongModule,
    ThuTienHopDongModule,
    HoaDonBanRaModule,
    SoDuDauKyModule,
    TenantModule,
    CloneMasterDataModule,
    LinhVucModule,
    NganhModule,
    KhoModule,
    DonViTinhModule,
    NhomVatTuModule,
    HangHoaVatTuModule,
    HoSoChungTuModule,
    LyDoKhongHopLeModule,
  ],
})
export class MasterDataServiceModule {}
