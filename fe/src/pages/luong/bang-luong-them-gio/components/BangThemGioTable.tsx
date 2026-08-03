import { useMemo } from "react";
import { Empty, InputNumber, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  useBangThemGioHandler,
  useBangThemGioState,
} from "../BangThemGioHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { NHAN_LOAI_NGAY } from "@/services/cauHinhLuongService";
import type { DongLuongThemGio } from "@/services/bangLuongThemGioService";
import "../BangThemGioPage.state";

function formatTien(value?: number): string {
  if (value === undefined || value === null) return "-";
  // Tiền ở bảng này có phần thập phân (mẫu 03-LĐTL in 1.503.906,25), khác
  // bảng lương chính đã làm tròn — nên hiện tối đa 2 chữ số thập phân.
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

const moneyCellStyle: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
};

function renderTien(value?: number) {
  return <span style={moneyCellStyle}>{formatTien(value)}</span>;
}

export function BangThemGioTable() {
  const handler = useBangThemGioHandler();
  const [danhSach] = useBangThemGioState("danhSach", [] as DongLuongThemGio[]);
  const [dangTai] = useBangThemGioState("dangTai", false);
  const [daChot] = useBangThemGioState("daChot", false);
  const { canEdit } = usePagePermission("/luong/bang-luong");

  /**
   * Gộp khoá của MỌI dòng, không lấy từ dòng đầu: nhân viên đầu tiên có thể
   * không làm ca đêm, mà cột "Buổi đêm" vẫn phải in ra đúng biểu mẫu.
   */
  const cacLoai = useMemo(
    () =>
      Array.from(
        new Set(danhSach.flatMap((d) => Object.keys(d.theoLoai ?? {}))),
      ),
    [danhSach],
  );

  const suaGio = (dong: DongLuongThemGio, loai: string, soGio: number) => {
    const theoLoai: Record<string, number> = {};
    for (const k of cacLoai) theoLoai[k] = dong.theoLoai?.[k]?.soGio ?? 0;
    theoLoai[loai] = soGio;
    handler.executeEvent("capNhatDong", { id: dong.id, theoLoai });
  };

  const columns: ColumnsType<DongLuongThemGio> = [
    {
      title: "Số TT",
      key: "stt",
      width: 64,
      align: "center",
      render: (_v, _r, i) => i + 1,
    },
    {
      title: "Họ và tên",
      key: "hoTen",
      width: 200,
      fixed: "left",
      render: (_v, r) => (
        <div>
          <div className="font-medium">{r.employeeName ?? r.employeeCode}</div>
          {r.suaTay && <Tag color="gold">Sửa tay</Tag>}
        </div>
      ),
    },
    {
      title: "Tiền lương tháng",
      key: "luongThang",
      align: "right",
      render: (_v, r) => renderTien(r.luongThang),
    },
    {
      title: "Mức lương",
      children: [
        {
          title: "Ngày",
          key: "donGiaNgay",
          align: "right",
          render: (_v, r) => renderTien(r.donGiaNgay),
        },
        {
          title: "Giờ",
          key: "donGiaGio",
          align: "right",
          render: (_v, r) => renderTien(r.donGiaGio),
        },
      ],
    },
    ...cacLoai.map((loai) => ({
      // Loại công ty tự thêm chưa có nhãn tiếng Việt thì hiện chính khoá —
      // thà xấu còn hơn ẩn mất một nhóm cột đang có tiền trong đó.
      title: NHAN_LOAI_NGAY[loai] ?? loai,
      children: [
        {
          title: "Số giờ",
          key: `${loai}__soGio`,
          align: "right" as const,
          render: (_v: unknown, r: DongLuongThemGio) => {
            const soGio = r.theoLoai?.[loai]?.soGio ?? 0;
            if (!canEdit || daChot) return soGio;
            return (
              <InputNumber
                size="small"
                min={0}
                step={0.5}
                value={soGio}
                aria-label={`Số giờ ${loai} của ${r.employeeName ?? r.employeeCode}`}
                onBlur={(e) => {
                  const v = Number((e.target as HTMLInputElement).value);
                  if (!Number.isNaN(v) && v !== soGio) suaGio(r, loai, v);
                }}
              />
            );
          },
        },
        {
          title: "Thành tiền",
          key: `${loai}__thanhTien`,
          align: "right" as const,
          render: (_v: unknown, r: DongLuongThemGio) =>
            renderTien(r.theoLoai?.[loai]?.thanhTien),
        },
      ],
    })),
    {
      title: "Tổng cộng tiền",
      key: "tongTien",
      align: "right",
      render: (_v, r) => renderTien(r.tongTien),
    },
    {
      title: "Số giờ nghỉ bù",
      key: "gioNghiBu",
      align: "right",
      render: (_v, r) => r.gioNghiBu ?? 0,
    },
    {
      title: "Thực nhận",
      key: "thucNhan",
      align: "right",
      render: (_v, r) => <strong>{formatTien(r.thucNhan)}</strong>,
    },
  ];

  return (
    <Table<DongLuongThemGio>
      rowKey="id"
      size="small"
      bordered
      loading={dangTai}
      columns={columns}
      dataSource={danhSach}
      pagination={false}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: <Empty description="Chưa có dữ liệu" /> }}
    />
  );
}
