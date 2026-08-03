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
   * Phát hiện & vá một CHUYỂN TIẾP DANG DỞ: hồ sơ mang dấu `coChuyenTiepDangDo
   * === true` — nghĩa là pha 1 đã ghi bền snapshot (và bật cờ này) TRƯỚC khi
   * đụng NV, nhưng lần ghi HỒ SƠ CUỐI của quy trình duyệt/huỷ-duyệt đó (nơi
   * DUY NHẤT tắt cờ này) chưa từng thành công (xem doc-comment `updateStatus()`,
   * round 3). Nếu không vá, NV kẹt 'da_nghi' vĩnh viễn ngay khi hồ sơ bị từ
   * chối hoặc xoá thay vì được thử duyệt lại — chính hai đường "thoát" tự
   * nhiên nhất mà HR sẽ bấm khi thấy hồ sơ hiện "chờ duyệt" bất thường
   * (review round 4, CRITICAL).
   *
   * Review round 5, IMPORTANT — vì sao dùng CỜ RIÊNG thay vì suy ra dang dở
   * từ `trangThaiNhanVienTruocKhiDuyet != null`: snapshot đó KHÔNG BAO GIỜ
   * bị xoá khỏi hồ sơ sau khi khôi phục (mãi mãi là dấu vết lịch sử vô hại
   * của LẦN DUYỆT ĐÃ HOÀN TẤT), nên "snapshot khác null" đúng với MỌI hồ sơ
   * từng qua một lần duyệt/huỷ-duyệt bình thường — không chỉ hồ sơ dang dở.
   * Kết hợp thêm `emp.trangThai === 'da_nghi'` (bản round 4) làm giảm rủi ro
   * nhưng KHÔNG loại trừ: nếu hồ sơ R1 đó (đã huỷ duyệt sạch từ lâu, snapshot
   * chỉ còn là tàn dư) rồi NV sau đó THỰC SỰ nghỉ việc — qua một hồ sơ R2
   * KHÁC được duyệt hợp lệ, hoặc bị đặt `da_nghi` thẳng trên hồ sơ NV — thì
   * `emp.trangThai === 'da_nghi'` cũng đúng, và bản round 4 sẽ NHẦM coi R1
   * là dang dở rồi "vá" — tức ghi đè NV về lại snapshot cũ của R1, ÂM THẦM
   * MỞ KHOÁ một người đã thực sự nghỉ việc. Cờ `coChuyenTiepDangDo` loại trừ
   * đúng trường hợp này bằng cấu trúc: nó chỉ true khi CHÍNH quy trình
   * duyệt/huỷ-duyệt hiện tại của CHÍNH hồ sơ này chưa ghi xong lần cuối —
   * không suy luận gián tiếp từ hai điều kiện có thể trùng hợp.
   *
   * VẪN giữ `emp.trangThai === 'da_nghi'` làm điều kiện thứ hai (không chỉ
   * dựa vào cờ): nếu chuyển tiếp dang dở xảy ra ở PHA GHI NV (không phải pha
   * ghi hồ sơ cuối — round 2's W2, ghi NV thất bại), cờ vẫn true (đã bật ở
   * pha 1) nhưng `emp.trangThai` CHƯA từng đổi — `trangThaiKhoiPhuc(item)`
   * lúc đó trùng giá trị hiện tại của NV nên vá cũng vô hại, NHƯNG nếu giữa
   * lúc đó và lúc HR từ chối/xoá, NV lại bị đổi trạng thái hợp lệ vì lý do
   * khác (vd tạm nghỉ) mà cờ của R1 vẫn treo true — chỉ vá khi NV THỰC SỰ
   * đang kẹt 'da_nghi' mới tránh ghi đè nhầm một thay đổi hợp lệ không liên
   * quan xảy ra sau đó.
   */
  private async vaChuyenTiepDangDoNeuCo(item: Resignation): Promise<void> {
    if (!item.coChuyenTiepDangDo) return;

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

    // Dọn cờ dang dở (nếu có) khi hồ sơ bị xoá — từ đây record vĩnh viễn
    // isActive=false, cờ còn treo hay không không còn ý nghĩa gì (guard
    // đầu hàm chặn mọi lần gọi lại), dọn cho sạch để không gây khó hiểu nếu
    // có ai tra thẳng vào DB sau này.
    item.coChuyenTiepDangDo = false;
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
   * `vaChuyenTiepDangDoNeuCo()` đóng nốt hai đường đó.
   *
   * SỬA LẠI (review round 5, IMPORTANT) — bản round 4 dùng
   * "`trangThaiNhanVienTruocKhiDuyet != null` + `emp.trangThai === 'da_nghi'`"
   * làm tín hiệu duy nhất để suy ra dang dở. SAI: snapshot không bao giờ bị
   * xoá sau khi khôi phục, nên nó khác null trên MỌI hồ sơ từng qua một lần
   * duyệt/huỷ-duyệt BÌNH THƯỜNG — không chỉ hồ sơ dang dở. Ghép với
   * `emp.trangThai === 'da_nghi'` làm giảm khả năng trùng nhưng KHÔNG loại
   * trừ: nếu R1 (đã huỷ duyệt sạch) rồi NV sau đó THỰC SỰ nghỉ việc qua một
   * hồ sơ R2 khác, cả hai điều kiện lại đúng cùng lúc trên R1 — HR xoá/mở
   * lại R1 sẽ khiến hệ thống NHẦM "vá" nó, ghi đè NV về lại snapshot cũ của
   * R1, ÂM THẦM MỞ KHOÁ một người đã thực sự nghỉ việc (đi từ chiều "stuck"
   * mà round 1-4 chặn, sang chiều "over-restore" mới). Sửa bằng cờ tường
   * minh `Resignation.coChuyenTiepDangDo` (đặt true ở pha 1, tắt ở lần ghi
   * hồ sơ CUỐI) thay vì suy luận gián tiếp — xem doc-comment
   * `vaChuyenTiepDangDoNeuCo()` cho lý giải đầy đủ.
   */
  async updateStatus(id: string, trangThai: string): Promise<Resignation> {
    const item = await this.findOne(id);
    const dangHieuLucTruoc = this.coHieuLucNghiViec(item.trangThai);
    const seHieuLuc = this.coHieuLucNghiViec(trangThai);

    if (!dangHieuLucTruoc && !seHieuLuc) {
      await this.vaChuyenTiepDangDoNeuCo(item);
      // Dù có vá hay không, chuyển trạng thái này (vd cho_duyet -> tu_choi
      // KHÔNG qua hiệu lực) tự thân không mở ra một chuyển tiếp dang dở mới
      // — dọn cờ cho sạch nếu nó còn treo true từ một vòng trước.
      item.coChuyenTiepDangDo = false;
      item.trangThai = trangThai;
      return this.repo.save(item);
    }

    const emp = await this.findEmployee(item.employeeId);

    if (seHieuLuc && !dangHieuLucTruoc) {
      // Pha 1 — ghi BỀN snapshot + BẬT cờ `coChuyenTiepDangDo` TRƯỚC khi
      // đụng NV, trangThai hồ sơ CHƯA đổi. `giaTriChupHopLe()` vẫn lọc
      // 'da_nghi' cho lần gọi lại sau một thất bại ở pha này (khi đó live
      // emp.trangThai vẫn là giá trị gốc thật vì NV chưa hề bị ghi — an
      // toàn), hoặc sau một thất bại ở pha NV/pha 2 (khi đó dùng lại chính
      // snapshot vừa ghi bền ở đây). Ghi lại (dù snapshot không đổi) MIỄN LÀ
      // cờ chưa bật — nếu chỉ xét riêng snapshot, một lần gọi lại có
      // snapshot trùng khớp NHƯNG cờ chưa từng được ghi bền (hiếm, nhưng có
      // thể xảy ra nếu hồ sơ được tạo thủ công/migrate với snapshot có sẵn)
      // sẽ bỏ qua pha 1 và để cờ mãi mãi false — vô hiệu hoá toàn bộ cơ chế
      // vá của round 4/5 cho riêng hồ sơ đó.
      const snapshot = this.giaTriChupHopLe(
        emp.trangThai,
        item.trangThaiNhanVienTruocKhiDuyet,
      );
      if (item.trangThaiNhanVienTruocKhiDuyet !== snapshot || !item.coChuyenTiepDangDo) {
        item.trangThaiNhanVienTruocKhiDuyet = snapshot;
        item.coChuyenTiepDangDo = true;
        await this.repo.save(item);
      }
    }

    emp.trangThai = seHieuLuc ? 'da_nghi' : this.trangThaiKhoiPhuc(item);
    await this.employeeRepo.save(emp);

    item.trangThai = trangThai;
    // Lần ghi hồ sơ CUỐI của quy trình duyệt/huỷ-duyệt này — tắt cờ dang dở
    // (nếu có) NGAY TRONG CÙNG lần lưu này: đây chính là điểm mà round 3 mô
    // tả là "hoàn tất". Áp dụng chung cho cả chiều vào lẫn ra hiệu lực —
    // vô hại nếu cờ vốn đã false.
    item.coChuyenTiepDangDo = false;
    return this.repo.save(item);
  }
}
