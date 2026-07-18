import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { Table, Select, InputNumber, Input, Button, Tooltip, Popconfirm, Pagination } from "antd";
import { PlusOutlined, DeleteOutlined, CopyOutlined } from "@ant-design/icons";
import {
  useNhatKyChungFormState,
  useNhatKyChungFormHandler,
} from "../../NhatKyChungFormHandlerContext";
import {
  ChungTuChiTiet,
  TaiKhoanItem,
  ChungTuHeader,
  KhoanMucItem,
} from "../../form-handler/sub-handler/init/init.state";
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien, QuyChuan, NhomKhuyenMai, NhomQuanLy, KhoanMuc, HopDong, TaiKhoanNganHang } from "@/types";
import {
  buildDoiTuongSnapshot,
  buildNganHangSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildDoiSnapshot,
  buildNhanVienSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
  buildKhoanMucSnapshot,
  buildNhomKhuyenMaiSnapshot,
  buildNhomQuanLySnapshot,
  buildHopDongSnapshot,
} from "@/utils/snapshotBuilder";
import { useTableColumnResize } from "@/hooks/useTableColumnResize";
import { getDoiTuongSelectConfig, getSelectedDoiTuongLoai } from "../../doiTuongConfig";
import { SelectWithQuickAdd } from "../../quick-add/SelectWithQuickAdd";
import { QuickAddDoiTuongModal } from "../../quick-add/QuickAddDoiTuongModal";
import { QuickAddSanPhamModal } from "../../quick-add/QuickAddSanPhamModal";
import { toast } from "sonner";

export function ChiTietTable() {
  const handler = useNhatKyChungFormHandler();
  const [chiTietList] = useNhatKyChungFormState("chiTietList", []);
  const [taiKhoanList] = useNhatKyChungFormState("taiKhoanList", []);
  const [doiTuongList] = useNhatKyChungFormState("doiTuongList", []);
  const [nganHangList] = useNhatKyChungFormState("nganHangList", []);
  const [duAnList] = useNhatKyChungFormState("duAnList", []);
  const [boPhanList] = useNhatKyChungFormState("boPhanList", []);
  const [sanPhamList] = useNhatKyChungFormState("sanPhamList", []);
  const [dongTienList] = useNhatKyChungFormState("dongTienList", []);
  const [khoanMucList] = useNhatKyChungFormState("khoanMucList", []);
  const [nhomKhuyenMaiList] = useNhatKyChungFormState("nhomKhuyenMaiList", []);
  const [nhomQuanLyList] = useNhatKyChungFormState("nhomQuanLyList", []);
  const [hopDongList] = useNhatKyChungFormState("hopDongList", []);
  const [quyChaunList] = useNhatKyChungFormState("quyChaunList", []);
  const [header] = useNhatKyChungFormState("header", null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Quick-add modal state
  type QuickAddState =
    | { type: "doiTuong"; key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[] }
    | { type: "sanPham"; key: string }
    | null;
  const [quickAdd, setQuickAdd] = useState<QuickAddState>(null);

  const taiKhoanSelectOptions = (taiKhoanList as TaiKhoanItem[]).map((tk) => ({
    value: tk.ma,
    label: `${tk.ma} - ${tk.ten}`,
  }));

  // Lọc nghiệp vụ theo loại giao dịch từ header
  const typedHeader = header as ChungTuHeader | null;
  const nghiepVuOptions = (quyChaunList as QuyChuan[])
    .filter((qc) => !typedHeader?.loaiGiaoDich || qc.loaiGiaoDich === typedHeader.loaiGiaoDich)
    .map((qc) => ({
      value: qc.nghiepVu,
      label: qc.nghiepVu,
    }));

  // Tính toán data cho trang hiện tại
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return (chiTietList as ChungTuChiTiet[]).slice(startIndex, endIndex);
  }, [chiTietList, currentPage, pageSize]);

  // Tính toán trang cuối khi thêm mới
  const totalItems = (chiTietList as ChungTuChiTiet[]).length;
  const lastPage = useMemo(() => Math.ceil(totalItems / pageSize) || 1, [totalItems, pageSize]);

  // Auto jump to last page when adding new item
  const prevTotalRef = useRef(totalItems);
  useEffect(() => {
    if (totalItems > prevTotalRef.current) {
      // Item was added, jump to last page
      setCurrentPage(lastPage);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems, lastPage]);

  // Enable column resize
  useTableColumnResize("chi-tiet-excel-table");

  // Track active row for keyboard navigation
  const tableRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<number>(0);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+N or Alt+N: Add new row
    if ((e.ctrlKey || e.altKey) && e.key === "n") {
      e.preventDefault();
      handler.executeEvent("addChiTiet", {});
    }
    // Ctrl+D: Duplicate current row
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      const list = chiTietList as ChungTuChiTiet[];
      if (list.length > 0 && activeRowRef.current < list.length) {
        handler.executeEvent("duplicateChiTiet", { key: list[activeRowRef.current].key });
      }
    }
  }, [handler, chiTietList]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleUpdateField = (
    key: string,
    field: keyof ChungTuChiTiet,
    value: unknown
  ) => {
    handler.executeEvent("updateChiTiet", { key, field, value });
  };

  const handleDoiTuongChange = (key: string, doiTuongId: string | undefined) => {
    handleUpdateField(key, "doiTuongId", doiTuongId);
    if (!doiTuongId) {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "doiTuongSnapshot",
        snapshot: {},
      });
      return;
    }
    // Đối tượng thường hoặc ngân hàng/quỹ (TK chiTietTheo = NGAN_HANG_QUY)
    const doiTuong = (doiTuongList as DoiTuong[]).find((d) => d.id === doiTuongId);
    const nganHang = (nganHangList as TaiKhoanNganHang[]).find((nh) => nh.id === doiTuongId);
    const snapshot = doiTuong
      ? buildDoiTuongSnapshot(doiTuong)
      : nganHang
        ? buildNganHangSnapshot(nganHang)
        : undefined;
    if (snapshot) {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "doiTuongSnapshot",
        snapshot,
      });
    }
  };

  const handleDuAnChange = (key: string, duAnId: string | undefined) => {
    handleUpdateField(key, "duAnId", duAnId);
    if (duAnId) {
      const duAn = (duAnList as DuAn[]).find((d) => d.id === duAnId);
      if (duAn) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "duAnSnapshot",
          snapshot: buildDuAnSnapshot(duAn),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "duAnSnapshot",
        snapshot: {},
      });
    }
  };

  const handleBoPhanChange = (key: string, boPhanId: string | undefined) => {
    handleUpdateField(key, "boPhanId", boPhanId);
    if (boPhanId) {
      const boPhan = (boPhanList as BoPhan[]).find((b) => b.id === boPhanId);
      if (boPhan) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "boPhanSnapshot",
          snapshot: buildBoPhanSnapshot(boPhan),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "boPhanSnapshot",
        snapshot: {},
      });
    }
  };

  const handleSanPhamChange = (key: string, sanPhamId: string | undefined) => {
    handleUpdateField(key, "sanPhamId", sanPhamId);
    if (sanPhamId) {
      const sanPham = (sanPhamList as SanPham[]).find((s) => s.id === sanPhamId);
      if (sanPham) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "sanPhamSnapshot",
          snapshot: buildSanPhamSnapshot(sanPham),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "sanPhamSnapshot",
        snapshot: {},
      });
    }
  };

  const handleDongTienChange = (key: string, dongTienId: string | undefined) => {
    handleUpdateField(key, "dongTienId", dongTienId);
    if (dongTienId) {
      const dongTien = (dongTienList as DongTien[]).find((d) => d.id === dongTienId);
      if (dongTien) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "dongTienSnapshot",
          snapshot: buildDongTienSnapshot(dongTien),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "dongTienSnapshot",
        snapshot: {},
      });
    }
  };

  const handleDoiTuong2Change = (key: string, doiTuong2Id: string | undefined) => {
    handleUpdateField(key, "doiTuong2Id", doiTuong2Id);
    if (!doiTuong2Id) {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "doiTuong2Snapshot",
        snapshot: {},
      });
      return;
    }
    // Đối tượng thường hoặc ngân hàng/quỹ (TK chiTietTheo = NGAN_HANG_QUY)
    const doiTuong = (doiTuongList as DoiTuong[]).find((d) => d.id === doiTuong2Id);
    const nganHang = (nganHangList as TaiKhoanNganHang[]).find((nh) => nh.id === doiTuong2Id);
    const snapshot = doiTuong
      ? buildDoiTuongSnapshot(doiTuong)
      : nganHang
        ? buildNganHangSnapshot(nganHang)
        : undefined;
    if (snapshot) {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "doiTuong2Snapshot",
        snapshot,
      });
    }
  };

  // Đổi TK → nếu đối tượng đang chọn không khớp chiTietTheo mới thì clear
  const handleTaiKhoanChange = (
    record: ChungTuChiTiet,
    field: "taiKhoanNo" | "taiKhoanCo",
    ma: string | undefined
  ) => {
    handleUpdateField(record.key, field, ma || "");
    const doiTuongField = field === "taiKhoanNo" ? "doiTuongId" : "doiTuong2Id";
    const snapshotField = field === "taiKhoanNo" ? "doiTuongSnapshot" : "doiTuong2Snapshot";
    const currentId = field === "taiKhoanNo" ? record.doiTuongId : record.doiTuong2Id;
    if (!currentId) return;
    const tk = (taiKhoanList as TaiKhoanItem[]).find((t) => t.ma === ma);
    const currentLoai = getSelectedDoiTuongLoai(
      currentId,
      doiTuongList as DoiTuong[],
      nganHangList as TaiKhoanNganHang[]
    );
    // Đối tượng đa loại: chỉ xoá khi KHÔNG khớp loại mà TK mới yêu cầu
    if (!tk?.chiTietTheo || !currentLoai?.includes(tk.chiTietTheo)) {
      handleUpdateField(record.key, doiTuongField, undefined);
      handler.executeEvent("updateChiTietSnapshot", {
        key: record.key,
        snapshotField,
        snapshot: {},
      });
    }
  };

  const handleDoiChange = (key: string, doiId: string | undefined) => {
    handleUpdateField(key, "doiId", doiId);
    if (doiId) {
      const doi = (boPhanList as BoPhan[]).find((bp) => bp.id === doiId);
      if (doi) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "doiSnapshot",
          snapshot: buildDoiSnapshot(doi),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "doiSnapshot",
        snapshot: {},
      });
    }
  };

  const handleNhanVienChange = (key: string, nhanVienId: string | undefined) => {
    handleUpdateField(key, "nhanVienId", nhanVienId);
    if (nhanVienId) {
      const nhanVien = (doiTuongList as DoiTuong[]).find((d) => d.id === nhanVienId);
      if (nhanVien) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "nhanVienSnapshot",
          snapshot: buildNhanVienSnapshot(nhanVien),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "nhanVienSnapshot",
        snapshot: {},
      });
    }
  };

  const handleKhoanMucChange = (key: string, khoanMucId: string | undefined) => {
    handleUpdateField(key, "khoanMucId", khoanMucId);
    if (khoanMucId) {
      const khoanMuc = (khoanMucList as KhoanMucItem[]).find((km) => km.id === khoanMucId);
      if (khoanMuc) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "khoanMucSnapshot",
          snapshot: buildKhoanMucSnapshot(khoanMuc as KhoanMuc),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "khoanMucSnapshot",
        snapshot: {},
      });
    }
  };

  const handleNhomKhuyenMaiChange = (key: string, nhomKhuyenMaiId: string | undefined) => {
    handleUpdateField(key, "nhomKhuyenMaiId", nhomKhuyenMaiId);
    if (nhomKhuyenMaiId) {
      const nhomKhuyenMai = (nhomKhuyenMaiList as NhomKhuyenMai[]).find((nkm) => nkm.id === nhomKhuyenMaiId);
      if (nhomKhuyenMai) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "nhomKhuyenMaiSnapshot",
          snapshot: buildNhomKhuyenMaiSnapshot(nhomKhuyenMai),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "nhomKhuyenMaiSnapshot",
        snapshot: {},
      });
    }
  };

  const handleNhomQuanLyChange = (key: string, nhomQuanLyId: string | undefined) => {
    handleUpdateField(key, "nhomQuanLyId", nhomQuanLyId);
    if (nhomQuanLyId) {
      const nhomQuanLy = (nhomQuanLyList as NhomQuanLy[]).find((nql) => nql.id === nhomQuanLyId);
      if (nhomQuanLy) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "nhomQuanLySnapshot",
          snapshot: buildNhomQuanLySnapshot(nhomQuanLy),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "nhomQuanLySnapshot",
        snapshot: {},
      });
    }
  };

  const handleHopDongChange = (key: string, hopDongId: string | undefined) => {
    handleUpdateField(key, "hopDongId", hopDongId);
    if (hopDongId) {
      const hopDong = (hopDongList as HopDong[]).find((hd) => hd.id === hopDongId);
      if (hopDong) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "hopDongSnapshot",
          snapshot: buildHopDongSnapshot(hopDong),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "hopDongSnapshot",
        snapshot: {},
      });
    }
  };

  const columns = [
    {
      title: "STT",
      width: 45,
      align: "center" as const,
      fixed: "left" as const,
      className: "excel-stt-cell",
      render: (_: unknown, __: unknown, index: number) => (
        <span className="font-medium text-gray-500">{index + 1}</span>
      ),
    },
    {
      title: (
        <span>
          Nghiệp vụ <span className="text-red-500">*</span>
        </span>
      ),
      dataIndex: "nghiepVu",
      width: 180,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          placeholder="Chọn nghiệp vụ"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handler.executeEvent("handleNghiepVuChange", { key: record.key, nghiepVu: v })}
          onFocus={() => { activeRowRef.current = index; }}
          options={nghiepVuOptions}
          className="w-full excel-cell-input"
          variant="borderless"
          status={!value ? "error" : ""}
          popupMatchSelectWidth={280}
          disabled={!typedHeader?.loaiGiaoDich}
        />
      ),
    },
    {
      title: "Diễn giải",
      dataIndex: "noiDung",
      width: 180,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Input.TextArea
          size="small"
          placeholder="Nhập diễn giải"
          value={value || ""}
          onChange={(e) => handleUpdateField(record.key, "noiDung", e.target.value)}
          onFocus={() => { activeRowRef.current = index; }}
          className="excel-cell-input"
          variant="borderless"
          autoSize={{ minRows: 1, maxRows: 3 }}
        />
      ),
    },
    {
      title: "Sản phẩm",
      dataIndex: "sanPhamId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <SelectWithQuickAdd
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleSanPhamChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(sanPhamList as SanPham[]).map((sp) => ({
            value: sp.id,
            label: `${sp.ma} - ${sp.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
          quickAddLabel="sản phẩm"
          onQuickAdd={() => setQuickAdd({ type: "sanPham", key: record.key })}
        />
      ),
    },
    {
      title: (
        <span>
          TK Nợ <span className="text-red-500">*</span>
        </span>
      ),
      dataIndex: "taiKhoanNo",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          placeholder="Chọn TK"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleTaiKhoanChange(record, "taiKhoanNo", v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={taiKhoanSelectOptions}
          className="w-full excel-cell-input"
          variant="borderless"
          status={!value ? "error" : ""}
          popupMatchSelectWidth={280}
        />
      ),
    },
    {
      title: (
        <span>
          TK Có <span className="text-red-500">*</span>
        </span>
      ),
      dataIndex: "taiKhoanCo",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          placeholder="Chọn TK"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleTaiKhoanChange(record, "taiKhoanCo", v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={taiKhoanSelectOptions}
          className="w-full excel-cell-input"
          variant="borderless"
          status={!value ? "error" : ""}
          popupMatchSelectWidth={280}
        />
      ),
    },
    {
      title: (
        <span>
          Số tiền <span className="text-red-500">*</span>
        </span>
      ),
      dataIndex: "soTien",
      width: 130,
      render: (value: number, record: ChungTuChiTiet, index: number) => (
        <InputNumber
          size="small"
          min={0}
          className="w-full excel-cell-input"
          value={value}
          onChange={(v) => handleUpdateField(record.key, "soTien", v || 0)}
          onFocus={() => { activeRowRef.current = index; }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(v) => (v ? Number(v.replace(/\$\s?|(,*)/g, "")) : 0) as 0}
          variant="borderless"
          status={!value || value <= 0 ? "error" : ""}
        />
      ),
    },
    {
      title: "Đối tượng nợ",
      dataIndex: "doiTuongId",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => {
        const tkNo = (taiKhoanList as TaiKhoanItem[]).find((t) => t.ma === record.taiKhoanNo);
        const cfg = getDoiTuongSelectConfig(
          tkNo?.chiTietTheo,
          doiTuongList as DoiTuong[],
          nganHangList as TaiKhoanNganHang[]
        );
        return (
          <SelectWithQuickAdd
            size="small"
            showSearch
            allowClear
            placeholder={cfg.disabled ? "—" : "Chọn"}
            optionFilterProp="label"
            value={value || undefined}
            onChange={(v) => handleDoiTuongChange(record.key, v)}
            onFocus={() => { activeRowRef.current = index; }}
            options={cfg.options}
            disabled={cfg.disabled}
            className="w-full excel-cell-input"
            variant="borderless"
            popupMatchSelectWidth={280}
            quickAddLabel="đối tượng"
            quickAddDisabled={cfg.disabled || tkNo?.chiTietTheo === "NGAN_HANG_QUY" || !tkNo?.chiTietTheo}
            onQuickAdd={() => setQuickAdd({ type: "doiTuong", key: record.key, field: "doiTuongId", loai: tkNo?.chiTietTheo ? [tkNo.chiTietTheo] : [] })}
          />
        );
      },
    },
    {
      title: "Đối tượng có",
      dataIndex: "doiTuong2Id",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => {
        const tkCo = (taiKhoanList as TaiKhoanItem[]).find((t) => t.ma === record.taiKhoanCo);
        const cfg = getDoiTuongSelectConfig(
          tkCo?.chiTietTheo,
          doiTuongList as DoiTuong[],
          nganHangList as TaiKhoanNganHang[]
        );
        return (
          <SelectWithQuickAdd
            size="small"
            showSearch
            allowClear
            placeholder={cfg.disabled ? "—" : "Chọn"}
            optionFilterProp="label"
            value={value || undefined}
            onChange={(v) => handleDoiTuong2Change(record.key, v)}
            onFocus={() => { activeRowRef.current = index; }}
            options={cfg.options}
            disabled={cfg.disabled}
            className="w-full excel-cell-input"
            variant="borderless"
            popupMatchSelectWidth={280}
            quickAddLabel="đối tượng"
            quickAddDisabled={cfg.disabled || tkCo?.chiTietTheo === "NGAN_HANG_QUY" || !tkCo?.chiTietTheo}
            onQuickAdd={() => setQuickAdd({ type: "doiTuong", key: record.key, field: "doiTuong2Id", loai: tkCo?.chiTietTheo ? [tkCo.chiTietTheo] : [] })}
          />
        );
      },
    },
    {
      title: "Dự án",
      dataIndex: "duAnId",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleDuAnChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(duAnList as DuAn[]).map((da) => ({
            value: da.id,
            label: `${da.ma} - ${da.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={280}
        />
      ),
    },
    {
      title: "Bộ phận",
      dataIndex: "boPhanId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleBoPhanChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(boPhanList as BoPhan[])
            .filter((bp) => !bp.ten.toLowerCase().includes("đội"))
            .map((bp) => ({
              value: bp.id,
              label: `${bp.ma} - ${bp.ten}`,
            }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Đội thi công",
      dataIndex: "doiId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleDoiChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(boPhanList as BoPhan[])
            .filter((bp) => bp.ten.toLowerCase().includes("đội"))
            .map((bp) => ({
              value: bp.id,
              label: `${bp.ma} - ${bp.ten}`,
            }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Nhân viên",
      dataIndex: "nhanVienId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleNhanVienChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(doiTuongList as DoiTuong[])
            .filter((d) => d.loai.includes("NHAN_VIEN"))
            .map((nv) => ({
              value: nv.id,
              label: `${nv.ma} - ${nv.ten}`,
            }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Dòng tiền",
      dataIndex: "dongTienId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleDongTienChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(dongTienList as DongTien[]).map((dt) => ({
            value: dt.id,
            label: `${dt.ma} - ${dt.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Khoản mục",
      dataIndex: "khoanMucId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleKhoanMucChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(khoanMucList as KhoanMucItem[]).map((km) => ({
            value: km.id,
            label: `${km.ma} - ${km.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Nhóm KM",
      dataIndex: "nhomKhuyenMaiId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleNhomKhuyenMaiChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(nhomKhuyenMaiList as NhomKhuyenMai[]).map((nkm) => ({
            value: nkm.id,
            label: `${nkm.ma} - ${nkm.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Nhóm QL",
      dataIndex: "nhomQuanLyId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleNhomQuanLyChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(nhomQuanLyList as NhomQuanLy[]).map((nql) => ({
            value: nql.id,
            label: `${nql.ma} - ${nql.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Hợp đồng",
      dataIndex: "hopDongId",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleHopDongChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(hopDongList as HopDong[]).map((hd) => ({
            value: hd.id,
            label: `${hd.soHopDong} - ${hd.tenCongTrinh}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={300}
        />
      ),
    },
    {
      title: "Số TK",
      dataIndex: "soTaiKhoan",
      width: 120,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Input
          size="small"
          placeholder="Số tài khoản"
          value={value || ""}
          onChange={(e) => handleUpdateField(record.key, "soTaiKhoan", e.target.value)}
          onFocus={() => { activeRowRef.current = index; }}
          className="excel-cell-input"
          variant="borderless"
        />
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "ghiChu",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Input
          size="small"
          placeholder="Ghi chú"
          value={value || ""}
          onChange={(e) => handleUpdateField(record.key, "ghiChu", e.target.value)}
          onFocus={() => { activeRowRef.current = index; }}
          className="excel-cell-input"
          variant="borderless"
        />
      ),
    },
    {
      title: "",
      width: 70,
      align: "center" as const,
      fixed: "right" as const,
      className: "excel-action-cell",
      render: (_: unknown, record: ChungTuChiTiet) => (
        <div className="flex gap-0.5 justify-center">
          <Tooltip title="Nhân bản (Ctrl+D)">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handler.executeEvent("duplicateChiTiet", { key: record.key })}
              className="!px-1.5"
            />
          </Tooltip>
          <Popconfirm
            title="Xóa dòng này?"
            onConfirm={() => handler.executeEvent("removeChiTiet", { key: record.key })}
            okText="Xóa"
            cancelText="Hủy"
            disabled={(chiTietList as ChungTuChiTiet[]).length <= 1}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={(chiTietList as ChungTuChiTiet[]).length <= 1}
              className="!px-1.5"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const total = (chiTietList as ChungTuChiTiet[]).reduce(
    (sum, item) => sum + (item.soTien || 0),
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  return (
    <div ref={tableRef} className="excel-editable-table">
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey="key"
        pagination={false}
        size="small"
        scroll={{ x: 2400, y: 'calc(100vh - 380px)' }}
        bordered
        className="resizable-table chi-tiet-excel-table"
        rowClassName={(_, index) =>
          index === activeRowRef.current ? "excel-row-active" : ""
        }
      />

      {/* Footer with pagination, add button and total */}
      <div className="nkc-table-footer">
        <div className="nkc-footer-left">
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handler.executeEvent("addChiTiet", {})}
          >
            Thêm dòng
          </Button>
          <span className="text-gray-500 text-xs ml-2">Ctrl+N</span>
        </div>

        <div className="nkc-footer-center">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={totalItems}
            showSizeChanger
            pageSizeOptions={['25', '50', '100', '200']}
            size="small"
            showTotal={(total, range) => `${range[0]}-${range[1]}/${total}`}
            onChange={(page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
                const newLastPage = Math.ceil(totalItems / size) || 1;
                if (page > newLastPage) {
                  setCurrentPage(newLastPage);
                }
              }
            }}
          />
        </div>

        <div className="nkc-footer-right">
          <span className="text-gray-500 text-xs mr-2">Tổng:</span>
          <span className="text-sm font-bold text-green-600">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {quickAdd?.type === "doiTuong" && (
        <QuickAddDoiTuongModal
          open
          onClose={() => setQuickAdd(null)}
          defaultLoai={quickAdd.loai}
          onSubmit={async (v) => {
            const r = await handler.executeEvent("quickCreateDoiTuong", {
              key: quickAdd.key,
              field: quickAdd.field,
              ...v,
            });
            if (r?.ok) { toast.success("Đã thêm đối tượng"); return true; }
            toast.error("Thêm đối tượng thất bại"); return false;
          }}
        />
      )}
      {quickAdd?.type === "sanPham" && (
        <QuickAddSanPhamModal
          open
          onClose={() => setQuickAdd(null)}
          onSubmit={async (v) => {
            const r = await handler.executeEvent("quickCreateSanPham", {
              key: quickAdd.key,
              ...v,
            });
            if (r?.ok) { toast.success("Đã thêm sản phẩm"); return true; }
            toast.error("Thêm sản phẩm thất bại"); return false;
          }}
        />
      )}
    </div>
  );
}
