// src/MenuProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@/common/redux/authSlice';
import { useMenuAccess } from '@/hooks/useMenuAccess';


// 파일 맨 위
export default function MenuProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { hasAccess, ready } = useMenuAccess(); // hasAccess는 트리 전체에서 비교

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!ready) return null;

  const ok = hasAccess(location.pathname);
  if (!ok) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
