/**
 * 마스터 데이터 권한 훅 - 캐싱 및 재검증 정책 적용
 * 
 * 전역 캐싱 정책:
 * - staleTime: 5분
 * - gcTime: 60분 
 * - 포커스/재연결 재검증 활성화
 * - 단일 키: ['permissions']
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/common/axios/AxiosClient';
import type { PermissionDto } from '@/types/generated/PermissionDto';
import { dtoToPermission } from '@/types/mappers/permissionMapper';
import type { Permission } from '@/types/Permission';

// 마스터 권한 데이터 키 (전역 공통) - 충돌 방지를 위해 구체화
export const MASTER_PERMISSIONS_KEY = ['master', 'permissions'] as const;

/**
 * 마스터 권한 데이터 조회 훅
 * 
 * 모든 페이지에서 동일한 키를 사용하여 중복 요청 방지
 * 응답을 배열 형태로 정규화하여 반환
 */
export function useMasterPermissions() {
  const result = useQuery({
    queryKey: MASTER_PERMISSIONS_KEY,
    queryFn: async () => {
      // /permissions 엔드포인트 호출
      const response = await axios.get('/permission');
      let data = response.data;
      
      // 응답 정규화 - 배열이 아닐 경우 배열로 변환
      const list = Array.isArray(data) ? data : 
                   data?.data ? (Array.isArray(data.data) ? data.data : [data.data]) :
                   [data];
      
      // DTO를 UI 모델로 변환
      return list.map((dto: PermissionDto) => dtoToPermission(dto));
    },
    // 마스터 데이터 캐싱 정책 - 최적화
    staleTime: 30 * 60 * 1000, // 30분으로 연장
    gcTime: 60 * 60 * 1000, // 60분
    refetchOnWindowFocus: true, // 포커스 복귀 시 재검증 비활성화
    refetchOnReconnect: false, // 네트워크 재연결 시 재검증 비활성화
    retry: 1, // 1회 재시도
    // 이전 데이터 유지로 깜빡임 방지
    placeholderData: (previousData:any) => previousData,
  });

  return {
    permissions: result.data ?? [],
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
    isFetching: result.isFetching,
    isStale: result.isStale,
  };
}

/**
 * 권한 마스터 데이터 무효화 유틸리티
 */
export function useInvalidatePermissions() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: MASTER_PERMISSIONS_KEY });
  };
}

/**
 * 권한 마스터 데이터 프리페치 유틸리티
 */
export function usePrefetchPermissions() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: MASTER_PERMISSIONS_KEY,
      queryFn: async () => {
        const response = await axios.get('/permission');
        let data = response.data;
        const list = Array.isArray(data) ? data : 
                     data?.data ? (Array.isArray(data.data) ? data.data : [data.data]) :
                     [data];
        return list.map((dto: PermissionDto) => dtoToPermission(dto));
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
    });
  };
}

/**
 * 권한 ID로 특정 권한 정보 조회 (캐시된 마스터 데이터에서)
 */
export function usePermissionById(permissionId: string | undefined) {
  const { permissions, isLoading } = useMasterPermissions();
  
  const permission = permissions.find(
    (p: any) => p.id === permissionId || p.permissionId === permissionId
  );
  
  return {
    permission,
    isLoading,
    isFound: !!permission,
  };
}

/**
 * 활성화된 권한 목록만 조회
 */
export function useActivePermissions() {
  const { permissions, isLoading, isError, error } = useMasterPermissions();
  
  const activePermissions = permissions.filter((permission: any) => 
    permission.delYn === true || permission.delYn === 'Y'
  );
  
  return {
    permissions: activePermissions,
    isLoading,
    isError,
    error,
  };
}

/**
 * 권한 그룹별로 분류된 권한 목록 조회
 */
export function usePermissionsByGroup() {
  const { permissions, isLoading, isError, error } = useMasterPermissions();
  
  const groupedPermissions = permissions.reduce((groups: any, permission: any) => {
    const group = permission.group || 'default';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);
  
  return {
    groupedPermissions,
    isLoading,
    isError,
    error,
  };
}