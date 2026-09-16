/**
 * Tổng số GIỜ LÀM trong một ngày công, tính từ các lượt bấm vào/ra
 * (yêu cầu d16: "Ghi nhận tổng số giờ làm việc trong ngày ⇒ Bảng chấm công có
 * xuất được: Bảng giờ làm").
 *
 * Hàm THUẦN để test được mà không cần DB — và vì đây là con số sẽ đi vào bảng
 * giờ làm gửi cho người lao động đối chiếu, nó phải có bài test riêng cho các
 * ca xấu: quên chấm ra, chấm ra hai lần, ca qua đêm.
 */

export interface LuotCham {
  loai: string; // 'vao' | 'ra'
  thoiDiem: string; // ISO
}

export interface KetQuaGioLam {
  /** Giờ vào ĐẦU TIÊN trong ngày, ISO; `null` nếu không có lượt vào nào. */
  gioVao: string | null;
  /** Giờ ra CUỐI CÙNG trong ngày, ISO; `null` nếu chưa chấm ra. */
  gioRa: string | null;
  /** Tổng giờ của các cặp vào–ra đã đóng, làm tròn 2 chữ số thập phân. */
  tongGio: number;
  /** Còn một lượt vào chưa có lượt ra tương ứng. */
  thieuGioRa: boolean;
}

function mocThoiGian(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/**
 * Ghép các lượt bấm thành từng CẶP vào–ra rồi cộng, thay vì lấy
 * `giờ ra cuối − giờ vào đầu`.
 *
 * Lý do: người ra ngoài giữa buổi rồi quay lại sẽ có 2 cặp; lấy hiệu hai đầu
 * là tính luôn cả quãng họ không ở chỗ làm. Cặp hoá cũng là cách duy nhất
 * phát hiện "quên chấm ra" — một lượt vào không có lượt ra đi kèm.
 *
 * Lượt `ra` xuất hiện khi chưa có lượt `vao` nào đang mở thì bị BỎ QUA: đó là
 * dữ liệu hỏng (HR nhập nhầm chiều), và cộng nó vào là ra một con số giờ
 * không giải thích được cho ai.
 */
export function tinhGioLamTrongNgay(banGhi: LuotCham[]): KetQuaGioLam {
  const theoThoiGian = [...banGhi]
    .filter((b) => Number.isFinite(mocThoiGian(b.thoiDiem)))
    .sort((a, b) => mocThoiGian(a.thoiDiem) - mocThoiGian(b.thoiDiem));

  let tongMs = 0;
  let dangMo: number | null = null;
  let gioVao: string | null = null;
  let gioRa: string | null = null;

  for (const b of theoThoiGian) {
    const t = mocThoiGian(b.thoiDiem);
    if (b.loai === 'vao') {
      // Hai lượt `vao` liên tiếp (quên chấm ra rồi chấm vào lại): giữ lượt
      // ĐẦU đang mở, bỏ qua lượt sau. Nhận lượt sau là âm thầm xoá mất quãng
      // thời gian giữa hai lần bấm.
      if (dangMo === null) dangMo = t;
      if (!gioVao) gioVao = b.thoiDiem;
    } else if (b.loai === 'ra') {
      gioRa = b.thoiDiem;
      if (dangMo !== null) {
        tongMs += Math.max(0, t - dangMo);
        dangMo = null;
      }
    }
  }

  return {
    gioVao,
    gioRa,
    tongGio: Math.round((tongMs / 3_600_000) * 100) / 100,
    thieuGioRa: dangMo !== null,
  };
}
