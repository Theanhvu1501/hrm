import { Button, Tooltip } from "antd";
import { PlusSquareOutlined, MinusSquareOutlined } from "@ant-design/icons";

export interface ExpandCollapseButtonsProps {
  /** Mở tất cả node có con. */
  onExpandAll: () => void;
  /** Thu gọn toàn bộ. */
  onCollapseAll: () => void;
  size?: "small" | "middle";
  className?: string;
}

/**
 * Cặp nút Mở tất cả / Thu gọn dùng chung cho mọi bảng cây.
 * 2 nút icon + tooltip, canh phải.
 */
export function ExpandCollapseButtons({
  onExpandAll,
  onCollapseAll,
  size = "small",
  className,
}: ExpandCollapseButtonsProps) {
  return (
    <Button.Group className={className}>
      <Tooltip title="Mở tất cả">
        <Button size={size} icon={<PlusSquareOutlined />} onClick={onExpandAll} />
      </Tooltip>
      <Tooltip title="Thu gọn">
        <Button size={size} icon={<MinusSquareOutlined />} onClick={onCollapseAll} />
      </Tooltip>
    </Button.Group>
  );
}
