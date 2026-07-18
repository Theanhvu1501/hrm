import { Card } from "antd";

/** Khối skeleton dùng nội bộ (không phụ thuộc shadcn) — nhận className để định cỡ. */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-black/10 ${className ?? ""}`} />;
}

export function FormHeaderSkeleton() {
  return (
    <Card className="shadow-sm" size="small">
      <div className="mb-4 sm:mb-6">
        {/* Row 1: Ngày chứng từ + Nghiệp vụ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        {/* Diễn giải chung */}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-20 w-full" />
        </div>
        {/* Thông tin bổ sung collapse */}
        <div className="mt-4">
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </Card>
  );
}

export function ChiTietTableSkeleton() {
  return (
    <div className="excel-container mt-4">
      <div className="excel-toolbar">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2 p-4 bg-white border border-t-0">
        {/* Table header */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-10" />
        </div>
        {/* Table rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-10 w-12" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormActionsSkeleton() {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}
