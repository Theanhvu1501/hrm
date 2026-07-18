import type { ReactNode } from "react";
import { Select, DatePicker, Button } from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { FilterBar as SharedFilterBar } from "@/components/common/FilterBar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePhieuState, usePhieuHandler } from "../../PhieuHandlerContext";

const { RangePicker } = DatePicker;

export function FilterBar({ settingsButton }: { settingsButton?: ReactNode }) {
  const handler = usePhieuHandler();
  const isAdmin = useIsAdmin();

  const [searchText] = usePhieuState("searchText", "");
  const [dateRange] = usePhieuState("dateRange", null);
  const [filterDoiTuong] = usePhieuState("filterDoiTuong", undefined);
  const [filterDuAn] = usePhieuState("filterDuAn", undefined);
  const [filterBoPhan] = usePhieuState("filterBoPhan", undefined);
  const [filterTaiKhoanNo] = usePhieuState("filterTaiKhoanNo", undefined);
  const [filterTaiKhoanCo] = usePhieuState("filterTaiKhoanCo", undefined);

  const [doiTuongList] = usePhieuState("doiTuongList", []);
  const [duAnList] = usePhieuState("duAnList", []);
  const [boPhanList] = usePhieuState("boPhanList", []);
  const [taiKhoanList] = usePhieuState("taiKhoanList", []);

  const [, setFormModalOpen] = usePhieuState("formModalOpen", false);
  const [, setEditingPhieu] = usePhieuState("editingPhieu", null);
  const [, setImportModalOpen] = usePhieuState("importModalOpen", false);
  const [, setTemplateModalOpen] = usePhieuState("templateModalOpen", false);

  const setFilter = (key: string, value: unknown) =>
    handler.executeEvent("setFilter", { key, value });
  const apply = () => handler.executeEvent("applyFilters", {});

  const handleSelect = (key: string, value: string | undefined) => {
    setFilter(key, value);
    apply();
  };

  const tkOptions = taiKhoanList.map((tk) => ({
    value: tk.ma,
    label: `${tk.ma} - ${tk.ten}`,
  }));

  return (
    <SharedFilterBar
      search={{
        value: searchText ?? "",
        onChange: (v) => setFilter("searchText", v),
        onSearch: apply,
        placeholder: "Tìm kiếm số phiếu, nội dung...",
      }}
      onReset={() => handler.executeEvent("resetFilters", {})}
      filters={
        <>
          <RangePicker
            format="DD/MM/YYYY"
            value={(dateRange as [Dayjs, Dayjs] | null) ?? null}
            onChange={(v) => {
              setFilter("dateRange", v && v[0] && v[1] ? v : null);
              apply();
            }}
          />
          <Select
            placeholder="Đối tượng"
            style={{ width: 170 }}
            allowClear
            value={filterDoiTuong}
            onChange={(v) => handleSelect("filterDoiTuong", v)}
            options={doiTuongList.map((dt) => ({ value: dt.ma, label: dt.ten }))}
          />
          <Select
            placeholder="Dự án"
            style={{ width: 170 }}
            allowClear
            value={filterDuAn}
            onChange={(v) => handleSelect("filterDuAn", v)}
            options={duAnList.map((da) => ({ value: da.ma, label: da.ten }))}
          />
          <Select
            placeholder="Bộ phận"
            style={{ width: 170 }}
            allowClear
            value={filterBoPhan}
            onChange={(v) => handleSelect("filterBoPhan", v)}
            options={boPhanList.map((bp) => ({ value: bp.ma, label: bp.ten }))}
          />
          <Select
            placeholder="TK Nợ"
            style={{ width: 160 }}
            allowClear
            showSearch
            optionFilterProp="label"
            value={filterTaiKhoanNo}
            onChange={(v) => handleSelect("filterTaiKhoanNo", v)}
            options={tkOptions}
          />
          <Select
            placeholder="TK Có"
            style={{ width: 160 }}
            allowClear
            showSearch
            optionFilterProp="label"
            value={filterTaiKhoanCo}
            onChange={(v) => handleSelect("filterTaiKhoanCo", v)}
            options={tkOptions}
          />
        </>
      }
      actions={
        <>
          {settingsButton}
          {isAdmin && (
            <Button
              icon={<FileTextOutlined />}
              onClick={() => setTemplateModalOpen(true)}
            >
              Mẫu in
            </Button>
          )}
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportModalOpen(true)}
          >
            Import Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingPhieu(null);
              setFormModalOpen(true);
            }}
          >
            Thêm phiếu
          </Button>
        </>
      }
    />
  );
}
