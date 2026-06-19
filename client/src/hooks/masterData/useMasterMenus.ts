/**
 * 마스터 데이터 메뉴 훅 - 캐싱 및 재검증 정책 적용
 * 
 * 전역 캐싱 정책:
 * - staleTime: 5분
 * - gcTime: 60분 
 * - 포커스/재연결 재검증 활성화
 * - 단일 키: ['menus']
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/common/axios/AxiosClient';
import type { MenuDto } from '@/types/generated/MenuDto';
import { dtoToMenu } from '@/types/mappers/menuMapper';
import type { Menu } from '@/types/Menu';

// 마스터 메뉴 데이터 키 (전역 공통) - 충돌 방지를 위해 구체화
export const MASTER_MENUS_KEY = ['menu'] as const;

/**
 * 마스터 메뉴 데이터 조회 훅
 * 
 * 모든 페이지에서 동일한 키를 사용하여 중복 요청 방지
 * 트리 형태의 응답을 그대로 반환 (IBSheet가 Items 필드를 자동 인식하여 트리 구조 생성)
 */
export function useMasterMenus() {
  const result = useQuery({
    queryKey: MASTER_MENUS_KEY,
    queryFn: async () => {
      console.log('🔄 [useMasterMenus] API 호출 시작...');
      const param = { size : 50}
      try {
        // /menu/grid/search 엔드포인트 호출
        const response = await axios.post('/menu/grid/search',param);
        console.log('🌲 [useMasterMenus] API 응답 성공:', {
          status: response.status,
          hasData: !!response.data,
          hasList: !!response.data?.list,
          트리개수: response.data?.list?.length || 0,
          전체응답: response.data
        });
        
        if (!response.data.data.list ){
          throw new Error('응답에 list 필드가 없습니다');
        }
        
        return response.data.data.list;
      } catch (error) {
        console.error('❌ [useMasterMenus] API 호출 실패:', error);
        throw error;
      }
    },
    // 마스터 데이터 캐싱 정책 - 최적화
    staleTime: 30 * 60 * 1000, // 30분으로 연장
    gcTime: 60 * 60 * 1000, // 60분
    refetchOnWindowFocus: true, // 포커스 복귀 시 재검증 비활성화
    refetchOnReconnect: false, // 네트워크 재연결 시 재검증 비활성화
    retry: 1, // 1회 재시도
    // 이전 데이터 유지로 깜빡임 방지
    placeholderData: (previousData) => previousData,
  });

  return {
    menus: result.data ?? [],
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
    isFetching: result.isFetching,
    isStale: result.isStale,
  };
}

/**
 * 메뉴 마스터 데이터 무효화 유틸리티
 */
export function useInvalidateMenus() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: MASTER_MENUS_KEY });
  };
}

/**
 * 메뉴 마스터 데이터 프리페치 유틸리티
 */
export function usePrefetchMenus() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: MASTER_MENUS_KEY,
      queryFn: async () => {
        const param = { size : 50}
        // /menu/grid/search 엔드포인트 호출
        const response = await axios.post('/menu/grid/search',param);
        return response.data.data.list;
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
    });
  };
}

/**
 * 메뉴 ID로 특정 메뉴 정보 조회 (캐시된 마스터 데이터에서)
 */
export function useMenuById(menuId: string | undefined) {
  const { menus, isLoading } = useMasterMenus();
  
  const menu = menus.find(
    (m: any) => m.id === menuId || m.menuId === menuId
  );
  
  return {
    menu,
    isLoading,
    isFound: !!menu,
  };
}

/**
 * 활성화된 메뉴 목록만 조회
 */
export function useActiveMenus() {
  const { menus, isLoading, isError, error } = useMasterMenus();
  
  const activeMenus = menus.filter((menu: any) => 
    menu.delYn === true || menu.delYn === 'Y'
  );
  
  return {
    menus: activeMenus,
    isLoading,
    isError,
    error,
  };
}

/**
 * 메뉴 타입별로 분류된 메뉴 목록 조회
 */
export function useMenusByType() {
  const { menus, isLoading, isError, error } = useMasterMenus();
  
  const groupedMenus = menus.reduce((groups: any, menu: any) => {
    const type = menu.menuType || 'default';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(menu);
    return groups;
  }, {} as Record<string, Menu[]>);
  
  return {
    groupedMenus,
    isLoading,
    isError,
    error,
  };
}

/**
 * 계층형 메뉴 구조로 조회 (parentId 기반)
 */
export function useHierarchicalMenus() {
  const { menus, isLoading, isError, error } = useMasterMenus();
  
  // parentId가 없는 루트 메뉴들
  const rootMenus = menus.filter((menu: any) => !menu.parentId);
  
  // 자식 메뉴들을 부모에 연결하는 재귀 함수
  const buildHierarchy = (parentMenus: Menu[]): any[] => {
    return parentMenus.map((parent: any) => {
      const children = menus.filter((menu: any) => menu.parentId === parent.menuId);
      return {
        ...parent,
        children: children.length > 0 ? buildHierarchy(children) : [],
      };
    });
  };
  
  const hierarchicalMenus = buildHierarchy(rootMenus);
  
  return {
    hierarchicalMenus,
    isLoading,
    isError,
    error,
  };
}