import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AttendanceRequest,
  CauHinhLuong,
  DongLuong,
  DongLuongThemGio,
  Employee,
  Timesheet,
} from '@app/entities';
import type {
  CauHinhLuongApDung,
  CauHinhLuongData,
  DauVaoDongLuong,
  PhieuLuong,
} from '@app/entities';
import {
  dungPhieuLuong,
  ganCauHinhRieng,
  quyetToanMotNguoi,
  tinhDongLuong,
} from '@app/core';
// `QuyetToanNguoi` định nghĩa ở @app/core (nơi có luật thuế), KHÔNG ở
// @app/entities — core đã import entities, khai ngược lại là vòng phụ thuộc.
import type { QuyetToanNguoi } from '@app/core';
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
  hopDongThu2: boolean;
  cauHinhApDung: CauHinhLuongApDung;
  nhapTheoKy: Record<string, number>;
  tienOt: number;
  otMienThue: number;
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
    @InjectRepository(AttendanceRequest)
    private readonly donRepo: Repository<AttendanceRequest>,
    @InjectRepository(DongLuongThemGio)
    private readonly themGioRepo: Repository<DongLuongThemGio>,
  ) {}

  /**
   * Đếm số ĐƠN làm thêm đang tham chiếu từng loại ngày (P4.2b §6).
   *
   * Màn Cấu hình lương dùng con số này để CHẶN xoá một loại đang được dùng:
   * xoá xong thì `phanBoOt` của đơn cũ trỏ vào loại không còn trong
   * `uuTienLoai`, biểu mẫu 03-LĐTL (P4.2c) mất cột, và `traHeSo()` âm thầm rơi
   * về hệ số ngày thường — trả thiếu mà không báo gì.
   *
   * Một đơn góp TỐI ĐA 1 vào mỗi loại (gom qua `Set`), kể cả khi `phanBoOt` có
   * nhiều phần cùng loại: con số hiện cho admin phải đọc được là "bao nhiêu
   * đơn", không phải "bao nhiêu dòng phân bổ".
   *
   * Chỉ đếm đơn `isActive` — một bản ghi trong thùng rác không đáng chặn admin
   * dọn bảng hệ số vĩnh viễn.
   */
  async demDonTheoLoaiOt(): Promise<Record<string, number>> {
    const dons = await this.donRepo.find({
      where: { loaiDon: 'lam_them_gio', isActive: true } as any,
    });

    const dem: Record<string, number> = {};
    for (const don of dons) {
      const loai = new Set<string>();
      if (don.phanBoOt?.length) {
        for (const p of don.phanBoOt) loai.add(p.loaiNgayOt);
      } else if (don.loaiNgayOt) {
        loai.add(don.loaiNgayOt);
      }
      for (const l of loai) dem[l] = (dem[l] ?? 0) + 1;
    }
    return dem;
  }

  /**
   * Đọc bản ghi `CauHinhLuong` đang active. Nếu chưa có bản ghi nào (lần đầu
   * dùng module), tự tạo một bản từ `CAU_HINH_LUONG_MAC_DINH` rồi lưu lại —
   * admin sửa tiếp qua `capNhatCauHinh`. Không có hằng số nghiệp vụ nào nằm
   * trong service, chỉ có seed mặc định này.
   */
  async layCauHinh(): Promise<CauHinhLuong> {
    const rows = await this.cauHinhRepo.find({ where: { isActive: true } });
    const row = rows[0] as CauHinhLuong | undefined;
    if (row) {
      // Bản ghi tạo trước P4.1 không có khối `bhCongTy`; engine khai trường
      // này BẮT BUỘC nên backfill từ seed rồi lưu lại, thay vì để engine
      // phòng thủ `?? 0` (sẽ âm thầm báo chi phí công ty = 0 mãi mãi).
      if (!row.bhCongTy) {
        row.bhCongTy = CAU_HINH_LUONG_MAC_DINH.bhCongTy;
        return this.cauHinhRepo.save(row);
      }
      return row;
    }

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
      hopDongThu2: sn.hopDongThu2,
      nhapTheoKy: sn.nhapTheoKy,
      tienOt: sn.tienOt,
      otMienThue: sn.otMienThue,
    };
  }

  /** Ảnh chụp cấu hình ĐÃ resolve cho một NV — nguồn duy nhất để tính lại. */
  private toCauHinhApDung(ch: CauHinhLuongData): CauHinhLuongApDung {
    return {
      congChuan: ch.congChuan,
      thuViecTyLe: ch.thuViec.tyLe,
      bhxhTyLe: ch.bhxh.tyLe,
      bhxhCanCu: ch.bhxh.canCu,
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

    const themGioTheoNV = await this.layTienOtDaChot(thang, chEntity);

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

      // Cấu hình riêng của NV gộp lên cấu hình chung; `ch` KHÔNG bị mutate nên
      // NV sau trong vòng lặp vẫn xuất phát từ cấu hình của công ty.
      const chNV = ganCauHinhRieng(ch, emp.cauHinhLuongRieng);

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
        hopDongThu2: !!emp.hopDongThu2,
        cauHinhApDung: this.toCauHinhApDung(chNV),
        nhapTheoKy: existing?.nhapTheoKy ?? {},
        // Nhân viên không có dòng trên bảng 03-LĐTL = không làm thêm giờ.
        tienOt: themGioTheoNV.get(employeeId)?.tongTien ?? 0,
        otMienThue: themGioTheoNV.get(employeeId)?.otMienThue ?? 0,
      };

      const khaiBao = tinhDongLuong(this.buildDauVao(mucKhaiBao, mucKhaiBao, snapshot), chNV);
      const thucTe = tinhDongLuong(this.buildDauVao(luongThoaThuan, mucKhaiBao, snapshot), chNV);

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
      row.hopDongThu2 = snapshot.hopDongThu2;
      row.cauHinhApDung = snapshot.cauHinhApDung;
      row.tamUng = snapshot.tamUng;
      row.khauTruKhac = snapshot.khauTruKhac;
      row.nhapTheoKy = snapshot.nhapTheoKy;
      row.khaiBao = khaiBao;
      row.thucTe = thucTe;

      rows.push(await this.dongLuongRepo.save(row));
    }

    return rows;
  }

  /**
   * Bảng 03-LĐTL đã chốt của kỳ, tra theo `employeeId`.
   *
   * CHẶN nếu chưa chốt thay vì âm thầm lấy 0: một dòng lương thiếu tiền OT
   * trông y hệt dòng lương của người không làm thêm giờ, và không ai đối soát
   * ra. Bản đồ là biến CỤC BỘ trả về chứ không phải thuộc tính instance —
   * service là singleton, thuộc tính instance là trạng thái dùng chung giữa
   * các request và một kỳ đang tổng hợp có thể đọc bản đồ của kỳ khác.
   */
  private async layTienOtDaChot(
    thang: string,
    chEntity: CauHinhLuong,
  ): Promise<Map<string, DongLuongThemGio>> {
    const lamThem = (chEntity as any)?.lamThem;
    // Chưa khai `lamThem` hoặc chỉ nghỉ bù ⇒ bảng lương không trả tiền OT,
    // không có bảng nào phải chờ chốt.
    if (!lamThem || lamThem.cheDoBu === 'chi_nghi_bu') return new Map();

    const ds = await this.themGioRepo.find({
      where: { thang, isActive: true } as any,
    });
    if (ds.length === 0 || ds.some((d) => d.trangThai !== 'chot')) {
      throw new BadRequestException(
        `Bảng lương thêm giờ kỳ ${thang} chưa chốt — chốt bảng đó trước khi tổng hợp bảng lương.`,
      );
    }
    return new Map(ds.map((d) => [String(d.employeeId), d]));
  }

  /**
   * Phiếu lương của CHÍNH nhân viên đó cho một kỳ. `null` khi chưa có dòng
   * hoặc kỳ còn `nhap` — con số ở kỳ nháp còn thay đổi được, và một nhân viên
   * đã nhìn thấy một số rồi hôm sau thấy số khác là tranh cãi không đáng có.
   *
   * `employeeId` do controller suy từ TOKEN truyền xuống; service không nhận
   * nó từ client ở bất kỳ đường nào khác.
   */
  async phieuLuongCuaToi(
    employeeId: string,
    thang: string,
  ): Promise<PhieuLuong | null> {
    const rows = await this.dongLuongRepo.find({
      where: { thang, employeeId } as any,
    });
    const dong = rows[0];
    if (!dong || dong.trangThai !== 'chot') return null;

    const ch = this.toCauHinhData(await this.layCauHinh());
    return dungPhieuLuong(dong, ch.khoanLuong ?? []);
  }

  /** Các kỳ nhân viên này CÓ phiếu (đã chốt), mới nhất trước. */
  async kyCoPhieuLuong(employeeId: string): Promise<string[]> {
    const rows = await this.dongLuongRepo.find({
      where: { employeeId } as any,
    });
    return rows
      .filter((r) => r.trangThai === 'chot')
      .map((r) => r.thang)
      .sort()
      .reverse();
  }

  /**
   * Quyết toán thuế TNCN của một NĂM cho toàn công ty.
   *
   * Tách người `camKet`/`thoiVu` ra khỏi bảng lũy tiến: hai chế độ thuế đó
   * khác hẳn (cam kết 02/CK-TNCN không khấu trừ trong năm; thời vụ khấu trừ
   * 10% toàn phần). Gộp im lặng vào bảng lũy tiến là ra một con số nghĩa vụ
   * thuế sai cho người thật.
   *
   * Xếp theo tháng GẦN NHẤT khi một người vừa có tháng thường vừa có tháng
   * thời vụ trong năm — và `quyetToanMotNguoi()` ghi chú lại để kế toán biết
   * mà kiểm tay.
   */
  async quyetToanNam(nam: number): Promise<{
    nam: number;
    ds: QuyetToanNguoi[];
    khongLuyTien: { employeeId: string; hoTen: string; lyDo: string }[];
    soKyDaChotTrongNam: number;
  }> {
    const tatCa = await this.dongLuongRepo.find({});
    const trongNam = tatCa.filter(
      (d) => (d.thang ?? '').startsWith(`${nam}-`) && d.isActive !== false,
    );

    const theoNguoi = new Map<string, DongLuong[]>();
    for (const d of trongNam) {
      const k = String(d.employeeId);
      theoNguoi.set(k, [...(theoNguoi.get(k) ?? []), d]);
    }

    const ch = this.toCauHinhData(await this.layCauHinh());
    const ds: QuyetToanNguoi[] = [];
    const khongLuyTien: { employeeId: string; hoTen: string; lyDo: string }[] = [];
    let soKyDaChotTrongNam = 0;

    for (const [employeeId, dsDong] of theoNguoi) {
      const daChot = dsDong.filter((d) => d.trangThai === 'chot');
      soKyDaChotTrongNam += daChot.length;
      if (daChot.length === 0) continue;

      // Tháng GẦN NHẤT quyết định chế độ thuế của người này trong năm.
      const moiNhat = [...daChot].sort((a, b) =>
        (a.thang ?? '').localeCompare(b.thang ?? ''),
      )[daChot.length - 1];

      if (moiNhat.camKet || moiNhat.thoiVu) {
        khongLuyTien.push({
          employeeId,
          hoTen: moiNhat.employeeName ?? '',
          lyDo: moiNhat.camKet ? 'cam kết 02/CK-TNCN' : 'thời vụ, khấu trừ 10%',
        });
        continue;
      }

      ds.push(quyetToanMotNguoi(daChot, ch));
    }

    return { nam, ds, khongLuyTien, soKyDaChotTrongNam };
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
    // Cố ý dùng `item.cauHinhApDung` (snapshot của dòng) chứ không đọc lại
    // Employee: sửa một khoản biến động không được kéo theo thay đổi cấu hình
    // riêng mà HR vừa sửa trên hồ sơ giữa kỳ.
    const ch = ganCauHinhRieng(
      this.toCauHinhData(chEntity),
      item.cauHinhApDung,
    );

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
      hopDongThu2: item.hopDongThu2,
      cauHinhApDung: item.cauHinhApDung,
      nhapTheoKy: item.nhapTheoKy ?? {},
      // Giữ nguyên số OT đã tính cho dòng này, KHÔNG đọc lại bảng 03-LĐTL —
      // cùng lập luận với `cauHinhApDung` ngay trên: sửa một khoản biến động
      // không được kéo theo thay đổi mà kế toán vừa làm ở bảng khác. Lấy từ
      // `thucTe` vì `tienOt` là khoản đi thẳng, hai mức khai báo/thực tế đều
      // mang cùng một con số.
      tienOt: item.thucTe?.giaTriTungKhoan?.TIEN_OT ?? 0,
      otMienThue: item.thucTe?.otMienThue ?? 0,
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
