import { Select, Divider, Button } from "antd";
import type { SelectProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";

export interface SelectWithQuickAddProps extends SelectProps {
  quickAddLabel: string;
  onQuickAdd: () => void;
  quickAddDisabled?: boolean;
}

export function SelectWithQuickAdd({
  quickAddLabel,
  onQuickAdd,
  quickAddDisabled = false,
  ...selectProps
}: SelectWithQuickAddProps) {
  return (
    <Select
      {...selectProps}
      popupRender={(menu) => (
        <>
          {menu}
          {!quickAddDisabled && (
            <>
              <Divider style={{ margin: "4px 0" }} />
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                block
                style={{ textAlign: "left" }}
                // onMouseDown chặn blur Select trước khi click handler chạy
                onMouseDown={(e) => e.preventDefault()}
                onClick={onQuickAdd}
              >
                Thêm nhanh {quickAddLabel}
              </Button>
            </>
          )}
        </>
      )}
    />
  );
}
