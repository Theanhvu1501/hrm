import React from "react";
import { Input, Button, Tooltip } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";

export interface FilterBarSearch {
  value: string;
  onChange: (value: string) => void;
  /** Gọi khi nhấn Enter hoặc xoá ô tìm kiếm. */
  onSearch?: () => void;
  placeholder?: string;
  width?: number;
}

export interface FilterBarProps {
  /** Ô tìm kiếm (trái). */
  search?: FilterBarSearch;
  /** Nút đặt lại bộ lọc (cạnh ô tìm kiếm). */
  onReset?: () => void;
  /** Các control lọc ở giữa (Select/DatePicker...). */
  filters?: React.ReactNode;
  /** Nút hành động bên phải (Thêm/Export...). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Khung filter dùng chung cho toàn dự án — "filter 1 cục".
 * Bố cục: [tìm kiếm] [đặt lại] [bộ lọc] ........ [hành động].
 */
export function FilterBar({
  search,
  onReset,
  filters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div className={`filter-bar${className ? ` ${className}` : ""}`}>
      <div className="filter-bar__main">
        {search && (
          <Input
            placeholder={search.placeholder ?? "Tìm kiếm..."}
            prefix={<SearchOutlined className="text-muted-foreground" />}
            value={search.value}
            onChange={(e) => {
              search.onChange(e.target.value);
              if (e.target.value === "") search.onSearch?.();
            }}
            onPressEnter={() => search.onSearch?.()}
            style={{ width: search.width ?? 280 }}
            allowClear
          />
        )}
        {onReset && (
          <Tooltip title="Đặt lại bộ lọc">
            <Button icon={<ReloadOutlined />} onClick={onReset} />
          </Tooltip>
        )}
        {filters}
      </div>
      {actions && <div className="filter-bar__actions">{actions}</div>}
    </div>
  );
}
