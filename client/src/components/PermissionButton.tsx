import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  permission?: string;
  resource?: string;
  action?: string;
  role?: string;
  hideWhenNoAccess?: boolean; // true면 권한이 없을 때 버튼을 숨김
  disableWhenNoAccess?: boolean; // true면 권한이 없을 때 버튼을 비활성화
  className?: string;
}

/**
 * 권한 기반 버튼 컴포넌트
 * 
 * 사용 예시:
 * 
 * // 권한이 없으면 버튼 숨김
 * <PermissionButton permission="user.create" hideWhenNoAccess>
 *   사용자 생성
 * </PermissionButton>
 * 
 * // 권한이 없으면 버튼 비활성화
 * <PermissionButton resource="user" action="delete" disableWhenNoAccess>
 *   사용자 삭제
 * </PermissionButton>
 * 
 * // 역할 기반 버튼
 * <PermissionButton role="admin" hideWhenNoAccess className="btn-primary">
 *   관리자 기능
 * </PermissionButton>
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  permission,
  resource,
  action,
  role,
  hideWhenNoAccess = false,
  disableWhenNoAccess = true,
  className = '',
  disabled,
  ...buttonProps
}) => {
  const {
    hasPermission,
    hasPermissionByResource,
    hasRole,
    canAccess,
    isAuthenticated
  } = usePermission();

  // 인증되지 않은 경우 처리
  if (!isAuthenticated) {
    return hideWhenNoAccess ? null : (
      <button {...buttonProps} disabled={true} className={`${className} opacity-50 cursor-not-allowed`}>
        {children}
      </button>
    );
  }

  let hasAccess = false;

  // 권한 확인
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (resource && action) {
    hasAccess = hasPermissionByResource(resource, action) || canAccess(resource, action);
  } else if (role) {
    hasAccess = hasRole(role);
  } else {
    // 특정 권한이 지정되지 않으면 접근 허용
    hasAccess = true;
  }

  // 권한이 없고 숨김 옵션이 활성화된 경우
  if (!hasAccess && hideWhenNoAccess) {
    return null;
  }

  // 권한이 없고 비활성화 옵션이 활성화된 경우
  const isDisabled = disabled || (!hasAccess && disableWhenNoAccess);

  return (
    <button 
      {...buttonProps} 
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

export default PermissionButton;