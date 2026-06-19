// 보호된 네비게이션 컴포넌트들
import React from 'react';


// 보호된 링크 버튼 (메뉴 아이템용)
interface ProtectedLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onNavigationBlocked?: (reason: 'unauthenticated' | 'insufficient_permissions') => void;
}


// 메뉴 아이템 컴포넌트 (완전한 메뉴 아이템)
interface ProtectedMenuItemProps {
  to: string;
  icon?: React.ReactNode;
  label: string;
  description?: string;
  className?: string;
  showAccessStatus?: boolean;
}


// 버튼 형태의 보호된 네비게이션
interface ProtectedNavButtonProps {
  to: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

