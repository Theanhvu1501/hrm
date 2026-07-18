import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, CheckCircle2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function TenantSelector() {
  const { availableTenants, selectTenant, user, isLoading } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const filteredTenants = availableTenants.filter((tenant) =>
    tenant.tenantName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async () => {
    if (!selectedTenant) return;
    setIsSubmitting(true);
    try {
      await selectTenant(selectedTenant);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Failed to select tenant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoubleClick = async (tenantId: string) => {
    setSelectedTenant(tenantId);
    setIsSubmitting(true);
    try {
      await selectTenant(tenantId);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Failed to select tenant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-[36.5rem] shadow-2xl border-0 max-h-[calc(100dvh-2rem)] flex flex-col">
        <CardHeader className="text-center pb-2 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Chọn công ty</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Xin chào <span className="font-medium text-foreground">{user?.hoTen}</span>, vui lòng chọn công ty để tiếp tục
          </p>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col min-h-0">
          {availableTenants.length > 5 && (
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm công ty..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <div className="overflow-y-auto min-h-0 flex-1 -mr-2 pr-2">
            <div className="space-y-2">
              {filteredTenants.map((tenant) => (
                <div
                  key={tenant.tenantId}
                  onClick={() => setSelectedTenant(tenant.tenantId)}
                  onDoubleClick={() => handleDoubleClick(tenant.tenantId)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedTenant === tenant.tenantId
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold ${
                      selectedTenant === tenant.tenantId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {tenant.tenantName?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-clamp-2">{tenant.tenantName}</div>
                      <div className="text-xs text-muted-foreground">{tenant.role}</div>
                    </div>
                    {selectedTenant === tenant.tenantId && (
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </div>
                </div>
              ))}

              {filteredTenants.length === 0 && search && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Không tìm thấy công ty phù hợp
                </div>
              )}
            </div>
          </div>

          {availableTenants.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Bạn chưa được gán vào công ty nào.</p>
              <p className="text-sm">Vui lòng liên hệ quản trị viên.</p>
            </div>
          )}

          <Button
            onClick={handleSelect}
            disabled={!selectedTenant || isSubmitting}
            className="w-full mt-4 shrink-0"
            size="lg"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Tiếp tục'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
