import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  resource?: string;
  action?: string;
  role?: string;
  menuId?: string;
  fallback?: React.ReactNode;
  requireAll?: boolean; // true일 경우, 사용자가 지정된 모든 권한/역할을 가져야 함
}

/**
 * 사용자 권한 기반 조건부 렌더링을 위한 PermissionGuard 컴포넌트
 * 
 * 사용 예시:
 * 
 * // 단일 권한 확인
 * <PermissionGuard permission="user.create">
 *   <CreateUserButton />
 * </PermissionGuard>
 * 
 * // 리소스 + 액션 확인
 * <PermissionGuard resource="user" action="delete">
 *   <DeleteUserButton />
 * </PermissionGuard>
 * 
 * // 역할 확인
 * <PermissionGuard role="admin">
 *   <AdminDashboard />
 * </PermissionGuard>
 * 
 * // 메뉴 접근 확인
 * <PermissionGuard menuId="user-management">
 *   <UserManagementMenu />
 * </PermissionGuard>
 * 
 * // 대체 콘텐츠와 함께 사용
 * <PermissionGuard permission="user.view" fallback={<div>접근 거부</div>}>
 *   <UserAccess />
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  resource,
  action,
  role,
  menuId,
  fallback = null,
  requireAll = false
}) => {
  const {
    hasPermission,
    hasPermissionByResource,
    hasRole,
    hasMenuAccess,
    canAccess,
    isAuthenticated
  } = usePermission();

  // 인증되지 않은 경우, 아무것도 렌더링하지 않거나 fallback 표시
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  let hasAccess = false;

  // 다양한 접근 권한 확인
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (resource && action) {
    hasAccess = hasPermissionByResource(resource, action) || canAccess(resource, action);
  } else if (role) {
    hasAccess = hasRole(role);
  } else if (menuId) {
    hasAccess = hasMenuAccess(menuId);
  } else {
    // 특정 권한이 지정되지 않은 경우, 인증 여부만 확인
    hasAccess = true;
  }

  // 접근 권한이 있으면 children 렌더링, 없으면 fallback 렌더링
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;
