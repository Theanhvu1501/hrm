import { isValidElement, useCallback, useMemo, useState } from "react";
import { TermText } from "@/components/glossary/TermText";
import { useTerm } from "@/contexts/TermContext";
import { useColumnVisibility } from "@/components/table/useColumnVisibility";
import type { Key } from "react";
import { Table, Button, Space, Tooltip, Popconfirm } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { NhatKyChung, QuyChuan, HoSoChungTu } from "@/types";
import { useTableColumnResize } from "@/hooks/useTableColumnResize";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  getNkcDoiTuongMa,
  getNkcDoiTuongTen,
  getNkcDoiTuong2Ma,
  getNkcDoiTuong2Ten,
  getNkcDuAnMa,
  getNkcDuAnTen,
  getNkcChuDauTuMa,
  getNkcChuDauTuTen,
  getNkcBoPhanMa,
  getNkcBoPhanTen,
  getNkcDoiMa,
  getNkcDoiTen,
  getNkcNhanVienMa,
  getNkcNhanVienTen,
  getNkcSanPhamMa,
  getNkcSanPhamTen,
  getNkcDongTienMa,
  getNkcDongTienTen,
  getNkcKhoanMucMa,
  getNkcKhoanMucTen,
  getNkcNhomKhuyenMaiMa,
  getNkcNhomKhuyenMaiTen,
  getNkcNhomQuanLyMa,
  getNkcNhomQuanLyTen,
  getNkcHopDongSo,
  getNkcHopDongTen,
} from "@/utils/snapshotDisplay";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import { FilterDrawer } from "../filter-drawer/FilterDrawer";
import { EntryActions } from "../entry-actions/EntryActions";
import { TableTitleSettings } from '@/components/glossary/TableTitleSettings';
import { NKC_TITLE_TERMS } from './nkcTitleTerms';
import { DetailPopover } from "./DetailPopover";
import { EditableCell, SelectOption } from "../editable-cell";
import { BienTapHoSoCell } from "../BienTapHoSoCell";
import { KiemSoatCell } from "../KiemSoatCell";
import dayjs from "dayjs";
import type { TablePaginationConfig } from "antd/es/table";
import type { ColumnType } from "antd/es/table";

// Import inline-edit handler to register it
import "../../handler/sub-handler/inline-edit/inline-edit.handler";
import { ImportExcelModal } from "../../import/ImportExcelModal";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN").format(value);
};

// Render text với ellipsis và tooltip - compact style
const renderEllipsisText = (text: string | undefined | null) => {
  if (!text) return <span className="text-gray-400">-</span>;
  return (
    <Tooltip title={text} placement="topLeft">
      <span className="excel-cell-text">{text}</span>
    </Tooltip>
  );
};

// Default column widths
const DEFAULT_WIDTHS: Record<string, number> = {
  ngay: 120,
  ngayGhiSo: 100,
  soPhieu: 90,
  loaiGiaoDich: 120,
  nghiepVu: 150,
  dienGiai: 150,
  taiKhoanNo: 55,
  taiKhoanCo: 55,
  soTien: 100,
  doiTuongMa: 65,
  doiTuong: 110,
  doiTuong2Ma: 65,
  doiTuong2: 110,
  chuDauTuMa: 65,
  chuDauTu: 110,
  duAnMa: 65,
  duAn: 110,
  sanPhamMa: 65,
  sanPham: 110,
  boPhanMa: 55,
  boPhan: 90,
  doiMa: 55,
  doi: 90,
  nhanVienMa: 55,
  nhanVien: 90,
  dongTienMa: 55,
  dongTien: 100,
  khoanMucMa: 55,
  khoanMuc: 100,
  nhomKhuyenMaiMa: 55,
  nhomKhuyenMai: 100,
  nhomQuanLyMa: 55,
  nhomQuanLy: 100,
  hopDongSo: 80,
  hopDong: 120,
  soTaiKhoan: 100,
  nguoiGiaoDich: 100,
  diaChi: 120,
  ghiChu: 120,
  hoSoChungTu: 160,
  kiemSoat: 150,
  action: 70,
};

// Editable column configuration
interface EditableColumnConfig {
  editable: boolean;
  inputType: "text" | "number" | "date" | "select";
}

const EDITABLE_COLUMNS: Record<string, EditableColumnConfig> = {
  ngay: { editable: true, inputType: "date" },
  dienGiai: { editable: true, inputType: "text" },
  taiKhoanNo: { editable: true, inputType: "select" },
  taiKhoanCo: { editable: true, inputType: "select" },
  soTien: { editable: true, inputType: "number" },
  nguoiGiaoDich: { editable: true, inputType: "text" },
  diaChi: { editable: true, inputType: "text" },
  ghiChu: { editable: true, inputType: "text" },
};

// Column definitions without width (static)
const getColumnDefinitions = (
  taiKhoanOptions: SelectOption[],
  quyChaunList: QuyChuan[],
  hoSoChungTuList: HoSoChungTu[],
  onRefresh: () => void
): Omit<ColumnType<NhatKyChung>, "width">[] => [
  {
    title: "Biên tập hồ sơ",
    key: "hoSoChungTu",
    align: "center" as const,
    render: (_: unknown, record: NhatKyChung) => (
      <BienTapHoSoCell
        entry={record}
        quyChaunList={quyChaunList}
        hoSoChungTuList={hoSoChungTuList}
        onSaved={onRefresh}
      />
    ),
  },
  {
    title: "Kiểm soát",
    key: "kiemSoat",
    align: "center" as const,
    render: (_: unknown, record: NhatKyChung) => (
      <KiemSoatCell entry={record} onSaved={onRefresh} />
    ),
  },
  {
    title: "Ngày Phát Sinh CT",
    dataIndex: "ngay",
    key: "ngay",
    sorter: (a: NhatKyChung, b: NhatKyChung) =>
      new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
    render: (date: string, record: NhatKyChung) => (
      <EditableCell
        record={record}
        dataIndex="ngay"
        editable={true}
        inputType="date"
      >
        {dayjs(date).format("DD/MM/YY")}
      </EditableCell>
    ),
  },
  {
    title: "Ngày ghi sổ",
    dataIndex: "ngayGhiSo",
    key: "ngayGhiSo",
    render: (_: unknown, record: NhatKyChung) =>
      dayjs(record.ngayGhiSo || record.ngay).format("DD/MM/YY"),
  },
  {
    title: "Số CT",
    dataIndex: "soPhieu",
    key: "soPhieu",
    render: (text: string, record: NhatKyChung) => (
      <span
        className={`font-semibold ${
          record.loaiChungTu === "Phiếu thu" ? "text-green-600" : "text-red-600"
        }`}
      >
        {text}
      </span>
    ),
  },
  {
    title: "Loại GD",
    key: "loaiGiaoDich",
    render: (_: unknown, record: NhatKyChung) => {
      const loaiGD = record.danhMuc?.loaiGiaoDich?.ten;
      return loaiGD ? (
        <Tooltip title={loaiGD}>
          <span className="excel-cell-text">{loaiGD}</span>
        </Tooltip>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: "Nghiệp vụ",
    key: "nghiepVu",
    render: (_: unknown, record: NhatKyChung) => {
      const nghiepVu = record.danhMuc?.nghiepVu?.ten;
      return nghiepVu ? (
        <Tooltip title={nghiepVu}>
          <span className="excel-cell-text">{nghiepVu}</span>
        </Tooltip>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: "Diễn giải",
    dataIndex: "dienGiai",
    key: "dienGiai",
    render: (text: string, record: NhatKyChung) => (
      <EditableCell
        record={record}
        dataIndex="dienGiai"
        editable={true}
        inputType="text"
      >
        {renderEllipsisText(text)}
      </EditableCell>
    ),
  },
  {
    title: "TK Nợ",
    dataIndex: "taiKhoanNo",
    key: "taiKhoanNo",
    align: "center" as const,
    render: (text: string, record: NhatKyChung) => {
      const data = record.danhMuc?.taiKhoanNo;
      return (
        <EditableCell
          record={record}
          dataIndex="taiKhoanNo"
          editable={true}
          inputType="select"
          selectOptions={taiKhoanOptions}
        >
          {data ? (
            <DetailPopover type="taiKhoan" data={data}>
              <span className="cursor-pointer text-orange-600 font-medium">
                {text}
              </span>
            </DetailPopover>
          ) : (
            <span className="text-orange-600">{text}</span>
          )}
        </EditableCell>
      );
    },
  },
  {
    title: "TK Có",
    dataIndex: "taiKhoanCo",
    key: "taiKhoanCo",
    align: "center" as const,
    render: (text: string, record: NhatKyChung) => {
      const data = record.danhMuc?.taiKhoanCo;
      return (
        <EditableCell
          record={record}
          dataIndex="taiKhoanCo"
          editable={true}
          inputType="select"
          selectOptions={taiKhoanOptions}
        >
          {data ? (
            <DetailPopover type="taiKhoan" data={data}>
              <span className="cursor-pointer text-green-600 font-medium">
                {text}
              </span>
            </DetailPopover>
          ) : (
            <span className="text-green-600">{text}</span>
          )}
        </EditableCell>
      );
    },
  },
  {
    title: "Số tiền",
    dataIndex: "soTien",
    key: "soTien",
    align: "right" as const,
    sorter: (a: NhatKyChung, b: NhatKyChung) => a.soTien - b.soTien,
    render: (value: number, record: NhatKyChung) => (
      <EditableCell
        record={record}
        dataIndex="soTien"
        editable={true}
        inputType="number"
      >
        <span className="font-medium">{formatCurrency(value)}</span>
      </EditableCell>
    ),
  },
  {
    title: <TermText tk="doiTuong" surface="nkc.dtNoMa" />,
    key: "doiTuongMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDoiTuongMa(record);
      const data = record.danhMuc?.doiTuong;
      return ma ? (
        <DetailPopover type="doiTuong" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="doiTuong" surface="nkc.dtNo" />,
    key: "doiTuong",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDoiTuongTen(record);
      const data = record.danhMuc?.doiTuong;
      return data ? (
        <DetailPopover type="doiTuong" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="doiTuong" surface="nkc.dtCoMa" />,
    key: "doiTuong2Ma",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDoiTuong2Ma(record);
      const data = record.danhMuc?.doiTuong2;
      return ma ? (
        <DetailPopover type="doiTuong" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="doiTuong" surface="nkc.dtCo" />,
    key: "doiTuong2",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDoiTuong2Ten(record);
      const data = record.danhMuc?.doiTuong2;
      return data ? (
        <DetailPopover type="doiTuong" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="chuDauTu" surface="nkc.colMa" />,
    key: "chuDauTuMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcChuDauTuMa(record);
      const data = record.danhMuc?.duAn
        ? {
            ma: record.danhMuc.duAn.chuDauTuMa,
            ten: record.danhMuc.duAn.chuDauTuTen,
          }
        : null;
      return ma ? (
        <DetailPopover type="doiTuong" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="chuDauTu" surface="nkc.colTen" />,
    key: "chuDauTu",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcChuDauTuTen(record);
      const data = record.danhMuc?.duAn
        ? {
            ma: record.danhMuc.duAn.chuDauTuMa,
            ten: record.danhMuc.duAn.chuDauTuTen,
          }
        : null;
      return data ? (
        <DetailPopover type="doiTuong" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="duAn" surface="nkc.colMa" />,
    key: "duAnMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDuAnMa(record);
      const data = record.danhMuc?.duAn;
      return ma ? (
        <DetailPopover type="duAn" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="duAn" surface="nkc.colTen" />,
    key: "duAn",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDuAnTen(record);
      const data = record.danhMuc?.duAn;
      return data ? (
        <DetailPopover type="duAn" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="sanPham" surface="nkc.colMa" />,
    key: "sanPhamMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcSanPhamMa(record);
      const data = record.danhMuc?.sanPham;
      return ma ? (
        <DetailPopover type="sanPham" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="sanPham" surface="nkc.colTen" />,
    key: "sanPham",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcSanPhamTen(record);
      const data = record.danhMuc?.sanPham;
      return data ? (
        <DetailPopover type="sanPham" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="boPhan" surface="nkc.colMa" />,
    key: "boPhanMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcBoPhanMa(record);
      const data = record.danhMuc?.boPhan;
      return ma ? (
        <DetailPopover type="boPhan" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="boPhan" surface="nkc.colTen" />,
    key: "boPhan",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcBoPhanTen(record);
      const data = record.danhMuc?.boPhan;
      return data ? (
        <DetailPopover type="boPhan" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="doi" surface="nkc.colMa" />,
    key: "doiMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDoiMa(record);
      const data = record.danhMuc?.doi;
      return ma ? (
        <DetailPopover type="boPhan" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="doi" surface="nkc.colTen" />,
    key: "doi",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDoiTen(record);
      const data = record.danhMuc?.doi;
      return data ? (
        <DetailPopover type="boPhan" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="nhanVien" surface="nkc.colMa" />,
    key: "nhanVienMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcNhanVienMa(record);
      const data = record.danhMuc?.nhanVien;
      return ma ? (
        <DetailPopover type="nhanVien" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="nhanVien" surface="nkc.colTen" />,
    key: "nhanVien",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcNhanVienTen(record);
      const data = record.danhMuc?.nhanVien;
      return data ? (
        <DetailPopover type="nhanVien" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="dongTien" surface="nkc.colMa" />,
    key: "dongTienMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDongTienMa(record);
      const data = record.danhMuc?.dongTien;
      return ma ? (
        <DetailPopover type="dongTien" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="dongTien" surface="nkc.colTen" />,
    key: "dongTien",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDongTienTen(record);
      const data = record.danhMuc?.dongTien;
      return data ? (
        <DetailPopover type="dongTien" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="khoanMuc" surface="nkc.colMa" />,
    key: "khoanMucMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcKhoanMucMa(record);
      const data = record.danhMuc?.khoanMuc;
      return ma ? (
        <DetailPopover type="khoanMuc" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="khoanMuc" surface="nkc.colTen" />,
    key: "khoanMuc",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcKhoanMucTen(record);
      const data = record.danhMuc?.khoanMuc;
      return data ? (
        <DetailPopover type="khoanMuc" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="nhomKhuyenMai" surface="nkc.colMa" />,
    key: "nhomKhuyenMaiMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcNhomKhuyenMaiMa(record);
      const data = record.danhMuc?.nhomKhuyenMai;
      return ma ? (
        <DetailPopover type="nhomKhuyenMai" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="nhomKhuyenMai" surface="nkc.colTen" />,
    key: "nhomKhuyenMai",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcNhomKhuyenMaiTen(record);
      const data = record.danhMuc?.nhomKhuyenMai;
      return data ? (
        <DetailPopover type="nhomKhuyenMai" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="nhomQuanLy" surface="nkc.colMa" />,
    key: "nhomQuanLyMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcNhomQuanLyMa(record);
      const data = record.danhMuc?.nhomQuanLy;
      return ma ? (
        <DetailPopover type="nhomQuanLy" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="nhomQuanLy" surface="nkc.colTen" />,
    key: "nhomQuanLy",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcNhomQuanLyTen(record);
      const data = record.danhMuc?.nhomQuanLy;
      return data ? (
        <DetailPopover type="nhomQuanLy" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: <TermText tk="hopDong" surface="nkc.colMa" />,
    key: "hopDongSo",
    render: (_: unknown, record: NhatKyChung) => {
      const so = getNkcHopDongSo(record);
      const data = record.danhMuc?.hopDong;
      return so ? (
        <DetailPopover type="hopDong" data={data}>
          <span className="cursor-pointer text-blue-600">{so}</span>
        </DetailPopover>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: <TermText tk="hopDong" surface="nkc.colTen" />,
    key: "hopDong",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcHopDongTen(record);
      const data = record.danhMuc?.hopDong;
      return data ? (
        <DetailPopover type="hopDong" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : (
        renderEllipsisText(ten)
      );
    },
  },
  {
    title: "Số TK",
    dataIndex: "soTaiKhoan",
    key: "soTaiKhoan",
    render: (text: string) => renderEllipsisText(text),
  },
  {
    title: "Người GD",
    dataIndex: "nguoiGiaoDich",
    key: "nguoiGiaoDich",
    render: (text: string, record: NhatKyChung) => (
      <EditableCell
        record={record}
        dataIndex="nguoiGiaoDich"
        editable={true}
        inputType="text"
      >
        {renderEllipsisText(text)}
      </EditableCell>
    ),
  },
  {
    title: "Địa chỉ",
    dataIndex: "diaChi",
    key: "diaChi",
    render: (text: string, record: NhatKyChung) => (
      <EditableCell
        record={record}
        dataIndex="diaChi"
        editable={true}
        inputType="text"
      >
        {renderEllipsisText(text)}
      </EditableCell>
    ),
  },
  {
    title: "Ghi chú",
    dataIndex: "ghiChu",
    key: "ghiChu",
    render: (text: string, record: NhatKyChung) => (
      <EditableCell
        record={record}
        dataIndex="ghiChu"
        editable={true}
        inputType="text"
      >
        {renderEllipsisText(text)}
      </EditableCell>
    ),
  },
  {
    title: "",
    key: "action",
    width: 120,
    align: "center" as const,
    fixed: "right" as const,
    render: (_: unknown, record: NhatKyChung) => <EntryActions entry={record} />,
  },
];

// Calculate total width
const TOTAL_WIDTH = Object.values(DEFAULT_WIDTHS).reduce((sum, w) => sum + w, 0);

export function EntryListTab() {
  const navigate = useNavigate();
  const handler = useNhatKyChungHandler();
  const [data] = useNhatKyChungState("data", []);
  const [loading] = useNhatKyChungState("loading", false);
  const [pagination] = useNhatKyChungState("pagination", {
    total: 0,
    page: 1,
    limit: 100,
    totalPages: 0,
  });
  const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);
  const [quyChaunList] = useNhatKyChungState("quyChaunList", []);
  const [hoSoChungTuList] = useNhatKyChungState("hoSoChungTuList", []);
  const [editingRowId] = useNhatKyChungState("editingRowId", null);
  const [exportingExcel] = useNhatKyChungState("exportingExcel", false);
  const [selectedEntryIds, setSelectedEntryIds] = useNhatKyChungState(
    "selectedEntryIds",
    []
  );
  const [deletingBatch] = useNhatKyChungState("deletingBatch", false);
  const { canCreate, canDelete } = usePagePermission("/chung-tu/nhat-ky-chung");
  const [importOpen, setImportOpen] = useState(false);

  // Enable column resize via DOM manipulation (no React re-renders)
  // storageKey bump 'v2': cấu trúc cột đổi (thêm cột Ngày ghi sổ) → bỏ width cũ lưu theo chỉ số (đã lệch).
  useTableColumnResize("resizable-table", "table-col-widths-nkc-v2");

  const { t } = useTerm();

  // Convert taiKhoanList to select options
  const taiKhoanOptions: SelectOption[] = useMemo(
    () =>
      (taiKhoanList || []).map((tk: { ma: string; ten: string }) => ({
        value: tk.ma,
        label: `${tk.ma} - ${tk.ten}`,
      })),
    [taiKhoanList]
  );

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    const { current = 1, pageSize = 100 } = paginationConfig;
    // Chọn theo trang hiện tại → đổi trang thì bỏ chọn
    setSelectedEntryIds([]);
    handler.executeEvent("loadPage", { page: current, limit: pageSize });
  };

  // Checkbox chọn dòng để xóa hàng loạt (chỉ bật khi có quyền xóa)
  const rowSelection = canDelete
    ? {
        selectedRowKeys: selectedEntryIds,
        onChange: (keys: Key[]) => setSelectedEntryIds(keys.map(String)),
        columnWidth: 32,
      }
    : undefined;

  // Read pagination from handler state at call time to avoid stale closure in memoised columns
  const handleRefresh = useCallback(() => {
    const currentPagination = handler.getState("pagination");
    handler.executeEvent("loadPage", {
      page: currentPagination?.page || 1,
      limit: currentPagination?.limit || 100,
    });
  }, [handler]);

  // Memoize columns with widths - now depends on taiKhoanOptions
  const columns = useMemo(
    () =>
      getColumnDefinitions(
        taiKhoanOptions,
        quyChaunList,
        hoSoChungTuList,
        handleRefresh
      ).map((col) => ({
        ...col,
        width: col.width || DEFAULT_WIDTHS[col.key as string] || 100,
      })),
    [taiKhoanOptions, quyChaunList, hoSoChungTuList, handleRefresh]
  );

  // Ẩn/hiện cột. Tiêu đề cột có thể là chuỗi hoặc node <TermText> → lấy nhãn tương ứng.
  const labelOf = useCallback(
    (col: ColumnType<NhatKyChung>): string | null => {
      const title = col.title as unknown;
      if (typeof title === "string") return title.trim() || null;
      if (isValidElement(title) && title.type === TermText) {
        const props = title.props as { tk: string; surface?: string };
        return t(props.tk, props.surface);
      }
      return null; // cột thao tác / không nhãn → luôn hiển thị
    },
    [t]
  );

  const { columns: visibleColumns, chooserButton } = useColumnVisibility(
    "nkc.entryList",
    columns,
    labelOf,
    {
      // Width resize lưu theo CHỈ SỐ cột → ẩn/hiện làm lệch. Xoá để cột về width mặc định.
      onChange: () => {
        try {
          localStorage.removeItem("table-col-widths-nkc-v2");
        } catch {
          /* ignore */
        }
      },
    }
  );

  const handleCreateEntry = () => {
    navigate("/chung-tu/nhat-ky-chung/tao-moi");
  };

  // Row class name for highlighting editing row
  const getRowClassName = (record: NhatKyChung) => {
    if (editingRowId === record.id) {
      return "editing-row";
    }
    return "";
  };

  return (
    <div className="excel-tab-content">
      {/* Toolbar */}
      <div className="excel-toolbar">
        <Space size="small">
          {canCreate && (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleCreateEntry}
            >
              Thêm mới
            </Button>
          )}
          {canDelete && selectedEntryIds.length > 0 && (
            <Popconfirm
              title={`Xóa ${selectedEntryIds.length} bút toán đã chọn?`}
              description="Bút toán đã duyệt sẽ được bỏ qua."
              okText="Xóa"
              okButtonProps={{ danger: true }}
              cancelText="Hủy"
              onConfirm={() =>
                handler.executeEvent("deleteBatch", { ids: selectedEntryIds })
              }
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                loading={deletingBatch}
              >
                Xóa đã chọn ({selectedEntryIds.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Space size="small">
          {canCreate && (
            <Button
              size="small"
              icon={<FileExcelOutlined />}
              onClick={() => setImportOpen(true)}
            >
              Import Excel
            </Button>
          )}
          <Button
            size="small"
            icon={<FileExcelOutlined />}
            loading={exportingExcel}
            onClick={() => handler.executeEvent("exportExcel", {})}
          >
            Xuất Excel
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          />
          {chooserButton}
          <TableTitleSettings terms={NKC_TITLE_TERMS} />
          <FilterDrawer />
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={visibleColumns}
        dataSource={data || []}
        rowKey="id"
        rowSelection={rowSelection}
        loading={loading}
        className="excel-table resizable-table"
        rowClassName={getRowClassName}
        pagination={{
          current: pagination?.page || 1,
          pageSize: 100,
          total: pagination?.total || 0,
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
          size: "small",
        }}
        onChange={handleTableChange}
        size="small"
        bordered
        scroll={{
          x: visibleColumns.reduce(
            (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
            0
          ) || TOTAL_WIDTH,
          y: "calc(100vh - 250px)",
        }}
      />
      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() =>
          handler.executeEvent("loadPage", {
            page: pagination?.page || 1,
            limit: pagination?.limit || 100,
          })
        }
      />
    </div>
  );
}
