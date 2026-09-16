import type { CauHinhLuongData, KetQuaLuong } from '@app/entities';

/**
 * Chỉnh phần THỰC TẾ để số thuế trừ của người lao động bằng đúng số thuế đã
 * KHAI và NỘP (yêu cầu d32: "Hiện trạng sai Khấu trừ thuế của NLĐ").
 *
 * Bối cảnh: hệ thống tính song song hai mức — `khaiBao` (mức khai với cơ quan
 * thuế/bảo hiểm) và `thucTe` (lương thật). Trước bản vá, phiếu lương trừ thuế
 * theo `thucTe`, tức trừ của NLĐ NHIỀU HƠN số công ty thực nộp; phần chênh
 * không đi đâu cả và không giải thích được với người bị trừ.
 *
 * Hàm trả về BẢN SAO, không sửa tại chỗ: `thucTe` gốc vẫn là đầu ra thô của
 * engine, còn đây là con số đem đi trả lương — trộn hai thứ vào một chỗ là
 * lần sau không ai biết số nào do engine tính, số nào do quy ước này chỉnh.
 *
 * `thucLinh` tính lại theo đúng công thức của engine, chỉ đổi số thuế:
 *   thucLinh = tongThuNhap − bhxh − thue − phiCongDoan − tamUng − khauTruKhac
 * nên phải truyền vào `tamUng`/`khauTruKhac` của chính dòng đó.
 */
export function apDungKhauTruThue(
  khaiBao: KetQuaLuong,
  thucTe: KetQuaLuong,
  cauHinh: Pick<CauHinhLuongData, 'khauTruThueTheo'>,
  khoanTru: { tamUng: number; khauTruKhac: number },
): KetQuaLuong {
  // Mặc định `khai_bao` — kể cả khi cấu hình cũ chưa có trường này. Đây là
  // lựa chọn CÓ Ý: bản vá sinh ra vì hành vi cũ (`thuc_te`) bị báo là sai.
  if (cauHinh.khauTruThueTheo === 'thuc_te') return thucTe;
  if (thucTe.thue === khaiBao.thue) return thucTe;

  const chenh = thucTe.thue - khaiBao.thue;
  return {
    ...thucTe,
    thue: khaiBao.thue,
    // Trừ ít thuế hơn ⇒ thực lĩnh tăng đúng phần chênh.
    thucLinh: thucTe.thucLinh + chenh,
  };
}
