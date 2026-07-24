import { useMemo } from "react";
import { Empty, Table, Tooltip } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useBangLuongHandler,
  useBangLuongState,
} from "../BangLuongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import type { CapNhatDongLuongDto, DongLuong, KetQuaLuong } from "@/services/bangLuongService";
import { OSuaBienDong } from "./OSuaBienDong";
import "../BangLuongPage.state";

function formatTien(value?: number): string {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString("vi-VN");
}

const moneyCellStyle: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
};

function renderTien(value?: number) {
  return <span style={moneyCellStyle}>{formatTien(value)}</span>;
}

export function BangLuongTable() {
  const handler = useBangLuongHandler();
  const [danhSach] = useBangLuongState("danhSach", [] as DongLuong[]);
  const [dangTai] = useBangLuongState("dangTai", false);
  const [tabDangXem] = useBangLuongState("tabDangXem", "khaiBao" as "khaiBao" | "thucTe");
  const [daChot] = useBangLuongState("daChot", false);
  const { canEdit } = usePagePermission("/luong/bang-luong");

  const chiSuaDuoc = canEdit && !daChot;

  const handleCapNhat = (id: string, dto: CapNhatDongLuongDto) => {
    handler.executeEvent("capNhatDong", { id, dto });
  };

  // Danh sách mã khoản xuất hiện trong tab đang xem, gộp từ tất cả các dòng
  // (khác dòng có thể thiếu khoản khác nhau nếu cấu hình thay đổi giữa kỳ).
  const maKhoanList = useMemo(() => {
    const set = new Set<string>();
    danhSach.forEach((dong) => {
      const ketQua: KetQuaLuong | undefined = dong[tabDangXem];
      Object.keys(ketQua?.giaTriTungKhoan ?? {}).forEach((ma) => set.add(ma));
    });
    return Array.from(set);
  }, [danhSach, tabDangXem]);

  const thieuCongHoacLuong = (dong: DongLuong) =>
    dong.congThuong + dong.congThuViec + dong.congKhac === 0 || !dong.luongThoaThuan;

  const columns: ColumnsType<DongLuong> = useMemo(() => {
    const fixedLeft: ColumnsType<DongLuong> = [
      {
        title: "STT",
        key: "stt",
        width: 50,
        fixed: "left",
        align: "center",
        render: (_: unknown, __: DongLuong, index: number) => index + 1,
      },
      {
        title: "Mã NV",
        dataIndex: "employeeCode",
        key: "employeeCode",
        width: 100,
        fixed: "left",
        render: (value?: string) => value || "-",
      },
      {
        title: "Họ tên",
        dataIndex: "employeeName",
        key: "employeeName",
        width: 180,
        fixed: "left",
        render: (value: string | undefined, record: DongLuong) => (
          <span>
            {thieuCongHoacLuong(record) && (
              <Tooltip title="Thiếu công hoặc chưa khai báo lương thoả thuận">
                <WarningOutlined style={{ color: "#faad14", marginRight: 6 }} />
              </Tooltip>
            )}
            {value || "-"}
          </span>
        ),
      },
      {
        title: "Công thường",
        dataIndex: "congThuong",
        key: "congThuong",
        width: 100,
        align: "center",
        render: (value?: number) => value ?? 0,
      },
      {
        title: "Công thử việc",
        dataIndex: "congThuViec",
        key: "congThuViec",
        width: 100,
        align: "center",
        render: (value?: number) => value ?? 0,
      },
    ];

    const khoanColumns: ColumnsType<DongLuong> = maKhoanList.map((ma) => ({
      title: ma,
      key: `khoan-${ma}`,
      width: 130,
      align: "right" as const,
      render: (_: unknown, record: DongLuong) => {
        const ketQua: KetQuaLuong | undefined = record[tabDangXem];
        const value = ketQua?.giaTriTungKhoan?.[ma] ?? 0;
        const laBienDong = Object.prototype.hasOwnProperty.call(record.nhapTheoKy ?? {}, ma);
        if (!laBienDong) {
          return renderTien(value);
        }
        return (
          <OSuaBienDong
            label={ma}
            value={value}
            disabled={!chiSuaDuoc}
            onSave={(nhap) =>
              handleCapNhat(record.id, {
                nhapTheoKy: { ...(record.nhapTheoKy ?? {}), [ma]: nhap },
              })
            }
          />
        );
      },
    }));

    const tamUngColumn: ColumnsType<DongLuong> = [
      {
        title: "Tạm ứng",
        key: "tamUng",
        width: 130,
        align: "right",
        render: (_: unknown, record: DongLuong) => (
          <OSuaBienDong
            label="Tạm ứng"
            value={record.tamUng ?? 0}
            disabled={!chiSuaDuoc}
            onSave={(nhap) => handleCapNhat(record.id, { tamUng: nhap })}
          />
        ),
      },
    ];

    const ketQuaColumns: ColumnsType<DongLuong> = [
      {
        title: "Tổng thu nhập",
        key: "tongThuNhap",
        width: 130,
        align: "right",
        render: (_: unknown, record: DongLuong) => renderTien(record[tabDangXem]?.tongThuNhap),
      },
      {
        title: "BHXH",
        key: "bhxh",
        width: 110,
        align: "right",
        render: (_: unknown, record: DongLuong) => renderTien(record[tabDangXem]?.bhxh),
      },
      {
        title: "TN miễn thuế",
        key: "thuNhapMienThue",
        width: 130,
        align: "right",
        render: (_: unknown, record: DongLuong) => renderTien(record[tabDangXem]?.thuNhapMienThue),
      },
      {
        title: "Giảm trừ",
        key: "giamTru",
        width: 110,
        align: "right",
        render: (_: unknown, record: DongLuong) => renderTien(record[tabDangXem]?.giamTru),
      },
      {
        title: "TN tính thuế",
        key: "thuNhapTinhThue",
        width: 130,
        align: "right",
        render: (_: unknown, record: DongLuong) => renderTien(record[tabDangXem]?.thuNhapTinhThue),
      },
      {
        title: "Thuế",
        key: "thue",
        width: 110,
        align: "right",
        render: (_: unknown, record: DongLuong) => (
          <strong>{renderTien(record[tabDangXem]?.thue)}</strong>
        ),
      },
      {
        title: "Thực lĩnh",
        key: "thucLinh",
        width: 130,
        align: "right",
        render: (_: unknown, record: DongLuong) => (
          <strong>{renderTien(record[tabDangXem]?.thucLinh)}</strong>
        ),
      },
    ];

    return [...fixedLeft, ...khoanColumns, ...tamUngColumn, ...ketQuaColumns];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maKhoanList, tabDangXem, chiSuaDuoc]);

  const tongThucLinh = danhSach.reduce((sum, dong) => sum + (dong[tabDangXem]?.thucLinh ?? 0), 0);
  const tongThue = danhSach.reduce((sum, dong) => sum + (dong[tabDangXem]?.thue ?? 0), 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <Table<DongLuong>
        columns={columns}
        dataSource={danhSach}
        rowKey="id"
        loading={dangTai}
        pagination={{ pageSize: 20 }}
        bordered
        size="small"
        scroll={{ x: "max-content" }}
        locale={{
          emptyText: (
            <Empty
              description={!dangTai ? "Bấm 'Tổng hợp' để tính bảng lương tháng này" : " "}
            />
          ),
        }}
        summary={() =>
          danhSach.length === 0 ? null : (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={columns.length - 2}>
                  <strong>Tổng cộng</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{renderTien(tongThue)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>{renderTien(tongThucLinh)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }
      />
    </div>
  );
}
