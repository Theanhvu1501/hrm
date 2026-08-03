import { useCallback, useEffect, useState } from "react";
import { Alert, Button, DatePicker, Empty, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import {
  quyetToanTncnService,
  type KetQuaQuyetToan,
  type KyQuyetToan,
  type QuyetToanNguoi,
} from "@/services/quyetToanTncnService";
import { exportReportExcel } from "@/utils/exportReportExcel";
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
        <span style={{ color: r.soKyDaChot < 12 ? "#d46b08" : undefined }}>
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
        render: (_v: unknown, r: QuyetToanNguoi) =>
          formatTien(layNhom(r, khoa)?.[c]),
      })),
    })),
    {
      title: "Đã khấu trừ",
      key: "daKhauTru",
      align: "right",
      render: (_v, r) => formatTien(r.daKhauTru),
    },
    {
      title: "Chênh lệch",
      key: "chenhLech",
      align: "right",
      render: (_v, r) => (
        // Đỏ = còn phải nộp thêm, xanh = được hoàn. Đây là kết quả thật của
        // một cuộc quyết toán, không phải một cột phụ.
        <strong style={{ color: r.chenhLech > 0 ? "#cf1322" : r.chenhLech < 0 ? "#389e0d" : undefined }}>
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
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quyết toán thuế TNCN</h1>
          <p className="text-muted-foreground">
            Tính lại thuế cả năm trên biểu thuế năm rồi so với số đã khấu trừ
            hàng tháng — chênh lệch là số phải nộp thêm hoặc được hoàn
          </p>
        </div>
        <Space wrap>
          <DatePicker
            picker="year"
            value={dayjs(String(nam), "YYYY")}
            allowClear={false}
            onChange={(d: Dayjs | null) => d && setNam(d.year())}
          />
          <Button disabled={!kq} onClick={() => kq && exportReportExcel(`QT-TNCN-${kq.nam}`, [dungSheetQuyetToan(kq)])}>
            Xuất Excel
          </Button>
        </Space>
      </div>

      {kq && kq.soKyDaChotTrongNam < 12 && (
        <Alert
          type="warning"
          showIcon
          message={`Năm này mới chốt ${kq.soKyDaChotTrongNam} kỳ lương`}
          description="Bảng đang thiếu tháng — một bảng quyết toán thiếu hai tháng trông y hệt một bảng đủ. Chốt hết các kỳ trước khi đem đi nộp."
        />
      )}

      {kq && kq.khongLuyTien.length > 0 && (
        <Alert
          type="info"
          showIcon
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

      <Table<QuyetToanNguoi>
        rowKey="employeeId"
        size="small"
        bordered
        loading={dangTai}
        columns={columns}
        dataSource={kq?.ds ?? []}
        pagination={false}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <Empty description="Chưa có dữ liệu quyết toán năm này" /> }}
      />
    </div>
  );
}
