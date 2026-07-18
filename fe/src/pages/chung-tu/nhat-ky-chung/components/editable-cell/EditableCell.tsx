import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input, InputNumber, DatePicker, Select, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { NhatKyChung } from "@/types";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import { EditingRowValues } from "../../handler/sub-handler/inline-edit/inline-edit.state";
import dayjs from "dayjs";
import "./EditableCell.css";

export type InputType = "text" | "number" | "date" | "select";

export interface SelectOption {
  value: string;
  label: string;
}

export interface EditableCellProps {
  record: NhatKyChung;
  dataIndex: string;
  editable: boolean;
  inputType: InputType;
  selectOptions?: SelectOption[];
  children: React.ReactNode;
  className?: string;
}

export function EditableCell({
  record,
  dataIndex,
  editable,
  inputType,
  selectOptions = [],
  children,
  className = "",
}: EditableCellProps) {
  const handler = useNhatKyChungHandler();

  // Row edit state
  const [editingRowId] = useNhatKyChungState("editingRowId", null);
  const [editingRowValues] = useNhatKyChungState("editingRowValues", {});
  const [savingRow] = useNhatKyChungState("savingRow", false);

  const [localValue, setLocalValue] = useState<unknown>(null);
  const inputRef = useRef<any>(null);

  // Check if this row is in row-edit mode
  const isRowEditing = editingRowId === record.id;

  // Get value for row editing mode
  const getRowEditValue = useCallback(() => {
    const values = editingRowValues as EditingRowValues;
    return values[dataIndex];
  }, [editingRowValues, dataIndex]);

  // Initialize local value when entering edit mode
  useEffect(() => {
    if (isRowEditing) {
      const rowValue = getRowEditValue();
      if (inputType === "date" && rowValue) {
        setLocalValue(dayjs(rowValue as string));
      } else {
        setLocalValue(rowValue);
      }

      // Focus first input after a short delay
      setTimeout(() => {
        if (inputRef.current) {
          if (inputType === "select") {
            inputRef.current.focus();
          } else if (inputRef.current.focus) {
            inputRef.current.focus();
          }
        }
      }, 50);
    }
  }, [isRowEditing, getRowEditValue, inputType]);

  // Handle double click to start row editing
  const handleDoubleClick = useCallback(() => {
    // Don't allow if already editing or another row is being edited
    if (!editable || editingRowId) return;

    // Check if entry is approved
    if ((record as any).trangThai === "DA_DUYET") return;

    handler.executeEvent("startEditRow", {
      rowId: record.id,
      record: record,
    });
  }, [editable, editingRowId, handler, record]);

  // Handle value change
  const handleValueChange = useCallback(
    (value: unknown) => {
      setLocalValue(value);

      // Update the row values in state
      if (isRowEditing) {
        let valueToSave = value;
        if (inputType === "date" && dayjs.isDayjs(value)) {
          valueToSave = (value as dayjs.Dayjs).toISOString();
        }
        handler.executeEvent("updateRowValue", {
          columnKey: dataIndex,
          value: valueToSave,
        });
      }
    },
    [isRowEditing, inputType, handler, dataIndex]
  );

  // Handle key down in edit mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handler.executeEvent("cancelEditRow", {});
      }
      // Enter doesn't save - user must click Save button
    },
    [handler]
  );

  // Render input based on type
  const renderInput = () => {
    const commonProps = {
      ref: inputRef,
      onKeyDown: handleKeyDown,
      disabled: savingRow,
      size: "small" as const,
      className: "editable-cell-input",
    };

    switch (inputType) {
      case "number":
        return (
          <InputNumber
            {...commonProps}
            value={localValue as number}
            onChange={(val) => handleValueChange(val)}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value?.replace(/,/g, "") as unknown as number}
            style={{ width: "100%" }}
          />
        );

      case "date":
        return (
          <DatePicker
            {...commonProps}
            value={localValue as dayjs.Dayjs}
            onChange={(date) => handleValueChange(date)}
            format="DD/MM/YYYY"
            style={{ width: "100%" }}
          />
        );

      case "select":
        return (
          <Select
            {...commonProps}
            value={localValue as string}
            onChange={(val) => handleValueChange(val)}
            options={selectOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            style={{ width: "100%" }}
            dropdownMatchSelectWidth={false}
          />
        );

      case "text":
      default:
        return (
          <Input
            {...commonProps}
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
          />
        );
    }
  };

  // If not editable, just render children
  if (!editable) {
    return <>{children}</>;
  }

  // Render editing mode (row edit)
  if (isRowEditing) {
    return (
      <div className="editable-cell editable-cell-editing row-editing">
        {savingRow ? (
          <div className="editable-cell-loading">
            <Spin indicator={<LoadingOutlined spin />} size="small" />
          </div>
        ) : (
          renderInput()
        )}
      </div>
    );
  }

  // Render display mode with double-click handler
  return (
    <div
      className={`editable-cell editable-cell-display ${className}`}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </div>
  );
}

export default EditableCell;
