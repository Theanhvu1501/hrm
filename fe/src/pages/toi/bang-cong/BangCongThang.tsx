import { useCallback, useEffect, useState } from "react";
import { Alert, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  attendanceRecordService,
  AttendanceRecord,
  TrangThaiHomNay,
} from "@/services/attendanceRecordService";
import {
  attendanceRequestService,
  AttendanceRequest,
} from "@/services/attendanceRequestService";
import { homNayVN } from "@/ultils/thoiGianVN";
import { gomTheoNgay } from "@/pages/cham-cong/cua-toi/lichTuan";
import { thongDiepLoiDon } from "@/pages/toi/don-tu/thongDiepLoi";
import {
  dichThang,
  luoiThang,
  soNgayCuaThang,
  tinhONgay,
  ONgay,
} from "./thangCong";

const TEN_THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** "Tháng 7/2026" từ 'YYYY-MM'. */
function nhanThang(thang: string): string {
  const [nam, thangSo] = thang.split("-");
  return `Tháng ${Number(thangSo)}/${nam}`;
}

/** "21.5" thay vì "21.50…" — bỏ .0 thừa nhưng giữ nửa công. */
function chuoiTong(tong: number): string {
  return Number.isInteger(tong) ? String(tong) : String(Math.round(tong * 10) / 10);
}

/**
 * Màu chữ + nền cho một ô ngày, tách khỏi JSX cho dễ đọc.
 *
 * CHƯA xử lý ngày lễ công ty (xem comment ở thangCong.ts) — ô ngày lễ hiện
 * y hệt ngày thường không có bản ghi.
 */
function kieuO(o: ONgay, laHomNay: boolean): { nen?: string; chu?: string; mo?: boolean } {
  if (o.kyHieu || o.hienThi === "1" || o.hienThi === "0.5") {
    return {
      nen: laHomNay ? undefined : "var(--emp-accent-nhat)",
      chu: "var(--emp-accent)",
    };
  }
  if (o.hienThi === "•") return { chu: "var(--emp-cam)" };
  if (o.hienThi === "N" || o.hienThi === "0") return { chu: "var(--emp-muted)", mo: true };
  if (o.hienThi === "") return { mo: true };
  return {};
}

/**
 * Tab "Bảng công" của vỏ nhân viên — lịch tháng kiểu iOS.
 *
 * Tự phục vụ hoàn toàn (không cần backend mới): dựa vào 3 API tự-phục-vụ đã
 * có sẵn (`cuaToi` của bản ghi/đơn từ + `homNay`). Nạp lại cả ba khi mount
 * và mỗi lần đổi tháng — đơn từ không có tham số lọc theo tháng nên tải lại
 * nguyên danh sách của chính mình, `tinhONgay` tự lọc đơn phủ từng ngày.
 */
export default function BangCongThang() {
  const homNay = homNayVN();
  const [thang, setThang] = useState(() => homNay.slice(0, 7));
  const [dangTai, setDangTai] = useState(true);
  const [loiTai, setLoiTai] = useState("");
  const [banGhiThang, setBanGhiThang] = useState<AttendanceRecord[]>([]);
  const [donCuaToi, setDonCuaToi] = useState<AttendanceRequest[]>([]);
  const [homNayData, setHomNayData] = useState<TrangThaiHomNay | null>(null);

  const taiDuLieu = useCallback((thangCanTai: string) => {
    setDangTai(true);
    setLoiTai("");
    const tuNgay = `${thangCanTai}-01`;
    const denNgay = `${thangCanTai}-${String(soNgayCuaThang(thangCanTai)).padStart(2, "0")}`;

    Promise.all([
      attendanceRecordService.cuaToi(tuNgay, denNgay),
      attendanceRequestService.cuaToi(),
      attendanceRecordService.homNay(),
    ])
      .then(([banGhi, don, hn]) => {
        setBanGhiThang(banGhi);
        setDonCuaToi(don);
        setHomNayData(hn);
      })
      .catch((err) => {
        console.error("Tải bảng công tháng lỗi:", err);
        setLoiTai(thongDiepLoiDon(err, "Không tải được bảng công."));
      })
      .finally(() => setDangTai(false));
  }, []);

  useEffect(() => {
    taiDuLieu(thang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thang]);

  if (dangTai) {
    return (
      <div className="flex justify-center py-16">
        <span className="emp-spinner emp-spinner-lon" role="status" aria-label="Đang tải" />
      </div>
    );
  }

  if (loiTai) {
    return (
      <div className="emp-card p-4">
        <Alert type="error" showIcon title="Không tải được bảng công" description={loiTai} />
        <Button
          className="mt-3"
          block
          size="large"
          icon={<ReloadOutlined />}
          onClick={() => taiDuLieu(thang)}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  const luoi = luoiThang(thang);
  const theoNgay = gomTheoNgay(banGhiThang);
  const congHomNay = homNayData ? homNayData.soCong : null;

  let tong = 0;
  const oTheoNgay: Record<string, ONgay> = {};
  for (const ngay of luoi.flat()) {
    if (!ngay) continue;
    const o = tinhONgay(ngay, theoNgay[ngay] ?? [], donCuaToi, homNay, congHomNay);
    oTheoNgay[ngay] = o;
    if (typeof o.cong === "number") tong += o.cong;
  }

  return (
    <div className="w-full">
      <div className="emp-card mb-4 p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[15px] font-semibold">{nhanThang(thang)}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Tháng trước"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--emp-surface-2)] text-[15px] text-[color:var(--emp-text-phu)]"
              onClick={() => setThang((t) => dichThang(t, -1))}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Tháng sau"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--emp-surface-2)] text-[15px] text-[color:var(--emp-text-phu)]"
              onClick={() => setThang((t) => dichThang(t, 1))}
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {TEN_THU.map((t) => (
            <div
              key={t}
              className="py-1 text-center text-[12px] font-medium text-[color:var(--emp-muted)]"
            >
              {t}
            </div>
          ))}
        </div>

        {luoi.map((tuan, i) => (
          <div key={i} className="grid grid-cols-7 gap-1.5 mb-1.5 last:mb-0">
            {tuan.map((n, j) => {
              if (!n) return <div key={j} />;

              const o = oTheoNgay[n];
              const laHomNay = n === homNay;
              const { nen, chu, mo } = kieuO(o, laHomNay);
              // Ô cao, đủ rộng — lịch lấp đầy màn thay vì co cụm trên cùng
              // (mỗi ô ~64px, số ngày + số công đọc rõ trên điện thoại).
              const style: React.CSSProperties = {
                background: laHomNay ? "var(--emp-accent-nhat)" : nen,
                outline: laHomNay ? "1.5px solid var(--emp-accent)" : undefined,
                opacity: mo && !laHomNay ? 0.45 : 1,
                minHeight: 60,
              };

              return (
                <div
                  key={j}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-2xl text-center"
                  style={style}
                >
                  <div className="text-[16px] font-semibold leading-none">{o.ngayTrongThang}</div>
                  <div
                    className="text-[14px] font-semibold leading-none"
                    style={{ color: chu ?? "var(--emp-text-phu)" }}
                  >
                    {/* Khớp ảnh mẫu: số công kèm ký hiệu NHỎ trên góc (1ᵖ),
                        không thay số bằng chữ. Ngày không có ký hiệu chỉ hiện
                        hienThi ('1'|'0'|'N'|'•'|''). */}
                    {o.hienThi}
                    {o.kyHieu && <sup className="text-[10px]">{o.kyHieu}</sup>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="emp-card px-4 py-3 flex items-center justify-between">
        <span className="text-[14px] text-[color:var(--emp-text-phu)]">Tổng công tháng</span>
        <span className="text-[17px] font-semibold" style={{ color: "var(--emp-accent)" }}>
          {chuoiTong(tong)}
        </span>
      </div>
    </div>
  );
}
