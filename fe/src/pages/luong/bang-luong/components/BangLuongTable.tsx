import { useMemo } from "react";
import { Button, Empty, Table, Tag, Tooltip } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useBangLuongHandler,
  useBangLuongState,
} from "../BangLuongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import type { CapNhatDongLuongDto, DongLuong, KetQuaLuong } from "@/services/bangLuongService";
import type { CauHinhLuong, KhoanLuong } from "@/services/cauHinhLuongService";
import { OSuaBienDong } from "./OSuaBienDong";
import { printHtml } from "@/utils/printHtml";
import { dungPhieuLuongHtml } from "../lib/phieuLuongHtml";
import { useAuth } from "@/contexts/AuthContext";
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
  const [khoanLuong] = useBangLuongState("khoanLuong", [] as KhoanLuong[]);
  const [cauHinhChung] = useBangLuongState(
    "cauHinhChung",
    null as CauHinhLuong | null
  );
  const { canEdit } = usePagePermission("/luong/bang-luong");
  const { currentTenant } = useAuth();

  const chiSuaDuoc = canEdit && !daChot;

  // Tra cứu khoản theo mã (từ Cấu hình lương) để biết tên hiển thị + khoản
  // nào NHAP_THEO_KY (nhập tay theo kỳ, vd Hiệu suất/Thưởng). Rỗng khi cấu
  // hình chưa tải xong / lỗi tải — các cột fallback về hành vi cũ bên dưới.
  const khoanMap = useMemo(() => {
    const map = new Map<string, KhoanLuong>();
    khoanLuong.forEach((k) => map.set(k.ma, k));
    return map;
  }, [khoanLuong]);

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

  /**
   * Liệt kê tham số của dòng LỆCH so với cấu hình chung — để HR biết ngay vì
   * sao số của NV này khác người khác, thay vì phải mở lại hồ sơ từng người.
   * `undefined` khi trùng hoàn toàn, hoặc khi chưa tải được cấu hình chung
   * (không có gì để so thì không gắn nhãn, không đoán).
   */
  const moTaCauHinhRieng = (dong: DongLuong): string | undefined => {
    const ap = dong.cauHinhApDung;
    if (!ap || !cauHinhChung) return undefined;

    const khac: string[] = [];
    if (ap.congChuan !== cauHinhChung.congChuan)
      khac.push(`Công chuẩn ${ap.congChuan}`);
    if (ap.thuViecTyLe !== cauHinhChung.thuViec.tyLe)
      khac.push(`Thử việc ${ap.thuViecTyLe * 100}%`);
    if (ap.bhxhTyLe !== cauHinhChung.bhxh.tyLe)
      khac.push(`BHXH ${ap.bhxhTyLe * 100}%`);
    if (ap.bhxhCanCu !== cauHinhChung.bhxh.canCu)
      khac.push(
        `Căn cứ ${
          ap.bhxhCanCu === "MUC_KHAI_BAO" ? "mức khai báo" : "lương thoả thuận"
        }`
      );

    return khac.length ? `Cấu hình riêng: ${khac.join(", ")}` : undefined;
  };

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
        render: (value: string | undefined, record: DongLuong) => {
          const moTaRieng = moTaCauHinhRieng(record);
          return (
            <span>
              {thieuCongHoacLuong(record) && (
                <Tooltip title="Thiếu công hoặc chưa khai báo lương thoả thuận">
                  <WarningOutlined style={{ color: "#faad14", marginRight: 6 }} />
                </Tooltip>
              )}
              {value || "-"}
              {record.hopDongThu2 && (
                <Tooltip title="HĐLĐ thứ 2: không trừ BHXH, không giảm trừ gia cảnh tại đây; công ty chỉ đóng BHTNLĐ-BNN">
                  <Tag color="purple" style={{ marginLeft: 6 }}>
                    HĐ2
                  </Tag>
                </Tooltip>
              )}
              {moTaRieng && (
                <Tooltip title={moTaRieng}>
                  <Tag color="blue" style={{ marginLeft: 6 }}>
                    riêng
                  </Tag>
                </Tooltip>
              )}
            </span>
          );
        },
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

    const khoanColumns: ColumnsType<DongLuong> = maKhoanList.map((ma) => {
      const khoanCauHinh = khoanMap.get(ma);
      const tieuDe = khoanCauHinh?.ten ?? ma;
      return {
        title: tieuDe,
        key: `khoan-${ma}`,
        width: 130,
        align: "right" as const,
        render: (_: unknown, record: DongLuong) => {
          const ketQua: KetQuaLuong | undefined = record[tabDangXem];
          const value = ketQua?.giaTriTungKhoan?.[ma] ?? 0;
          // Có cấu hình cho mã này -> theo đúng loại công thức (cho nhập cả
          // khi dòng vừa tổng hợp chưa có sẵn `ma` trong `nhapTheoKy`).
          // Không có cấu hình (tải lỗi / mã lạ) -> fallback hành vi cũ: chỉ
          // cho sửa nếu dòng đã có sẵn giá trị nhập tay cho mã này.
          const laBienDong = khoanCauHinh
            ? khoanCauHinh.loaiCongThuc === "NHAP_THEO_KY"
            : Object.prototype.hasOwnProperty.call(record.nhapTheoKy ?? {}, ma);
          if (!laBienDong) {
            return renderTien(value);
          }
          return (
            <OSuaBienDong
              label={tieuDe}
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
      };
    });

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
        title: "Giảm trừ",
        key: "giamTru",
        width: 110,
        align: "right",
        render: (_: unknown, record: DongLuong) => renderTien(record[tabDangXem]?.giamTru),
      },
      {
        // Cột GỘP (P4.2c-2): giảm trừ gia cảnh + phần khoản lương được miễn
        // (ăn ca dưới trần) + phần chênh tiền làm thêm ca đêm. Đứng SAU cột
        // Giảm trừ nên giảm trừ hiện hai lần — một mình và trong tổng gộp;
        // cố ý, vì cột Giảm trừ là số đối chiếu với hồ sơ người phụ thuộc còn
        // cột gộp là số dùng để kiểm phép trừ.
        title: (
          <Tooltip title="Gồm giảm trừ gia cảnh + phần ăn ca dưới trần + phần chênh tiền làm thêm ca đêm">
            <span>TN miễn thuế</span>
          </Tooltip>
        ),
        key: "thuNhapMienThue",
        width: 130,
        align: "right",
        render: (_: unknown, record: DongLuong) => renderTien(record[tabDangXem]?.thuNhapMienThue),
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
        title: "Phí công đoàn",
        key: "phiCongDoan",
        width: 130,
        align: "right",
        // Đứng SAU Thuế vì đó đúng thứ tự phép tính: tính thuế xong mới trừ
        // phí. `?? 0`: dòng chốt trước P4.2c-2 không có trường này, và 0 ở đây
        // nghĩa là "chưa ghi nhận", KHÔNG phải "công ty không thu".
        render: (_: unknown, record: DongLuong) =>
          renderTien(record[tabDangXem]?.phiCongDoan ?? 0),
      },
      {
        title: "CP BH công ty",
        key: "chiPhiBHCongTy",
        width: 130,
        align: "right",
        render: (_: unknown, record: DongLuong) =>
          // `?? 0`: dòng chốt trước P4.1 không có trường này. 0 ở đây nghĩa là
          // "chưa ghi nhận", KHÔNG phải "công ty không đóng gì".
          renderTien(record[tabDangXem]?.chiPhiBHCongTy ?? 0),
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
      {
        title: "Phiếu lương",
        key: "inPhieu",
        width: 110,
        align: "center",
        render: (_: unknown, record: DongLuong) => {
          const daChot = record.trangThai === "chot";
          return (
            <Tooltip title={daChot ? undefined : "Chốt kỳ trước khi in"}>
              {/* `span` bọc ngoài: antd Tooltip không hiện trên nút disabled. */}
              <span>
                <Button
                  size="small"
                  disabled={!daChot}
                  onClick={() =>
                    printHtml(
                      dungPhieuLuongHtml(
                        record,
                        khoanLuong,
                        currentTenant?.tenantName ?? "",
                      ),
                      `Phiếu lương ${record.employeeCode ?? ""} ${record.thang}`,
                    )
                  }
                >
                  In
                </Button>
              </span>
            </Tooltip>
          );
        },
      },
    ];

    return [...fixedLeft, ...khoanColumns, ...tamUngColumn, ...ketQuaColumns];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maKhoanList, tabDangXem, chiSuaDuoc, khoanMap, cauHinhChung]);

  const tongThucLinh = danhSach.reduce((sum, dong) => sum + (dong[tabDangXem]?.thucLinh ?? 0), 0);
  const tongThue = danhSach.reduce((sum, dong) => sum + (dong[tabDangXem]?.thue ?? 0), 0);
  const tongChiPhiBH = danhSach.reduce(
    (sum, dong) => sum + (dong[tabDangXem]?.chiPhiBHCongTy ?? 0),
    0
  );

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
                {/* colSpan phải bằng số cột TRƯỚC 3 ô tổng bên dưới — chèn
                    thêm cột vào bảng mà quên chỗ này là lệch cả hàng tổng. */}
                <Table.Summary.Cell index={0} colSpan={columns.length - 3}>
                  <strong>Tổng cộng</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{renderTien(tongThue)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>{renderTien(tongChiPhiBH)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
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
