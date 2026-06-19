import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {Layout} from "@/components/layout/layout";
import SearchCard from '@/components/common/CommonSelectCard';
import { useSearchForm } from '@/hooks/useSelect';
import axios from '@/common/axios/AxiosClient';
import SheetActionBar from '@/components/common/SheetActionBar';
import { ActionsCtx, useActionsDeps } from '@/components/common/SheetActionContext';
import { usePager } from '@/hooks/usePager';
import Pagination from '@/components/common/Pagination';
import { toYN, dateStr, isOn } from "@/common/utils/dateFormatUtil";
import { useMasterPermissions } from '@/hooks/masterData/useMasterPermissions';
import { useMasterMenus } from '@/hooks/masterData/useMasterMenus';
import { IBSheetWrapper } from '@/components/common/IBSheetWrapper';
import { baseSheetOptions, commonColumns, commonSystemFields } from '@/components/common/SheetOptions';
import { buildCommonPayload } from '@/common/utils/commonTransformerData';
import { requiredValidate } from '@/common/utils/ibsheetValidation';
import { createMappingRows, createMappingMap } from '@/common/utils/mappingUtils';


// const toggleRoleActive = async (roleId: string, action: 'enable' | 'disable') => {
//   await axios.post(`/role/${roleId}/${action}`);
// };


export default function RolePage() {
  const roleSheetRef = useRef<any>(null);
  const rolePermissionSheetRef = useRef<any>(null);
  const roleMenuSheetRef = useRef<any>(null);

  // 권한 병합 전체 리스트 보관용
  const permissionAllRowsRef = useRef<any[]>([]);
  
  // 선택된 역할 상태
  const [selectedRole, setSelectedRole] = useState<{ roleId?: string; roleName?: string }>({});
  
  // selectedRole.roleId를 안정적인 값으로 메모이제이션
  const selectedRoleId = useMemo(() => selectedRole?.roleId, [selectedRole?.roleId]);
  
  // 패널 데이터 상태
  const [permissionPanelRows, setPermissionPanelRows] = useState<any[]>([]);
  const [menuPanelRows, setMenuPanelRows] = useState<any[]>([]);

  // 패널용 페이지네이션 상태
  const [permissionPanelPage, setPermissionPanelPage] = useState(1);
  const [permissionPanelSize, setPermissionPanelSize] = useState(20);
  const [menuPanelPage, setMenuPanelPage] = useState(1);
  const [menuPanelSize, setMenuPanelSize] = useState(10);

  // 마스터 데이터 조회 (캐싱 정책 적용)
  const { permissions, isLoading: isLoadingPermissions, refetch: refetchMasterPerm } = useMasterPermissions();
  const { menus: masterMenus, isLoading: isLoadingMenus, refetch: refetchMasterMenus } = useMasterMenus();


  const ensureRoleMasterData = async () => {
    console.log('ensureRoleMasterData 시작');
    console.log('현재 permissions:', permissions, '길이:', permissions?.length || 0);
    console.log('현재 masterMenus:', masterMenus, '길이:', masterMenus?.length || 0);
    
    // 캐시된 데이터가 있으면 그대로 사용 (refetch 불필요)
    const hasPermissions = Array.isArray(permissions) && permissions.length > 0;
    const hasMenus = Array.isArray(masterMenus) && masterMenus.length > 0;
    
    if (hasPermissions && hasMenus) {
      console.log('캐시된 데이터 사용');
      return { permData: permissions, menuData: masterMenus };
    }

    console.log('데이터 부족 - refetch 필요. hasPermissions:', hasPermissions, 'hasMenus:', hasMenus);

    try {
      // 필요한 데이터만 선택적으로 refetch
      const promises = [];
      if (!hasPermissions) {
        console.log('권한 데이터 refetch 추가');
        promises.push(refetchMasterPerm().catch(err => {
          console.error('권한 데이터 refetch 실패:', err);
          return { data: [] };
        }));
      }
      if (!hasMenus) {
        console.log('메뉴 데이터 refetch 추가');
        promises.push(refetchMasterMenus().catch(err => {
          console.error('메뉴 데이터 refetch 실패:', err);
          return { data: [] };
        }));
      }
      
      const results = await Promise.all(promises);
      console.log('Promise.all 결과:', results);
      
      let permData = permissions || [];
      let menuData = masterMenus || [];
      
      let resultIndex = 0;
      if (!hasPermissions) {
        permData = results[resultIndex]?.data ?? [];
        console.log('refetch된 권한 데이터:', permData);
        resultIndex++;
      }
      if (!hasMenus) {
        menuData = results[resultIndex]?.data ?? [];
        console.log('refetch된 메뉴 데이터:', menuData);
      }

      return { permData, menuData };
    } catch (error) {
      console.error('ensureRoleMasterData 에러:', error);
      return { 
        permData: permissions || [], 
        menuData: masterMenus || [] 
      };
    }
  };



  // 검색폼
  const { values, onChange, reset } = useSearchForm({
    roleName: '',
    delYn: '',
    sortBy: ''
  });

  // 정렬 설정
  const SORT_COLS = [
    { label: '생성일', value: 'regDt' },
    { label: '수정일', value: 'chgDt' },
    { label: '역할 ID', value: 'roleId' },
    { label: '역할 이름', value: 'roleName' },
    { label: '활성여부', value: 'delYn' },
  ] as const;

  const DIRS = [
    { label: '오름차순', value: 'ASC' },
    { label: '내림차순', value: 'DESC' },
  ] as const;

  const [sort1, setSort1] = useState<{ col: string; dir: 'ASC'|'DESC' }>({ col: 'regDt', dir: 'DESC' });

  const buildSortBy = (s1 = sort1) => {
    const parts: string[] = [];
    if (s1.col) parts.push(`${s1.col}:${s1.dir}`);
    return parts.join(',');
  };

  const [searchEnabled, setSearchEnabled] = useState(false);

  // ───── Roles: 서버 페이징 ─────
  const transformRoles = useCallback((list: any[]) => {
    return Array.isArray(list)
      ? list.map((role: any, i: number) => ({
          SEQ: i + 1,
          roleId: role.id ?? role.roleId,
          roleName: role.roleName ?? '',
          description: role.description ?? '',
          isDefault: role.isDefault,
          delYn: role.delYn,
          regDt: dateStr(role.regDt),
          chgDt: dateStr(role.chgDt),
          delDt: dateStr(role.delDt),
          regId: role.regId,
          chgId: role.chgId,
          delId: role.delId
        }))
      : [];
  }, []);

  const {
    rows: roleRows,
    pager: rolePager,
    isLoading,
    refetch: refetchRoles,
    setFilter: updateSearchFilter,
    page: rolePage,
    setPage: originalSetPage,
    size: roleSize,
    setSize: originalSetSize,
    clear: clearRolePager
  } = usePager({
    endpoint: '/role/grid/search',
    initialFilter: { ...values, sortBy: buildSortBy() },
    initialPage: 1,
    initialSize: 20,
    autoLoad: false,
    transform: transformRoles,
  });

  // 페이지/사이즈 변경 시 현재 정렬 정보를 포함하여 필터 업데이트
  const setPage = useCallback((page: number | ((prevPage: number) => number)) => {
    const nextPage = typeof page === 'function' ? page(rolePage) : page;
    const currentSortBy = buildSortBy();
    updateSearchFilter({ sortBy: currentSortBy }, { resetPage: false });
    originalSetPage(nextPage);
  }, [rolePage, buildSortBy, updateSearchFilter, originalSetPage]);

  const setSize = useCallback((size: React.SetStateAction<number>) => {
    const nextSize = typeof size === 'function' ? size(roleSize) : size;
    const currentSortBy = buildSortBy();
    updateSearchFilter({ sortBy: currentSortBy }, { resetPage: true });
    originalSetSize(nextSize);
  }, [roleSize, buildSortBy, updateSearchFilter, originalSetSize]);

  // ───── Role Permissions: 서버 페이징 ─────
  const transformRolePermissions = useCallback((list: any[]) => {
    // 서버 응답(list)을 이 그리드에 맞게 변환
    // 매핑행만 내려온다면:
    return (list ?? []).map((r: any, i: number) => ({
      SEQ: i + 1,
      roleId: r.roleId,
      roleName: r.roleName ?? '',
      permissionId: r.permissionId,
      permissionName: r.permissionName ?? '', // 서버가 안 주면 보여줄 수 없음
      mappingStatus: true,   // 서버가 주는 건 “매핑된 것”뿐이라면 true
      delYn: r.delYn,
      _originalMapping: { delYn: r.delYn, rolePermissionId: r.rolePermissionId ?? r.mappingId ?? '' },
      _status: '',
      regDt: dateStr(r.regDt), chgDt: dateStr(r.chgDt), delDt: dateStr(r.delDt),
      regId: r.regId, chgId: r.chgId, delId: r.delId,
    }));
  }, []);

  const {
    rows: permissionRows,
    pager: permissionPager,
    isLoading: isLoadingPermission,
    refetch: refetchRolePermissions,
    setFilter: setPermissionFilter,
    page: permissionPage,
    setPage: setPermissionPage,
    size: permissionSize,
    setSize: setPermissionSize,
  } = usePager({
    endpoint: '/role-permission/grid/search',
    initialFilter: {},
    initialPage: 1,
    initialSize: 20,
    autoLoad: false,
    transform: transformRolePermissions,
  });

  // ───── Role Menus: 서버 페이징 ─────
  const transformRoleMenus = useCallback((list: any[]) => {
    return Array.isArray(list)
      ? list.map((menu: any) => ({
          roleId: menu.roleId ?? '',
          roleName: menu.roleName ?? '',
          menuId: menu.menuId ?? '',
          menuName: menu.menuName ?? '',
          delYn: menu.delYn,
          select: 0,        // 체크박스 기본 해제
          _status: '',
          regDt: dateStr(menu.regDt),
          chgDt: dateStr(menu.chgDt),
          delDt: dateStr(menu.delDt),
          regId: menu.regId,
          chgId: menu.chgId,
          delId: menu.delId
        }))
      : [];
  }, []);


  const {
    rows: roleMenuRows,
    pager: roleMenuPager,
    isLoading: isLoadingRoleMenu,
    refetch: refetchRoleMenus,
    setFilter: setRoleMenuFilter,
    page: roleMenuPage,
    setPage: setRoleMenuPage,
    size: roleMenuSize,
    setSize: setRoleMenuSize,
    clear: clearRoleMenuPager
  } = usePager({
    endpoint: '/role-menu/grid/search',
    initialFilter: {roleIds: [] as string[] },
    initialPage: 1,
    initialSize: 20,
    autoLoad: false,
    transform: (list:any) => list,
  });

  // permissionRows와 마스터 권한 데이터를 병합하여 패널에 표시 (페이지네이션 적용)
  useEffect(() => {
    if (!selectedRoleId) return;

    if (!selectedRoleId) {
      setPermissionPanelRows([]);
      return;
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      setPermissionPanelRows([]);
      return;
    }

    // 매핑 데이터를 permissionId로 인덱싱 (permissionRows가 비어있어도 처리)
    const mappingMap = new Map();
    if (Array.isArray(permissionRows) && permissionRows.length > 0) {
      permissionRows.forEach(mapping => {
        if (mapping.permissionId) {
          mappingMap.set(mapping.permissionId, mapping);
        }
      });
    }

    // 마스터 데이터 페이지네이션 적용
    const startIndex = (permissionPanelPage - 1) * permissionPanelSize;
    const endIndex = startIndex + permissionPanelSize;
    const pagedPermissions = permissions.slice(startIndex, endIndex);

    // 페이지별 마스터 데이터와 매핑 데이터를 병합
    const panelData = pagedPermissions.map((masterPerm, index) => {
      const mapping = mappingMap.get(masterPerm.permissionId);
      const isMapped = !!mapping;
      
      return {
        SEQ: startIndex + index + 1,
        roleId: selectedRoleId,
        roleName: selectedRole.roleName || '',
        permissionId: masterPerm.permissionId,
        permissionName: masterPerm.permissionName,
        description:masterPerm.description,
        delYn: masterPerm.delYn,
        mappingStatus: isMapped,
        select: isMapped ? 1 : 0,
        _originalMapping: isMapped ? mapping : null,
        _status: '',
        rolePermissionId: mapping?.rolePermissionId || '',
        regDt: mapping ? dateStr(mapping.regDt) : '',
        chgDt: mapping ? dateStr(mapping.chgDt) : '',
        delDt: mapping ? dateStr(mapping.delDt) : '',
        regId: mapping?.regId || '',
        chgId: mapping?.chgId || '',
        delId: mapping?.delId || ''
      };
    });

    setPermissionPanelRows(panelData);
    permissionAllRowsRef.current = panelData;
  }, [permissionRows, permissions, permissionPanelPage, permissionPanelSize]);

  // menuRows와 마스터 메뉴 데이터를 병합하여 패널에 표시 (트리 구조)
  useEffect(() => {
    if (!selectedRoleId) return;

    if (!Array.isArray(masterMenus) || masterMenus.length === 0) {
      setMenuPanelRows([]);
      return;
    }

    // ✅ 트리 전체에서 menuId → 매핑 데이터 맵 생성 (roleMenuRows 기준)
    const collectMappings = (nodes = [], map = new Map()) => {
      for (const n of nodes) {
        if (n?.menuId != null) map.set(n.menuId, n);
        const kids = n.items ?? n.Items;
        if (Array.isArray(kids) && kids.length) collectMappings(kids, map);
      }
      return map;
    };

    const mappingMap = Array.isArray(roleMenuRows)
        ? collectMappings(roleMenuRows, new Map())
        : new Map();

    // 마스터 트리에 매핑 반영
    const addMappingToTree = (menus) => {
      return (menus ?? []).map((menu, i) => {
        const mappingData = mappingMap.get(menu.menuId);

        // ✅ '활성 매핑' 기준: 매핑이 있고 delYn === 'N'인 경우만 true
        const isActiveMapped =
            !!mappingData &&
            (mappingData.delYn === 'N' || mappingData.delYn === 0 || mappingData.delYn === false);

        // 참고: mappingStatus는 '매핑 존재'로 볼지, '활성 매핑'으로 볼지 정책에 따라
        const processed = {
          ...menu,
          SEQ: i + 1,
          roleId: selectedRoleId,
          roleName: selectedRole.roleName || '',
          mappingStatus: isActiveMapped,  // delYn === 'N'일 때만 true
          select: isActiveMapped ? 1 : 0,         // ✅ 체크는 활성 매핑일 때만
          _originalMapping: mappingData || null,
          _status: '',
        };

        const kids = menu.Items ?? menu.items;
        if (Array.isArray(kids)) {
          processed.Items = addMappingToTree(kids);
        }
        return processed;
      });
    };

    const panelData = addMappingToTree(masterMenus);
    setMenuPanelRows(panelData);
  }, [roleMenuRows, masterMenus, selectedRoleId, selectedRole.roleName]);

  // 패널 재로딩을 위한 공통 함수
  const loadRolePanels = async (roleId: string) => {
    const permissionFilter = { roleIds: [roleId] as string[] };
    const menuFilter = { roleIds: [roleId] as string[] };

    await Promise.all([
      refetchRolePermissions({ filter: permissionFilter, page: permissionPage }),
      refetchRoleMenus({ filter: menuFilter, page: roleMenuPage }),
    ]);
  };

  // SearchCard 필드
  const fields = [
    { type: "input", name: "roleName", label: "역할 이름", placeholder: "역할 이름" },
    {
      type: "select",
      name: "delYn",
      label: "활성 여부",
      options: [
        { label: "활성", value: 'N' },
        { label: "비활성", value: 'Y' },
      ],
    },
  ] as const;

  // IBSheet 옵션 - TestTemplate 방식 적용
  const roleSheetOptions = {
    ...baseSheetOptions,
    Cols: [
      ...commonColumns,
      { Header: "역할 ID", Name: "roleId", Type: "Text", Align: "Left", Width: 200, CanEdit: 0, Visible: 0 },
      { Header: "역할 이름(영문)", Name: "roleName", Type: "Text", Align: "Center", Width: 120, CanEdit: 1 ,Required : 1 },
      { Header: "역할 이름(한글)", Name: "description", Type: "Text", Align: "Center", Width: 120, CanEdit: 1 ,Required : 1},
      // { Header: "기본 여부", Name: "isDefault", Type: "Bool", Align: "Center", Width: 80 },
      { Header: "활성화", Name: "toggleActiveBtn", Type: "Button", ButtonText: "활성화", Width: 100, Visible: 0 },
      { Header: "삭제여부", Name: "delYn", Type: "Text", Align: "Center", Width: 80, CanEdit: 0,
        TextColorFormula: "delYn ? '#0b57d0' : '#9aa0a6'"
      },
      ...commonSystemFields
    ],
  };

  const rolePermissionSheetOptions = {
    ...baseSheetOptions,
    Cols: [
      ...commonColumns,
      // { Header: '역할명', Name: 'roleName', Type: 'Text', Align: 'Left', Width: 150, CanEdit: 0 },
      { Header: '권한한글명', Name: 'description', Type: 'Text', Align: 'Left', Width: 200, CanEdit: 0 },
      { Header: '권한명', Name: 'permissionName', Type: 'Text', Align: 'Left', Width: 200, CanEdit: 0 },
      { Header: '매핑 상태', Name: 'mappingStatus', Type: 'Bool', Align: 'Center', Width: 80, CanEdit: 0 },
      { Header: "삭제여부", Name: 'delYn', Type: 'Text', Align: 'Center', Width: 80, CanEdit: 0 },
      { Header: 'ROLE ID', Name: 'roleId', Type: 'Text', Align: 'Left', Width: 150, CanEdit: 0, Visible: 0 },
      { Header: '권한 ID', Name: 'permissionId', Type: 'Text', Align: 'Center', Width: 200, CanEdit: 0, Visible: 0 },
      ...commonSystemFields
    ],
  };

  const roleMenuSheetOptions = {
    Cfg: {
      Style: "IBSP",
      MessageWidth: 300,
      AutoFitColWidth: 'init',
      FitWidth: true,
      CanSort: false,
      MainCol: "menuName",
      TreeCol: "menuName", // 트리 컬럼 지정
      TreeItems: "Items" // 하위 항목 필드명 지정
    },
    LeftCols: [
      { Type: 'Seq', Name: 'SEQ', Align: 'Center', Width: 50, Render: 0, CanEdit: 0 },
      { Header: { Value: '', HeaderCheck: 1, Align: 'Center' }, Type: 'Bool', Name: 'select', Width: 60 },
    ],
    Cols: [
      { Name: 'menuName', Header: '메뉴명', Type: 'Text', Width: 200, CanEdit: 0 },
      { Name: 'menuType', Header: '타입', Type: 'Enum', Enum:'|HEADER|MENU', EnumKeys: '|HEADER|MENU', Width: 80, CanEdit: 0 },
      { Name: 'mappingStatus', Header: '매핑상태', Type: 'Bool', Width: 80, CanEdit: 0, Align: 'Center',
        TextColorFormula: "mappingStatus ? '#0b57d0' : '#9aa0a6'"
      },
      { Name: 'menuPath', Header: '경로', Type: 'Text', Width: 160, CanEdit: 0 },
      { Name: 'menuOrder', Header: '순서', Type: 'Int', Align: 'Center' ,Width: 60, CanEdit: 0 },
      { Name: 'delYn', Header: '삭제여부', Type: 'Text', Align: 'Center', Width: 80, CanEdit: 0 },
      { Name: '_status', Header: '상태', Type: 'Text', Align: 'Center', Width: 80, Visible: 0 },
      { Name: 'menuId', Visible: 0 },
      { Name: 'parentId', Visible: 0 },
      { Name: 'roleId', Visible: 0 },
      { Name: 'roleName', Visible: 0 },
      { Name: '_originalMapping', Visible: 0 },
      ...commonSystemFields
    ]
  };


  // 시트 이벤트 핸들러들
  const rolePermissionOnAfterChange = (evt: any) => {
    const sheet = rolePermissionSheetRef.current;
    if (!sheet || evt.col !== 'select') return;

    const { row } = evt;
    const currentValue = sheet.getValue(row, 'select');
    const originalMapping = sheet.getValue(row, '_originalMapping');
    
    // IBSheet 자동 플래그들 초기화 (중복 방지)
    sheet.setValue(row, 'Added', 0);
    sheet.setValue(row, 'Changed', 0);
    sheet.setValue(row, 'Deleted', 0);
    
    if (currentValue === 1 || currentValue === true) {
      // 체크된 경우
      if (originalMapping) {
        // 기존 매핑이 있던 경우 → Changed
        sheet.setValue(row, '_status', 'Changed');
        sheet.setValue(row, 'Changed', 1);
      } else {
        // 새로운 매핑인 경우 → Added
        sheet.setValue(row, '_status', 'Added');
        sheet.setValue(row, 'Added', 1);
      }
    } else {
      // 체크 해제된 경우
      if (originalMapping) {
        // 기존 매핑이 있던 경우 → Deleted
        sheet.setValue(row, '_status', 'Deleted');
        sheet.setValue(row, 'Deleted', 1);
      }
      // 원래 매핑이 없던 경우는 아무 처리 안 함
    }
  };

  const roleMenuOnAfterChange = (evt: any) => {
    const sheet = roleMenuSheetRef.current;
    if (!sheet || evt.col !== 'select') return;

    const { row } = evt;
    const currentValue = sheet.getValue(row, 'select');
    const originalMapping = sheet.getValue(row, '_originalMapping');

    // IBSheet 자동 플래그들 초기화 (중복 방지)
    sheet.setValue(row, 'Added', 0);
    sheet.setValue(row, 'Changed', 0);
    sheet.setValue(row, 'Deleted', 0);

    if (currentValue === 1 || currentValue === true) {
      // 체크된 경우
      if (originalMapping) {
        // 기존 매핑이 있던 경우 → Changed
        sheet.setValue(row, '_status', 'Changed');
        sheet.setValue(row, 'Changed', 1);
      } else {
        // 새로운 매핑인 경우 → Added
        sheet.setValue(row, '_status', 'Added');
        sheet.setValue(row, 'Added', 1);
      }
    } else {
      // 체크 해제된 경우
      if (originalMapping) {
        // 기존 매핑이 있던 경우 → Deleted
        sheet.setValue(row, '_status', 'Deleted');
        sheet.setValue(row, 'Deleted', 1);
      }
      // 원래 매핑이 없던 경우는 아무 처리 안 함
    }
  };

  const roleOnDblClick = async (evt: any) => {
    const sheet = roleSheetRef.current;
    if (!sheet) return;
    const { row } = evt;
    const rowData = sheet.getRowValue(row);
    const roleId = String(rowData.roleId ?? rowData.id ?? '');
    const roleName = rowData.roleName ?? rowData.name ?? '';
    
    if (!roleId) return;

    setSelectedRole({ roleId, roleName });
    
    // 패널 데이터 즉시 초기화 (이전 역할 데이터 제거)
    setPermissionPanelRows([]);
    setMenuPanelRows([]);

    // 패널 페이지 초기화
    setPermissionPanelPage(1);
    setMenuPanelPage(1);

    try {
      await loadRolePanels(roleId);
    } catch (err: any) {
      alert(`권한/메뉴 매핑 조회 실패:\n${err?.__parsedMessage ?? '알 수 없는 오류입니다.'}`);
    }
  };

  const roleOnAfterClick = async (evt: any) => {
    const sheet = roleSheetRef.current;
    if (!sheet) return;
    const { col, row } = evt;
    const rowData = sheet.getRowValue(row);

    // if (col === 'toggleActiveBtn') {
    //   const currentlyOn = isOn(rowData.delYn);
    //   const action = currentlyOn ? 'disable' : 'enable';
    //   const label = currentlyOn ? '비활성화' : '활성화';
    //   if (!confirm(`역할을 ${label}하시겠습니까?`)) return;

    //   try {
    //     // await toggleRoleActive(rowData.roleId, action);
    //     alert(`역할 ${label} 완료`);
    //     await refetchRoles();
    //   } catch (err: any) {
    //     const msg = err?.response?.data?.message ?? `역할 ${label}에 실패했습니다.`;
    //     alert(`${label} 실패: ${msg}\n저장 실패:\n${err?.__parsedMessage ?? '알 수 없는 오류입니다.'}`);
    //   }
    // }

  };

  // 버튼 텍스트 갱신 (활성/비활성)
  const updateToggleButtonTexts = () => {
    if (!roleSheetRef.current) return;
    const rows = roleSheetRef.current.getDataRows?.() ?? [];
    rows.forEach((row: any) => {
      const rv = roleSheetRef.current.getRowValue(row);
      if (!rv || !Object.prototype.hasOwnProperty.call(rv, 'delYn')) return;
      roleSheetRef.current.setAttribute(
        row,
        'toggleActiveBtn',
        'ButtonText',
        isOn(rv.delYn) ? '🔴 비활성화' : '🟢 활성화'
      );
    });
  };

  // ───── 검색/리셋 ─────
  const handleSearch = async () => {
    if (!searchEnabled) {
      setSearchEnabled(true);
    }
    
    const next = { ...values, sortBy: buildSortBy() };
    
    // 명시적으로 검색 실행
    updateSearchFilter(next, { resetPage: true });
    
    // 잠시 대기 후 강제 refetch (만약 updateSearchFilter가 즉시 실행되지 않는다면)
    setTimeout(async () => {
      await refetchRoles();
    }, 50);
    
    rolePermissionSheetRef.current?.reloadData();
    roleMenuSheetRef.current?.reloadData();
  };

  const handleReset = async () => {
    clearRolePager();
    reset();
    setSort1({ col: 'regDt', dir: 'DESC' });
    setSearchEnabled(false);
    setSelectedRole({});
    
    // 패널 데이터 초기화
    setPermissionPanelRows([]);
    setMenuPanelRows([]);
    
    // 상태 업데이트 완료 대기 (React의 배치 업데이트 처리)
    await new Promise(resolve => setTimeout(resolve, 0));

    roleSheetRef.current?.reloadData();
    rolePermissionSheetRef.current?.reloadData();
    roleMenuSheetRef.current?.reloadData();
  };

  // ───── 역할 저장 (체크된 행만 처리) ─────
  const handleRoleSave = async () => {
    const sheet = roleSheetRef.current;
    if (!sheet) return alert('시트가 초기화되지 않았습니다.');

    const result = await requiredValidate(sheet); // 컬럼 옵션 Required : 1 필수값 확인 
    
    if (!result.ok) {
      // 커스텀 알럿/토스트 등
      console.warn(result.errors);
      return;
    }
    
    try {
      const payload = buildCommonPayload(
        sheet,
        { idKey: 'roleId', nameKey: 'roleName', activeKey: 'delYn' },
        { statusMap: { Added: 'ADDED', Changed: 'CHANGED', Deleted: 'DELETED' } }
      );
      console.log('roleBulkData: ', payload);

      if (!payload.items.length) {
        return alert('변경된 데이터가 없습니다.');
      }
      

      const response = await axios.post('/role/grid/bulk/upsert', payload);
      if (response.status === 200) {
        alert('저장에 성공하였습니다');
        // 저장 후 데이터 재조회
        if (searchEnabled) await refetchRoles();
      }
      
    } catch (err: any) {
      alert(`저장 실패:\n${err?.__parsedMessage ?? '알 수 없는 오류입니다.'}`);
    }
  };

  // ───── 역할-권한 저장 (체크된 행만 처리) ─────
  const handleRolePermissionSave = async () => {
    const sheet = rolePermissionSheetRef.current;
    if (!sheet) return alert('시트가 초기화되지 않았습니다.');

    try {
      const payload = buildCommonPayload(
        sheet,
        { idKey: 'roleId', nameKey: 'roleName', activeKey: 'delYn' },
        { statusMap: { Added: 'ADDED', Changed: 'CHANGED', Deleted: 'DELETED' } }
      );

      if (!payload.items.length) {
        return alert('변경된 데이터가 없습니다.');
      }
      console.log('rolePermissionBulkData: ', payload);

      const response = await axios.post('/role-permission/grid/bulk/upsert', payload);
      if (response.status === 200) {
        alert('저장에 성공하였습니다');
        // 저장 후 데이터 재조회
        if (selectedRole?.roleId) {
          const permissionFilter = { roleIds: [selectedRole.roleId!] as string[] };
          await refetchRolePermissions({ filter: permissionFilter, page: permissionPage });
        }
      }
      
    } catch (err: any) {
      alert(`저장 실패:\n${err?.__parsedMessage ?? '알 수 없는 오류입니다.'}`);
    }
  };

  // ───── 역할-메뉴 저장 (체크된 행만 처리) ─────
  const handleRoleMenuSave = async () => {
    const sheet = roleMenuSheetRef.current;
    if (!sheet) return alert('시트가 초기화되지 않았습니다.');

    try {
      const payload = buildCommonPayload(
        sheet,
        { idKey: 'roleId', nameKey: 'roleName', activeKey: 'delYn' },
        { statusMap: { Added: 'ADDED', Changed: 'CHANGED', Deleted: 'DELETED' } }
      );

      if (!payload.items.length) {
        return alert('변경된 데이터가 없습니다.');
      }
      console.log('roleMenuBulkData: ', payload);

      const response = await axios.post('/role-menu/grid/bulk/upsert', payload);
      if (response.status === 200) {
        alert('저장에 성공하였습니다');
        // 저장 후 데이터 재조회
        if (selectedRole?.roleId) {
          const menuFilter = { roleIds: [selectedRole.roleId!] as string[] };
          await refetchRoleMenus({ filter: menuFilter, page: roleMenuPage });
        }
      }
    } catch (err: any) {
      alert(`롤 메뉴 저장 실패:\n${err?.__parsedMessage ?? '알 수 없는 오류입니다.'}`);
    }
  };

  // 컨텍스트: 상위에서 endpoints 기본 제공 → 각 카드에서 자기 sheetRef만 덮어쓰기
  const parent = useActionsDeps();

  //main 역할 sheet context
  const mappingProviderValue = useMemo(
    () => ({
      ...parent,
      sheetRef: roleSheetRef,
      getSelectedRows: () => roleSheetRef.current?.getRowsByChecked("select") ?? [],
      onSave: handleRoleSave,
      addRowInit: { select: 1, delYn: 'N' },
      deleteValidationCol: ['roleId'],
      sortConfig: {
        columns: SORT_COLS,
        directions: DIRS,
        currentSort: sort1,
        onSortChange: (newSort: { col: string; dir: 'ASC' | 'DESC' }) => {
          setSort1(newSort);
        }
      },
      buttonConfig: {
        showAddRow: true,
        showDeleteData: true,
        showSave: true,
        showClear: true,
        showSort: true
      }
    }),
    [parent, sort1]
  );

  //역할 권한 매핑 시트 context
  const permissionProviderValue = useMemo(
    () => ({
      ...parent,
      sheetRef: rolePermissionSheetRef,
      getSelectedRows: () => rolePermissionSheetRef.current?.getRowsByChecked("select") ?? [],
      onSave: handleRolePermissionSave,
      addRowInit: { select: 1, delYn: 'Y' },
      deleteValidationCol: ['roleId', 'permissionId'],
      buttonConfig: {
        showAddRow: false,
        showDeleteData: false,
        showSave: true,
        showClear: false,
        showSort: false
      }
    }),
    [parent]
  );

  //역할 메뉴 매핑 시트 context
  const roleMenuProviderValue = useMemo(
    () => ({
      ...parent,
      sheetRef: roleMenuSheetRef,
      getSelectedRows: () => roleMenuSheetRef.current?.getRowsByChecked("select") ?? [],
      onSave: handleRoleMenuSave,
      addRowInit: { select: 1, delYn: 'Y' },
      deleteValidationCol: ['roleId', 'menuId'],
      buttonConfig: {
        showAddRow: false,
        showDeleteData: false,
        showSave: true,
        showClear: false,
        showSort: false
      }
    }),
    [parent]
  );

  return (
      <Layout>
        <div className="p-4 space-y-4 korean-text">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">역할 매핑 관리</h1>
              <p className="text-gray-600 mt-2">역할 정보를 조회하고 관리합니다.</p>
            </div>
          </div>

          {/* 공통 검색 영역 */}
          <SearchCard
              fields={fields as any}
              values={values}
              onChange={onChange}
              onSearch={handleSearch}
              onReset={handleReset}
              loading={isLoading}
          />

          {/* 3개 시트 나란히 배치 레이아웃 */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-6">
            {/* 역할 목록 (메인 - 더 큰 비율) */}
            <Card className="xl:col-span-4 min-w-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>역할 목록</CardTitle>
                <ActionsCtx.Provider value={mappingProviderValue}>
                  <SheetActionBar />
                </ActionsCtx.Provider>
              </CardHeader>
              <CardContent className="overflow-hidden p-4">
                <div
                    className="w-full border border-gray-200 rounded-md"
                    style={{ height: 'clamp(400px, 60vh, 700px)' }}
                >
                  <IBSheetWrapper
                      id="roleMappingSheet"
                      el="roleMappingWrapper"
                      options={roleSheetOptions}
                      data={roleRows}
                      onLoad={(sheet: any) => {
                        console.log('🚀 [Role Sheet] 시트 초기화 완료, 데이터 건수:', roleRows.length);
                        roleSheetRef.current = sheet;
                        // 이벤트 바인딩
                        sheet.bind('onDblClick', roleOnDblClick);
                        sheet.bind('onAfterClick', roleOnAfterClick);
                        sheet.bind('onAfterLoad', () => {
                          console.log('🔄 [Role Sheet] onAfterLoad 이벤트 발생');
                          updateToggleButtonTexts();
                        });
                      }}
                  />
                </div>
                <Pagination
                    page={rolePage}
                    pages={rolePager.pages}
                    total={rolePager.total}
                    size={roleSize}
                    isLoading={isLoading}
                    setPage={setPage}
                    setSize={setSize}
                />
              </CardContent>
            </Card>

            {/* 역할별 권한 */}
            <Card className="xl:col-span-4 min-w-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>역할별 권한</CardTitle>
                <ActionsCtx.Provider value={permissionProviderValue}>
                  <SheetActionBar />
                </ActionsCtx.Provider>
              </CardHeader>
              <CardContent className="overflow-hidden p-4">
                <div
                    className="w-full border border-gray-200 rounded-md"
                    style={{ height: 'clamp(400px, 60vh, 700px)' }}
                >
                  <IBSheetWrapper
                      key={`role-permission-${selectedRole.roleId || 'none'}`}
                      id="rolePermissionSheet"
                      el="rolePermissionWrapper"
                      options={rolePermissionSheetOptions}
                      data={permissionPanelRows}
                      onLoad={(sheet: any) => {
                        rolePermissionSheetRef.current = sheet;
                        // 이벤트 바인딩
                        sheet.bind('onAfterChange', rolePermissionOnAfterChange);
                      }}
                  />
                </div>
                <Pagination
                    page={permissionPanelPage}
                    pages={Math.ceil((permissions?.length || 0) / permissionPanelSize)}
                    total={permissions?.length || 0}
                    size={permissionPanelSize}
                    isLoading={false}
                    setPage={setPermissionPanelPage}
                    setSize={setPermissionPanelSize}
                />
              </CardContent>
            </Card>

            {/* 롤 메뉴 */}
            <Card className="xl:col-span-4 min-w-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>롤 메뉴</CardTitle>
                <ActionsCtx.Provider value={roleMenuProviderValue}>
                  <SheetActionBar />
                </ActionsCtx.Provider>
              </CardHeader>
              <CardContent className="overflow-hidden p-4">
                <div
                    className="w-full border border-gray-200 rounded-md"
                    style={{ height: 'clamp(400px, 60vh, 700px)' }}
                >
                  <IBSheetWrapper
                      key={`role-menu-${selectedRole.roleId || 'none'}`}
                      id="roleMenuSheet"
                      el="roleMenuWrapper"
                      options={roleMenuSheetOptions}
                      data={menuPanelRows}
                      onLoad={(sheet: any) => {
                        roleMenuSheetRef.current = sheet;
                        // 이벤트 바인딩
                        sheet.bind('onAfterChange', roleMenuOnAfterChange);
                      }}
                  />
                </div>
                <Pagination
                    page={menuPanelPage}
                    pages={Math.ceil((masterMenus?.length || 0) / menuPanelSize)}
                    total={masterMenus?.length || 0}
                    size={menuPanelSize}
                    isLoading={false}
                    setPage={setMenuPanelPage}
                    setSize={setMenuPanelSize}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
  );
}
