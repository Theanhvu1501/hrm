import { Input, DatePicker, Select, Tooltip, Button } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import dayjs from "dayjs";
import "./FilterToolbar.state";

const { RangePicker } = DatePicker;

export function FilterToolbar() {
  const handler = useNhatKyChungHandler();
  const [searchText, setSearchText] = useNhatKyChungState("searchText", "");
  const [dateRange] = useNhatKyChungState("dateRange", null);
  const [filterAccount] = useNhatKyChungState("filterAccount", undefined);
  const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);

  const handleSearch = (value: string) => {
    handler.executeEvent("search", { text: value });
  };

  const handleDateRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    handler.executeEvent("filterByDate", { dates });
  };

  const handleAccountFilter = (value: string | undefined) => {
    handler.executeEvent("filterByAccount", { account: value });
  };

  const handleReset = () => {
    handler.executeEvent("resetFilters", {});
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Tìm kiếm..."
        prefix={<SearchOutlined className="text-muted-foreground" />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onPressEnter={() => handleSearch(searchText || "")}
        style={{ width: 200 }}
        allowClear
      />
      <RangePicker
        format="DD/MM/YYYY"
        value={dateRange}
        onChange={(dates) =>
          handleDateRangeChange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
        }
        placeholder={["Từ ngày", "Đến ngày"]}
      />
      <Select
        placeholder="Lọc TK"
        value={filterAccount}
        onChange={handleAccountFilter}
        style={{ width: 200 }}
        allowClear
        showSearch
        optionFilterProp="label"
        options={
          taiKhoanList?.map((tk) => ({
            value: tk.ma,
            label: `${tk.ma} - ${tk.ten}`,
          })) || []
        }
      />
      <Tooltip title="Xóa bộ lọc">
        <Button icon={<ReloadOutlined />} onClick={handleReset} />
      </Tooltip>
    </div>
  );
}
