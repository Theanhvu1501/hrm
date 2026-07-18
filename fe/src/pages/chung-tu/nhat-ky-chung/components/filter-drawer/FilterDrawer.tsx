import { useState } from "react";
import {
  Drawer,
  Input,
  DatePicker,
  Select,
  Button,
  Badge,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  FilterOutlined,
  SearchOutlined,
  ClearOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export function FilterDrawer() {
  const [open, setOpen] = useState(false);
  const handler = useNhatKyChungHandler();

  // Filter states
  const [searchText, setSearchText] = useNhatKyChungState("searchText", "");
  const [dateRange, setDateRange] = useNhatKyChungState("dateRange", null);
  const [filterAccount, setFilterAccount] = useNhatKyChungState(
    "filterAccount",
    undefined
  );
  const [filterLoaiChungTu, setFilterLoaiChungTu] = useNhatKyChungState(
    "filterLoaiChungTu",
    undefined
  );
  const [filterDoiTuong, setFilterDoiTuong] = useNhatKyChungState(
    "filterDoiTuong",
    undefined
  );
  const [filterDuAn, setFilterDuAn] = useNhatKyChungState(
    "filterDuAn",
    undefined
  );
  const [filterBoPhan, setFilterBoPhan] = useNhatKyChungState(
    "filterBoPhan",
    undefined
  );
  const [filterTaiKhoanCo, setFilterTaiKhoanCo] = useNhatKyChungState(
    "filterTaiKhoanCo",
    undefined
  );

  // Data lists for selects
  const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);
  const [doiTuongList] = useNhatKyChungState("doiTuongList", []);
  const [duAnList] = useNhatKyChungState("duAnList", []);
  const [boPhanList] = useNhatKyChungState("boPhanList", []);
  const [loaiGiaoDichList] = useNhatKyChungState("loaiGiaoDichList", []);

  // Count active filters
  const activeFilterCount = [
    searchText,
    dateRange,
    filterAccount,
    filterLoaiChungTu,
    filterDoiTuong,
    filterDuAn,
    filterBoPhan,
    filterTaiKhoanCo,
  ].filter(Boolean).length;

  const handleApply = () => {
    handler.executeEvent("applyDrawerFilters", {
      searchText,
      dateRange,
      filterAccount,
      filterLoaiChungTu,
      filterDoiTuong,
      filterDuAn,
      filterBoPhan,
      filterTaiKhoanCo,
    });
    setOpen(false);
  };

  const handleReset = () => {
    setSearchText("");
    setDateRange(null);
    setFilterAccount(undefined);
    setFilterLoaiChungTu(undefined);
    setFilterDoiTuong(undefined);
    setFilterDuAn(undefined);
    setFilterBoPhan(undefined);
    setFilterTaiKhoanCo(undefined);
    handler.executeEvent("resetFilters", {});
  };

  const selectProps = {
    size: "small" as const,
    allowClear: true,
    showSearch: true,
    optionFilterProp: "label" as const,
    style: { width: "100%" },
  };

  return (
    <>
      {/* Filter Button - Compact */}
      <Tooltip title={activeFilterCount > 0 ? `${activeFilterCount} bộ lọc đang áp dụng` : "Bộ lọc"}>
        <Badge count={activeFilterCount} size="small" offset={[-4, 4]}>
          <Button
            size="small"
            icon={<FilterOutlined />}
            onClick={() => setOpen(true)}
            type={activeFilterCount > 0 ? "primary" : "default"}
            ghost={activeFilterCount > 0}
          />
        </Badge>
      </Tooltip>

      {/* Filter Drawer - Compact */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                {activeFilterCount} đang chọn
              </span>
            )}
          </div>
        }
        placement="right"
        width={320}
        onClose={() => setOpen(false)}
        open={open}
        closeIcon={<CloseOutlined className="text-gray-400" />}
        styles={{
          header: { padding: "12px 16px", borderBottom: "1px solid #f0f0f0" },
          body: { padding: "12px 16px" },
          footer: { padding: "8px 16px", borderTop: "1px solid #f0f0f0" },
        }}
        footer={
          <div className="flex justify-between">
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={handleReset}
              disabled={activeFilterCount === 0}
            >
              Xóa lọc
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<SearchOutlined />}
              onClick={handleApply}
            >
              Áp dụng
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Search Text */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tìm kiếm</label>
            <Input
              size="small"
              placeholder="Nhập từ khóa..."
              prefix={<SearchOutlined className="text-gray-300" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleApply}
              allowClear
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
            <RangePicker
              size="small"
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={(dates) =>
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
              }
              placeholder={["Từ ngày", "Đến ngày"]}
              style={{ width: "100%" }}
            />
          </div>

          {/* Loại giao dịch */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Loại giao dịch</label>
            <Select
              {...selectProps}
              placeholder="Tất cả"
              value={filterLoaiChungTu}
              onChange={setFilterLoaiChungTu}
              options={
                loaiGiaoDichList?.map((lgd: { ma: string; ten: string }) => ({
                  value: lgd.ma,
                  label: lgd.ten,
                })) || []
              }
            />
          </div>

          {/* Row: Tài khoản Nợ & Có */}
          <Row gutter={8}>
            <Col span={12}>
              <label className="text-xs text-gray-500 mb-1 block">TK Nợ</label>
              <Select
                {...selectProps}
                placeholder="Chọn"
                value={filterAccount}
                onChange={(value) => setFilterAccount(value)}
                options={
                  taiKhoanList?.map((tk: { ma: string; ten: string }) => ({
                    value: tk.ma,
                    label: tk.ma,
                  })) || []
                }
              />
            </Col>
            <Col span={12}>
              <label className="text-xs text-gray-500 mb-1 block">TK Có</label>
              <Select
                {...selectProps}
                placeholder="Chọn"
                value={filterTaiKhoanCo}
                onChange={(value) => setFilterTaiKhoanCo(value)}
                options={
                  taiKhoanList?.map((tk: { ma: string; ten: string }) => ({
                    value: tk.ma,
                    label: tk.ma,
                  })) || []
                }
              />
            </Col>
          </Row>

          {/* Đối tượng */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Đối tượng</label>
            <Select
              {...selectProps}
              placeholder="Chọn đối tượng"
              value={filterDoiTuong}
              onChange={setFilterDoiTuong}
              options={
                doiTuongList?.map((dt: { ma: string; ten: string }) => ({
                  value: dt.ma,
                  label: `${dt.ma} - ${dt.ten}`,
                })) || []
              }
            />
          </div>

          {/* Row: Dự án & Bộ phận */}
          <Row gutter={8}>
            <Col span={12}>
              <label className="text-xs text-gray-500 mb-1 block">Dự án</label>
              <Select
                {...selectProps}
                placeholder="Chọn"
                value={filterDuAn}
                onChange={setFilterDuAn}
                options={
                  duAnList?.map((da: { ma: string; ten: string }) => ({
                    value: da.ma,
                    label: da.ma,
                  })) || []
                }
              />
            </Col>
            <Col span={12}>
              <label className="text-xs text-gray-500 mb-1 block">Bộ phận</label>
              <Select
                {...selectProps}
                placeholder="Chọn"
                value={filterBoPhan}
                onChange={setFilterBoPhan}
                options={
                  boPhanList?.map((bp: { ma: string; ten: string }) => ({
                    value: bp.ma,
                    label: bp.ma,
                  })) || []
                }
              />
            </Col>
          </Row>
        </div>
      </Drawer>
    </>
  );
}
