import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Timesheet,
  Employee,
  AttendanceRequest,
  AttendanceRecord,
  Holiday,
  Resignation,
} from '@app/entities';
import type { ChiTietNgayCong } from '@app/entities';
import { UpdateTimesheetDto, SetDayDto } from './dto';
import { soCongCuaKyHieu, nguonCuaO, NGUON_O } from './cham-cong-ky-hieu';
import { suyKyHieuNgay } from './suy-ky-hieu';
import {
  cacNgayTrongThang,
  tapNgayLeCuaThang,
  gomTheoNgay,
  demMuonSom,
  tongGioOt,
} from './nguon-thang';

export interface BangCongFilter {
  thang?: string;
  employeeId?: string;
  trangThai?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

/** Tóm tắt một lần tổng hợp `generate()` — xem doc-comment của hàm đó. */
export interface TomTatTongHop {
  soDongXuLy: number;
  soODaDien: number;
  soOTrong: number;
  soOCanhBao: number;
  soDongBoQuaVIChot: number;
}

@Injectable()
export class BangCong_Service {
  constructor(
    @InjectRepository(Timesheet)
    private readonly repo: Repository<Timesheet>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(AttendanceRequest)
    private readonly requestRepo: Repository<AttendanceRequest>,
    @InjectRepository(AttendanceRecord)
    private readonly recordRepo: Repository<AttendanceRecord>,
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,
    @InjectRepository(Resignation)
    private readonly resignationRepo: Repository<Resignation>,
  ) {}

  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  /**
   * Recomputes the derived/aggregate fields from `chiTietNgay`:
   * - soNgayCong = Σ soCongCuaKyHieu(cell.kyHieu)
   * - soNgayNghiPhep / soNgayNghiKhongLuong / soNgayOm = counts of P/KL/O cells
   * Mutates `ts` in place; caller is responsible for persisting it.
   */
  private recompute(ts: Timesheet): void {
    const cells = ts.chiTietNgay ?? [];

    ts.soNgayCong = cells.reduce(
      (sum, cell) => sum + soCongCuaKyHieu(cell.kyHieu),
      0,
    );
    ts.soNgayNghiPhep = cells.filter((c) => c.kyHieu === 'P').length;
    ts.soNgayNghiKhongLuong = cells.filter((c) => c.kyHieu === 'KL').length;
    ts.soNgayOm = cells.filter((c) => c.kyHieu === 'O').length;
  }

  /**
   * Tổng hợp bảng công của cả tháng.
   *
   * Ba việc, theo đúng thứ tự: tạo dòng còn thiếu → điền ô `tu_dong` và ô
   * trống → bỏ qua mọi ô `hr_sua`.
   *
   * Không có bảng xem trước như `dongQuy` của quỹ phép, vì thao tác này KHÔNG
   * phá dữ liệu người: nó chỉ tính lại phần vốn dĩ của máy. Đổi lại phải trả
   * về tóm tắt để HR biết còn bao nhiêu ô phải tự xử lý.
   */
  async generate(thang: string): Promise<TomTatTongHop> {
    const [employees, dongCoSan, banGhi, don, ngayLe, thoiViec] = await Promise.all([
      this.employeeRepo.find({ where: { isActive: true } as any }),
      this.repo.find({ where: { thang, isActive: true } as any }),
      this.recordRepo.find({ where: { isActive: true } as any }),
      this.requestRepo.find({ where: { isActive: true } as any }),
      this.holidayRepo.find({ where: { isActive: true } as any }),
      this.resignationRepo.find({ where: { isActive: true } as any }),
    ]);

    const cacNgay = cacNgayTrongThang(thang);
    const tapLe = tapNgayLeCuaThang(ngayLe, thang);
    const theoNgay = gomTheoNgay(banGhi, don, thang);
    const muonSom = demMuonSom(banGhi.filter((b) => b.ngay?.startsWith(thang)));
    const gioOt = tongGioOt(don, thang);
    const ngayCuoi = new Map<string, string>();
    for (const tv of thoiViec) {
      if (tv.trangThai !== 'da_duyet' && tv.trangThai !== 'hoan_thanh') continue;
      if (tv.ngayLamViecCuoi) ngayCuoi.set(tv.employeeId, tv.ngayLamViecCuoi);
    }

    const dongTheoNv = new Map(dongCoSan.map((d) => [d.employeeId, d]));

    const tomTat: TomTatTongHop = {
      soDongXuLy: 0,
      soODaDien: 0,
      soOTrong: 0,
      soOCanhBao: 0,
      soDongBoQuaVIChot: 0,
    };

    for (const emp of employees) {
      const employeeId = String((emp as any)._id);
      let row = dongTheoNv.get(employeeId);

      if (row?.trangThai === 'chot') {
        tomTat.soDongBoQuaVIChot += 1;
        continue;
      }

      if (!row) {
        row = this.repo.create({
          thang,
          employeeId,
          employeeName: emp.hoTen,
          employeeCode: emp.employeeId,
          chiTietNgay: [],
          trangThai: 'nhap',
          isActive: true,
        } as Partial<Timesheet>);
      }

      const oCu = new Map(
        (row.chiTietNgay ?? []).map((o) => [o.ngay, o] as [number, ChiTietNgayCong]),
      );
      const oMoi: ChiTietNgayCong[] = [];
      let soOTrong = 0;
      let soOCanhBao = 0;

      for (const ngay of cacNgay) {
        const soNgay = Number(ngay.slice(-2));
        const cu = oCu.get(soNgay);

        // Ô HR đã chạm vào là bất khả xâm phạm — kể cả khi căn cứ đã đổi.
        if (cu && nguonCuaO(cu) === NGUON_O.HR_SUA) {
          oMoi.push(cu);
          if (cu.canhBao?.length) soOCanhBao += 1;
          continue;
        }

        const duLieu = theoNgay.get(employeeId)?.get(ngay);
        const kq = suyKyHieuNgay({
          ngay,
          ngayVaoLam: emp.ngayVaoLam,
          ngayLamViecCuoi: ngayCuoi.get(employeeId),
          ngayLamViecTrongTuan: emp.ngayLamViecTrongTuan,
          laNgayLe: tapLe.has(ngay),
          donNghi: duLieu?.donNghi ?? null,
          coChamVao: duLieu?.coChamVao ?? false,
          coChamRa: duLieu?.coChamRa ?? false,
          coBanGhiNgoaiVung: duLieu?.coBanGhiNgoaiVung ?? false,
        });

        if (kq.chuaXuLy) soOTrong += 1;
        if (kq.canhBao.length) soOCanhBao += 1;

        if (kq.kyHieu) {
          oMoi.push({
            ngay: soNgay,
            kyHieu: kq.kyHieu,
            nguon: NGUON_O.TU_DONG,
            canhBao: kq.canhBao.length ? kq.canhBao : undefined,
          });
          tomTat.soODaDien += 1;
        }
      }

      oMoi.sort((a, b) => a.ngay - b.ngay);
      row.chiTietNgay = oMoi;
      row.soOTrong = soOTrong;
      row.soOCanhBao = soOCanhBao;
      row.soGioLamThem = gioOt.get(employeeId) ?? 0;
      row.soLanDiMuon = muonSom.get(employeeId)?.diMuon ?? 0;
      row.soLanVeSom = muonSom.get(employeeId)?.veSom ?? 0;
      this.recompute(row);

      await this.repo.save(row);
      tomTat.soDongXuLy += 1;
      tomTat.soOTrong += soOTrong;
      tomTat.soOCanhBao += soOCanhBao;
    }

    return tomTat;
  }

  async findAll(filter?: BangCongFilter): Promise<Timesheet[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.thang) where.thang = filter.thang;
    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.trangThai) where.trangThai = filter.trangThai;

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<Timesheet> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy bảng công với ID ${id}`);
    }

    return item;
  }

  /**
   * Upserts a single day's symbol into `chiTietNgay` and recomputes the
   * derived totals. Passing an empty/falsy `kyHieu` removes that day's
   * entry entirely (clearing the cell) rather than storing a blank symbol.
   */
  async setDay(id: string, dto: SetDayDto): Promise<Timesheet> {
    const item = await this.findOne(id);
    const cells = (item.chiTietNgay ?? []).filter((c) => c.ngay !== dto.ngay);

    if (dto.kyHieu) {
      cells.push({ ngay: dto.ngay, kyHieu: dto.kyHieu });
    }

    cells.sort((a, b) => a.ngay - b.ngay);
    item.chiTietNgay = cells;
    this.recompute(item);

    return this.repo.save(item);
  }

  /**
   * `soNgayCong` (and the P/KL/O counters) are always derived from
   * `chiTietNgay` — any value the caller sends for them is ignored. If the
   * dto includes a new `chiTietNgay` array, it replaces the existing grid
   * wholesale and triggers a recompute; manual fields (soLanDiMuon,
   * soLanVeSom, ghiChu, soGioLamThem) are applied as-is.
   */
  async update(id: string, dto: UpdateTimesheetDto): Promise<Timesheet> {
    const item = await this.findOne(id);
    const { soNgayCong: _ignored, chiTietNgay, ...rest } = dto;

    Object.assign(item, rest);
    if (chiTietNgay) {
      item.chiTietNgay = chiTietNgay as ChiTietNgayCong[];
    }
    this.recompute(item);

    return this.repo.save(item);
  }

  async finalize(thang: string): Promise<Timesheet[]> {
    const rows = await this.repo.find({ where: { thang, isActive: true } });

    const saved: Timesheet[] = [];
    for (const row of rows) {
      row.trangThai = 'chot';
      saved.push(await this.repo.save(row));
    }

    return saved;
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
