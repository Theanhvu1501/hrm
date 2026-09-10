import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, DatePicker, Empty, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import {
  quyetToanTncnService,
  type KetQuaQuyetToan,
  type KyQuyetToan,
  type QuyetToanNguoi,
} from "@/services/quyetToanTncnService";
import { exportReportExcel } from "@/utils/exportReportExcel";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { dungSheetQuyetToan } from "./xuatQuyetToan";

/**
 * Bảng quyết toán thuế TNCN năm.
 *
 * Con số ở đây đem đi nộp thuế, nên hai cảnh báo trên đầu bảng không phải
 * trang trí: một bảng thiếu hai tháng trông y hệt một bảng đủ, và người
 * cam kết/thời vụ lẫn vào bảng lũy tiến là ra nghĩa vụ thuế sai.
 */

function formatTien(v?: number): string {
  if (v === undefined || v === null) return "-";
  return v.toLocaleString("vi-VN");
}

const CON: Array<[keyof KyQuyetToan, string]> = [
  ["tongThuNhapChiuThue", "TN chịu thuế"],
  ["bhxh", "BHXH"],
  ["khoanMienThue", "Ăn ca"],
  ["giamTruBanThan", "GT bản thân"],
  ["giamTruNPT", "NPT"],
  ["giamTruGiaCanh", "GT gia cảnh"],
  ["thuNhapTinhThue", "TN tính thuế"],
  ["thue", "Thuế"],
];

const NHOM: Array<[string, string]> = [
  ["caNam", "CẢ NĂM"],
  ["q1", "Quý 1"],
  ["q2", "Quý 2"],
  ["q3", "Quý 3"],
  ["q4", "Quý 4"],
];

function layNhom(n: QuyetToanNguoi, khoa: string): KyQuyetToan | undefined {
  if (khoa === "caNam") return n.caNam;
  return n.quy?.[Number(khoa.slice(1)) - 1];
}

export default function QuyetToanTncnPage() {
  const [nam, setNam] = useState(dayjs().year());
  const [kq, setKq] = useState<KetQuaQuyetToan | null>(null);
  const [dangTai, setDangTai] = useState(false);

  const tai = useCallback((namCanTai: number) => {
    setDangTai(true);
    quyetToanTncnService
      .quyetToan(namCanTai)
      .then(setKq)
      .catch(() => setKq(null))
      .finally(() => setDangTai(false));
  }, []);

  useEffect(() => {
    tai(nam);
  }, [nam, tai]);

  const columns: ColumnsType<QuyetToanNguoi> = [
    { title: "Mã NV", key: "ma", width: 100, fixed: "left", render: (_v, r) => r.maNhanVien },
    { title: "Họ tên", key: "hoTen", width: 180, fixed: "left", render: (_v, r) => r.hoTen },
    {
      title: "Số kỳ",
      key: "soKy",
      width: 70,
      align: "right",
      render: (_v, r) => (
        <span style={{ color: r.soKyDaChot < 12 ? "hsl(var(--amber))" : undefined }}>
          {r.soKyDaChot}
        </span>
      ),
    },
    ...NHOM.map(([khoa, nhan]) => ({
      title: nhan,
      children: CON.map(([c, tenCot]) => ({
        title: tenCot,
        key: `${khoa}__${c}`,
        align: "right" as const,
        className: "tabular-nums",
        render: (_v: unknown, r: QuyetToanNguoi) =>
          formatTien(layNhom(r, khoa)?.[c]),
      })),
    })),
    {
      title: "Đã khấu trừ",
      key: "daKhauTru",
      align: "right",
      className: "tabular-nums",
      render: (_v, r) => formatTien(r.daKhauTru),
    },
    {
      title: "Chênh lệch",
      key: "chenhLech",
      align: "right",
      className: "tabular-nums",
      render: (_v, r) => (
        // Đỏ = còn phải nộp thêm, xanh = được hoàn. Đây là kết quả thật của
        // một cuộc quyết toán, không phải một cột phụ.
        <strong
          style={{
            color:
              r.chenhLech > 0
                ? "hsl(var(--red))"
                : r.chenhLech < 0
                  ? "hsl(var(--green))"
                  : undefined,
          }}
        >
          {formatTien(r.chenhLech)}
        </strong>
      ),
    },
    {
      title: "Ghi chú",
      key: "ghiChu",
      width: 200,
      render: (_v, r) => r.ghiChu ?? "",
    },
  ];

  return (
    <Card>
      <FilterBar
        filters={
          <DatePicker
            picker="year"
            value={dayjs(String(nam), "YYYY")}
            allowClear={false}
            onChange={(d: Dayjs | null) => d && setNam(d.year())}
          />
        }
        actions={
          <Button
            icon={<DownloadOutlined />}
            disabled={!kq}
            onClick={() => kq && exportReportExcel(`QT-TNCN-${kq.nam}`, [dungSheetQuyetToan(kq)])}
          >
            Xuất Excel
          </Button>
        }
      />

      {kq && kq.soKyDaChotTrongNam < 12 && (
        <Alert
          type="warning"
          showIcon
          className="mb-3"
          message={`Năm này mới chốt ${kq.soKyDaChotTrongNam} kỳ lương`}
          description="Bảng đang thiếu tháng — một bảng quyết toán thiếu hai tháng trông y hệt một bảng đủ. Chốt hết các kỳ trước khi đem đi nộp."
        />
      )}

      {kq && kq.khongLuyTien.length > 0 && (
        <Alert
          type="info"
          showIcon
          className="mb-3"
          message={`${kq.khongLuyTien.length} người không quyết toán theo lũy tiến`}
          description={
            <div>
              {kq.khongLuyTien.map((n) => (
                <div key={n.employeeId}>
                  {n.hoTen} — <Tag>{n.lyDo}</Tag>
                </div>
              ))}
            </div>
          }
        />
      )}

      <BangDuLieu<QuyetToanNguoi>
        rowKey="employeeId"
        // Lưới số tiêu đề hai tầng (năm / từng quý × 8 con số): cần viền ô.
        bordered
        loading={dangTai}
        columns={columns}
        dataSource={kq?.ds ?? []}
        // Không phân trang: bảng đem đi nộp thuế, xem liền một mạch như file xuất.
        pagination={false}
        // Không có phân trang nhưng tiêu đề hai tầng → trừ ít hơn chuẩn 285.
        buTruDoc={250}
        locale={{ emptyText: <Empty description="Chưa có dữ liệu quyết toán năm này" /> }}
      />
    </Card>
  );
}
