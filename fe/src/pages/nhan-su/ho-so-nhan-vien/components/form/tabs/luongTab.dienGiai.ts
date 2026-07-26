import type { CauHinhLuong } from "@/services/cauHinhLuongService";

/** Cờ hợp đồng của một NV — chỉ phần ảnh hưởng tới thuế và bảo hiểm. */
export interface CoHopDong {
  dongBH?: boolean;
  thoiVu?: boolean;
  camKet?: boolean;
  hopDongThu2?: boolean;
}

export interface DienGiai {
  thue: string;
  baoHiem: string;
}

/** 0.105 → "10,5%". `undefined` khi chưa tải được cấu hình. */
export function phanTram(tyLe?: number): string | undefined {
  if (typeof tyLe !== "number" || !Number.isFinite(tyLe)) return undefined;
  return `${(tyLe * 100).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Bốn ô tick ở tab Lương cộng lại ra một cách tính duy nhất, nhưng nhìn vào ô
 * tick thì không thấy được điều đó — HR tick cả "thời vụ" lẫn "HĐLĐ thứ 2" mà
 * không biết cái nào thắng, và sai số chỉ lộ ra lúc chốt lương cuối tháng.
 * Hàm này nói thẳng kết quả bằng một câu.
 *
 * Thứ tự ưu tiên PHẢI khớp engine `be/libs/core/src/luong/tinh-luong.ts`:
 * `camKet` > `thoiVu` > `hopDongThu2` > thường. Sửa engine thì sửa cả đây và
 * `luongTab.dienGiai.test.ts`.
 *
 * Tỷ lệ lấy từ `cauHinh` chứ KHÔNG viết cứng trong câu chữ — admin đổi tỷ lệ ở
 * màn Cấu hình lương thì câu này đổi theo. Chưa tải được cấu hình thì bỏ con
 * số, giữ nguyên phần diễn giải.
 */
export function dienGiaiThueVaBaoHiem(
  co: CoHopDong,
  cauHinh?: CauHinhLuong | null
): DienGiai {
  const tyLeThoiVu = phanTram(cauHinh?.quyTacThoiVu?.tyLe);
  const tyLeBhxhNV = phanTram(cauHinh?.bhxh?.tyLe);
  const tyLeCtyChuan = phanTram(cauHinh?.bhCongTy?.tyLe);
  const tyLeCtyHd2 = phanTram(cauHinh?.bhCongTy?.tyLeHopDongThu2);

  let thue: string;
  if (co.camKet) {
    thue = "Không khấu trừ thuế — nhân viên có bản cam kết.";
  } else if (co.thoiVu) {
    thue = tyLeThoiVu
      ? `Khấu trừ thẳng ${tyLeThoiVu} thu nhập chịu thuế, không giảm trừ gia cảnh.`
      : "Khấu trừ thẳng theo tỷ lệ hợp đồng thời vụ, không giảm trừ gia cảnh.";
  } else if (co.hopDongThu2) {
    thue =
      "Thuế lũy tiến, không giảm trừ gia cảnh — đã đăng ký ở công ty thứ nhất.";
  } else {
    thue = "Thuế lũy tiến, có giảm trừ bản thân và người phụ thuộc.";
  }

  let baoHiem: string;
  if (co.hopDongThu2) {
    baoHiem = tyLeCtyHd2
      ? `Nhân viên không bị trừ bảo hiểm ở đây; công ty đóng ${tyLeCtyHd2} (tai nạn lao động — bệnh nghề nghiệp).`
      : "Nhân viên không bị trừ bảo hiểm ở đây; công ty chỉ đóng bảo hiểm tai nạn lao động — bệnh nghề nghiệp.";
  } else if (co.dongBH) {
    baoHiem =
      tyLeBhxhNV && tyLeCtyChuan
        ? `Trừ ${tyLeBhxhNV} lương nhân viên; công ty đóng thêm ${tyLeCtyChuan}.`
        : "Trừ phần bảo hiểm của nhân viên; công ty đóng phần của mình.";
  } else {
    baoHiem = "Không đóng bảo hiểm ở công ty này.";
  }

  return { thue, baoHiem };
}
