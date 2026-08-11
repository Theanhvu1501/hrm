import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, Search, X } from 'lucide-react';
import { getLastTenantId, setLastTenantId } from '@/lib/lastTenant';

export function TenantSelector() {
  const { availableTenants, selectTenant, logout, isLoading } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
  // Chỉ 1 công ty → chọn luôn, không bắt user bấm thêm bước nào.
  const autoPicked = useRef(false);

  const currentTenant = useMemo(() => {
    const lastId = getLastTenantId();
    return availableTenants.find((t) => t.tenantId === lastId) || null;
  }, [availableTenants]);

  const handleSelect = async (tenantId: string) => {
    setIsSubmitting(true);
    try {
      setLastTenantId(tenantId);
      await selectTenant(tenantId);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Failed to select tenant:', error);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (autoPicked.current || availableTenants.length === 0) return;
    if (availableTenants.length === 1) {
      autoPicked.current = true;
      void handleSelect(availableTenants[0].tenantId);
      return;
    }
    setSelectedTenant((prev) => prev ?? getLastTenantId());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTenants]);

  const matches = (name?: string) =>
    (name || '').toLowerCase().includes(search.trim().toLowerCase());
  const showCurrent = currentTenant != null && matches(currentTenant.tenantName);
  const otherTenants = availableTenants.filter(
    (t) => t.tenantId !== currentTenant?.tenantId && matches(t.tenantName)
  );

  // Đang tải, hoặc đang tự chọn giúp khi chỉ có 1 công ty → không nháy giao diện chọn.
  if (isLoading || (availableTenants.length === 1 && isSubmitting)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-[38rem] shadow-2xl border-0 max-h-[calc(100dvh-2rem)] flex flex-col gap-0 py-0">
        <CardContent className="flex flex-col min-h-0 p-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-5 shrink-0">
            <h2 className="text-2xl font-semibold">Công ty của bạn</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Đóng"
              className="text-muted-foreground -mr-2"
              onClick={() => void logout()}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tìm kiếm */}
          <div className="px-6 pt-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </div>

          {/* Danh sách */}
          <div className="overflow-y-auto min-h-0 flex-1 px-6 pb-2">
            {availableTenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Bạn chưa được gán vào công ty nào.</p>
                <p className="text-sm">Vui lòng liên hệ quản trị viên.</p>
              </div>
            ) : !showCurrent && otherTenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Không tìm thấy công ty phù hợp
              </div>
            ) : (
              <>
                {showCurrent && currentTenant && (
                  <div className="pt-4">
                    <div className="text-[13px] text-muted-foreground">Công ty đang làm việc</div>
                    <button
                      type="button"
                      onClick={() => setSelectedTenant(currentTenant.tenantId)}
                      onDoubleClick={() => void handleSelect(currentTenant.tenantId)}
                      className={`mt-1 text-left text-[17px] leading-snug text-primary ${
                        selectedTenant === currentTenant.tenantId
                          ? 'font-semibold underline underline-offset-4'
                          : 'font-medium'
                      }`}
                    >
                      {currentTenant.tenantName}
                    </button>
                  </div>
                )}

                {otherTenants.length > 0 && (
                  <div className={showCurrent ? 'pt-5' : 'pt-4'}>
                    <div className="text-[13px] text-muted-foreground">
                      {showCurrent ? 'Chọn công ty khác' : 'Chọn công ty'}
                    </div>
                    <RadioGroup
                      value={selectedTenant ?? ''}
                      onValueChange={setSelectedTenant}
                      className="mt-2 gap-0"
                    >
                      {otherTenants.map((tenant) => (
                        <label
                          key={tenant.tenantId}
                          onClick={() => setSelectedTenant(tenant.tenantId)}
                          onDoubleClick={() => void handleSelect(tenant.tenantId)}
                          className="flex items-start gap-3 py-2.5 cursor-pointer"
                        >
                          <RadioGroupItem value={tenant.tenantId} className="mt-0.5 shrink-0" />
                          <span className="text-sm">{tenant.tenantName}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t px-6 py-3 shrink-0">
            <Button variant="ghost" onClick={() => void logout()} disabled={isSubmitting}>
              Hủy bỏ
            </Button>
            <Button
              onClick={() => selectedTenant && void handleSelect(selectedTenant)}
              disabled={!selectedTenant || isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Đồng ý'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
