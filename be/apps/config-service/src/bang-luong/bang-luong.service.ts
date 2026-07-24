import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CauHinhLuong, DongLuong, Employee, Timesheet } from '@app/entities';
import type { CauHinhLuongData, DauVaoDongLuong } from '@app/entities';
import { tinhDongLuong } from '@app/core';
import { CapNhatCauHinhLuongDto, CapNhatDongLuongDto } from './dto';
import { CAU_HINH_LUONG_MAC_DINH } from './cau-hinh-luong.seed';

/** Công của một NV trong tháng, dùng làm đầu vào cho engine. */
interface CongThang {
  congThuong: number;
  congThuViec: number;
  congKhac: number;
}

/** Phần snapshot dùng chung để dựng `DauVaoDongLuong` cho cả hai mức (chỉ khác `base`). */
interface SnapshotChung {
  congThuong: number;
  congThuViec: number;
  congKhac: number;
  phuCapCoDinh: number;
  soNguoiPhuThuoc: number;
  tamUng: number;
  khauTruKhac: number;
  dongBH: boolean;
  thoiVu: boolean;
  camKet: boolean;
  nhapTheoKy: Record<string, number>;
}

@Injectable()
export class BangLuong_Service {
  constructor(
    @InjectRepository(CauHinhLuong)
    private readonly cauHinhRepo: Repository<CauHinhLuong>,
    @InjectRepository(DongLuong)
    private readonly dongLuongRepo: Repository<DongLuong>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Timesheet)
    private readonly timesheetRepo: Repository<Timesheet>,
  ) {}

  /**
   * Đọc bản ghi `CauHinhLuong` đang active. Nếu chưa có bản ghi nào (lần đầu
   * dùng module), tự tạo một bản từ `CAU_HINH_LUONG_MAC_DINH` rồi lưu lại —
   * admin sửa tiếp qua `capNhatCauHinh`. Không có hằng số nghiệp vụ nào nằm
   * trong service, chỉ có seed mặc định này.
   */
  async layCauHinh(): Promise<CauHinhLuong> {
    const rows = await this.cauHinhRepo.find({ where: { isActive: true } });
    if (rows[0]) return rows[0] as CauHinhLuong;

    const created = this.cauHinhRepo.create({
      ...CAU_HINH_LUONG_MAC_DINH,
      isActive: true,
    } as Partial<CauHinhLuong>);
    return this.cauHinhRepo.save(created);
  }

  async capNhatCauHinh(dto: CapNhatCauHinhLuongDto): Promise<CauHinhLuong> {
    const item = await this.layCauHinh();
    Object.assign(item, dto);
    return this.cauHinhRepo.save(item);
  }

  /**
   * `CauHinhLuong` (entity) là siêu tập của `CauHinhLuongData` (có thêm
   * `_id`/`isActive`/…) nên có thể truyền thẳng cho `tinhDongLuong`.
   */
  private toCauHinhData(ch: CauHinhLuong): CauHinhLuongData {
    return ch;
  }

  /**
   * Công của một NV trong tháng, lấy từ nguồn công (`Timesheet`).
   * Ghi chú: ánh xạ chi tiết "ký hiệu công → loại công cho lương" (thử việc,
   * nghỉ hưởng lương…) sẽ chốt khi nối thật với logic bảng công đầy đủ — phase
   * này tối thiểu đọc `soNgayCong` làm `congThuong`; `congThuViec`/`congKhac`
   * để 0 và cần FE cảnh báo khi NV thiếu dữ liệu công.
   */
  private async layCongThang(
    thang: string,
    employeeId: string,
  ): Promise<CongThang> {
    const rows = await this.timesheetRepo.find({ where: { thang, employeeId } });
    const ts = rows[0];
    return {
      congThuong: ts?.soNgayCong ?? 0,
      congThuViec: 0,
      congKhac: 0,
    };
  }

  private buildDauVao(base: number, mucKhaiBao: number, sn: SnapshotChung): DauVaoDongLuong {
    return {
      base,
      mucKhaiBao,
      congThuong: sn.congThuong,
      congThuViec: sn.congThuViec,
      congKhac: sn.congKhac,
      phuCapCoDinh: sn.phuCapCoDinh,
      soNguoiPhuThuoc: sn.soNguoiPhuThuoc,
      tamUng: sn.tamUng,
      khauTruKhac: sn.khauTruKhac,
      dongBH: sn.dongBH,
      thoiVu: sn.thoiVu,
      camKet: sn.camKet,
      nhapTheoKy: sn.nhapTheoKy,
    };
  }

  /**
   * Tổng hợp một kỳ lương: đọc công (Timesheet) + tham số lương từ Hồ sơ NV
   * cho mọi NV active, chạy `tinhDongLuong` HAI lần trên CÙNG một cấu hình —
   * mức khai báo (base = `mucKhaiBao`) và mức thực tế (base = `luongThoaThuan`)
   * — rồi upsert một `DongLuong`/NV theo khoá {thang, employeeId}. Khoản biến
   * động đã nhập tay ở lần chạy trước (`nhapTheoKy`/`tamUng`/`khauTruKhac`)
   * được giữ nguyên, không bị ghi đè về 0. Dòng đã `chot` được coi là snapshot
   * bất biến — bỏ qua (không tính lại/ghi đè), trả về nguyên trạng; chỉ dòng
   * mới hoặc `nhap` mới được (tính lại và) lưu.
   */
  async tongHop(thang: string): Promise<DongLuong[]> {
    const chEntity = await this.layCauHinh();
    const ch = this.toCauHinhData(chEntity);
    const employees = await this.employeeRepo.find({ where: { isActive: true } });

    const rows: DongLuong[] = [];

    for (const emp of employees) {
      const employeeId = String((emp as any)._id);
      const cong = await this.layCongThang(thang, employeeId);

      const existingRows = await this.dongLuongRepo.find({ where: { thang, employeeId } });
      const existing = existingRows[0];

      // Kỳ đã chốt là snapshot bất biến — bỏ qua, không tính lại/ghi đè.
      if (existing?.trangThai === 'chot') {
        rows.push(existing);
        continue;
      }

      const mucKhaiBao = emp.mucKhaiBao ?? ch.mucKhaiBaoMacDinh;
      const luongThoaThuan = emp.luongThoaThuan ?? 0;

      const snapshot: SnapshotChung = {
        congThuong: cong.congThuong,
        congThuViec: cong.congThuViec,
        congKhac: cong.congKhac,
        phuCapCoDinh: emp.phuCapCoDinh ?? 0,
        soNguoiPhuThuoc: emp.soNguoiPhuThuoc ?? 0,
        tamUng: existing?.tamUng ?? 0,
        khauTruKhac: existing?.khauTruKhac ?? 0,
        dongBH: !!emp.dongBH,
        thoiVu: !!emp.thoiVu,
        camKet: !!emp.camKet,
        nhapTheoKy: existing?.nhapTheoKy ?? {},
      };

      const khaiBao = tinhDongLuong(this.buildDauVao(mucKhaiBao, mucKhaiBao, snapshot), ch);
      const thucTe = tinhDongLuong(this.buildDauVao(luongThoaThuan, mucKhaiBao, snapshot), ch);

      let row = existing;
      if (!row) {
        row = this.dongLuongRepo.create({
          thang,
          employeeId,
          employeeName: emp.hoTen,
          employeeCode: emp.employeeId,
          trangThai: 'nhap',
          isActive: true,
        } as Partial<DongLuong>);
      }

      row.congThuong = snapshot.congThuong;
      row.congThuViec = snapshot.congThuViec;
      row.congKhac = snapshot.congKhac;
      row.luongThoaThuan = luongThoaThuan;
      row.mucKhaiBao = mucKhaiBao;
      row.phuCapCoDinh = snapshot.phuCapCoDinh;
      row.soNguoiPhuThuoc = snapshot.soNguoiPhuThuoc;
      row.dongBH = snapshot.dongBH;
      row.thoiVu = snapshot.thoiVu;
      row.camKet = snapshot.camKet;
      row.tamUng = snapshot.tamUng;
      row.khauTruKhac = snapshot.khauTruKhac;
      row.nhapTheoKy = snapshot.nhapTheoKy;
      row.khaiBao = khaiBao;
      row.thucTe = thucTe;

      rows.push(await this.dongLuongRepo.save(row));
    }

    return rows;
  }

  async danhSachDong(thang: string): Promise<DongLuong[]> {
    return this.dongLuongRepo.find({ where: { thang, isActive: true } });
  }

  private async findOneDong(id: string): Promise<DongLuong> {
    const { ObjectId } = await import('mongodb');
    const item = await this.dongLuongRepo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy dòng lương với ID ${id}`);
    }

    return item;
  }

  /**
   * Sửa khoản biến động theo kỳ (`nhapTheoKy`/`tamUng`/`khauTruKhac`) của một
   * dòng rồi tính lại `khaiBao`/`thucTe` từ snapshot (không tổng hợp lại cả
   * kỳ). Từ chối nếu kỳ đã chốt — phải `moLai` trước. `dto.nhapTheoKy` được
   * GỘP (merge) vào khoản hiện có theo khoá, không thay thế toàn bộ — khoản
   * khác đã nhập ở lần trước không bị mất.
   */
  async capNhatDong(id: string, dto: CapNhatDongLuongDto): Promise<DongLuong> {
    const item = await this.findOneDong(id);

    if (item.trangThai === 'chot') {
      throw new BadRequestException('Kỳ đã chốt, mở lại để sửa');
    }

    if (dto.nhapTheoKy !== undefined) {
      item.nhapTheoKy = { ...(item.nhapTheoKy ?? {}), ...dto.nhapTheoKy };
    }
    if (dto.tamUng !== undefined) item.tamUng = dto.tamUng;
    if (dto.khauTruKhac !== undefined) item.khauTruKhac = dto.khauTruKhac;

    const chEntity = await this.layCauHinh();
    const ch = this.toCauHinhData(chEntity);

    const snapshot: SnapshotChung = {
      congThuong: item.congThuong,
      congThuViec: item.congThuViec,
      congKhac: item.congKhac,
      phuCapCoDinh: item.phuCapCoDinh,
      soNguoiPhuThuoc: item.soNguoiPhuThuoc,
      tamUng: item.tamUng,
      khauTruKhac: item.khauTruKhac,
      dongBH: item.dongBH,
      thoiVu: item.thoiVu,
      camKet: item.camKet,
      nhapTheoKy: item.nhapTheoKy ?? {},
    };

    item.khaiBao = tinhDongLuong(
      this.buildDauVao(item.mucKhaiBao, item.mucKhaiBao, snapshot),
      ch,
    );
    item.thucTe = tinhDongLuong(
      this.buildDauVao(item.luongThoaThuan, item.mucKhaiBao, snapshot),
      ch,
    );

    return this.dongLuongRepo.save(item);
  }

  private async setTrangThai(
    thang: string,
    trangThai: 'nhap' | 'chot',
  ): Promise<DongLuong[]> {
    const rows = await this.dongLuongRepo.find({ where: { thang, isActive: true } });

    const saved: DongLuong[] = [];
    for (const row of rows) {
      row.trangThai = trangThai;
      saved.push(await this.dongLuongRepo.save(row));
    }

    return saved;
  }

  async chot(thang: string): Promise<DongLuong[]> {
    return this.setTrangThai(thang, 'chot');
  }

  async moLai(thang: string): Promise<DongLuong[]> {
    return this.setTrangThai(thang, 'nhap');
  }
}
