/**
 * Đọc lưới ô của file Excel import số nhập tay theo kỳ (hiệu suất, thưởng…)
 * thành danh sách dòng gửi lên backend.
 *
 * Hàm THUẦN, nhận sẵn lưới `string[][]` chứ không tự đọc file: phần đọc
 * `.xlsx` nằm ở component, còn toàn bộ luật khớp cột / đọc số / bắt lỗi nằm ở
 * đây để test được bằng bảng, không cần dựng file thật.
 *
 * Quy ước quan trọng nhất: **ô trống ≠ số 0**. Trống nghĩa là "không đụng tới
 * khoản này", 0 nghĩa là "đặt về 0". Gộp hai thứ lại là ghi đè mất số kế toán
 * đã nhập tay từ trước — cùng lớp lỗi với `mucKhaiBao = 0` từng làm tắt BHXH.
 */

export interface DongImport {
  maNhanVien: string;
  /** Chỉ để đối chiếu trên màn xem trước — backend khớp theo MÃ. */
  hoTen?: string;
  giaTri: Record<string, number>;
}

export interface KetQuaDocFile {
  dong: DongImport[];
  /** Lỗi ở mức FILE hoặc DÒNG, mỗi lỗi một câu kèm số dòng trong Excel. */
  loi: string[];
}

const TIEU_DE_MA_NV = ["mã nv", "ma nv", "mã nhân viên", "ma nhan vien"];
const TIEU_DE_HO_TEN = ["họ tên", "ho ten", "họ và tên", "tên nhân viên"];

function chuan(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/**
 * Đọc một ô thành số. Trả `undefined` khi ô TRỐNG (không đụng tới khoản),
 * `null` khi có nội dung nhưng không phải số (lỗi thật, phải báo).
 */
function docSo(v: unknown): number | undefined | null {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (s === "") return undefined;

  // Bỏ dấu phân cách nghìn và khoảng trắng — file người ta gõ tay hay có.
  const so = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(so) ? so : null;
}

export function docLuoiImport(
  luoi: unknown[][],
  khoan: Array<{ ma: string; ten: string }>,
): KetQuaDocFile {
  const loi: string[] = [];
  const tieuDe = (luoi[0] ?? []).map(chuan);

  const cotMa = tieuDe.findIndex((t) => TIEU_DE_MA_NV.includes(t));
  if (cotMa < 0) {
    // Cố ý KHÔNG đoán "chắc là cột đầu tiên": đoán sai thì import ghi lương
    // vào nhầm người mà file trông vẫn hợp lệ.
    loi.push('Không tìm thấy cột "Mã NV" ở dòng tiêu đề.');
    return { dong: [], loi };
  }

  const cotHoTen = tieuDe.findIndex((t) => TIEU_DE_HO_TEN.includes(t));

  // Khớp cột theo TÊN khoản, và cả theo MÃ phòng khi người dùng đổi tiêu đề.
  const cotKhoan: Array<{ cot: number; ma: string }> = [];
  tieuDe.forEach((t, i) => {
    const k = khoan.find((x) => chuan(x.ten) === t || chuan(x.ma) === t);
    if (k) cotKhoan.push({ cot: i, ma: k.ma });
  });

  if (cotKhoan.length === 0) {
    loi.push(
      "Không có cột nào khớp khoản nhập tay của công ty. Dùng nút Tải file mẫu để lấy đúng tiêu đề.",
    );
    return { dong: [], loi };
  }

  const dong: DongImport[] = [];

  for (let i = 1; i < luoi.length; i += 1) {
    const hang = luoi[i] ?? [];
    const soDongExcel = i + 1; // 1-based, tính cả dòng tiêu đề

    const giaTri: Record<string, number> = {};
    let hongO = false;
    for (const { cot, ma } of cotKhoan) {
      const so = docSo(hang[cot]);
      if (so === null) {
        loi.push(`Dòng ${soDongExcel}: giá trị "${hang[cot]}" không phải số.`);
        hongO = true;
        continue;
      }
      if (so !== undefined) giaTri[ma] = so;
    }
    if (hongO) continue;

    const ma = String(hang[cotMa] ?? "").trim();
    if (!ma) {
      // Dòng trống hoàn toàn là chuyện thường ở cuối file — bỏ im lặng. Còn
      // dòng CÓ số mà thiếu mã là lỗi thật, phải báo.
      if (Object.keys(giaTri).length > 0) {
        loi.push(`Dòng ${soDongExcel}: có giá trị nhưng thiếu mã nhân viên.`);
      }
      continue;
    }

    if (Object.keys(giaTri).length === 0) continue;

    dong.push({
      maNhanVien: ma,
      hoTen: cotHoTen >= 0 ? String(hang[cotHoTen] ?? "").trim() : undefined,
      giaTri,
    });
  }

  return { dong, loi };
}
