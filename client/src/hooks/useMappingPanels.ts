import { useRef, useState, useCallback } from 'react';
import { createMappingRows, createMappingMap } from '@/common/utils/mappingUtils';

/**
 * 매핑 패널 구성을 위한 설정 타입
 */
export interface MappingPanelConfig {
  // 마스터 데이터 관련
  masterDataKey: string;           // 'organizations', 'roles', 'permissions', 'menus'
  masterIdField: string;           // 'organizationId', 'roleId', 'permissionId', 'menuId'
  masterNameField: string;         // 'organizationName', 'roleName', 'permissionName', 'menuName'
  
  // 매핑 데이터 관련  
  mappingEndpoint: string;         // '/user-organization/grid/search', '/role-permission/grid/search' 등
  mappingIdField?: string;         // 'userOrganizationId', 'rolePermissionId' 등
  
  // 필터 관련
  filterKey: string;              // 'userIds', 'roleIds' 등
  targetIdField: string;          // 'userId', 'roleId' 등 (필터에 들어갈 값의 필드명)
  
  // 추가 필드
  additionalFields?: Record<string, any>;
}

/**
 * 매핑 패널 관리를 위한 공통 훅
 */
export const useMappingPanels = () => {
  const prevAttrsRefs = useRef<Map<string, Map<string, any>>>(new Map());
  const [panelRowsState, setPanelRowsState] = useState<Map<string, any[]>>(new Map());

  /**
   * 마스터 데이터 확보 함수 (각 페이지에서 구현)
   */
  const ensureMasterDataRef = useRef<() => Promise<Record<string, any[]>>>();

  /**
   * 매핑 데이터 조회 함수 (각 페이지에서 구현) 
   */
  const fetchMappingDataRef = useRef<(endpoint: string, filter: any) => Promise<any[]>>();

  /**
   * 마스터 데이터 및 매핑 조회 함수 설정
   */
  const setDataFetchers = useCallback((
    ensureMasterData: () => Promise<Record<string, any[]>>,
    fetchMappingData: (endpoint: string, filter: any) => Promise<any[]>
  ) => {
    ensureMasterDataRef.current = ensureMasterData;
    fetchMappingDataRef.current = fetchMappingData;
  }, []);

  /**
   * 특정 패널 로딩
   */
  const loadPanel = useCallback(async (
    panelKey: string,
    config: MappingPanelConfig,
    selectedId: string
  ) => {
    if (!ensureMasterDataRef.current || !fetchMappingDataRef.current) {
      throw new Error('데이터 fetcher 함수들이 설정되지 않았습니다.');
    }

    // 1) 마스터 데이터 확보
    const masterDataMap = await ensureMasterDataRef.current();
    const masterData = masterDataMap[config.masterDataKey] || [];

    // 2) 매핑 데이터 조회
    const filter = { [config.filterKey]: [selectedId] };
    const mappingData = await fetchMappingDataRef.current(config.mappingEndpoint, filter);

    // 3) 매핑 맵 생성 및 스냅샷 저장
    const mappingMap = createMappingMap(mappingData, config.masterIdField, config.mappingIdField);
    
    // 각 패널별로 스냅샷 저장
    if (!prevAttrsRefs.current.has(panelKey)) {
      prevAttrsRefs.current.set(panelKey, new Map());
    }
    prevAttrsRefs.current.set(panelKey, mappingMap);

    // 4) 패널 행 생성
    const panelRows = createMappingRows(
      masterData,
      mappingMap,
      selectedId,
      {
        idField: config.masterIdField,
        nameField: config.masterNameField,
        additionalFields: {
          [config.targetIdField]: selectedId,
          ...config.additionalFields
        }
      }
    ).map((row, i) => ({
      ...row,
      // 마스터 데이터의 추가 속성들 병합
      ...Object.keys(masterData[i] || {}).reduce((acc, key) => {
        if (!row.hasOwnProperty(key)) {
          acc[key] = masterData[i][key];
        }
        return acc;
      }, {} as Record<string, any>)
    }));

    // 5) 상태 업데이트
    setPanelRowsState(prev => new Map(prev.set(panelKey, panelRows)));

    return panelRows;
  }, []);

  /**
   * 여러 패널을 동시에 로딩
   */
  const loadPanels = useCallback(async (
    configs: Array<{ key: string; config: MappingPanelConfig }>,
    selectedId: string
  ) => {
    const results = await Promise.allSettled(
      configs.map(({ key, config }) => loadPanel(key, config, selectedId))
    );

    // 실패한 패널들에 대한 로그
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`패널 로딩 실패 [${configs[index].key}]:`, result.reason);
      }
    });

    return results;
  }, [loadPanel]);

  /**
   * 특정 패널의 행 데이터 조회
   */
  const getPanelRows = useCallback((panelKey: string): any[] => {
    return panelRowsState.get(panelKey) || [];
  }, [panelRowsState]);

  /**
   * 특정 패널의 이전 속성 참조 조회
   */
  const getPrevAttrsRef = useCallback((panelKey: string) => {
    return prevAttrsRefs.current.get(panelKey) || new Map();
  }, []);

  /**
   * 패널 상태 초기화
   */
  const clearPanels = useCallback((panelKeys?: string[]) => {
    if (panelKeys) {
      // 특정 패널들만 초기화
      panelKeys.forEach(key => {
        prevAttrsRefs.current.delete(key);
      });
      setPanelRowsState(prev => {
        const newState = new Map(prev);
        panelKeys.forEach(key => newState.delete(key));
        return newState;
      });
    } else {
      // 모든 패널 초기화
      prevAttrsRefs.current.clear();
      setPanelRowsState(new Map());
    }
  }, []);

  /**
   * 저장 후 재조회 함수
   */
  const reloadAfterSave = useCallback(async (
    panelConfigs: Array<{ key: string; config: MappingPanelConfig }>,
    selectedId: string,
    onSuccess?: () => void
  ) => {
    try {
      await loadPanels(panelConfigs, selectedId);
      onSuccess?.();
    } catch (error) {
      console.error('저장 후 재조회 실패:', error);
      throw error;
    }
  }, [loadPanels]);

  return {
    // 설정
    setDataFetchers,
    
    // 패널 로딩
    loadPanel,
    loadPanels,
    
    // 데이터 조회
    getPanelRows,
    getPrevAttrsRef,
    
    // 상태 관리
    clearPanels,
    reloadAfterSave,
    
    // 상태 (필요시 직접 접근)
    panelRowsState,
    prevAttrsRefs: prevAttrsRefs.current
  };
};

/**
 * 페이지별 매핑 패널 설정 팩토리
 */
export const createMappingConfigs = {
  // 사용자 페이지
  user: (userId: string) => [
    {
      key: 'organization',
      config: {
        masterDataKey: 'orgData',
        masterIdField: 'organizationId',
        masterNameField: 'organizationName',
        mappingEndpoint: '/user-organization/grid/search',
        mappingIdField: 'userOrganizationId',
        filterKey: 'userIds',
        targetIdField: 'userId',
        additionalFields: { userId, description: '' }
      } as MappingPanelConfig
    },
    {
      key: 'role', 
      config: {
        masterDataKey: 'roleData',
        masterIdField: 'roleId',
        masterNameField: 'roleName',
        mappingEndpoint: '/user-role/grid/search',
        mappingIdField: 'userRoleId',
        filterKey: 'userIds',
        targetIdField: 'userId',
        additionalFields: { userId, description: '' }
      } as MappingPanelConfig
    }
  ],

  // 역할 페이지
  role: (roleId: string) => [
    {
      key: 'permission',
      config: {
        masterDataKey: 'permData',
        masterIdField: 'permissionId',
        masterNameField: 'permissionName',
        mappingEndpoint: '/role-permission/grid/search',
        mappingIdField: 'rolePermissionId',
        filterKey: 'roleIds',
        targetIdField: 'roleId',
        additionalFields: { roleId }
      } as MappingPanelConfig
    },
    {
      key: 'menu',
      config: {
        masterDataKey: 'menuData',
        masterIdField: 'menuId', 
        masterNameField: 'menuName',
        mappingEndpoint: '/role-menu/grid/search',
        mappingIdField: 'roleMenuId',
        filterKey: 'roleIds',
        targetIdField: 'roleId',
        additionalFields: { roleId }
      } as MappingPanelConfig
    }
  ],

  // 기타 페이지들도 필요에 따라 추가...
};