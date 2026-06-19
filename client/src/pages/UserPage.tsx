import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import SearchCard from '@/components/common/CommonSelectCard';
import {Layout} from "@/components/layout/layout";
import axios from '@/common/axios/AxiosClient';
import {IBSheetWrapper} from '@/components/common/IBSheetWrapper';
import {baseSheetOptions, commonColumns, commonSystemFields} from '@/components/common/SheetOptions';
import SheetActionBar from '@/components/common/SheetActionBar';
import {ActionsCtx, useActionsDeps} from '@/components/common/SheetActionContext';
import {useMasterRoles} from '@/hooks/masterData/useMasterRoles';
import {usePager} from '@/hooks/usePager';
import Pagination from '@/components/common/Pagination';
import {dateStr, isOn} from "@/common/utils/dateFormatUtil";
import {requiredValidate} from '@/common/utils/ibsheetValidation';
import {useMappingSave} from '@/hooks/useMappingSave';
import {useSearchForm} from "@/hooks/useSelect.ts";


const toggleDelYn = async (memberId: number, action: 'enable' | 'disable') => {
  await axios.post(`/user/${memberId}/${action}`);
};

const toggleUserStatus = async (memberId: number) => {
  await axios.post(`/user/${memberId}/unlock`);
};

export default function UserPage() {
  const userSheetRef = useRef<any>(null);
  const userOrganizationSheetRef = useRef<any>(null);
  const userRoleSheetRef = useRef<any>(null);

  // 마스터 데이터 조회 (캐싱 정책 적용)
  const { roles, refetch: refetchRoles,} = useMasterRoles();

  // 저장 관리 훅
  const { saveWithReload, createSaveConfigs } = useMappingSave();

  const ensureMasterData = async () => {
    // 캐시된 데이터가 있으면 그대로 사용 (refetch 불필요)
    const hasRoles = Array.isArray(roles) && roles.length > 0;
    
    if (hasRoles) {
      return { roleData: roles };
    }

    // 필요한 데이터만 선택적으로 refetch
    const promises = [];
    if (!hasRoles) promises.push(refetchRoles());
    
    const results = await Promise.all(promises);

    let roleData = roles;
    
    let resultIndex = 0;
    if (!hasRoles) {
      roleData = results[resultIndex]?.data ?? [];
    }

    return { roleData };
  };

  // 선택된 사용자 상태
  const [selectedUser, setSelectedUser] = useState<{ memberId?: number; name?: string }>({});
  
  // selectedUser.memberId를 안정적인 값으로 메모이제이션
  const selectedUserId = useMemo(() => selectedUser?.memberId, [selectedUser?.memberId]);
  
  // 패널 데이터 상태
  const [rolePanelRows, setRolePanelRows] = useState<any[]>([]);

  // 패널용 페이지네이션 상태
  const [rolePanelPage, setRolePanelPage] = useState(1);
  const [rolePanelSize, setRolePanelSize] = useState(10);


  // 정렬 설정
  const SORT_COLS = [
    { label: '생성일', value: 'regDt' },
    { label: '수정일', value: 'chgDt' },
    { label: '이메일', value: 'email' },
    { label: '사용자명', value: 'name' },
  ] as const;

  const DIRS = [
    { label: '오름차순', value: 'ASC' },
    { label: '내림차순', value: 'DESC' },
  ] as const;

  const [sort1, setSort1] = useState<{ col: string; dir: 'ASC'|'DESC' }>({ 
    col: 'regDt', 
    dir: 'DESC' 
  });

  const buildSortBy = (s1 = sort1) => {
    const parts: string[] = [];
    if (s1.col) parts.push(`${s1.col}:${s1.dir}`);
    return parts.join(',');
  };

  // 검색폼
  const { values, onChange, reset } = useSearchForm({
    email: '',
    name: '',
    delYn: '',
    sortBy: buildSortBy(), // 정렬 정보 추가
  });

  type IdFilter = {
    memberIds?: number[];
    delYn? :string;
  };

  // ───── Users: 서버 페이징 ─────
  const transformUsers = useCallback((list: any[]) => {
    return Array.isArray(list)
      ? list.map((user: any, i: number) => {
          const roles = Array.isArray(user.roles) && user.roles.length ? user.roles[0] : {};
          return {
            SEQ: i + 1,
            memberId: user.memberId as number ,
            userId: user.userId ??'',
            email: user.email ?? '',
            name: user.name ?? '',
            telNo : user.telNo,
            memberStatusCd : user.memberStatusCd,
            delYn: user.delYn,
            regDt: dateStr(user.regDt),
            chgDt: dateStr(user.chgDt),
            delDt: dateStr(user.delDt),
            regId: user.regId,
            chgId: user.chgId,
            delId: user.delId
          };
        })
      : [];
  }, []);

  // usePager에서 원본 setPage, setSize 함수를 별도로 받아옴
  const {
    rows: userRows,
    pager: userPager,
    isLoading,
    refetch: refetchUsers,
    setFilter: updateSearchFilter,
    page: userPage,
    setPage: originalSetPage,
    size: userSize,
    setSize: originalSetSize,
    clear: clearPager,
  } = usePager({
    endpoint: '/member/search',
    initialFilter: { ...values, sortBy: buildSortBy() },
    initialPage: 1,
    initialSize: 20,
    autoLoad: false,
    transform: transformUsers,
  });

  // 페이지/사이즈 변경 시 현재 정렬 정보를 포함하여 필터 업데이트
  const setPage = useCallback((page: number | ((prevPage: number) => number)) => {
    const nextPage = typeof page === 'function' ? page(userPage) : page;
    const currentSortBy = buildSortBy();
    updateSearchFilter({ sortBy: currentSortBy }, { resetPage: false });
    originalSetPage(nextPage);
  }, [userPage, buildSortBy, updateSearchFilter, originalSetPage]);

  const setSize = useCallback((size: React.SetStateAction<number>) => {
    const nextSize = typeof size === 'function' ? size(userSize) : size;
    const currentSortBy = buildSortBy();
    updateSearchFilter({ sortBy: currentSortBy }, { resetPage: true });
    originalSetSize(nextSize);
  }, [userSize, buildSortBy, updateSearchFilter, originalSetSize]);


  // ───── Roles: 서버 페이징 ─────
  const transformUserRoles = useCallback((list: any[]) => {
    return Array.isArray(list)
        ? list.map((r: any) => {
          const isActive = !!r.memberId && (r.delYn === 'N' || r.delYn === 0 || r.delYn === false);
          return {
            roleId: r.roleId ?? r.id,
            roleName: r.roleName ?? '',
            memberId: r.memberId,
            delYn: r.delYn,
            userRoleId: r.userRoleId ?? r.mappingId ?? '',
            mappingStatus: isActive, // ✅ 활성 매핑만 true
            select: isActive ? 1 : 0, // ✅ 활성 매핑만 체크
            _originalMapping: r.memberId ? r : null,
            _status: '',
            regDt: dateStr(r.regDt),
            chgDt: dateStr(r.chgDt),
            delDt: dateStr(r.delDt),
            regId: r.regId, chgId: r.chgId, delId: r.delId
          };
        })
        : [];
  }, []);

  const {
    rows: roleRows,
    pager: rolePager,
    isLoading: isLoadingRole,
    refetch: refetchUserRolesGrid,
    setFilter: setRoleFilter,
    page: rolePage,
    setPage: setRolePage,
    size: roleSize,
    setSize: setRoleSize,
  } = usePager<IdFilter>({ 
    endpoint: 'member/role/grid/search',
    initialFilter: { memberIds: [] },
    initialPage: 1,
    initialSize: 10,
    autoLoad: false,
    transform: transformUserRoles,
  });


  // roleRows와 마스터 역할 데이터를 병합하여 패널에 표시 (페이지네이션 적용)
  useEffect(() => {
    // 사용자가 선택되지 않은 경우 패널 데이터 초기화
    // 마스터 역할 데이터가 있어야 병합 가능
    if (!selectedUserId || !Array.isArray(roles) || roles.length === 0) {
      setRolePanelRows([]);
      return;
    }

    const mid = Number(selectedUserId);

    // 매핑 데이터를 roleId로 인덱싱 (roleRows가 비어있어도 처리)
    const mappingMap = new Map<number, any>();
    if (Array.isArray(roleRows) && roleRows.length > 0) {
      roleRows.forEach((m) => {
        const rid = Number(m.roleId);
        if (rid && Number(m.memberId) === mid) {
          mappingMap.set(rid, m);
        }
      });
    }

    // 마스터 데이터 페이지네이션 적용
    const startIndex = (rolePanelPage - 1) * rolePanelSize;
    const endIndex = startIndex + rolePanelSize;
    const pagedRoles = roles.slice(startIndex, endIndex);

    // 페이지별 마스터 데이터와 매핑 데이터를 병합 (매핑 데이터가 없어도 마스터 데이터는 표시)
    const panelData = pagedRoles.map((masterRole, index) => {
      const rid = Number(masterRole.roleId);
      const mapping = mappingMap.get(rid) || null;      // delYn=Y 도 포함해서 들어옴
      const hadMappingEver = !!mapping;                 // ⬅️ 핵심: 기존 존재 여부
      const isActive = hadMappingEver && (mapping.delYn === 'N' || mapping.delYn === 0 || mapping.delYn === false);

      return {
        SEQ: startIndex + index + 1,
        roleId: rid,
        roleName: masterRole.roleName,
        description: masterRole.description || '',
        memberId: mid,

        delYn: mapping ? (mapping.delYn ?? 'N') : 'N',

        // 체크/상태는 '활성' 기준
        mappingStatus: isActive ? 1 : 0,
        select: isActive ? 1 : 0,
        origSelect: isActive ? 1 : 0,

        // 기존 매핑은 객체 자체로 보존(단일 id 없음)
        _originalMapping: mapping,

        // 디버깅/저장보정용
        hadMappingEver: hadMappingEver ? 1 : 0,

        _status: '',
        regDt: mapping ? dateStr(mapping.regDt) : '',
        chgDt: mapping ? dateStr(mapping.chgDt) : '',
        delDt: mapping ? dateStr(mapping.delDt) : '',
        regId: mapping?.regId,
        chgId: mapping?.chgId,
        delId: mapping?.delId,
      };
    });

    setRolePanelRows(panelData);
  }, [roleRows, roles, rolePanelPage, rolePanelSize, selectedUserId]);

  // ✅ IBSheetWrapper가 자동으로 데이터를 주입하므로 별도 useEffect 불필요
  // 하지만 사용자 시트의 버튼 텍스트는 별도로 업데이트 필요
  // useEffect(() => {
  //   if (userSheetRef.current && userRows.length > 0) {
  //     const sig = JSON.stringify(userRows?.map(r => [r.memberId, r.email, r.delYn, r.memberStatusCd]));
  //     if (sig !== lastUserRowsRef.current) {
  //       lastUserRowsRef.current = sig;
  //       // IBSheetWrapper가 데이터를 이미 로드했으므로 버튼 텍스트만 업데이트
  //       // setTimeout(() => updateToggleButtonTexts(), 100);
  //     }
  //   }
  // }, [userRows]);

  // ───── 시트 컬럼 옵션 ─────
  const userSheetOptions = {
    ...baseSheetOptions,
    Cols: [
      ...commonColumns, // 기본 컬럼 (SEQ, select 등)
      { Header: 'memberId', Name: 'memberId', Type: 'Text', Align: 'Left', Width: 100, CanEdit: 0 ,Visible:0},
      { Header: '아이디', Name: 'userId', Type: 'Text', Align: 'Left', Width: 170, CanEdit: 0 ,Required: 1},
      { Header: "이름",      Name: "name",      Align: "Center", Width: 100 ,CanEdit: 1,Required: 1},
      { Header: '이메일', Name: 'email', Type: 'Text', Align: 'Left', Width: 170, CanEdit: 1},
      { Header: "전화번호",  Name: "telNo",     Align: "Center", Width: 100 },
      { Header: '비밀번호', Name: 'userPw', Type: 'Pass', Align: 'Left', Width: 100, CanEdit: 1 ,Required: 1 },
      { Header: "삭제 여부", Name: "delYn", Type: "Text", Align: "Center", Width: 80, CanEdit : 1},
      // { Header: '계정 활성화', Name: 'toggleActiveBtn', Type: 'Button', ButtonText: '활성화', Width: 110 },
      { Header: '계정상태', Name: 'memberStatusCd', Type: 'Text', Align: 'Center', Width: 80, Visible: 0 },
      ...commonSystemFields, // 기본 날짜 컬럼 (regDt, chgDt)
    ],
  };

  const roleSheetOptions = {
    ...baseSheetOptions,
    Cols: [
      ...commonColumns, // 기본 컬럼 (SEQ, select 등)
      { Header: '역할', Name: 'roleName', Type: 'Text', Align: 'Center', Width: 140, CanEdit: 0 },
      { Header: '설명', Name: 'description', Type: 'Text', Align: 'Center', Width: 140, CanEdit: 0 },
      { Header: '매핑 상태', Name: 'mappingStatus', Type: 'Bool', Align: 'Center', Width: 80, CanEdit: 0 },
      { Header: '삭제 여부', Name: 'delYn', Type: 'Text', Align: 'Center', Width: 80, CanEdit: 0 ,Visible: 0 },
      { Header: '역할pk', Name: 'roleId', Type: 'Text', Align: 'Center', Width: 120, CanEdit: 0, Visible: 0 },
      { Header: '유저역할pk', Name: 'userRoleId', Type: 'Text', Align: 'Center', Width: 120, CanEdit: 0, Visible: 0 },
      { Header: '상태', Name: '_status', Type: 'Text', Align: 'Center', Width: 80, Visible: 0 },
    ],
  };


  // 패널 재로딩을 위한 공통 함수
  const loadUserPanels = async (selectedMemberId: number) => {
    const filter: IdFilter = { memberIds: [selectedMemberId] }; // OK
    setRoleFilter(filter);
    setRolePage(1);
    await refetchUserRolesGrid({ filter, page: 1 });
  };


  // ───── 시트 이벤트 핸들러 ─────
  // const userOnAfterLoad = () => updateToggleButtonTexts();

  const userRoleOnAfterChange = (evt: any) => {
    const sheet = userRoleSheetRef.current;
    if (!sheet || evt.col !== 'select') return;

    const { row } = evt;
    const isActive  = [1,'1',true].includes(sheet.getValue(row,'select'));
    const wasActive = [1,'1',true].includes(sheet.getValue(row,'origSelect'));

    const hadMappingEver =
        !!sheet.getValue(row, '_originalMapping') ||
        Number(sheet.getValue(row, 'hadMappingEver')) === 1;

    // 초기화
    sheet.setValue(row, 'Added', 0);
    sheet.setValue(row, 'Changed', 0);
    sheet.setValue(row, 'Deleted', 0);
    sheet.setValue(row, '_status', '', 1);

    if (wasActive && !isActive) {
      // 활성 → 비활성
      sheet.setValue(row, '_status', 'Deleted', 1);
      sheet.setValue(row, 'Deleted', 1, 1);
      sheet.setValue(row, 'delYn', 'Y', 1);
      sheet.setValue(row, 'mappingStatus', 0, 1);
    } else if (!wasActive && isActive) {
      if (hadMappingEver) {
        // 비활성(기존 존재) → 재활성 = Changed
        sheet.setValue(row, '_status', 'Changed', 1);
        sheet.setValue(row, 'Changed', 1, 1);
      } else {
        // 진짜 신규
        sheet.setValue(row, '_status', 'Added', 1);
        sheet.setValue(row, 'Added', 1, 1);
      }
      sheet.setValue(row, 'delYn', 'N', 1);
      sheet.setValue(row, 'mappingStatus', 1, 1);
    }

    // 디버깅
    const dbg = sheet.getRowValue(row);
    console.log('[ROLE-TOGGLE]', {
      wasActive, isActive, hadMappingEver,
      _status: dbg._status, delYn: dbg.delYn
    });
  };



  const userOnDblClick = async (evt: any) => {
    const sheet = userSheetRef.current;
    if (!sheet) return;
    const { col, row } = evt;
    if (col === 'name') return;
    const rowData = sheet.getRowValue(row);
    setSelectedUser({ memberId: rowData.memberId, name: rowData.name || '' });
    
    // 패널 데이터 즉시 초기화 (이전 사용자 데이터 제거)
    setRolePanelRows([]);
    userRoleSheetRef.current?.removeAll?.();

    // 패널 페이지 초기화
    setRolePanelPage(1);

    try {
      await loadUserPanels(rowData.memberId);
    } catch (err: any) {
      alert(`매핑 데이터 조회 실패:\n${err?.__parsedMessage ?? '알 수 없는 오류입니다.'}`);
    }
  };

  const userOnAfterClick = async (evt: any) => {
    const sheet = userSheetRef.current;
    if (!sheet) return;
    const { col, row } = evt;
    const rowData = sheet.getRowValue(row);

    if (col === 'toggleActiveBtn') {
      const currentlyOn = isOn(rowData.delYn);
      const action = currentlyOn ? 'disable' : 'enable';
      const label = currentlyOn ? '비활성화' : '활성화';
      if (!confirm(`사용자를 ${label}하시겠습니까?`)) return;

      try {
        await toggleDelYn(rowData.memberId, action);
        alert(`사용자 ${label} 완료`);
        await refetchUsers();
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? `사용자 ${label}에 실패했습니다.`;
        alert(`${label} 실패: ${msg}\n저장 실패:\n${err?.__parsedMessage ?? '알 수 없는 오류입니다.'}`);
      }
    }
  };

  const userOnButtonClick = async (evt: any) => {
    const sheet = userSheetRef.current;
    if (!sheet) return;
    const { col, row } = evt;
    const rowData = sheet.getRowValue(row);
    if (col !== 'name') return;

    const status = String(rowData?.memberStatusCd ?? '').toUpperCase();

    // 버튼은 ACTIVE에서 숨기더라도, 혹시 모를 클릭 이벤트 대비 가드
    if (status === 'ACTIVE') return;

    // LOCKED일 때만 API 호출
    if (status !== 'LOCKED') return;

    const label = '잠금 해제';
    if (!confirm(`사용자를 ${label}하시겠습니까?`)) return;

    try {
      await toggleUserStatus(rowData.memberId);
      alert(`사용자 ${label} 완료`);
      await refetchUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? `사용자 ${label}에 실패했습니다.`;
      alert(`${label} 실패: ${msg}`);
    }
  }


  // ───── 검색 ─────
  const handleSearch = async () => {
    const next = { ...values, sortBy: buildSortBy() };
    
    updateSearchFilter(next, { resetPage: true });
    await refetchUsers({ filter: next, page: 1 });
    
    // 패널 상태 초기화
    userRoleSheetRef.current?.reloadData();
    setRolePanelRows([]);
    setSelectedUser({});
  };

  const handleReset = () => {
    clearPager(); // pager/rows/page/size 초기화 + 다음 effect 1회 무시
    reset();
    setSort1({ col: 'regDt', dir: 'DESC' });
    setSelectedUser({});

    // 시트 데이터 초기화
    userSheetRef.current?.reloadData();
    userOrganizationSheetRef.current?.reloadData();
    userRoleSheetRef.current?.reloadData();
    
    // 패널 데이터 초기화
    setRolePanelRows([]);
  };

  // ───── 사용자 저장 (새로운 훅 사용) ─────
  const handleUserSave = async () => {
    const sheet = userSheetRef.current;
    if (!sheet) return alert('시트가 초기화되지 않았습니다.');

    // 유효성 검사
    const result = await requiredValidate(sheet, {
      defaultMode: 'always',
      perColumnMode: {
        password: 'add-only',
        newPassword: 'touched-only',
      },
    });

    if (!result.ok) {
      console.warn(result.errors);
      return;
    }

    // 새로운 훅을 사용한 저장
    try {
      await saveWithReload(userSheetRef, {
        ...createSaveConfigs.user(selectedUser?.memberId),
        onSuccess: async () => {
          // 사용자 목록 새로고침
          await refetchUsers();
          
          // 선택된 사용자가 있으면 패널 재로딩
          if (selectedUser?.memberId) {
            await loadUserPanels(selectedUser.memberId);
          }
        }
      });
      
    } catch (error) {
      console.error('사용자 저장 실패:', error);
    }
  };


  // ───── 역할 매핑 저장 (새로운 훅 사용) ─────
  const handleUserRoleSave = async () => {
    if (!selectedUser?.memberId) return alert('먼저 사용자를 선택해주세요.');

    try {
      await saveWithReload(
          userRoleSheetRef,
          {
            ...createSaveConfigs.userRole(selectedUser.memberId),
            onSuccess: async () => {
              // 역할 매핑 데이터 재조회 (useEffect가 자동으로 마스터 데이터와 병합)
              const filter = { userIds: [selectedUser.memberId!] as string[] };
              await refetchUserRolesGrid({ filter, page: rolePage });
            }
          }
      );
    } catch (error) {
      console.error('역할 매핑 저장 실패:', error);
    }
  };


  // ───── Provider Contexts ─────
  const parent = useActionsDeps();

  const userMappingProviderValue = useMemo(
    () => ({
      ...parent,
      sheetRef: userSheetRef,
      getSelectedRows: () => userSheetRef.current?.getRowsByChecked('select') ?? [],
      onClearAll: async () => {
        userSheetRef.current?.removeAll?.();
        userRoleSheetRef.current?.removeAll?.();
        setRolePanelRows([]);
      },
      onSave: handleUserSave,
      onAddRow: async () => {
        const sheet = userSheetRef.current;
        if (sheet?.addRow) {
          const newRow = sheet.addRow({ init: { select: 1, delYn: true } });
          ([
            ['email', { CanEdit: 1 }],
            ['password', { CanEdit: 1 }],
            ['name', { CanEdit: 1 }],
          ] as const).forEach(([col, attrs]) => {
            if (sheet.getColIndex?.(col) >= 0) {
              Object.entries(attrs).forEach(([k, v]) => sheet.setAttribute(newRow, col, k, v));
            }
          });
        }
      },
      deleteValidationCol: ['memberId'],
      sortConfig: {
        columns: SORT_COLS,
        directions: DIRS,
        currentSort: sort1,
        onSortChange: (newSort: { col: string; dir: 'ASC' | 'DESC' }) => {
          setSort1(newSort);
          // 정렬 상태만 업데이트, 자동조회는 하지 않음
        }
      },
      buttonConfig: {
        showAddRow: false,      // 행 추가 버튼 표시
        showDeleteData: false,  // 데이터 삭제 버튼 표시
        showSave: false,        // 저장 버튼 표시
        showClear: false,       // 초기화 버튼 표시
        showSort: true         // 정렬 컨트롤 표시
      },
    }),
    [parent, roles, sort1, buildSortBy, updateSearchFilter]
  );


  const userRoleProviderValue = useMemo(
    () => ({
      sheetRef: userRoleSheetRef,
      getSelectedRows: () => userRoleSheetRef.current?.getRowsByChecked('select') ?? [],
      onClearAll: () => userRoleSheetRef.current?.removeAll?.(),
      onSave: handleUserRoleSave,
      onAddRow: () => userRoleSheetRef.current?.addRow?.({ init: { select: 1 } }),
      deleteValidationCol: ['roleId'],
      buttonConfig: {
        showAddRow: false,      // 행 추가 버튼 표시
        showDeleteData: false,  // 데이터 삭제 버튼 표시
        showSave: true,        // 저장 버튼 표시
        showClear: false,       // 초기화 버튼 표시
        showSort: false         // 정렬 컨트롤 표시
      }
    }),
    [selectedUser.memberId]
  );

  return (
      <Layout>
        <div className="p-4 space-y-4 korean-text">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">사용자 매핑 관리</h1>
              <p className="text-gray-600 mt-2">사용자 정보를 조회하고 관리합니다.</p>
            </div>
          </div>

          {/* 검색 */}
          <SearchCard
              fields={[
                { type: 'input', name: 'email', label: '이메일', placeholder: '이메일을 입력하세요' },
                { type: 'input', name: 'name', label: '사용자명', placeholder: '사용자명을 입력하세요' },
                {
                  type: 'select',
                  name: 'delYn',
                  label: '활성 상태',
                  options: [
                    { label: '활성', value: 'N' },
                    { label: '비활성', value: 'Y' },
                  ],
                },
              ] as const}
              values={values}
              onChange={(name, value) => {
                onChange(name, value);
                // sortBy는 자동으로 최신 상태로 업데이트
                if (name !== 'sortBy') {
                  onChange('sortBy', buildSortBy());
                }
              }}
              onSearch={handleSearch}
              onReset={handleReset}
              loading={isLoading}
          />

          {/* 레이아웃 */}
          <div className="flex flex-col xl:flex-row gap-4 xl:gap-6">
            {/* 사용자 목록 */}
            <Card className="flex-1 xl:flex-[3] min-w-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>사용자 목록</CardTitle>
                <ActionsCtx.Provider value={userMappingProviderValue}>
                  <SheetActionBar />
                </ActionsCtx.Provider>
              </CardHeader>
              <CardContent className="overflow-hidden p-4">
                <div
                    className="w-full border border-gray-200 rounded-md"
                    style={{ height: 'clamp(400px, 50vh, 600px)' }}
                >
                  <IBSheetWrapper
                      id="userSheet"
                      el="userWrapper"
                      options={userSheetOptions}
                      data={userRows}
                      onLoad={(sheet: any) => {
                        userSheetRef.current = sheet;
                        // userSheetRef.current.bind('onAfterLoad', userOnAfterLoad);
                        userSheetRef.current.bind('onDblClick', userOnDblClick);
                        userSheetRef.current.bind('onAfterClick', userOnAfterClick);
                        userSheetRef.current.bind('onButtonClick', userOnButtonClick);
                      }}
                  />
                </div>
                <Pagination
                    page={userPage}
                    pages={userPager.pages}
                    total={userPager.total}
                    size={userSize}
                    isLoading={isLoading}
                    setPage={setPage}
                    setSize={setSize}
                />
              </CardContent>
            </Card>

            {/* 우측 패널 */}
            <div className="flex-1 xl:flex-[2] flex flex-col min-h-0 space-y-4">
              {/* 유저별 역할 */}
              <Card className="flex-1 min-h-0 flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle>유저별 역할</CardTitle>
                  <ActionsCtx.Provider value={userRoleProviderValue}>
                    <SheetActionBar />
                  </ActionsCtx.Provider>
                </CardHeader>
                <CardContent className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                  <div className="w-full flex-1 min-h-0 border border-gray-200 rounded-md overflow-hidden">
                    <IBSheetWrapper
                        key={`role-${selectedUser.memberId || 'none'}`}
                        id="userRoleSheet"
                        el="userRoleWrapper"
                        options={roleSheetOptions}
                        data={rolePanelRows}
                        onLoad={(sheet: any) => {
                          userRoleSheetRef.current = sheet;
                          userRoleSheetRef.current.bind('onAfterChange', userRoleOnAfterChange);
                        }}
                    />
                  </div>
                  {/* 역할 패널용 페이지네이션 */}
                  <Pagination
                      page={rolePanelPage}
                      pages={Math.ceil((roles?.length || 0) / rolePanelSize)}
                      total={roles?.length || 0}
                      size={rolePanelSize}
                      isLoading={false}
                      setPage={setRolePanelPage}
                      setSize={setRolePanelSize}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
  );
}