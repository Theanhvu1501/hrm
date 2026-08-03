import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { KhoanLuong, BacThue } from '@app/entities';

const RE_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Khung giờ đêm — hai mốc "HH:mm". */
export class KhungGioDemDto {
  @Matches(RE_HHMM, { message: 'khungGioDem.tu phải đúng dạng HH:mm' })
  tu: string;

  @Matches(RE_HHMM, { message: 'khungGioDem.den phải đúng dạng HH:mm' })
  den: string;
}

/** Sàn hệ số TÍCH QUỸ khi `cheDoBu = 'chi_nghi_bu'` — đúng BẰNG sàn trả tiền BLLĐ 2019 Đ98.1.
 *  Nghỉ bù là hình thức bù DUY NHẤT ở chế độ này (không trả thêm tiền), nên tích
 *  dưới sàn này là trả thiếu công cho người lao động.
 *
 *  `ngay_dem` CỐ Ý không có sàn ở đây: BLLĐ Đ98.1 không nói về ca đêm, còn mức
 *  ca đêm chủ sản phẩm chốt (1.5) thấp hơn NĐ 145/2020 Đ57.2 — ghi nhận ở spec
 *  P4.2b §8.1 chứ không chặn bằng DTO, vì đó là lựa chọn của công ty. */
const SAN_HE_SO_CHI_NGHI_BU: Record<string, number> = {
  ngay_thuong: 1.5,
  ngay_nghi: 2.0,
  ngay_le: 3.0,
};

/** Nhãn tiếng Việt cho từng `cheDoBu` — thông điệp lỗi tới tay admin HR, không
 *  phải lập trình viên, nên phải gọi đúng tên chế độ họ đã chọn trên form,
 *  không phải slug enum thô. */
const TEN_CHE_DO: Record<string, string> = {
  chi_nghi_bu: 'chỉ nghỉ bù',
  chi_tien: 'chỉ trả tiền',
  nhan_vien_chon: 'nhân viên chọn',
  nghi_bu_va_chenh: 'nghỉ bù và trả chênh',
};

/** Case 4 (`nghi_bu_va_chenh` hệ số đã đúng 1.0) và case 5 (`chi_tien`) đều
 *  rớt vì "chế độ chưa hỗ trợ" — cùng LÝ DO, nên cùng dạng câu là đúng. Điểm
 *  cần sửa không phải là ép hai câu khác nhau giả tạo, mà là nêu ĐÚNG chế độ
 *  nào bị từ chối, để hai câu tự nhiên khác nhau vì chúng THẬT SỰ khác nhau. */
const khongHoTro = (cheDoBu: string): string =>
  `Chế độ bù "${TEN_CHE_DO[cheDoBu] ?? cheDoBu}" chưa được hỗ trợ ở phiên bản hiện tại (mới hỗ trợ "chỉ nghỉ bù")`;

/**
 * Ba ràng buộc KHÔNG diễn đạt được bằng decorator rời, và cả ba đều sai thành
 * tiền thật nếu để lọt:
 *  1. Chế độ chưa nối bảng lương (P4.2b) — lưu được nhưng hành xử sai.
 *  2. `nghi_bu_va_chenh` mà hệ số tích ≠ 1.0 — bảng lương đã trả phần chênh
 *     rồi, tích quỹ ở 1.5 nữa là trả gấp đôi cho cùng một giờ công.
 *  3. `chi_nghi_bu` mà hệ số tích dưới sàn BLLĐ 2019 Đ98.1 — nghỉ bù là bù
 *     DUY NHẤT ở chế độ này, tích thiếu là trả thiếu công thật.
 *
 * `lyDoTuChoi()` là NGUỒN DUY NHẤT của cả kết quả pass/fail lẫn thông điệp —
 * `validate()` và `defaultMessage()` cùng gọi nó. Tách hai nơi tính lý do
 * riêng (bản cũ) khiến `defaultMessage()` phải ĐOÁN lý do chỉ từ `cheDoBu`,
 * không biết `validate()` thực sự rớt ở nhánh nào — nên khi `nghi_bu_va_chenh`
 * đã đúng hệ số 1.0 (chỉ còn vướng "chưa hỗ trợ"), nó vẫn báo nhầm là sai hệ số.
 */
@ValidatorConstraint({ name: 'cauHinhLamThemHopLe', async: false })
export class CauHinhLamThemHopLe implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return this.lyDoTuChoi(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return this.lyDoTuChoi(args.value) ?? 'Cấu hình làm thêm không hợp lệ';
  }

  private lyDoTuChoi(lt: any): string | null {
    if (!lt) return null;

    const h = lt.heSoTichQuy ?? {};

    // ── Bảng tra phải PHỦ ĐỦ `uuTienLoai` (P4.2b) ──────────────────────────
    const uuTien: string[] = lt.uuTienLoai ?? [];
    if (!Array.isArray(uuTien) || uuTien.length === 0) {
      return 'uuTienLoai phải có ít nhất một loại ngày';
    }
    if (new Set(uuTien).size !== uuTien.length) {
      return 'uuTienLoai có khoá trùng — mỗi loại ngày chỉ được xuất hiện một lần';
    }

    // Thiếu một khoá là hệ số `undefined`, nhân ra NaN; NaN đi qua
    // lamTronGio()/lamTronTheo() vẫn là NaN, ghi vào DB im lặng, và chỉ lộ ra
    // khi kế toán nhìn bảng lương.
    for (const [ten, bang] of [
      ['heSoTra', lt.heSoTra],
      ['heSoTichQuy', lt.heSoTichQuy],
    ] as const) {
      for (const loai of uuTien) {
        const v = bang?.[loai];
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          return `${ten} thiếu hệ số cho loại "${loai}"`;
        }
        if (v <= 0) {
          return `${ten}."${loai}" phải > 0 — hệ số 0 làm dòng lương bằng 0, hệ số âm làm nó âm (đang là ${v})`;
        }
      }
    }

    for (const loai of lt.mienThueChenh ?? []) {
      if (!uuTien.includes(loai)) {
        return `mienThueChenh chứa loại "${loai}" không có trong uuTienLoai — gần như chắc chắn là gõ nhầm, và hậu quả là miễn thuế hụt trong im lặng`;
      }
    }

    if (lt.khungGioDem && lt.khungGioDem.tu === lt.khungGioDem.den) {
      return 'khungGioDem.tu và khungGioDem.den phải khác nhau — hai mốc bằng nhau không rõ là khung rỗng hay khung 24 giờ';
    }

    if (lt.cheDoBu === 'nghi_bu_va_chenh') {
      // Duyệt MỌI loại trong `uuTienLoai`, không chỉ ba loại có sàn: thêm
      // `ngay_dem` mà bỏ qua là mở lại đúng lỗ hổng trả gấp đôi cho cùng một
      // giờ công mà ràng buộc này tồn tại để chặn.
      for (const truong of uuTien) {
        if (h[truong] !== 1) {
          return `Chế độ "nghỉ bù và trả chênh" bắt buộc hệ số tích quỹ = 1.0 ở mọi loại ngày (đang sai ở ${truong} = ${h[truong]})`;
        }
      }
      // Hệ số đúng 1.0 cả ba rồi — vẫn còn vướng ở chỗ chế độ này CHƯA nối
      // bảng lương ở chặng này, không được lẫn với lỗi hệ số phía trên.
      return khongHoTro(lt.cheDoBu);
    }

    if (lt.cheDoBu === 'chi_nghi_bu') {
      for (const truong of Object.keys(SAN_HE_SO_CHI_NGHI_BU)) {
        const san = SAN_HE_SO_CHI_NGHI_BU[truong];
        if (!(h[truong] >= san)) {
          // toFixed(1) để "3" hiện thành "3.0" — khớp đúng số thập phân sàn
          // BLLĐ ghi trong luật, tránh nhầm với số nguyên bất kỳ.
          return `Hệ số tích quỹ "${truong}" phải ≥ ${san.toFixed(1)} (sàn BLLĐ 2019 Đ98.1) khi chế độ là "chỉ nghỉ bù" — đang là ${h[truong]}`;
        }
      }
      return null;
    }

    // chi_tien / nhan_vien_chon: chưa nối bảng lương, không cần xét hệ số.
    return khongHoTro(lt.cheDoBu);
  }
}

export class CauHinhLamThemDto {
  @IsIn(['chi_nghi_bu', 'chi_tien', 'nhan_vien_chon', 'nghi_bu_va_chenh'])
  cheDoBu: string;

  // Bảng tra MỞ: `@IsObject` chứ không DTO khai cứng từng khoá — khai cứng là
  // quay lại đúng cái hardcode P4.2b tồn tại để gỡ (thêm một loại ngày phải là
  // thêm một dòng cấu hình, không phải một lần sửa kiểu rồi deploy). Nội dung
  // được `CauHinhLamThemHopLe` kiểm chéo với `uuTienLoai`.
  @IsObject() heSoTra: Record<string, number>;
  @IsObject() heSoTichQuy: Record<string, number>;

  @IsOptional()
  @ValidateNested()
  @Type(() => KhungGioDemDto)
  khungGioDem: KhungGioDemDto | null;

  @IsArray() @IsString({ each: true }) uuTienLoai: string[];
  @IsArray() @IsString({ each: true }) mienThueChenh: string[];

  @IsOptional() @IsInt() @Min(1) soThangHanDung: number | null;

  @IsIn(['quy_ra_tien', 'huy_bo']) khiHetHan: string;
}

export class CapNhatCauHinhLuongDto {
  @IsOptional() @IsNumber() mucKhaiBaoMacDinh?: number;
  @IsOptional() @IsNumber() congChuan?: number;
  @IsOptional() @IsArray() khoanLuong?: KhoanLuong[];
  @IsOptional() @IsNumber() giamTruBanThan?: number;
  @IsOptional() @IsNumber() giamTruNPT?: number;
  @IsOptional() @IsObject() bhxh?: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  @IsOptional() @IsArray() bacThue?: BacThue[];
  @IsOptional() @IsObject() thuViec?: { tyLe: number };
  @IsOptional() @IsObject() quyTacThoiVu?: { tyLe: number; nguong: number };
  @IsOptional() @IsObject() quyTacCamKet?: { mienThue: boolean };
  @IsOptional() @IsObject() bhCongTy?: { tyLe: number; tyLeHopDongThu2: number };
  @IsOptional() @IsObject() phiCongDoan?: { tyLe: number };
  @IsOptional() @IsNumber() lamTron?: number;

  @IsOptional() @IsNumber() @Min(0.5) soGioMoiNgay?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CauHinhLamThemDto)
  @Validate(CauHinhLamThemHopLe)
  lamThem?: CauHinhLamThemDto;
}
