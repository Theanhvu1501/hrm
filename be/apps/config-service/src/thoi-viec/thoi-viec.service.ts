import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resignation, Employee } from '@app/entities';
import { CreateThoiViecDto, UpdateThoiViecDto } from './dto';

export interface ThoiViecFilter {
  employeeId?: string;
  trangThai?: string;
  loaiThoiViec?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class ThoiViec_Service {
  constructor(
    @InjectRepository(Resignation)
    private readonly repo: Repository<Resignation>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  private async findEmployee(employeeId: string): Promise<Employee> {
    const { ObjectId } = await import('mongodb');
    const emp = await this.employeeRepo.findOne({
      where: { _id: new ObjectId(employeeId) as any },
    });

    if (!emp) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    return emp;
  }

  async create(dto: CreateThoiViecDto): Promise<Resignation> {
    const emp = await this.findEmployee(dto.employeeId);

    const entity = this.repo.create({
      employeeId: dto.employeeId,
      employeeName: emp.hoTen,
      employeeCode: emp.employeeId,
      ngayNopDon: dto.ngayNopDon,
      ngayLamViecCuoi: dto.ngayLamViecCuoi,
      loaiThoiViec: dto.loaiThoiViec,
      lyDo: dto.lyDo,
      viPham: dto.viPham,
      checklistBanGiao: dto.checklistBanGiao,
      soQuyetDinh: dto.soQuyetDinh,
      ghiChu: dto.ghiChu,
      trangThai: 'cho_duyet',
      isActive: true,
    } as Partial<Resignation>);

    return this.repo.save(entity);
  }

  /**
   * Coerces the `isActive` filter value, which may arrive as a real boolean
   * (programmatic callers) or as the STRING "true"/"false" (HTTP query params
   * are never parsed to booleans by Nest's default query pipe). Defaults to
   * `true` when the value is absent, mirroring nhan-vien/hop-dong/qua-trinh.
   */
  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  async findAll(filter?: ThoiViecFilter): Promise<Resignation[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.trangThai) where.trangThai = filter.trangThai;
    if (filter?.loaiThoiViec) where.loaiThoiViec = filter.loaiThoiViec;

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<Resignation> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy hồ sơ thôi việc với ID ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateThoiViecDto): Promise<Resignation> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  /**
   * 'da_duyet'/'hoan_thanh' là hai trạng thái "có hiệu lực nghỉ việc": đây là
   * lúc `updateStatus()` đẩy Employee.trangThai sang 'da_nghi', và cũng là
   * lúc bảng công (`ngayCuoiHopLeCuaHoSo` trong bang-cong.service.ts) bắt
   * đầu tính hồ sơ vào mốc cắt ngày công. 'cho_duyet'/'tu_choi' thì không.
   */
  private coHieuLucNghiViec(trangThai: string): boolean {
    return trangThai === 'da_duyet' || trangThai === 'hoan_thanh';
  }

  /** Giá trị khôi phục cho NV khi hồ sơ thôi việc rời khỏi trạng thái hiệu lực. */
  private trangThaiKhoiPhuc(item: Resignation): string {
    return item.trangThaiNhanVienTruocKhiDuyet ?? 'dang_lam_viec';
  }

  /**
   * Lọc giá trị hợp lệ để CHỤP làm "trạng thái NV trước khi duyệt".
   *
   * 'da_nghi' KHÔNG BAO GIỜ là giá trị chụp hợp lệ — theo định nghĩa, đây là
   * ảnh chụp thời điểm TRƯỚC KHI hồ sơ có hiệu lực, nên NV không thể đã là
   * 'da_nghi' ngay lúc đó (trừ phi đang bị một hồ sơ thôi việc KHÁC giữ ở
   * 'da_nghi' — cũng không phải giá trị đáng chụp lại). Dùng làm lưới an
   * toàn CUỐI CÙNG cho `updateStatus()` — xem doc-comment ở đó (round 3,
   * CRITICAL) về cơ chế ghi-hai-pha đã giải quyết phần lớn lỗ hổng; hàm này
   * chỉ còn xử lý trường hợp hồ sơ cũ/hỏng không có snapshot durable nào để
   * rơi về, nên vẫn rơi về 'dang_lam_viec' — CÙNG mức suy giảm đã biết và
   * đã ghi runbook cho hồ sơ cũ không có snapshot (xem ops/README.md).
   */
  private giaTriChupHopLe(
    trangThaiHienTaiCuaEmp: string,
    snapshotDaCoTrenHoSo: string | undefined,
  ): string {
    if (trangThaiHienTaiCuaEmp === 'da_nghi') {
      return snapshotDaCoTrenHoSo ?? 'dang_lam_viec';
    }
    return trangThaiHienTaiCuaEmp;
  }

  /**
   * Phát hiện & vá một CHUYỂN TIẾP DANG DỞ: hồ sơ đang ở trạng thái KHÔNG
   * hiệu lực (`cho_duyet`/`tu_choi`) nhưng vẫn mang snapshot durable
   * (`trangThaiNhanVienTruocKhiDuyet != null`) — dấu hiệu duy nhất còn lại
   * cho biết lần ghi HỒ SƠ cuối (W3) của một lần duyệt trước đó đã thất bại
   * SAU KHI lần ghi NV đã thành công (xem doc-comment `updateStatus()`,
   * round 3). Nếu không vá, NV kẹt 'da_nghi' vĩnh viễn ngay khi hồ sơ bị
   * từ chối hoặc xoá thay vì được thử duyệt lại — chính hai đường "thoát"
   * tự nhiên nhất mà HR sẽ bấm khi thấy hồ sơ hiện "chờ duyệt" bất thường
   * (review round 4, CRITICAL).
   *
   * `emp.trangThai === 'da_nghi'` là điều kiện BẮT BUỘC để giữ hàm này TRƠ
   * sau một chu kỳ duyệt → huỷ duyệt BÌNH THƯỜNG (không dang dở): snapshot
   * CỐ Ý không bị xoá khỏi hồ sơ sau khi khôi phục (xem nhánh "đi ra" của
   * `updateStatus()` — không có dòng nào xoá `trangThaiNhanVienTruocKhiDuyet`),
   * nên nó vẫn còn đó dù NV lúc này đã đúng rồi (vd 'dang_lam_viec') — nếu
   * thiếu điều kiện này, MỌI hồ sơ đã từng qua một lần duyệt/huỷ duyệt sẽ bị
   * "vá" lại mỗi lần đổi trạng thái hoặc bị xoá sau đó, kể cả khi không có
   * gì dang dở. Chỉ khi NV THỰC SỰ còn kẹt ở 'da_nghi' — nghĩa là không có
   * hồ sơ thôi việc nào khác đang hợp lệ giữ họ ở đó — hàm mới ghi.
   */
  private async vaChuyenTiepDangDoNeuCo(item: Resignation): Promise<void> {
    if (item.trangThaiNhanVienTruocKhiDuyet == null) return;

    const emp = await this.findEmployee(item.employeeId);
    if (emp.trangThai !== 'da_nghi') return;

    emp.trangThai = this.trangThaiKhoiPhuc(item);
    // Xem lý giải "không nuốt lỗi" ở doc-comment updateStatus() — áp dụng
    // như nhau: một lần vá thất bại phải báo lỗi, không được coi là xong.
    await this.employeeRepo.save(emp);
  }

  /**
   * Xoá mềm MỘT hồ sơ thôi việc phải huỷ cả hai hiệu ứng đã áp cho nhân
   * viên khi hồ sơ đó đang có hiệu lực — không chỉ tắt `isActive`:
   *   - bảng công: lọc theo `isActive: true` nên mốc cắt ngày công tự biến
   *     mất, KHÔNG cần sửa gì thêm ở đây.
   *   - chấm công: `chanNeuDaNghiViec()` đọc `Employee.trangThai`, không
   *     đọc hồ sơ thôi việc, nên nếu không chủ động trả lại trạng thái làm
   *     việc thì NV vẫn bị chặn chấm công dù bảng công đã tính công lại
   *     bình thường cho họ — hai hệ thống lệch pha nhau.
   *
   * THỨ TỰ GHI: nhân viên TRƯỚC, `isActive=false` SAU (xem lý giải dài ở
   * `updateStatus()` — cùng một lỗi thiết kế, cùng một cách sửa). Nếu ghi
   * NV lỗi, hồ sơ vẫn còn `isActive=true` trong DB nên lần gọi lại sẽ đi
   * qua guard bên dưới và thử lại đúng phần đã lỗi — không bị coi là "đã
   * xoá rồi" và bỏ qua NV vĩnh viễn.
   *
   * Guard `!item.isActive` chặn xử lý lại khi remove() bị gọi lần hai trên
   * cùng một hồ sơ ĐÃ xoá THÀNH CÔNG: không phải vì tốn kém (save Mongo là
   * idempotent) mà vì nếu không guard, một lần gọi lại vô tình (double-
   * click, retry sau khi đã thành công) sẽ ghi ĐÈ trangThai hiện tại của NV
   * bằng giá trị chụp cũ, kể cả khi NV đã được HR chỉnh tay sang trạng thái
   * khác từ sau lần xoá đầu tiên.
   *
   * Nhánh `else` (review round 4, CRITICAL): xoá một hồ sơ KHÔNG ở trạng
   * thái hiệu lực (vd `cho_duyet`) trông vô hại, nhưng nếu đó là một
   * CHUYỂN TIẾP DANG DỞ (xem `vaChuyenTiepDangDoNeuCo()`) thì `isActive =
   * false` xoá luôn hồ sơ khỏi `findAll()` — tức xoá luôn DẤU VẾT duy nhất
   * còn lại giải thích vì sao NV đang bị `chanNeuDaNghiViec()` chặn, không
   * còn cách nào truy lại từ giao diện HR sau đó.
   */
  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    if (!item.isActive) return;

    if (this.coHieuLucNghiViec(item.trangThai)) {
      const emp = await this.findEmployee(item.employeeId);
      emp.trangThai = this.trangThaiKhoiPhuc(item);
      // Xem lý giải "không nuốt lỗi" ở updateStatus() — áp dụng như nhau.
      await this.employeeRepo.save(emp);
    } else {
      await this.vaChuyenTiepDangDoNeuCo(item);
    }

    item.isActive = false;
    await this.repo.save(item);
  }

  /**
   * Updates the resignation's status.
   *
   * Đi VÀO trạng thái có hiệu lực ('da_duyet'/'hoan_thanh') từ trạng thái
   * chưa có hiệu lực: chụp lại Employee.trangThai NGAY LÚC ĐÓ (để còn khôi
   * phục đúng — vd 'tam_nghi' — nếu sau này huỷ duyệt), rồi đẩy nhân viên
   * sang 'da_nghi'. Chuyển giữa hai trạng thái CÙNG có hiệu lực (da_duyet ->
   * hoan_thanh) không chụp lại — chụp lúc đó sẽ đè mất giá trị gốc bằng
   * chính 'da_nghi'.
   *
   * Đi RA khỏi trạng thái có hiệu lực (về 'tu_choi'/'cho_duyet'): khôi phục
   * Employee.trangThai về đúng giá trị đã chụp — đây là điểm sửa Gap 1 (HR
   * duyệt nhầm rồi từ chối lại vẫn phải mở lại được chấm công cho NV).
   *
   * Không đi vào/ra trạng thái có hiệu lực (vd cho_duyet -> tu_choi khi
   * chưa từng được duyệt): KHÔNG đụng tới hồ sơ nhân viên — TRỪ KHI hồ sơ
   * đang mang dấu vết một chuyển tiếp dang dở, xem `vaChuyenTiepDangDoNeuCo()`
   * (round 4) ngay dưới đây.
   *
   * THỨ TỰ GHI — nhân viên TRƯỚC, hồ sơ thôi việc SAU (review round 2,
   * CRITICAL): bản đầu ghi hồ sơ trước rồi mới ghi NV. Nếu ghi NV lỗi giữa
   * chừng, hồ sơ ĐÃ đổi trạng thái trong DB, còn NV thì chưa — caller nhận
   * 5xx và làm đúng việc "retry cùng request", nhưng lần gọi lại sẽ
   * `findOne()` ra hồ sơ đã ở trạng thái ĐÍCH, khiến `dangHieuLucTruoc` và
   * `seHieuLuc` tính ra BẰNG NHAU và rơi vào nhánh no-op phía trên — không
   * còn fetch/ghi NV, không còn báo lỗi, trả 200 "thành công" trong khi NV
   * vẫn kẹt nguyên trạng thái cũ. Guard chống double-processing (nãy dùng
   * để tránh ghi đè quỹ phép/luồng khác) vô tình biến CHÍNH retry — con
   * đường phục hồi duy nhất — thành no-op vĩnh viễn.
   *
   * Ghi NV trước khắc phục: nếu bước NV lỗi, hồ sơ (biến `item` local) CHƯA
   * hề bị `save()`, nên DB vẫn giữ nguyên trạng thái cũ; lần gọi lại tính
   * lại đúng `dangHieuLucTruoc`/`seHieuLuc` như lần đầu và thử lại toàn bộ
   * thao tác — không có short-circuit. Lỗi vẫn được propagate (không nuốt),
   * chỉ đổi thứ tự để retry có ý nghĩa.
   *
   * NHƯNG đổi thứ tự chỉ DỜI lỗ hổng sang chiều ngược lại, không xoá được
   * nó — nguồn của snapshot (Employee) chính là thứ mà request này vừa mới
   * sửa. Nếu ghi NV THÀNH CÔNG ('da_nghi') rồi ghi HỒ SƠ (bước cuối) thất
   * bại, DB lúc đó có NV='da_nghi' nhưng hồ sơ CHƯA đổi trạng thái; lần gọi
   * lại vẫn rơi vào đúng nhánh "lần đầu vào hiệu lực" (vì hồ sơ chưa có
   * hiệu lực trong DB) và đọc lại `emp.trangThai` để chụp — nhưng giá trị
   * đọc được lúc này LÀ 'da_nghi' (do lần ghi trước đã thành công), không
   * phải giá trị gốc thật. Không xử lý thì snapshot bị ghi đè vĩnh viễn
   * thành 'da_nghi' — huỷ duyệt/xoá sau này sẽ luôn trả NV về 'da_nghi',
   * tức KHÔNG BAO GIỜ mở khoá được — đúng lớp lỗi mà round 1 sinh ra để dập
   * (Gap 1/2), chỉ đổi hướng kích hoạt (review round 3, CRITICAL).
   *
   * KHÔNG có cách sắp thứ tự MỘT lần ghi NV + MỘT lần ghi hồ sơ mà không hở
   * ở một trong hai chiều — nguồn (Employee) và đích (Resignation) là hai
   * document độc lập, và repo này không dùng transaction Mongo đa-document
   * ở bất kỳ đâu khác (không muốn thêm session/replica-set requirement chỉ
   * cho một luồng). Giải pháp: THÊM MỘT LẦN GHI HỒ SƠ NỮA, TRƯỚC khi đụng
   * NV — ghi bền chính snapshot đó (trangThai hồ sơ CHƯA đổi, chỉ có
   * `trangThaiNhanVienTruocKhiDuyet`) trước khi `emp.trangThai` bị mutate.
   * Vậy nếu bước ghi NV hoặc bước ghi hồ sơ CUỐI thất bại, snapshot đã nằm
   * bền trong DB rồi — lần gọi lại đọc `item.trangThaiNhanVienTruocKhiDuyet`
   * đã có sẵn giá trị gốc thật, `giaTriChupHopLe()` không cần rơi về
   * 'dang_lam_viec' nữa. Guard `!== snapshot` bên dưới giữ pha ghi đầu
   * idempotent — không ghi lại nếu giá trị đã đúng từ một lần thử trước.
   *
   * QUAN TRỌNG — pha 1 chỉ đóng lỗ hổng CHO ĐƯỜNG RETRY-DUYỆT-LẠI, không
   * đóng lỗ hổng nói chung (review round 4, CRITICAL): nếu lần ghi hồ sơ
   * CUỐI (W3) thất bại SAU KHI lần ghi NV đã thành công, DB bị XÉ RÁCH ở
   * giữa hai lần thử — hồ sơ vẫn `cho_duyet` (chưa hiệu lực) nhưng NV đã
   * thực sự là 'da_nghi'. Duyệt lại (gọi lại đúng request cũ) thì tự lành,
   * đúng như đoạn trên mô tả — NHƯNG hai phản ứng tự nhiên khác mà HR nhìn
   * thấy hồ sơ "chờ duyệt" bất thường rồi bấm — TỪ CHỐI hoặc XOÁ — trước
   * bản vá round 4 đều đi qua nhánh no-op phía trên (không hiệu lực trước,
   * không hiệu lực sau ⇒ bỏ qua NV) hoặc `remove()`'s `else` cũ (không xoá
   * mềm gì cho hồ sơ chưa hiệu lực) và both đều ÂM THẦM để NV kẹt 'da_nghi'
   * — cùng lớp lỗi round 1 sinh ra để dập, chỉ đổi đường kích hoạt lần nữa.
   * `vaChuyenTiepDangDoNeuCo()` đóng nốt hai đường đó: một snapshot durable
   * còn sót trên một hồ sơ KHÔNG hiệu lực, cộng với NV thực sự đang
   * 'da_nghi', chỉ có thể là dấu vết của một chuyển tiếp dang dở — không
   * phải trạng thái hợp lệ nào khác — nên được coi là tín hiệu để vá,
   * không phải điều kiện chuyển trạng thái thông thường.
   */
  async updateStatus(id: string, trangThai: string): Promise<Resignation> {
    const item = await this.findOne(id);
    const dangHieuLucTruoc = this.coHieuLucNghiViec(item.trangThai);
    const seHieuLuc = this.coHieuLucNghiViec(trangThai);

    if (!dangHieuLucTruoc && !seHieuLuc) {
      await this.vaChuyenTiepDangDoNeuCo(item);
      item.trangThai = trangThai;
      return this.repo.save(item);
    }

    const emp = await this.findEmployee(item.employeeId);

    if (seHieuLuc && !dangHieuLucTruoc) {
      // Pha 1 — ghi BỀN snapshot TRƯỚC khi đụng NV, trangThai hồ sơ CHƯA
      // đổi. `giaTriChupHopLe()` vẫn lọc 'da_nghi' cho lần gọi lại sau một
      // thất bại ở pha này (khi đó live emp.trangThai vẫn là giá trị gốc
      // thật vì NV chưa hề bị ghi — an toàn), hoặc sau một thất bại ở pha
      // NV/pha 2 (khi đó dùng lại chính snapshot vừa ghi bền ở đây).
      const snapshot = this.giaTriChupHopLe(
        emp.trangThai,
        item.trangThaiNhanVienTruocKhiDuyet,
      );
      if (item.trangThaiNhanVienTruocKhiDuyet !== snapshot) {
        item.trangThaiNhanVienTruocKhiDuyet = snapshot;
        await this.repo.save(item);
      }
    }

    emp.trangThai = seHieuLuc ? 'da_nghi' : this.trangThaiKhoiPhuc(item);
    await this.employeeRepo.save(emp);

    item.trangThai = trangThai;
    return this.repo.save(item);
  }
}
