import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NguoiDung, TenantInfo } from '@/types';
import { authService } from '@/services/authService';
import { setAuthToken, getAuthToken, clearAuthToken, setCurrentTenant, getCurrentTenant, clearCurrentTenant } from '@/services/base/service-base';
import { ssoHandoff } from '@/services/ssoHandoff';
import { redirectToIdentityLogin } from '@/services/identityRedirect';
import { refreshFromIdentity, decodeTenantId, isIdentityConfigured } from '@/services/identitySession';
import { ApiError, ApiErrorType } from '@/config/api';
import { getAvailableModuleCodes } from '@/config/modules';
import { linhVucService, type LinhVuc } from '@/services/linhVucService';

/**
 * Đang đứng trong vỏ nhân viên (`/toi`) hay không?
 *
 * Vỏ nhân viên có cổng đăng nhập RIÊNG ở `/toi/login`, gọi thẳng identity từ
 * trình duyệt. Nếu ở nhánh này mà vẫn đá về Portal thì nhân viên mở máy mới,
 * vừa xoá dữ liệu, hoặc vừa cài PWA sẽ bị ném ngược vào đúng luồng 5 bước qua
 * Portal mà cổng này sinh ra để xoá — và tệ hơn: `window.location.href` chạy
 * ngay trong microtask, trước cả khi cổng kịp dò phiên. Ở `/toi` ta KHÔNG đá
 * về Portal; cứ để `initAuth` chạy nốt (`setIsLoading(false)`) rồi guard
 * `YeuCauDangNhapChamCong` đưa về `/toi/login` — chính nó mới biết cách tận
 * dụng cookie identity còn sống.
 *
 * CỐ Ý hẹp và chỉ đọc `window.location.pathname`: mọi đường dẫn NGOÀI `/toi`
 * (toàn bộ khu quản trị) giữ nguyên hành vi cũ, vẫn bật về Portal. Nhìn qua
 * thì đây trông như một chỗ thiếu nhất quán — nó là chủ ý, vì hai khu vực có
 * hai cửa đăng nhập khác nhau.
 */
function dangOVoNhanVien(): boolean {
  const duongDan = window.location.pathname ?? '';
  return duongDan === '/toi' || duongDan.startsWith('/toi/');
}

function extractPermissionsFromToken(token: string): string[] {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.permissions || [];
  } catch {
    return [];
  }
}


interface AuthContextType {
  user: NguoiDung | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsTenantSelection: boolean;
  availableTenants: TenantInfo[];
  currentTenant: TenantInfo | null;
  // Toàn bộ lĩnh vực từ API (gồm inactive, để admin thấy hết).
  allModules: LinhVuc[];
  // Code lĩnh vực user được phép xem ở tenant hiện tại (SuperAdmin = toàn bộ active).
  availableModules: string[];
  // Tra cứu doc lĩnh vực theo code.
  getModule: (code: string) => LinhVuc | undefined;
  // Nạp lại danh sách lĩnh vực (sau khi admin sửa).
  refreshModules: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /**
   * `dichDen` = nơi hạ cánh sau khi đã đóng phiên (cả hrm lẫn identity).
   * Bỏ trống → về Portal như cũ (khu quản trị). Vỏ nhân viên truyền
   * `/toi/login` để không phải đi vòng qua Portal.
   */
  logout: (dichDen?: string) => void;
  refreshUser: () => Promise<void>;
  applyGlossary: (glossary: import('@/types/tenant').Glossary) => void;
  currentLinhVuc: LinhVuc | null;
  applyLinhVucGlossary: (glossary: import('@/types/tenant').Glossary) => void;
  selectTenant: (tenantId: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<NguoiDung | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableTenants, setAvailableTenants] = useState<TenantInfo[]>([]);
  const [currentTenant, setCurrentTenantState] = useState<TenantInfo | null>(null);
  const [needsTenantSelection, setNeedsTenantSelection] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [allModules, setAllModules] = useState<LinhVuc[]>([]);

  const refreshModules = useCallback(async () => {
    try {
      const list = await linhVucService.getAll();
      setAllModules(list);
      // cache lần thành công gần nhất để fallback khi lỗi
      localStorage.setItem('linhVucCache', JSON.stringify(list));
    } catch {
      const cached = localStorage.getItem('linhVucCache');
      if (cached) {
        try {
          setAllModules(JSON.parse(cached));
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  // Code lĩnh vực đang active (nguồn để tính available + auto-chọn).
  const activeCodes = allModules.filter((m) => m.isActive).map((m) => m.code);

  // Lĩnh vực khả dụng theo tenant hiện tại (SuperAdmin = toàn bộ active).
  const availableModules = currentTenant
    ? getAvailableModuleCodes(currentTenant.modules, user?.isSuperAdmin || false, activeCodes)
    : [];

  const LINH_VUC_DEFAULT = 'KE_TOAN';
  const currentLinhVucCode = currentTenant?.modules?.[0] ?? LINH_VUC_DEFAULT;
  const currentLinhVuc = allModules.find((m) => m.code === currentLinhVucCode) ?? null;

  const getModule = useCallback(
    (code: string) => allModules.find((m) => m.code === code),
    [allModules],
  );

  // Check for existing token and fetch user on mount
  useEffect(() => {
    const initAuth = async () => {
      // SSO từ Portal: nếu có ?tenant, nạp token trước. handoffTenant = công ty
      // user vừa chọn ở Portal — PHẢI ưu tiên hơn currentTenant cũ trong localStorage,
      // nếu không tenant cũ sẽ đè lựa chọn mới và (khi tenant cũ hết hiệu lực) gây
      // vòng lặp "chọn công ty xong lại quay về chọn app".
      const handoffTenant = await ssoHandoff();

      // SLO / nguồn chân lý là phiên identity (cookie mc_session), KHÔNG phải token
      // cache trong localStorage. Khi identity được cấu hình và ta có tenant hiện
      // tại → xin access token tươi từ identity. Nếu trả null nghĩa là đã logout ở
      // portal (cookie/refresh chết) → token cache vô hiệu, xoá đi để rơi về portal.
      if (isIdentityConfigured()) {
        const tenantId =
          handoffTenant ?? getCurrentTenant()?.tenantId ?? decodeTenantId(getAuthToken());
        if (tenantId) {
          const fresh = await refreshFromIdentity(tenantId);
          if (fresh) {
            setAuthToken(fresh);
          } else {
            clearAuthToken();
            clearCurrentTenant();
          }
        }
      }

      const token = getAuthToken();
      let hasValidSession = false;
      if (token) {
        try {
          const response = await authService.getMe();
          setUser(response.user);
          hasValidSession = true;

          // Set current tenant from response
          if (response.tenant) {
            setCurrentTenant(response.tenant);
            setCurrentTenantState(response.tenant);
            setNeedsTenantSelection(false);
          }

          // Set permissions from BE or extract from JWT
          if (response.permissions) {
            setUserPermissions(response.permissions);
          } else if (token) {
            setUserPermissions(extractPermissionsFromToken(token));
          }

          // Set available tenants if provided
          if (response.availableTenants && response.availableTenants.length > 0) {
            setAvailableTenants(response.availableTenants);
          }

          // Nạp danh sách lĩnh vực động (sau khi đã có token hợp lệ).
          await refreshModules();
        } catch (error) {
          // Token invalid or expired
          clearAuthToken();
          clearCurrentTenant();
          console.error('Failed to restore session:', error);
        }
      }
      // Nếu không có phiên hợp lệ → redirect sang portal identity (nếu được cấu hình).
      // Khi redirect: giữ màn loading (trang sắp điều hướng đi, không render LoginPage).
      // Khi không redirect (VITE_IDENTITY_URL rỗng): hiển thị LoginPage cục bộ (fallback dev).
      // Ngoại lệ /toi: xem chú thích ở `dangOVoNhanVien`. Phải rơi xuống
      // `setIsLoading(false)`, nếu không guard của vỏ nhân viên quay mãi.
      if (!hasValidSession && !dangOVoNhanVien() && redirectToIdentityLogin()) return;
      setIsLoading(false);
    };

    initAuth();

    // Listen for unauthorized events from ServiceBase.
    // 401 giữa phiên (token hết hạn / bị thu hồi) → dọn phiên + đá về portal identity.
    const handleUnauthorized = () => {
      setUser(null);
      clearAuthToken();
      clearCurrentTenant();
      // Token hết hạn giữa ca làm phải đưa nhân viên về /toi/login, không phải
      // về Portal — xem `dangOVoNhanVien`. setUser(null) ở trên đã đủ để guard
      // chuyển hướng.
      if (dangOVoNhanVien()) return;
      redirectToIdentityLogin(); // dev (VITE_IDENTITY_URL rỗng): no-op, giữ hành vi cũ
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ đăng xuất đa app (Single Logout) cho tab đang mở: định kỳ kiểm phiên
  // identity. Nếu đã logout ở portal (refreshFromIdentity trả null) → dọn + đá về
  // portal. Cũng giữ access token luôn tươi (cho phép hạ TTL token về sau).
  useEffect(() => {
    if (!isIdentityConfigured()) return;
    const REVALIDATE_MS = 5 * 60 * 1000; // 5 phút
    const id = window.setInterval(async () => {
      const tenantId = getCurrentTenant()?.tenantId ?? decodeTenantId(getAuthToken());
      if (!tenantId) return;
      const fresh = await refreshFromIdentity(tenantId);
      if (fresh) {
        setAuthToken(fresh);
      } else {
        setUser(null);
        clearAuthToken();
        clearCurrentTenant();
        // Cùng lý do như hai chỗ trên: ở vỏ nhân viên thì về /toi/login chứ
        // không văng ra Portal — xem `dangOVoNhanVien`.
        if (dangOVoNhanVien()) return;
        redirectToIdentityLogin();
      }
    }, REVALIDATE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);

      // Handle tenant from login response
      if (response.accessToken && response.tenant) {
        // Single tenant - auto set (token already saved by authService.login)
        setCurrentTenant(response.tenant);
        setCurrentTenantState(response.tenant);
        setNeedsTenantSelection(false);
        setTempToken(null);
      } else if (response.tempToken && response.tenants && response.tenants.length > 0) {
        // Multiple tenants - need selection, save tempToken for later
        setTempToken(response.tempToken);
        setAvailableTenants(response.tenants);
        setNeedsTenantSelection(true);
      } else if (response.accessToken && !response.tenant) {
        // SUPER_ADMIN with no tenants - can proceed without tenant
        setNeedsTenantSelection(false);
        setTempToken(null);
      }

      // Save permissions from response or extract from JWT
      if (response.permissions) {
        setUserPermissions(response.permissions);
      } else if (response.accessToken) {
        setUserPermissions(extractPermissionsFromToken(response.accessToken));
      }

      // Nạp lĩnh vực động khi đã có token (bỏ qua nếu còn chờ chọn tenant).
      if (response.accessToken) {
        await refreshModules();
      }

      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.type) {
          case ApiErrorType.UNAUTHORIZED:
            return { success: false, error: 'Email hoặc mật khẩu không chính xác' };
          case ApiErrorType.FORBIDDEN:
            return { success: false, error: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin' };
          case ApiErrorType.NETWORK_ERROR:
            return { success: false, error: 'Không thể kết nối đến server. Vui lòng thử lại' };
          default:
            return { success: false, error: error.message || 'Đăng nhập thất bại' };
        }
      }
      return { success: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại' };
    }
  }, [refreshModules]);

  const logout = useCallback(async (dichDen?: string) => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setCurrentTenantState(null);
      setAvailableTenants([]);
      setNeedsTenantSelection(false);
      setTempToken(null);
      setUserPermissions([]);
      clearAuthToken();
      clearCurrentTenant();

      // SSO: đăng xuất cũng kết thúc phiên ở MasterCeo Portal. Đây là NƠI DUY
      // NHẤT gọi /api/logout trong luồng đăng xuất — màn hình gọi thêm
      // `identityLogout()` nữa là bắn hai lượt cho cùng một cú bấm.
      const identityUrl = import.meta.env.VITE_IDENTITY_URL as string | undefined;
      if (identityUrl) {
        try {
          await fetch(`${identityUrl}/api/logout`, { method: 'POST', credentials: 'include' });
        } catch {
          /* bỏ qua — vẫn phải điều hướng đi */
        }
      }
      // Mặc định về Portal (giữ nguyên hành vi khu quản trị). Vỏ nhân viên
      // truyền `/toi/login` để hạ cánh thẳng ở cổng chấm công — Portal chính
      // là chặng đường vòng đợt này sinh ra để xoá.
      const diDau = dichDen ?? identityUrl;
      if (diDau) window.location.href = diDau;
    }
  }, []);

  const selectTenant = useCallback(async (tenantId: string) => {
    if (!tempToken) {
      console.error('No temp token available for tenant selection');
      return;
    }

    try {
      // Call API to exchange tempToken + tenantId for accessToken
      const response = await authService.selectTenant(tempToken, tenantId);

      // Update state with response
      setUser(response.user);
      setCurrentTenant(response.tenant);
      setCurrentTenantState(response.tenant);
      setNeedsTenantSelection(false);
      setTempToken(null);

      // Set permissions from API response or extract from JWT token
      if (response.permissions && response.permissions.length > 0) {
        setUserPermissions(response.permissions);
      } else {
        const token = getAuthToken();
        if (token) {
          setUserPermissions(extractPermissionsFromToken(token));
        }
      }

      // Nạp lĩnh vực động sau khi chọn tenant.
      await refreshModules();
    } catch (error) {
      console.error('Failed to select tenant:', error);
      throw error;
    }
  }, [tempToken, refreshModules]);

  const switchTenant = useCallback(async (tenantId: string) => {
    try {
      const response = await authService.switchTenant(tenantId);

      setUser(response.user);
      setCurrentTenant(response.tenant);
      setCurrentTenantState(response.tenant);

      // Set permissions from API response or extract from JWT token
      if (response.permissions && response.permissions.length > 0) {
        setUserPermissions(response.permissions);
      } else {
        const token = getAuthToken();
        if (token) {
          setUserPermissions(extractPermissionsFromToken(token));
        }
      }

      // Update the role in availableTenants if needed
      setAvailableTenants((prev) =>
        prev.map((t) =>
          t.tenantId === response.tenant.tenantId
            ? { ...t, role: response.tenant.role }
            : t,
        ),
      );

      // Reload page to refresh all data for the new tenant
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      setUser(response.user);
      if (response.permissions) {
        setUserPermissions(response.permissions);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const applyGlossary = useCallback((glossary: import('@/types/tenant').Glossary) => {
    setCurrentTenantState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, glossary };
      setCurrentTenant(next); // cập nhật cache localStorage
      return next;
    });
  }, []);

  const applyLinhVucGlossary = useCallback((glossary: import('@/types/tenant').Glossary) => {
    setAllModules((prev) => {
      const next = prev.map((m) => (m.code === currentLinhVucCode ? { ...m, glossary } : m));
      localStorage.setItem('linhVucCache', JSON.stringify(next)); // đồng bộ cache như refreshModules
      return next;
    });
  }, [currentLinhVucCode]);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    if (userPermissions.length > 0) {
      if (userPermissions.includes('*')) return true;
      return userPermissions.includes(permission);
    }
    // Fallback: extract permissions directly from stored JWT token
    const token = getAuthToken();
    if (token) {
      const perms = extractPermissionsFromToken(token);
      if (perms.includes('*') || perms.includes(permission)) return true;
    }
    return false;
  }, [user, userPermissions]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        needsTenantSelection,
        availableTenants,
        currentTenant,
        allModules,
        availableModules,
        getModule,
        refreshModules,
        login,
        logout,
        refreshUser,
        applyGlossary,
        currentLinhVuc,
        applyLinhVucGlossary,
        selectTenant,
        switchTenant,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
