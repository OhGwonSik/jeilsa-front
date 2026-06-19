import { useSelector } from 'react-redux';
import { useMemo, useCallback } from 'react';
import { RootState } from '@/common/redux/store';
import { UserPermission, selectIsAuthenticated } from '@/common/redux/authSlice';

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource?: string;
  action?: string;
}

// 타입 가드: 문자열 배열 여부 확인
const isStringArray = (arr: unknown[]): arr is string[] => {
  return arr.every((item) => typeof item === 'string');
};

/**
 * 권한 관리 훅 - common_auth_backend API에 맞게 최적화
 */
export const usePermission = () => {
  const { 
    permissions, 
    roles, 
    userId, 
    email, 
    displayName, 
    menus 
  } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // 권한 목록을 메모이제이션하여 성능 최적화
  const permissionList = useMemo(() => {
    if (!permissions || permissions.length === 0) return [];
    if (isStringArray(permissions)) return permissions;
    return (permissions as UserPermission[]).map((p) => p.name);
  }, [permissions]);

  // 역할 목록을 메모이제이션
  const roleNames = useMemo(() => {
    return roles.map(role => role.name);
  }, [roles]);

  // 메뉴 경로들을 메모이제이션
  const menuIds = useMemo(() => {
    const getAllMenuIds = (menuItems: any[]): string[] => {
      let ids: string[] = [];
      menuItems.forEach(menu => {
        if (menu.menuId && menu.isActive) {
          ids.push(menu.menuId);
        }
        if (menu.menuName && menu.isActive) {
          ids.push(menu.menuName);
        }
        if (menu.items && menu.items.length > 0) {
          ids = ids.concat(getAllMenuIds(menu.items));
        }
      });
      return ids;
    };
    return getAllMenuIds(menus);
  }, [menus]);

  /**
   * 특정 권한을 가지고 있는지 확인 - 메모이제이션 적용
   */
  const hasPermission = useCallback((requiredPermission: string): boolean => {
    if (!isAuthenticated) return false;
    return permissionList.includes(requiredPermission);
  }, [isAuthenticated, permissionList]);

  /**
   * 리소스와 액션 기반 권한 확인 - 메모이제이션 적용
   */
  const hasPermissionByResource = useCallback((resource: string, action: string): boolean => {
    if (!isAuthenticated) return false;
    return hasPermission(`${resource}.${action}`);
  }, [isAuthenticated, hasPermission]);

  /**
   * 역할 확인 - 메모이제이션 적용
   */
  const hasRole = useCallback((roleName: string): boolean => {
    if (!isAuthenticated) return false;
    return roleNames.includes(roleName);
  }, [isAuthenticated, roleNames]);

  /**
   * 여러 역할 중 하나라도 가지고 있는지 확인 (OR) - 메모이제이션 적용
   */
  const hasAnyRole = useCallback((roleNamesArray: string[]): boolean => {
    if (!isAuthenticated) return false;
    return roleNamesArray.some((roleName) => roleNames.includes(roleName));
  }, [isAuthenticated, roleNames]);

  /**
   * 모든 역할을 가지고 있는지 확인 (AND) - 메모이제이션 적용
   */
  const hasAllRoles = useCallback((roleNamesArray: string[]): boolean => {
    if (!isAuthenticated) return false;
    return roleNamesArray.every((roleName) => roleNames.includes(roleName));
  }, [isAuthenticated, roleNames]);

  /**
   * 여러 권한 중 하나라도 가지고 있는지 확인 (OR) - 메모이제이션 적용
   */
  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    if (!isAuthenticated) return false;
    return requiredPermissions.some((p) => permissionList.includes(p));
  }, [isAuthenticated, permissionList]);

  /**
   * 모든 권한을 가지고 있는지 확인 (AND) - 메모이제이션 적용
   */
  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    if (!isAuthenticated) return false;
    return requiredPermissions.every((p) => permissionList.includes(p));
  }, [isAuthenticated, permissionList]);

  /**
   * 관리자 권한 확인 - 메모이제이션 적용
   */
  const isAdmin = useCallback((): boolean => {
    return hasAnyPermission(['admin.read', 'admin.write', 'system.admin']);
  }, [hasAnyPermission]);

  /**
   * 슈퍼 관리자 권한 확인 - 메모이제이션 적용
   */
  const isSuperAdmin = useCallback((): boolean => {
    return hasPermission('system.super_admin');
  }, [hasPermission]);

  /**
   * 일반 사용자 권한 확인 - 메모이제이션 적용
   */
  const isUser = useCallback((): boolean => {
    return hasRole('user') || hasPermission('user.read');
  }, [hasRole, hasPermission]);

  /**
   * 작업자 권한 확인 - 메모이제이션 적용
   */
  const isWorker = useCallback((): boolean => {
    return hasRole('worker') || hasAnyPermission(['user.update', 'user.insert']);
  }, [hasRole, hasAnyPermission]);

  /**
   * 리소스 접근 권한 확인
   */
  const canAccess = (resource: string, action: string): boolean => {
    if (!isAuthenticated) return false;
    if (isSuperAdmin()) return true;
    if (isAdmin() && !resource.startsWith('system')) return true;
    return hasPermissionByResource(resource, action);
  };

  /**
   * 사용자 관리 권한 확인
   */
  const canManageUsers = (): boolean => {
    return hasAnyPermission(['user.insert', 'user.update', 'user.delete']);
  };

  /**
   * 조직 관리 권한 확인
   */
  const canManageOrganizations = (): boolean => {
    return hasAnyPermission(['organization.insert', 'organization.update', 'organization.delete']);
  };

  /**
   * 역할 관리 권한 확인
   */
  const canManageRoles = (): boolean => {
    return hasAnyPermission(['role.insert', 'role.update', 'role.delete']);
  };

  /**
   * 메뉴 접근 권한 확인 - 메모이제이션 적용
   */
  const hasMenuAccess = useCallback((menuId: string): boolean => {
    if (!isAuthenticated) return false;
    if (isSuperAdmin()) return true;
    return menuIds.includes(menuId);
  }, [isAuthenticated, isSuperAdmin, menuIds]);

  /**
   * 현재 사용자의 모든 권한 목록 반환 - 메모이제이션된 값 사용
   */
  const getAllPermissions = useCallback((): string[] => {
    return permissionList;
  }, [permissionList]);

  /**
   * 권한 정보 디버깅용
   */
  const debugPermissions = () => {
    console.group('🔐 현재 사용자 권한 정보');
    console.log('사용자 ID:', userId);
    console.log('이메일:', email);
    console.log('표시명:', displayName);
    console.log('인증 상태:', isAuthenticated);
    console.log('전체 권한:', permissions);
    console.log('권한 목록:', getAllPermissions());
    console.log('역할 목록:', roles);
    console.log('메뉴 목록:', menus);
    console.log('관리자 여부:', isAdmin());
    console.log('슈퍼 관리자 여부:', isSuperAdmin());
    console.log('작업자 여부:', isWorker());
    console.log('일반 사용자 여부:', isUser());
    console.groupEnd();
  };

  return {
    userId,
    email,
    displayName,
    menus,
    permissions,
    roles,
    isAuthenticated,

    hasPermission,
    hasPermissionByResource,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission,
    hasAllPermissions,

    isAdmin,
    isSuperAdmin,
    isUser,
    isWorker,

    canAccess,
    canManageUsers,
    canManageOrganizations,
    canManageRoles,
    hasMenuAccess,

    getAllPermissions,
    debugPermissions,
  };
};

export default usePermission;
