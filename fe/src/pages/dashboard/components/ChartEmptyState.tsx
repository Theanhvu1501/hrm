import React from 'react';
import { Empty } from 'antd';

interface Props {
  description?: string;
  height?: number;
}

/** Trạng thái "chưa có dữ liệu" dùng chung cho các chart, giữ chiều cao để không vỡ layout. */
const ChartEmptyState: React.FC<Props> = ({ description = 'Chưa có dữ liệu', height = 280 }) => (
  <Empty
    description={description}
    style={{ height }}
    className="flex flex-col items-center justify-center"
  />
);

export default ChartEmptyState;
