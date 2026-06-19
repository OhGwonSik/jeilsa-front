import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';

interface PermissionRouteProps {
  children: React.ReactNode;
  permission?: string;
  resource?: string;
  action?: string;
  role?: string;
  menuId?: string;
  redirectTo?: string; // 권한이 없을 때 리다이렉트할 경로
  requireAuth?: boolean; // 인증이 필요한지 여부
  fallback?: React.ReactNode; // 권한이 없을 때 표시할 컴포넌트
}

/**
 * 권한 기반 라우트 보호 컴포넌트
 * 
 * 사용 예시:
 * 
 * // 특정 권한이 있어야 접근 가능한 라우트
 * <PermissionRoute permission="user.create">
 *   <UserCreatePage />
 * </PermissionRoute>
 * 
 * // 리소스 기반 권한 확인
 * <PermissionRoute resource="admin" action="read" redirectTo="/dashboard">
 *   <AdminPanel />
 * </PermissionRoute>
 * 
 * // 역할 기반 접근 제어
 * <PermissionRoute role="admin" redirectTo="/unauthorized">
 *   <AdminSettings />
 * </PermissionRoute>
 * 
 * // 메뉴 접근 권한 확인
 * <PermissionRoute menuId="user-management" fallback={<div>접근 거부</div>}>
 *   <UserManagement />
 * </PermissionRoute>
 * 
 * // 단순 인증 확인
 * <PermissionRoute requireAuth redirectTo="/login">
 *   <ProtectedPage />
 * </PermissionRoute>
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  permission,
  resource,
  action,
  role,
  menuId,
  redirectTo = '/unauthorized',
  requireAuth = true,
  fallback = null
}) => {
  const {
    hasPermission,
    hasPermissionByResource,
    hasRole,
    hasMenuAccess,
    canAccess,
    isAuthenticated
  } = usePermission();

  // 인증이 필요하지만 인증되지 않은 경우
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 인증이 필요하지 않고 인증되지 않은 경우, children 렌더링
  if (!requireAuth && !isAuthenticated) {
    return <>{children}</>;
  }

  let hasAccess = false;

  // 특정 권한 조건이 없으면 인증 여부만 확인
  if (!permission && !resource && !action && !role && !menuId) {
    hasAccess = !requireAuth || isAuthenticated;
  } else {
    // 권한 확인
    if (permission) {
      hasAccess = hasPermission(permission);
    } else if (resource && action) {
      hasAccess = hasPermissionByResource(resource, action) || canAccess(resource, action);
    } else if (role) {
      hasAccess = hasRole(role);
    } else if (menuId) {
      hasAccess = hasMenuAccess(menuId);
    }
  }

  // 접근 권한이 있으면 children 렌더링
  if (hasAccess) {
    return <>{children}</>;
  }

  // 접근 권한이 없으면 fallback 또는 리다이렉트
  if (fallback) {
    return <>{fallback}</>;
  }

  return <Navigate to={redirectTo} replace />;
};

export default PermissionRoute;