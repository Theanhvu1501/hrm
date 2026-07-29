import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

export const MA_LOI_BANG_CONG = {
  /** Sửa bảng công đã chốt — kỳ lương có thể đã tính theo con số cũ. */
  BANG_CONG_DA_CHOT: 'BANG_CONG_DA_CHOT',
  /** Chốt khi còn ô chưa xử lý = chốt một kỳ lương thiếu ngày công. */
  CON_O_CHUA_XU_LY: 'CON_O_CHUA_XU_LY',
  /** Chốt một tháng chưa từng "Tổng hợp" — không có dòng nào để khoá. */
  CHUA_CO_BANG_CONG: 'CHUA_CO_BANG_CONG',
} as const;

/** Tóm tắt một lần tổng hợp `generate()` — xem doc-comment của hàm đó. */
export interface TomTatTongHop {
  soDongXuLy: number;
  soODaDien: number;
  soOTrong: number;
  soOCanhBao: number;
  soDongBoQuaVIChot: number;
  /**
   * Số dòng "mồ côi": NV bị soft-delete SAU khi đã có dòng bảng công tháng
   * này (thường còn `soOTrong > 0`) — `employeeRepo.find({isActive:true})`
   * không còn thấy họ nên vòng lặp chính không bao giờ quay lại dòng đó.
   * `finalize()` đọc MỌI dòng active của tháng bất kể NV còn hoạt động hay
   * không, nên nếu không dọn thì dòng này chặn chốt vĩnh viễn, không có UI
   * nào sửa được ngoài xoá tay. Xem vòng lặp "dòng mồ côi" cuối `generate()`.
   */
  soDongMoCoi: number;
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
      // Chặn khoảng ngay ở tầng truy vấn: `attendance_records` ghi MỘT DÒNG
      // MỖI LƯỢT BẤM, nên nạp cả bảng để tính một tháng là phép quét lớn dần
      // vô hạn trong khi phần dùng được thì cố định.
      //
      // Dùng toán tử Mongo thô chứ không `Between` của TypeORM: driver Mongo
      // ở đây chuyển thẳng `where` xuống native driver mà KHÔNG dịch
      // FindOperator, nên `Between` trả về 0 dòng (đã kiểm bằng mongo:7
      // thật). Đây cũng là cách `ban-ghi-cham-cong.service.ts:613` đang làm
      // trên chính bảng này. Dùng `$lte: "${thang}-31"` chứ không
      // `$lt: "${thang}-32"` — mọi ngày thật của tháng đều `<= "YYYY-MM-31"`
      // khi so chuỗi, cùng tiền lệ ở `ban-ghi-cham-cong`.
      //
      // KHÔNG chặn tương tự cho requestRepo: đơn nghỉ có khoảng
      // `ngay..denNgay` vắt qua ranh giới tháng, chặn theo `ngay` sẽ đánh
      // rơi đơn bắt đầu từ tháng trước mà kéo sang tháng này.
      this.recordRepo.find({
        where: {
          isActive: true,
          ngay: { $gte: `${thang}-01`, $lte: `${thang}-31` },
        } as any,
      }),
      this.requestRepo.find({ where: { isActive: true } as any }),
      this.holidayRepo.find({ where: { isActive: true } as any }),
      this.resignationRepo.find({ where: { isActive: true } as any }),
    ]);

    const cacNgay = cacNgayTrongThang(thang);
    const tapLe = tapNgayLeCuaThang(ngayLe, thang);
    const theoNgay = gomTheoNgay(banGhi, don, thang);
    const muonSom = demMuonSom(banGhi.filter((b) => b.ngay?.startsWith(thang)));
    const gioOt = tongGioOt(don, thang);
    // Người đã nghỉ vẫn nằm trong danh sách NV đang hoạt động (duyệt thôi việc
    // chỉ đổi `trangThai`, không tắt `isActive`), nên nếu không có mốc kết thúc
    // thì mỗi tháng họ đẻ ra hai chục ô "chưa xử lý" vĩnh viễn.
    // Nhiều hồ sơ thôi việc thì lấy ngày MUỘN NHẤT — ghi đè lần cuối trên mảng
    // chưa sắp xếp sẽ để một hồ sơ cũ xoá trắng mọi ngày sau nó, mà nhánh đó
    // trả chuaXuLy=false nên không cảnh báo gì cả.
    //
    // Luật chọn mốc CHO TỪNG HỒ SƠ (đã duyệt/hoàn thành, rơi về ngayNopDon khi
    // thiếu ngayLamViecCuoi) dùng CHUNG `ngayCuoiHopLeCuaHoSo()` với
    // `mocNgayLamViecCuoi()` bên dưới — hai hàm này phục vụ hai đường khác
    // nhau (generate() gom theo lô, suyLaiMotNgay()/demLaiOTrong() tính cho
    // một NV) nhưng PHẢI cùng một luật, nếu không "trả về tự động" sẽ suy ra
    // một ngày khác với lần Tổng hợp gần nhất cho cùng một người.
    const ngayCuoi = new Map<string, string>();
    for (const tv of thoiViec) {
      const ngay = this.ngayCuoiHopLeCuaHoSo(tv);
      if (!ngay) continue;
      const daCo = ngayCuoi.get(tv.employeeId);
      if (!daCo || ngay > daCo) ngayCuoi.set(tv.employeeId, ngay);
    }

    const dongTheoNv = new Map(dongCoSan.map((d) => [d.employeeId, d]));
    const activeIds = new Set(employees.map((emp) => String((emp as any)._id)));

    const tomTat: TomTatTongHop = {
      soDongXuLy: 0,
      soODaDien: 0,
      soOTrong: 0,
      soOCanhBao: 0,
      soDongBoQuaVIChot: 0,
      soDongMoCoi: 0,
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

      // Ô hr_sua có `ngay` không khớp ngày nào của tháng (dữ liệu bẩn, hoặc
      // PATCH cũ lọt ngày 31 vào tháng 2) vẫn phải được mang theo: xoá nó đi
      // là phá đúng thứ spec gọi là bất khả xâm phạm.
      //
      // Cờ cảnh báo của những ô này cũng phải được cộng vào soOCanhBao — nếu
      // không, `demLaiOTrong()` (đếm TẤT CẢ ô trong chiTietNgay, không phân
      // biệt trong/ngoài phạm vi tháng) và `generate()` sẽ ra HAI con số khác
      // nhau cho CÙNG một dòng dữ liệu, chỉ tuỳ đường nào chạy sau cùng.
      const ngayDaXet = new Set(cacNgay.map((n) => Number(n.slice(-2))));
      for (const [soNgay, cu] of oCu) {
        if (ngayDaXet.has(soNgay)) continue;
        if (nguonCuaO(cu) !== NGUON_O.HR_SUA) continue;
        oMoi.push(cu);
        if (cu.canhBao?.length) soOCanhBao += 1;
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

    // Dòng "mồ côi": tồn tại trong `dongCoSan` (bảng công tháng này) nhưng
    // `employeeId` không còn nằm trong `employees` đang hoạt động — NV bị
    // soft-delete SAU khi đã có dòng, thường vẫn còn `soOTrong > 0`. Vòng lặp
    // trên chỉ đi qua `employees` nên KHÔNG BAO GIỜ quay lại dòng này; mà
    // `finalize()` đọc mọi dòng active của tháng bất kể NV còn hoạt động hay
    // không, nên nó chặn chốt vĩnh viễn nếu không được dọn ở đây. Không đụng
    // dòng đã `chot` — đã khoá có chủ ý, không phải việc của generate().
    for (const row of dongCoSan) {
      if (activeIds.has(row.employeeId)) continue;
      if (row.trangThai === 'chot') continue;
      if ((row.soOTrong ?? 0) === 0 && (row.soOCanhBao ?? 0) === 0) continue;

      row.soOTrong = 0;
      row.soOCanhBao = 0;
      await this.repo.save(row);
      tomTat.soDongMoCoi += 1;
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
   * Chốt xong nghĩa là kỳ lương có thể đã tính theo bảng công này. Sửa lén
   * một ô sau đó là làm cho phiếu lương đã phát và bảng công lệch nhau mà
   * không ai biết. Muốn sửa thì phải mở lại — hành động có chủ ý.
   *
   * Lỗ hổng có sẵn TRƯỚC P3.9: `finalize()` đặt cờ `chot` nhưng không hàm
   * nào kiểm, nên bảng công đã tính lương vẫn sửa được mà không ai biết.
   */
  private chanKhiDaChot(item: Timesheet): void {
    if (item.trangThai === 'chot') {
      throw new ConflictException({
        code: MA_LOI_BANG_CONG.BANG_CONG_DA_CHOT,
        message: 'Bảng công đã chốt. Bấm "Mở lại" trước khi sửa.',
      });
    }
  }

  /**
   * Mốc ngày làm việc cuối áp dụng được của MỘT hồ sơ thôi việc, hoặc
   * `undefined` nếu hồ sơ đó chưa đủ chín (chưa duyệt/hoàn thành) — dùng
   * chung cho `generate()` (gom theo lô, tự tính ngày muộn nhất cho mỗi NV
   * trong `Map`) và `mocNgayLamViecCuoi()` (một NV, cũng lấy muộn nhất).
   *
   * Luật này trước đây nằm rải ở HAI nơi (Task 4 review round 1) — sửa một
   * chỗ quên chỗ kia khiến `generate()` và "trả về tự động"
   * (`suyLaiMotNgay()`/`demLaiOTrong()`) tính khác ngày nhau cho CÙNG một NV,
   * ghi một ký hiệu SAI cho ngày người đó thật ra đã nghỉ hoặc chưa nghỉ.
   *
   * Rơi về `ngayNopDon` (bắt buộc) khi `ngayLamViecCuoi` để trống, còn hơn
   * coi như người đó làm việc mãi mãi.
   */
  private ngayCuoiHopLeCuaHoSo(tv: Resignation): string | undefined {
    if (tv.trangThai !== 'da_duyet' && tv.trangThai !== 'hoan_thanh') return undefined;
    return tv.ngayLamViecCuoi || tv.ngayNopDon || undefined;
  }

  /**
   * Mốc ngày làm việc cuối của MỘT nhân viên, lấy từ hồ sơ thôi việc đã
   * duyệt/hoàn thành — dùng chung cho `suyLaiMotNgay()` và `demLaiOTrong()`.
   *
   * Lấy ngày MUỘN NHẤT chứ không phải hồ sơ khớp đầu tiên trong mảng: NV
   * nghỉ rồi được tuyển lại rồi nghỉ tiếp sẽ có NHIỀU hồ sơ, và bắt phải hồ
   * sơ cũ thì mọi ngày sau đó bị coi là ngoài khoảng làm việc.
   *
   * `generate()` giữ nguyên cách tính theo lô (gom `Map<employeeId, ...>`
   * một lần cho mọi nhân viên) vì hiệu năng — không refactor để dùng chung
   * VÒNG LẶP này, chỉ dùng chung `ngayCuoiHopLeCuaHoSo()` ở trên cho LUẬT
   * chọn ngày của từng hồ sơ.
   */
  private mocNgayLamViecCuoi(thoiViec: Resignation[]): string | undefined {
    let muonNhat: string | undefined;
    for (const tv of thoiViec) {
      const ngay = this.ngayCuoiHopLeCuaHoSo(tv);
      if (!ngay) continue;
      if (!muonNhat || ngay > muonNhat) muonNhat = ngay;
    }
    return muonNhat;
  }

  /** Suy lại ký hiệu cho đúng MỘT ngày của MỘT dòng — dùng cho "trả về tự động". */
  private async suyLaiMotNgay(item: Timesheet, ngayTrongThang: number) {
    const ngay = `${item.thang}-${String(ngayTrongThang).padStart(2, '0')}`;
    const { ObjectId } = await import('mongodb');
    const emp = await this.employeeRepo.findOne({
      where: { _id: new ObjectId(item.employeeId) as any },
    });

    const [banGhi, don, ngayLe, thoiViec] = await Promise.all([
      // Chặn khoảng ngày ở tầng truy vấn — cùng lý do đã ghi ở generate() và
      // demLaiOTrong(): không chặn thì mỗi lần bấm "Trả về tự động" MỘT ô sẽ
      // nạp cả lịch sử chấm công của người đó, dùng đúng một ngày rồi bỏ.
      this.recordRepo.find({
        where: {
          employeeId: item.employeeId,
          isActive: true,
          ngay: { $gte: `${item.thang}-01`, $lte: `${item.thang}-31` },
        } as any,
      }),
      this.requestRepo.find({ where: { employeeId: item.employeeId, isActive: true } as any }),
      this.holidayRepo.find({ where: { isActive: true } as any }),
      this.resignationRepo.find({ where: { employeeId: item.employeeId, isActive: true } as any }),
    ]);

    const duLieu = gomTheoNgay(banGhi, don, item.thang).get(item.employeeId)?.get(ngay);

    return suyKyHieuNgay({
      ngay,
      ngayVaoLam: emp?.ngayVaoLam,
      ngayLamViecCuoi: this.mocNgayLamViecCuoi(thoiViec),
      ngayLamViecTrongTuan: emp?.ngayLamViecTrongTuan,
      laNgayLe: tapNgayLeCuaThang(ngayLe, item.thang).has(ngay),
      donNghi: duLieu?.donNghi ?? null,
      coChamVao: duLieu?.coChamVao ?? false,
      coChamRa: duLieu?.coChamRa ?? false,
      coBanGhiNgoaiVung: duLieu?.coBanGhiNgoaiVung ?? false,
    });
  }

  /**
   * Đếm lại soOTrong/soOCanhBao sau khi HR sửa tay (setDay hoặc update thay
   * cả mảng chiTietNgay).
   *
   * "Ô trống" chỉ tính trên NGÀY LÀM VIỆC — Chủ nhật, ngày trước khi vào làm
   * và ngày sau khi nghỉ việc đều không phải việc HR phải xử lý. Nên phải
   * suy lại từng ngày chưa có ký hiệu thay vì đếm suông số ngày thiếu.
   *
   * KHÔNG gọi `suyLaiMotNgay()` trong vòng lặp: hàm đó tự truy vấn 5 lần cho
   * MỘT ngày, nên một tháng còn 20 ô trống sẽ thành 100 truy vấn cho một cú
   * bấm sửa một ô. Ở đây lấy dữ liệu của dòng này MỘT LẦN (5 truy vấn, không
   * đổi theo số ô trống) rồi lặp thuần trong bộ nhớ bằng `suyKyHieuNgay()`
   * trực tiếp — cùng cách `generate()` đã làm cho cả tháng.
   *
   * `soOCanhBao` cộng cảnh báo của MỌI ngày trống có `kq.canhBao.length`,
   * không riêng những ngày `chuaXuLy` — giống hệt `generate()`. Ca cụ thể:
   * HR xoá một ô mà ngày đó có chấm vào nhưng thiếu giờ ra, máy suy ra lại
   * `X` kèm cờ `thieu_gio_ra` (`chuaXuLy: false`, không phải "ô trống"), nếu
   * chỉ cộng theo `soOTrong` thì cảnh báo này biến mất khỏi cột cho tới lần
   * Tổng hợp kế tiếp.
   */
  private async demLaiOTrong(item: Timesheet): Promise<void> {
    const { ObjectId } = await import('mongodb');
    const [emp, banGhi, don, ngayLe, thoiViec] = await Promise.all([
      this.employeeRepo.findOne({ where: { _id: new ObjectId(item.employeeId) as any } }),
      this.recordRepo.find({
        where: {
          employeeId: item.employeeId,
          isActive: true,
          ngay: { $gte: `${item.thang}-01`, $lte: `${item.thang}-31` },
        } as any,
      }),
      this.requestRepo.find({ where: { employeeId: item.employeeId, isActive: true } as any }),
      this.holidayRepo.find({ where: { isActive: true } as any }),
      this.resignationRepo.find({ where: { employeeId: item.employeeId, isActive: true } as any }),
    ]);

    const tapLe = tapNgayLeCuaThang(ngayLe, item.thang);
    const theoNgay = gomTheoNgay(banGhi, don, item.thang).get(item.employeeId);
    const ngayLamViecCuoi = this.mocNgayLamViecCuoi(thoiViec);

    const daCo = new Set((item.chiTietNgay ?? []).map((c) => c.ngay));
    let soOTrong = 0;
    // Cảnh báo của các ngày CHƯA có ô (khác với cảnh báo của ô đã có sẵn
    // trong chiTietNgay, cộng riêng bên dưới) — cùng cách generate() tách
    // hai nguồn cảnh báo (ô hr_sua giữ nguyên vs. ô vừa suy ra).
    let soOCanhBaoTrong = 0;

    for (const ngay of cacNgayTrongThang(item.thang)) {
      const soNgay = Number(ngay.slice(-2));
      if (daCo.has(soNgay)) continue;

      const duLieu = theoNgay?.get(ngay);
      const kq = suyKyHieuNgay({
        ngay,
        ngayVaoLam: emp?.ngayVaoLam,
        ngayLamViecCuoi,
        ngayLamViecTrongTuan: emp?.ngayLamViecTrongTuan,
        laNgayLe: tapLe.has(ngay),
        donNghi: duLieu?.donNghi ?? null,
        coChamVao: duLieu?.coChamVao ?? false,
        coChamRa: duLieu?.coChamRa ?? false,
        coBanGhiNgoaiVung: duLieu?.coBanGhiNgoaiVung ?? false,
      });

      if (kq.chuaXuLy) soOTrong += 1;
      if (kq.canhBao.length) soOCanhBaoTrong += 1;
    }

    item.soOTrong = soOTrong;
    item.soOCanhBao =
      (item.chiTietNgay ?? []).filter((c) => c.canhBao?.length).length + soOCanhBaoTrong;
  }

  /**
   * Upserts a single day's symbol into `chiTietNgay` and recomputes the
   * derived totals. Passing an empty/falsy `kyHieu` removes that day's
   * entry entirely (clearing the cell) rather than storing a blank symbol.
   *
   * HR chạm vào ô nào thì ô đó thuộc về HR: đặt `nguon: 'hr_sua'` và xoá
   * `canhBao` cũ — cảnh báo cũ nói về giá trị máy suy ra, không còn đúng với
   * giá trị người vừa đặt. `veTuDong` là đường lùi ngược lại: xoá dấu
   * `hr_sua` rồi tính lại đúng ngày đó như máy vẫn quản.
   */
  async setDay(id: string, dto: SetDayDto): Promise<Timesheet> {
    const item = await this.findOne(id);
    this.chanKhiDaChot(item);

    const cells = (item.chiTietNgay ?? []).filter((c) => c.ngay !== dto.ngay);

    if (dto.veTuDong) {
      const kq = await this.suyLaiMotNgay(item, dto.ngay);
      if (kq.kyHieu) {
        cells.push({
          ngay: dto.ngay,
          kyHieu: kq.kyHieu,
          nguon: NGUON_O.TU_DONG,
          canhBao: kq.canhBao.length ? kq.canhBao : undefined,
        });
      }
    } else if (dto.kyHieu) {
      cells.push({ ngay: dto.ngay, kyHieu: dto.kyHieu, nguon: NGUON_O.HR_SUA });
    }

    cells.sort((a, b) => a.ngay - b.ngay);
    item.chiTietNgay = cells;
    await this.demLaiOTrong(item);
    this.recompute(item);

    return this.repo.save(item);
  }

  /**
   * `soNgayCong` (and the P/KL/O counters) are always derived from
   * `chiTietNgay` — any value the caller sends for them is ignored. If the
   * dto includes a new `chiTietNgay` array, it replaces the existing grid
   * wholesale and triggers a recompute; manual fields (soLanDiMuon,
   * soLanVeSom, ghiChu, soGioLamThem) are applied as-is.
   *
   * `chiTietNgay` thay cả mảng thì `soOTrong`/`soOCanhBao` cũng phải đếm lại
   * — không chỉ `generate()` và `setDay()` mới đổi lưới, PUT nguyên khối
   * cũng đổi được, nên bỏ sót đường này thì HR lấp đủ ô qua PUT mà cột "ô
   * trống" vẫn đứng yên vĩnh viễn.
   */
  async update(id: string, dto: UpdateTimesheetDto): Promise<Timesheet> {
    const item = await this.findOne(id);
    this.chanKhiDaChot(item);

    const { soNgayCong: _ignored, chiTietNgay, ...rest } = dto;

    Object.assign(item, rest);
    if (chiTietNgay) {
      item.chiTietNgay = chiTietNgay as ChiTietNgayCong[];
    }
    await this.demLaiOTrong(item);
    this.recompute(item);

    return this.repo.save(item);
  }

  /**
   * Chốt cả tháng. Chặn TRƯỚC khi ghi bất kỳ dòng nào: chốt được nửa chừng
   * rồi mới báo lỗi là trạng thái tệ nhất — HR không biết đã chốt tới đâu, và
   * bảng công thành nửa chốt nửa không.
   */
  async finalize(thang: string): Promise<Timesheet[]> {
    const rows = await this.repo.find({ where: { thang, isActive: true } as any });

    // Chưa từng bấm "Tổng hợp bảng công" cho tháng này thì không có gì để
    // khoá — trả "thành công" với mảng rỗng dễ khiến HR tưởng nhầm tháng đã
    // chốt xong, trong khi thực ra chưa hề có một dòng công nào được tính.
    if (rows.length === 0) {
      throw new ConflictException({
        code: MA_LOI_BANG_CONG.CHUA_CO_BANG_CONG,
        message: 'Chưa có bảng công nào để chốt. Bấm "Tổng hợp bảng công" trước.',
      });
    }

    const conTrong = rows.filter((r) => (r.soOTrong ?? 0) > 0);
    if (conTrong.length > 0) {
      const tongO = conTrong.reduce((s, r) => s + (r.soOTrong ?? 0), 0);
      throw new ConflictException({
        code: MA_LOI_BANG_CONG.CON_O_CHUA_XU_LY,
        message: `Còn ${tongO} ô chưa xử lý ở ${conTrong.length} nhân viên. Xử lý hết rồi mới chốt được.`,
      });
    }

    const saved: Timesheet[] = [];
    for (const row of rows) {
      // Dòng đã chốt sẵn (vd chốt lại một tháng đã chốt toàn bộ, hoặc
      // generate() vừa tạo dòng mới bên cạnh các dòng cũ đã chốt) thì ghi lại
      // không đổi gì — bỏ qua để khỏi tốn một lượt save() vô ích cho mỗi dòng.
      if (row.trangThai === 'chot') {
        saved.push(row);
        continue;
      }
      row.trangThai = 'chot';
      saved.push(await this.repo.save(row));
    }

    return saved;
  }

  /**
   * Mở lại bảng công đã chốt để sửa.
   *
   * Có hàm này vì thực tế sẽ có lúc phải sửa bảng công đã chốt. Điểm khác so
   * với trước P3.9 là việc đó trở thành hành động CÓ CHỦ Ý, thay vì sửa lén
   * một ô trong khi kỳ lương đã tính theo con số cũ.
   */
  async moLai(thang: string): Promise<number> {
    const rows = await this.repo.find({ where: { thang, isActive: true } as any });

    let so = 0;
    for (const row of rows) {
      if (row.trangThai !== 'chot') continue;
      row.trangThai = 'nhap';
      await this.repo.save(row);
      so += 1;
    }

    return so;
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
