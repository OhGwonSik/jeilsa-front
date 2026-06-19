// ProtectedRoute.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectAuthReady } from '@/common/redux/auth/authSlice';
import { usePermission } from '@/hooks/usePermission'; // 너가 쓰는 훅 그대로

type ProtectedRouteProps = {
  children: React.ReactElement;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requireAll?: boolean;
  fallbackPath?: string;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                                children,
                                                                requiredPermissions = [],
                                                                requiredRoles = [],
                                                                requireAll = false,
                                                                fallbackPath = '/login',
                                                              }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const ready = useSelector(selectAuthReady); // ✅ 준비 완료 여부
  const location = useLocation();
  const { hasAnyPermission, hasAllPermissions, hasAnyRole, hasAllRoles } = usePermission();

  // 1) 아직 auth/persist 준비 전이면 아무 것도 렌더하지 않음 (깜빡/오판정 방지)
  if (!ready) return null; // 필요하면 로딩 스피너

  // 2) 인증 먼저
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  // 3) 권한/역할 체크(있을 때만)
  if (requiredPermissions.length > 0) {
    const ok = requireAll
        ? hasAllPermissions(requiredPermissions)
        : hasAnyPermission(requiredPermissions);
    if (!ok) return <Navigate to="/unauthorized" replace />;
  }

  if (requiredRoles.length > 0) {
    const ok = requireAll ? hasAllRoles(requiredRoles) : hasAnyRole(requiredRoles);
    if (!ok) return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
