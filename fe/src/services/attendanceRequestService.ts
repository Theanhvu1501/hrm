import { ServiceBase } from './base/service-base';

// nghi_phep/nghi_bu được P3.6 thêm — xem be/apps/config-service/src/
// don-cham-cong/dto/create-don-cham-cong.dto.ts (@IsIn của trường loaiDon).
export type AttendanceRequestType =
  | 'giai_trinh'
  | 'lam_them_gio'
  | 'nghi_phep'
  | 'nghi_bu';
export type AttendanceRequestStatus = 'cho_duyet' | 'da_duyet' | 'tu_choi';

/** ca_ngay|sang|chieu — chỉ có ý nghĩa khi đơn nghỉ phép đúng một ngày. */
export type Buoi = 'ca_ngay' | 'sang' | 'chieu';

/** Chỉ dùng khi loaiDon là nghi_phep/nghi_bu — xem create-don-cham-cong.dto.ts. */
export type LoaiNghi =
  | 'phep_nam'
  | 'khong_luong'
  | 'om_dau'
  | 'thai_san'
  | 'cuoi_hoi'
  | 'tang';

/** Kết quả suyHeSoOt() ở be/.../don-cham-cong/luat-don.ts — backend tự tính. */
export type LoaiNgayOt = 'ngay_thuong' | 'ngay_nghi' | 'ngay_le';

export interface AttendanceRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  loaiDon: AttendanceRequestType;
  ngay: string;
  lyDo?: string;
  gioTu?: string;
  gioDen?: string;
  minhChung?: string;
  trangThai: AttendanceRequestStatus;
  nguoiDuyet?: string;
  ghiChu?: string;
  isActive: boolean;

  // ── Đơn nghỉ phép (nghi_phep|nghi_bu): khoảng ngày [ngay, denNgay] ────────
  denNgay?: string;
  buoi?: Buoi;
  loaiNghi?: LoaiNghi;

  // ── Backend TỰ TÍNH (luat-don.ts) — client không gửi lên, chỉ đọc về.
  // Tất cả optional và KHÔNG có giá trị mặc định: 0 (vd. soGioOt=0) là giá
  // trị thật, phải sống sót qua transform() — không được rơi vào nhánh
  // fallback nào cả (không dùng `x.soGioOt || ...`).
  soNgayNghi?: number;
  soGioOt?: number;
  heSoOt?: number;
  loaiNgayOt?: LoaiNgayOt;

  // ── Vết duyệt đơn ─────────────────────────────────────────────────────────
  nguoiDuyetId?: string;
  thoiDiemDuyet?: string;
}

export interface AttendanceRequestFilter {
  employeeId?: string;
  loaiDon?: string;
  trangThai?: string;
  isActive?: boolean | string;
}

export interface CreateAttendanceRequestDto {
  employeeId: string;
  loaiDon: AttendanceRequestType;
  ngay: string;
  denNgay?: string;
  buoi?: Buoi;
  loaiNghi?: LoaiNghi;
  lyDo?: string;
  gioTu?: string;
  gioDen?: string;
  minhChung?: string;
  trangThai?: AttendanceRequestStatus;
  nguoiDuyet?: string;
  ghiChu?: string;
}

export type UpdateAttendanceRequestDto = Partial<CreateAttendanceRequestDto>;

/**
 * DTO nộp đơn CHO CHÍNH MÌNH — route `POST /don-cham-cong/cua-toi`.
 *
 * Cố tình KHÔNG có `employeeId`/`trangThai`/`nguoiDuyet` — khớp
 * `TaoDonCuaToiDto` (OmitType) ở backend
 * (be/apps/config-service/src/don-cham-cong/dto/tao-don-cua-toi.dto.ts).
 * Gửi kèm các trường này sẽ bị `ValidationPipe({ forbidNonWhitelisted: true })`
 * của backend từ chối 400, nên không khai chúng ở đây ngay từ tầng kiểu để
 * TypeScript chặn trước khi ra tới network.
 */
export interface TaoDonCuaToiDto {
  loaiDon: AttendanceRequestType;
  ngay: string;
  denNgay?: string;
  buoi?: Buoi;
  loaiNghi?: LoaiNghi;
  lyDo?: string;
  gioTu?: string;
  gioDen?: string;
  minhChung?: string;
  ghiChu?: string;
}

class AttendanceRequestService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/don-cham-cong' });
  }

  async getList(filter?: AttendanceRequestFilter): Promise<AttendanceRequest[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async get(id: string): Promise<AttendanceRequest> {
    const res = await super.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return this.transform(res);
  }

  async create(dto: CreateAttendanceRequestDto): Promise<AttendanceRequest> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(
    id: string,
    dto: UpdateAttendanceRequestDto
  ): Promise<AttendanceRequest> {
    const res = await this.put<Record<string, unknown>>(dto, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  async updateStatus(
    id: string,
    trangThai: AttendanceRequestStatus,
    nguoiDuyet?: string
  ): Promise<AttendanceRequest> {
    const res = await this.patch<Record<string, unknown>>(
      { trangThai, nguoiDuyet },
      { endpoint: `/${id}/trang-thai` }
    );
    return this.transform(res);
  }

  // ── Tự phục vụ — dùng cho màn `/toi/don-tu` (Task 6). KHÔNG dùng
  // getList()/create()/remove() ở trên cho luồng này: các route đó
  // (GET/POST/DELETE /don-cham-cong) là route QUẢN TRỊ, nay đòi quyền
  // /cham-cong/don-tu:xem|them|xoa mà nhân viên thường không có — gọi nhầm
  // sẽ ăn 403. Ba route `cua-toi` dưới đây chỉ cần JwtGuard. ───────────────

  /** Danh sách đơn của chính mình — `GET /don-cham-cong/cua-toi`. */
  async cuaToi(): Promise<AttendanceRequest[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      endpoint: '/cua-toi',
    });
    return res.map(this.transform);
  }

  /**
   * Nộp đơn cho chính mình — `POST /don-cham-cong/cua-toi`. Không truyền
   * employeeId: type TaoDonCuaToiDto cố tình không có trường này, backend
   * luôn suy nhân viên từ token.
   */
  async taoDonCuaToi(dto: TaoDonCuaToiDto): Promise<AttendanceRequest> {
    const res = await this.post<Record<string, unknown>>(dto, {
      endpoint: '/cua-toi',
    });
    return this.transform(res);
  }

  /**
   * Huỷ đơn của chính mình — `DELETE /don-cham-cong/cua-toi/:id`. Backend
   * chỉ cho huỷ khi đơn còn `cho_duyet`; đơn đã duyệt/từ chối sẽ bị 4xx.
   */
  async huyDonCuaToi(id: string): Promise<void> {
    await super.delete({ endpoint: `/cua-toi/${id}` });
  }

  private transform(x: Record<string, unknown>): AttendanceRequest {
    return {
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      loaiDon: (x.loaiDon as AttendanceRequestType) ?? 'giai_trinh',
      ngay: x.ngay as string,
      lyDo: x.lyDo as string | undefined,
      gioTu: x.gioTu as string | undefined,
      gioDen: x.gioDen as string | undefined,
      minhChung: x.minhChung as string | undefined,
      trangThai: (x.trangThai as AttendanceRequestStatus) ?? 'cho_duyet',
      nguoiDuyet: x.nguoiDuyet as string | undefined,
      ghiChu: x.ghiChu as string | undefined,
      isActive: (x.isActive as boolean) ?? true,

      denNgay: x.denNgay as string | undefined,
      buoi: x.buoi as Buoi | undefined,
      loaiNghi: x.loaiNghi as LoaiNghi | undefined,

      // Passthrough thuần, KHÔNG fallback: 0 (vd. soGioOt=0) phải giữ nguyên
      // là 0, không phải bị `||`/`??` biến thành undefined hay giá trị khác.
      soNgayNghi: x.soNgayNghi as number | undefined,
      soGioOt: x.soGioOt as number | undefined,
      heSoOt: x.heSoOt as number | undefined,
      loaiNgayOt: x.loaiNgayOt as LoaiNgayOt | undefined,

      nguoiDuyetId: x.nguoiDuyetId as string | undefined,
      thoiDiemDuyet: x.thoiDiemDuyet as string | undefined,
    };
  }
}

export const attendanceRequestService = new AttendanceRequestService();
