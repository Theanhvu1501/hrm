import React, { useState, useEffect } from 'react';
import { Space, Button, Breadcrumb } from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
  HomeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { FilterBar } from '@/components/common/FilterBar';
import { useQuyChaunHandler, useQuyChaunState } from '../../QuyChaunHandlerContext';
import { usePagePermission } from "@/hooks/usePagePermission";
import './QuyChaunHeader.state';
import { PaginationMeta } from '../table/QuyChaunTable.state';

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

interface QuyChaunHeaderProps {
  settingsButton?: React.ReactNode;
  /** Nút "Xóa đã chọn (N)" — do trang cha dựng (useBulkDelete). */
  bulkDeleteButton?: React.ReactNode;
}

export const QuyChaunHeader: React.FC<QuyChaunHeaderProps> = ({ settingsButton, bulkDeleteButton }) => {
  const handler = useQuyChaunHandler();
  const { canCreate, canExport } = usePagePermission("/danh-muc/quy-chuan");
  const [searchText] = useQuyChaunState('searchText', '');
  const [activeTab] = useQuyChaunState('activeTab', 'all');
  const [pagination] = useQuyChaunState('pagination', DEFAULT_PAGINATION);
  const [localSearchText, setLocalSearchText] = useState(searchText);

  // Sync local state with global state (for refresh button)
  useEffect(() => {
    setLocalSearchText(searchText);
  }, [searchText]);

  const handleSearch = (value: string) => {
    // Use paginated search API
    handler.executeEvent('searchPaginated', { 
      keyword: value,
      page: 1,
      limit: pagination.limit,
      loaiGiaoDich: activeTab === 'all' ? undefined : activeTab,
    });
  };

  const handleRefresh = () => {
    handler.executeEvent('refresh', {});
  };

  const handleAdd = () => {
    handler.executeEvent('openModal', {});
  };

  return (
    <>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>Cấu hình</Breadcrumb.Item>
        <Breadcrumb.Item>Quy chuẩn hạch toán</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <SettingOutlined />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Quy chuẩn hạch toán tự động</span>
        </Space>
      </div>

      <FilterBar
        search={{
          value: localSearchText,
          onChange: setLocalSearchText,
          onSearch: () => handleSearch(localSearchText),
          placeholder: 'Tìm kiếm nghiệp vụ...',
          width: 250,
        }}
        onReset={handleRefresh}
        actions={
          <>
            {settingsButton}
            {canExport && <Button icon={<ExportOutlined />}>Xuất Excel</Button>}
            {bulkDeleteButton}
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Thêm mới
              </Button>
            )}
          </>
        }
      />
    </>
  );
};
