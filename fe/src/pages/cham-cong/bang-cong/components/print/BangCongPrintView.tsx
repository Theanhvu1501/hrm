import { useMemo } from "react";
import dayjs from "dayjs";
import { useAuth } from "@/contexts/AuthContext";
import { useBangCongState } from "../../BangCongHandlerContext";
import { KyHieuDef, Timesheet } from "@/services/timesheetService";
import { WEEKDAY_LABELS, isWeekendDay } from "../../constants";
import "../table/BangCongTable.state";

export function BangCongPrintView() {
  const [thang] = useBangCongState("thang", dayjs().format("YYYY-MM"));
  const [timesheetList] = useBangCongState("timesheetList", [] as Timesheet[]);
  const [kyHieuList] = useBangCongState("kyHieuList", [] as KyHieuDef[]);
  const { currentTenant } = useAuth();

  const daysInMonth = useMemo(
    () => dayjs(thang, "YYYY-MM").daysInMonth(),
    [thang]
  );
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const thangSo = thang ? dayjs(thang, "YYYY-MM").format("MM") : "___";
  const namSo = thang ? dayjs(thang, "YYYY-MM").format("YYYY") : "______";

  const now = dayjs();

  return (
    <div className="bang-cong-print-only">
      <div className="bcp-header">
        <p className="bcp-title">BẢNG CHẤM CÔNG</p>
        <p className="bcp-meta">
          Tháng {thangSo} / Năm {namSo}
        </p>
        <p className="bcp-meta">
          Đơn vị/Công ty: {currentTenant?.tenantName || "..................................."}
        </p>
        <p className="bcp-meta">Bộ phận: ...................................</p>
      </div>

      <table>
        <thead>
          <tr>
            <th rowSpan={2}>STT</th>
            <th rowSpan={2}>Mã NV</th>
            <th rowSpan={2}>Họ tên</th>
            <th colSpan={daysInMonth}>Ngày trong tháng</th>
            <th rowSpan={2}>Tổng công</th>
            <th rowSpan={2}>Phép</th>
            <th rowSpan={2}>Ốm</th>
            <th rowSpan={2}>Không lương</th>
            <th rowSpan={2}>Giờ OT</th>
          </tr>
          <tr>
            {days.map((day) => {
              const dow = dayjs(thang, "YYYY-MM").date(day).day();
              return (
                <th
                  key={day}
                  style={
                    isWeekendDay(dow) ? { background: "#eee" } : undefined
                  }
                >
                  {day}
                  <br />
                  {WEEKDAY_LABELS[dow]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {timesheetList.map((row, index) => (
            <tr key={row._id}>
              <td>{index + 1}</td>
              <td>{row.employeeCode || "-"}</td>
              <td style={{ textAlign: "left" }}>{row.employeeName || "-"}</td>
              {days.map((day) => {
                const entry = row.chiTietNgay?.find((c) => c.ngay === day);
                return <td key={day}>{entry?.kyHieu || ""}</td>;
              })}
              <td>{row.soNgayCong ?? 0}</td>
              <td>{row.soNgayNghiPhep ?? 0}</td>
              <td>{row.soNgayOm ?? 0}</td>
              <td>{row.soNgayNghiKhongLuong ?? 0}</td>
              <td>{row.soGioLamThem ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bcp-legend">
        <strong>Chú thích: </strong>
        {kyHieuList
          .map((k) => `${k.kyHieu} = ${k.nhan} (${k.soCong} công)`)
          .join("; ")}
      </div>

      <p className="bcp-date-line" style={{ marginTop: 20 }}>
        Ngày {now.format("DD")} tháng {now.format("MM")} năm {now.format("YYYY")}
      </p>

      <div className="bcp-signatures">
        <div className="bcp-signature-col">
          <div className="bcp-signature-title">Người chấm công</div>
          <div>(Ký, họ tên)</div>
          <div className="bcp-signature-space" />
        </div>
        <div className="bcp-signature-col">
          <div className="bcp-signature-title">Phụ trách bộ phận</div>
          <div>(Ký, họ tên)</div>
          <div className="bcp-signature-space" />
        </div>
        <div className="bcp-signature-col">
          <div className="bcp-signature-title">Người duyệt</div>
          <div>(Ký, họ tên)</div>
          <div className="bcp-signature-space" />
        </div>
      </div>
    </div>
  );
}
