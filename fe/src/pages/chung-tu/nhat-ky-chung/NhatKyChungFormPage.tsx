import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "antd";
import {
  NhatKyChungFormHandlerProvider,
  useNhatKyChungFormHandler,
  useNhatKyChungFormState,
} from "./NhatKyChungFormHandlerContext";
import { FormHeader } from "./form-components/form-header/FormHeader";
import { ChiTietTable } from "./form-components/chi-tiet-table/ChiTietTable";
import { FormActions } from "./form-components/form-actions/FormActions";
import {
  FormHeaderSkeleton,
  ChiTietTableSkeleton,
  FormActionsSkeleton,
} from "./form-components/FormSkeleton";

function NhatKyChungFormPageInner() {
  const handler = useNhatKyChungFormHandler();
  const { soPhieu } = useParams<{ soPhieu?: string }>();
  const [loading] = useNhatKyChungFormState("loading", true);

  useEffect(() => {
    handler.executeEvent("init", { soPhieu });
  }, [handler, soPhieu]);

  if (loading) {
    return (
      <div className="nkc-form-page">
        <FormHeaderSkeleton />
        <ChiTietTableSkeleton />
        <FormActionsSkeleton />
      </div>
    );
  }

  return (
    <div className="nkc-form-page nkc-form-page-layout">
      {/* Form Header Card - Compact */}
      <Card
        className="shadow-sm nkc-header-card"
        size="small"
        title={<span className="text-gray-600 font-medium text-sm">Thông tin chứng từ</span>}
        bodyStyle={{ padding: '8px 12px' }}
      >
        <FormHeader />
      </Card>

      {/* Chi tiết hạch toán */}
      <div className="nkc-detail-section">
        <Card
          className="shadow-sm nkc-detail-card"
          size="small"
          title={<span className="text-gray-600 font-medium text-sm">Chi tiết hạch toán</span>}
          bodyStyle={{ padding: 0 }}
        >
          <ChiTietTable />
        </Card>
      </div>

      <FormActions />
    </div>
  );
}

export default function NhatKyChungFormPage() {
  return (
    <NhatKyChungFormHandlerProvider>
      <NhatKyChungFormPageInner />
    </NhatKyChungFormHandlerProvider>
  );
}
