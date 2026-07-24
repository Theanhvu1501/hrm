import { useEffect, useState } from "react";
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  LoginOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { TrangThaiHomNay } from "@/services/attendanceRecordService";
import { gioGiayVN } from "@/ultils/thoiGianVN";

/**
 * Hero của màn chấm công — nhân vật chính là THỜI GIAN.
 *
 * Gộp thông tin ca + địa điểm (trước đây ở ShiftCard) với đồng hồ chạy real
 * time, một thanh tiến trình cho biết đang ở đâu trong ca, và nút chấm dạng
 * pill iOS. NutCham vẫn giữ toàn bộ máy trạng thái (đang tải / bị chặn / lỗi):
 * Hero CHỈ là phần màn hình chính khi đã sẵn sàng chấm — không chứa logic
 * chặn, không tự gọi API, mọi thứ nhận qua props để test/độc lập.
 */
export interface HeroProps {
  homNay: TrangThaiHomNay;
  /** true = lượt kế tiếp là VÀO (nút teal "Chấm vào"); false = RA (nút cam). */
  laVao: boolean;
  dangCham: boolean;
  onCham: () => void;
}

const TEAL = "#12a594";
const CAM = "#ff9500";

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Giờ HH:MM (giờ VN) từ một mốc ISO — dùng gioGiayVN rồi bỏ giây. */
function gioPhut(iso: string): string {
  return gioGiayVN(iso).slice(0, 5);
}

/** Đồng hồ VN HH:MM:SS, cập nhật mỗi giây. */
function useDongHo(): { hh: string; mm: string; ss: string; phutTrongNgay: number } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const [hh, mm, ss] = s.split(":");
  return { hh, mm, ss, phutTrongNgay: Number(hh) * 60 + Number(mm) };
}

export function Hero({ homNay, laVao, dangCham, onCham }: HeroProps) {
  const { hh, mm, ss, phutTrongNgay } = useDongHo();

  const ca = homNay.ca;
  const vao = homNay.banGhi.find((b) => b.loai === "vao");
  const gioVao = vao ? gioPhut(vao.thoiDiem) : undefined;

  // Địa điểm: 1 điểm hiện tên + bán kính; nhiều điểm hiện số lượng.
  const diaDiem = homNay.diaDiem ?? [];
  const motDiem = diaDiem.length === 1 ? diaDiem[0] : null;
  const nhanDiaDiem = motDiem
    ? `${motDiem.ten}${motDiem.banKinh !== undefined ? ` · ${motDiem.banKinh}m` : ""}`
    : diaDiem.length > 1
      ? `${diaDiem.length} địa điểm được phép`
      : null;

  // Tiến trình trong ca: chấm hiện tại giữa giờ bắt đầu và kết thúc.
  let pct: number | null = null;
  let trongCa = false;
  if (ca) {
    const start = hhmmToMin(ca.gioBatDau);
    const end = hhmmToMin(ca.gioKetThuc);
    let span = end - start;
    if (span <= 0) span += 24 * 60; // ca qua đêm
    let elapsed = phutTrongNgay - start;
    if (elapsed < 0 && ca.laCaQuaDem) elapsed += 24 * 60;
    pct = Math.max(0, Math.min(1, elapsed / span)) * 100;
    trongCa = elapsed >= 0 && elapsed <= span;
  }

  const eyebrow = !ca
    ? "Chưa gán ca"
    : trongCa
      ? `Đang trong ca · ${ca.ten}`
      : `Ca ${ca.ten}`;

  // Nhãn nút CỐ ĐỊNH "Chấm công": hướng vào/ra đã thể hiện bằng icon (login/
  // logout), màu (teal/cam) và dòng gợi ý dưới nút. Giữ một nhãn để ba ô
  // trạng thái là chỗ duy nhất người dùng đọc "thiếu vào hay ra".
  const mauNut = laVao ? TEAL : CAM;

  return (
    <section className="emp-hero">
      <div className="emp-hero-eyebrow">{eyebrow}</div>

      <div className="emp-hero-clock">
        {hh}:{mm}
        <span className="emp-hero-sec">:{ss}</span>
      </div>

      <div className="emp-hero-chips">
        {ca && (
          <span className="emp-hero-chip">
            <ClockCircleOutlined style={{ color: TEAL }} />
            {ca.gioBatDau} – {ca.gioKetThuc}
            {ca.laCaQuaDem && " (qua đêm)"}
          </span>
        )}
        {nhanDiaDiem && (
          <span className="emp-hero-chip">
            <EnvironmentOutlined style={{ color: CAM }} />
            {nhanDiaDiem}
          </span>
        )}
      </div>

      {ca && pct !== null && (
        <div className="emp-hero-track">
          <div className="emp-hero-track-bar">
            <div
              className="emp-hero-track-fill"
              style={{ width: `${pct}%` }}
            />
            <div className="emp-hero-track-dot" style={{ left: `${pct}%` }} />
          </div>
          <div className="emp-hero-track-ends">
            <span>{gioVao ? `Vào ${gioVao}` : `Vào ${ca.gioBatDau}`}</span>
            <span>Tan {ca.gioKetThuc}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        className="emp-punch"
        disabled={dangCham}
        onClick={onCham}
        style={{
          background: dangCham
            ? "var(--emp-muted)"
            : `linear-gradient(180deg, ${laVao ? "#1cc3b0" : "#ffab33"}, ${mauNut})`,
          boxShadow: dangCham
            ? "none"
            : `0 6px 18px ${laVao ? "rgba(18,165,148,.36)" : "rgba(255,149,0,.36)"}, inset 0 1px 0 rgba(255,255,255,.32)`,
          touchAction: "manipulation",
        }}
      >
        {dangCham ? (
          <span className="emp-spinner emp-spinner-trang" role="status" aria-label="Đang chấm" />
        ) : (
          <>
            {laVao ? <LoginOutlined /> : <LogoutOutlined />}
            Chấm công
          </>
        )}
      </button>

      <div className="emp-punch-hint">
        {gioVao && !laVao
          ? `Đã vào lúc ${gioVao} · chạm để chấm ra`
          : "Chạm nút để chấm công"}
      </div>
    </section>
  );
}
