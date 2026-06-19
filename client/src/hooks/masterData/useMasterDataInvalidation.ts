/**
 * 마스터 데이터 무효화 유틸리티
 * 
 * 마스터 데이터 변경 시 관련 키만 정밀 무효화
 * 불필요한 전역 무효화 방지
 */

import { useQueryClient } from '@tanstack/react-query';
import { 
  MASTER_ORGANIZATIONS_KEY,
  useInvalidateOrganizations 
} from './useMasterOrganizations';
import { 
  MASTER_ROLES_KEY,
  useInvalidateRoles 
} from './useMasterRoles';
import { 
  MASTER_PERMISSIONS_KEY,
  useInvalidatePermissions 
} from './useMasterPermissions';
import { 
  MASTER_MENUS_KEY,
  useInvalidateMenus 
} from './useMasterMenus';

/**
 * 통합 마스터 데이터 무효화 훅
 */
export function useMasterDataInvalidation() {
  const queryClient = useQueryClient();
  const invalidateOrganizations = useInvalidateOrganizations();
  const invalidateRoles = useInvalidateRoles();
  const invalidatePermissions = useInvalidatePermissions();
  const invalidateMenus = useInvalidateMenus();

  return {
    /**
     * 조직 마스터 데이터만 무효화
     */
    invalidateOrganizations,
    
    /**
     * 역할 마스터 데이터만 무효화
     */
    invalidateRoles,
    
    /**
     * 권한 마스터 데이터만 무효화
     */
    invalidatePermissions,
    
    /**
     * 메뉴 마스터 데이터만 무효화
     */
    invalidateMenus,
    
    /**
     * 모든 마스터 데이터 무효화 (관리 화면에서 대량 변경 시)
     */
    invalidateAllMasterData: () => {
      invalidateOrganizations();
      invalidateRoles();
      invalidatePermissions();
      invalidateMenus();
    },
    
    /**
     * 특정 키들만 무효화
     */
    invalidateKeys: (keys: string[]) => {
      keys.forEach(key => {
        switch (key) {
          case 'organization':
            invalidateOrganizations();
            break;
          case 'role':
            invalidateRoles();
            break;
          case 'permission':
            invalidatePermissions();
            break;
          case 'menu':
            invalidateMenus();
            break;
        }
      });
    },
    
    /**
     * 마스터 데이터 관련 변경 작업 후 자동 무효화
     * 작업 타입에 따라 적절한 키만 무효화
     */
    invalidateAfterMasterChange: (changeType: {
      organizations?: boolean;
      roles?: boolean;
      permissions?: boolean;
      menus?: boolean;
    }) => {
      if (changeType.organizations) {
        invalidateOrganizations();
      }
      if (changeType.roles) {
        invalidateRoles();
      }
      if (changeType.permissions) {
        invalidatePermissions();
      }
      if (changeType.menus) {
        invalidateMenus();
      }
    },
  };
}

/**
 * 마스터 데이터 캐시 상태 조회 유틸리티
 */
export function useMasterDataCacheStatus() {
  const queryClient = useQueryClient();
  
  return {
    /**
     * 각 마스터 데이터의 캐시 상태 조회
     */
    getCacheStatus: () => {
      const organizationsQuery = queryClient.getQueryState(MASTER_ORGANIZATIONS_KEY);
      const rolesQuery = queryClient.getQueryState(MASTER_ROLES_KEY);
      const permissionsQuery = queryClient.getQueryState(MASTER_PERMISSIONS_KEY);
      const menusQuery = queryClient.getQueryState(MASTER_MENUS_KEY);
      
      return {
        organizations: {
          isCached: !!organizationsQuery,
          isStale: organizationsQuery?.isInvalidated || false,
          lastFetched: organizationsQuery?.dataUpdatedAt,
          status: organizationsQuery?.status,
        },
        roles: {
          isCached: !!rolesQuery,
          isStale: rolesQuery?.isInvalidated || false,
          lastFetched: rolesQuery?.dataUpdatedAt,
          status: rolesQuery?.status,
        },
        permissions: {
          isCached: !!permissionsQuery,
          isStale: permissionsQuery?.isInvalidated || false,
          lastFetched: permissionsQuery?.dataUpdatedAt,
          status: permissionsQuery?.status,
        },
        menus: {
          isCached: !!menusQuery,
          isStale: menusQuery?.isInvalidated || false,
          lastFetched: menusQuery?.dataUpdatedAt,
          status: menusQuery?.status,
        },
      };
    },
    
    /**
     * 캐시된 데이터 직접 조회
     */
    getCachedData: () => {
      return {
        organizations: queryClient.getQueryData(MASTER_ORGANIZATIONS_KEY),
        roles: queryClient.getQueryData(MASTER_ROLES_KEY),
        permissions: queryClient.getQueryData(MASTER_PERMISSIONS_KEY),
        menus: queryClient.getQueryData(MASTER_MENUS_KEY),
      };
    },
    
    /**
     * 마스터 데이터 캐시 수동 설정 (서버 푸시 등에서 사용)
     */
    setCachedData: (data: {
      organizations?: any[];
      roles?: any[];
      permissions?: any[];
      menus?: any[];
    }) => {
      if (data.organizations) {
        queryClient.setQueryData(MASTER_ORGANIZATIONS_KEY, data.organizations);
      }
      if (data.roles) {
        queryClient.setQueryData(MASTER_ROLES_KEY, data.roles);
      }
      if (data.permissions) {
        queryClient.setQueryData(MASTER_PERMISSIONS_KEY, data.permissions);
      }
      if (data.menus) {
        queryClient.setQueryData(MASTER_MENUS_KEY, data.menus);
      }
    },
  };
}

/**
 * 경량 변경 체크 기반 스마트 무효화 훅
 */
export function useSmartInvalidation() {
  const { invalidateAfterMasterChange } = useMasterDataInvalidation();
  
  return {
    /**
     * 변경 시각 비교를 통한 스마트 무효화
     * 실제 변경이 감지된 마스터만 무효화
     */
    checkAndInvalidate: async () => {
      try {
        // 각 마스터의 last-updated 체크 (병렬 실행)
        const [orgsUpdated, rolesUpdated, permissionsUpdated] = await Promise.allSettled([
          fetch('/organizations/last-updated').then(r => r.json()),
          fetch('/roles/last-updated').then(r => r.json()),
          fetch('/permissions/last-updated').then(r => r.json()),
        ]);
        
        // localStorage에 저장된 이전 갱신 시각과 비교
        const lastChecked = {
          organizations: localStorage.getItem('lastChecked_organizations'),
          roles: localStorage.getItem('lastChecked_roles'),
          permissions: localStorage.getItem('lastChecked_permissions'),
        };
        
        const changeDetected = {
          organizations: false,
          roles: false,
          permissions: false,
        };
        
        // 조직 변경 체크
        if (orgsUpdated.status === 'fulfilled') {
          const newTime = orgsUpdated.value.lastUpdated;
          if (lastChecked.organizations !== newTime) {
            changeDetected.organizations = true;
            localStorage.setItem('lastChecked_organizations', newTime);
          }
        }
        
        // 역할 변경 체크
        if (rolesUpdated.status === 'fulfilled') {
          const newTime = rolesUpdated.value.lastUpdated;
          if (lastChecked.roles !== newTime) {
            changeDetected.roles = true;
            localStorage.setItem('lastChecked_roles', newTime);
          }
        }
        
        // 권한 변경 체크
        if (permissionsUpdated.status === 'fulfilled') {
          const newTime = permissionsUpdated.value.lastUpdated;
          if (lastChecked.permissions !== newTime) {
            changeDetected.permissions = true;
            localStorage.setItem('lastChecked_permissions', newTime);
          }
        }
        
        // 변경이 감지된 마스터만 무효화
        if (changeDetected.organizations || changeDetected.roles || changeDetected.permissions) {
          invalidateAfterMasterChange(changeDetected);
        }
        
        return changeDetected;
        
      } catch (error) {
        console.warn('Smart invalidation check failed:', error);
        // 체크 실패 시 안전하게 모든 마스터 무효화
        invalidateAfterMasterChange({
          organizations: true,
          roles: true,
          permissions: true,
        });
      }
    },
  };
}