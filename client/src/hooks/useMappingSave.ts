import { useCallback } from 'react';
import axios from '@/common/axios/AxiosClient';
import { buildCommonPayload } from '@/common/utils/commonTransformerData';
import { useMappingPanels, MappingPanelConfig } from './useMappingPanels';

export interface SaveConfig {
  endpoint: string;                    // '/user/bulk/upsert', '/role-permission/grid/bulk/upsert' 등
  idKey?: string;                     // 'userId', 'roleId' 등 (기본값: 자동 추론)
  nameKey?: string;                   // 'name', 'roleName' 등 (기본값: 자동 추론)  
  activeKey?: string;                 // 'delYn' (기본값: 'delYn')
  statusMap?: Record<string, string>; // 상태 매핑 (기본값: { Added: 'ADDED', Changed: 'CHANGED', Deleted: 'DELETED' })
}

export interface SaveWithReloadConfig extends SaveConfig {
  // 저장 후 재조회할 패널 설정
  reloadPanels?: Array<{ key: string; config: MappingPanelConfig }>;
  selectedId?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  successMessage?: string;
}

/**
 * 매핑 데이터 저장 및 자동 재조회를 위한 훅
 */
export const useMappingSave = () => {
  const { reloadAfterSave } = useMappingPanels();

  /**
   * 기본 저장 함수
   */
  const save = useCallback(async (
    sheetRef: React.MutableRefObject<any>,
    config: SaveConfig
  ) => {
    const sheet = sheetRef.current;
    if (!sheet) throw new Error('시트가 초기화되지 않았습니다.');

    // 페이로드 생성
    const payload = buildCommonPayload(
      sheet,
      {
        idKey: config.idKey || 'id',
        nameKey: config.nameKey || 'name',
        activeKey: config.activeKey || 'delYn'
      },
      {
        statusMap: config.statusMap || {
          Added: 'ADDED',
          Changed: 'CHANGED', 
          Deleted: 'DELETED'
        }
      }
    );

    if (!payload.items.length) {
      return { success: false, message: '변경된 데이터가 없습니다.' };
    }

    // 서버 저장
    const response = await axios.post(config.endpoint, payload);
    
    if (response.status === 200) {
      return { success: true, data: response.data, message: '저장이 완료되었습니다.' };
    }
    
    throw new Error('저장에 실패했습니다.');
  }, []);

  /**
   * 저장 후 자동 재조회하는 함수
   */
  const saveWithReload = useCallback(async (
    sheetRef: React.MutableRefObject<any>,
    config: SaveWithReloadConfig
  ) => {
    try {
      // 1) 기본 저장 수행
      const saveResult = await save(sheetRef, config);
      
      if (!saveResult.success) {
        return saveResult;
      }

      // 2) 성공 메시지 표시
      if (config.successMessage !== false) {
        alert(config.successMessage || saveResult.message);
      }

      // 3) 패널 재조회 (설정된 경우)
      if (config.reloadPanels && config.selectedId) {
        await reloadAfterSave(
          config.reloadPanels,
          config.selectedId,
          () => config.onSuccess?.(saveResult.data)
        );
      } else {
        config.onSuccess?.(saveResult.data);
      }

      return saveResult;

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.__parsedMessage || '알 수 없는 오류입니다.';
      
      if (config.onError) {
        config.onError(error);
      } else {
        alert(`저장 실패:\n${errorMessage}`);
      }
      
      throw error;
    }
  }, [save, reloadAfterSave]);

  /**
   * 주요 엔티티별 저장 설정 팩토리
   */
  const createSaveConfigs = {
    // 사용자 저장
    user: (selectedUserId?: number, reloadPanels?: Array<{ key: number; config: MappingPanelConfig }>): SaveWithReloadConfig => ({
      endpoint: '/user/bulk/upsert',
      idKey: 'memberId',
      nameKey: 'name',
      reloadPanels,
      selectedId: selectedUserId,
      successMessage: '사용자 정보가 저장되었습니다.'
    }),

    // 사용자-조직 매핑 저장  
    userOrganization: (selectedUserId?: string): SaveWithReloadConfig => ({
      endpoint: '/user-organization/grid/bulk/upsert',
      idKey: 'memberId',
      nameKey: 'organizationName',
      selectedId: selectedUserId,
      successMessage: '사용자-조직 매핑이 저장되었습니다.'
    }),

    // 사용자-역할 매핑 저장
    userRole: (selectedUserId?: number): SaveWithReloadConfig => ({
      endpoint: '/member/role/grid/upsert',
      idKey: 'memberId',
      nameKey: 'roleName',
      selectedId: selectedUserId,
      successMessage: '사용자-역할 매핑이 저장되었습니다.'
    }),

    // 역할 저장
    role: (selectedRoleId?: string, reloadPanels?: Array<{ key: string; config: MappingPanelConfig }>): SaveWithReloadConfig => ({
      endpoint: '/role/bulk/upsert',
      idKey: 'roleId',
      nameKey: 'roleName',
      reloadPanels,
      selectedId: selectedRoleId,
      successMessage: '역할 정보가 저장되었습니다.'
    }),

    // 역할-권한 매핑 저장
    rolePermission: (selectedRoleId?: string): SaveWithReloadConfig => ({
      endpoint: '/role-permission/grid/bulk/upsert',
      idKey: 'roleId', 
      nameKey: 'permissionName',
      selectedId: selectedRoleId,
      successMessage: '역할-권한 매핑이 저장되었습니다.'
    }),

    // 역할-메뉴 매핑 저장
    roleMenu: (selectedRoleId?: string): SaveWithReloadConfig => ({
      endpoint: '/role-menu/grid/bulk/upsert',
      idKey: 'roleId',
      nameKey: 'menuName', 
      selectedId: selectedRoleId,
      successMessage: '역할-메뉴 매핑이 저장되었습니다.'
    })
  };

  return {
    save,
    saveWithReload,
    createSaveConfigs
  };
};

/**
 * 개별 저장 훅들 (기존 코드와의 호환성을 위해)
 */
export const useUserSave = () => {
  const { saveWithReload, createSaveConfigs } = useMappingSave();
  
  return useCallback((
    sheetRef: React.MutableRefObject<any>,
    selectedUserId?: string,
    reloadPanels?: Array<{ key: string; config: MappingPanelConfig }>
  ) => {
    return saveWithReload(sheetRef, createSaveConfigs.user(selectedUserId, reloadPanels));
  }, [saveWithReload, createSaveConfigs]);
};

export const useRoleSave = () => {
  const { saveWithReload, createSaveConfigs } = useMappingSave();
  
  return useCallback((
    sheetRef: React.MutableRefObject<any>, 
    selectedRoleId?: string,
    reloadPanels?: Array<{ key: string; config: MappingPanelConfig }>
  ) => {
    return saveWithReload(sheetRef, createSaveConfigs.role(selectedRoleId, reloadPanels));
  }, [saveWithReload, createSaveConfigs]);
};