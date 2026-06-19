// components/common/SheetActionBar.tsx
import { MutableRefObject, useCallback } from "react";
import { Button } from "@/components/ui/button";
import axios from "@/common/axios/AxiosClient";
import { useActionsDeps } from "@/components/common/SheetActionContext";

export type SaveRequest = {
  endpoint: string;
  data: any;
  method?: 'post' | 'put' | 'patch' | 'delete';
};

export type SaveStrategy<Row = any> = {
  buildRequests: (rows: Row[], sheet?: any) => SaveRequest[];
};

export type ActionsDeps = {
  sheetRef?: MutableRefObject<any> | null;
  endpoints?: { saveSelected?: string };
  getSelectedRows?: () => any[];
  onClearAll?: () => void;
  addRowInit?: Record<string, any> | (() => Record<string, any>);
  addRowAttributes?: Record<string, any>;
  deleteValidationCol :  string[]; // ← 추가: PK 후보 키들 (예: ['roleId'])
  saveStrategy?: SaveStrategy;
  onSave?: () => void; // 커스텀 저장 핸들러
  onAddRow?: () => void; // 행 추가 이벤트
  // onDeleteRow?: () => void; // 행 삭제 이벤트
  onDeleteData?: () => void; // 데이터 삭제 이벤트
  // 정렬 컨트롤 관련
  sortConfig?: {
    columns: readonly { readonly label: string; readonly value: string }[] | { label: string; value: string }[];
    directions: readonly { readonly label: string; readonly value: 'ASC' | 'DESC' }[] | { label: string; value: 'ASC' | 'DESC' }[];
    currentSort: { col: string; dir: 'ASC' | 'DESC' };
    onSortChange: (sort: { col: string; dir: 'ASC' | 'DESC' }) => void;
  };
  // 버튼 표시 제어
  buttonConfig?: {
    showAddRow?: boolean;      // 행 추가 버튼 표시 여부 (기본: true)
    showDeleteData?: boolean;  // 데이터 삭제 버튼 표시 여부 (기본: true)
    showSave?: boolean;        // 저장 버튼 표시 여부 (기본: true)
    showClear?: boolean;       // 초기화 버튼 표시 여부 (기본: true)
    showSort?: boolean;        // 정렬 컨트롤 표시 여부 (기본: sortConfig 존재 여부에 따름)
  };
};

export default function SheetActionBar() {
  const {
    sheetRef,
    endpoints,
    getSelectedRows,
    onClearAll,
    addRowInit,
    addRowAttributes,
    deleteValidationCol,
    saveStrategy,
    onSave,
    onAddRow,
    // onDeleteRow,
    onDeleteData,
    sortConfig,
    buttonConfig
  } = useActionsDeps();

  const safeGetSelected = useCallback(() => {
    if (getSelectedRows) return getSelectedRows();
    const sheet = sheetRef?.current;
    if (!sheet) return [];
    return sheet.getRowsByChecked ? sheet.getRowsByChecked("select") : [];
  }, [getSelectedRows, sheetRef]);

  const withNoSubmit = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const handleAddRow = () => {
    if (onAddRow) {
      onAddRow();
      return;
    }
    
    const sheet = sheetRef?.current;
    if (sheet?.addRow) {
      // addRowInit이 함수인 경우 실행하여 최신 값 얻기
      const resolvedInit = typeof addRowInit === 'function' ? addRowInit() : (addRowInit || {});
      const initData = { select: 1, ...resolvedInit };
      
      const newRow = sheet.addRow({ init: initData });
      if (addRowAttributes) {
        Object.entries(addRowAttributes).forEach(([col, attrs]) => {
          if (sheet.getColIndex?.(col) >= 0) {
            Object.entries(attrs).forEach(([attrName, attrValue]) => {
              sheet.setAttribute(newRow, col, attrName, attrValue);
            });
          }
        });
      }
    }
  };
  
  //행삭제
  // const handleDelRow = () => {
  //   if (onDeleteRow) {
  //     onDeleteRow();
  //     return;
  //   }
  //   debugger;
  //   const sheet = sheetRef?.current;
  //   const rows = safeGetSelected();
  //   if (rows.length === 0) {
  //     return alert("삭제할 행을 선택해주세요.");
  //   }
  //   rows.forEach((r: any) => sheet.removeRow(r));
  // };

  function hasAnyId(data: any, keys: string[]) {
    return keys.some((k) => {
      const v = data?.[k];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });
  }

  // 선택된 행 삭제(신규행은 removeRow, 기존행은 deleteRow로 마킹)
  const handleDeleteData = () => {
    if (onDeleteData) {
      onDeleteData();
      return;
    }
    
    const sheet = sheetRef?.current;
    if (!sheet) return;

    const rows = safeGetSelected(); // ex) getRowsByChecked("select")
    if (!rows || rows.length === 0) {
      alert("삭제할 행을 선택해주세요.");
      return;
    }
    if (!confirm(`선택된 ${rows.length}개 행을 삭제하시겠습니까?`)) return;
    // deleteValidationCol 없으면 기본 후보키를 사용 (프로젝트에 맞게 조정)
    const idKeys = Array.isArray(deleteValidationCol) && deleteValidationCol.length ? deleteValidationCol : ['id'];
    
    rows.forEach((r: any) => {
      const data = sheet.getRowValue(r) || {};

      if (hasAnyId(data, idKeys)) {
        // 기존 저장 행 → 서버 반영을 위한 삭제 마킹
        sheet.deleteRow(r);
      } else {
        // 신규(미저장) 행 → 그냥 제거
        sheet.removeRow(r);
      }
    })
  };

  const handleSaveSelected = async () => {
    // 1순위: onSave 커스텀 핸들러
    if (onSave) {
      return onSave();
    }

    // 2순위: saveStrategy
    // 3순위: endpoints.saveSelected
    const sheet = sheetRef?.current;
    const selected = safeGetSelected();
    const rows = selected?.map((r: any) => sheet.getRowValue(r));
    
    if (!rows?.length) return alert("저장할 행이 없습니다.");
    if (!confirm("선택한 행을 저장하시겠습니까?")) return;

    try {
      let requests: SaveRequest[] = [];

      if (saveStrategy) {
        requests = saveStrategy.buildRequests(rows, sheet);
      } else if (endpoints?.saveSelected) {
        // 기본 로직: 단일은 단일 리스트, 다중은 배열로 전송

        if (rows.length === 1) {
          // 단일 행: 배열에 담지 않고 단일 객체로 전송
          requests = [{
            endpoint: endpoints.saveSelected,
            data: rows[0],
            method: 'post'
          }];
        } else {
          // 다중 행: items 배열로 전송
          requests = [{
            endpoint: endpoints.saveSelected,
            data: { items: rows },
            method: 'post'
          }];
        }
      } else {
        return alert("저장 엔드포인트가 설정되지 않았습니다.");
      }

      for (const req of requests) {
        await axios[req.method ?? 'post'](req.endpoint, req.data);
      }

      alert("선택한 행이 저장되었습니다.");
      sheet.loadSearchData({data : []})
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleClear = () => {
    if (onClearAll) return onClearAll();
    const sheet = sheetRef?.current;
    sheet?.loadSearchData?.();
  };

  // 버튼 표시 여부 결정 (기본값: true)
  const showSort = buttonConfig?.showSort !== false && sortConfig;
  const showAddRow = buttonConfig?.showAddRow !== false;
  const showDeleteData = buttonConfig?.showDeleteData !== false;
  const showSave = buttonConfig?.showSave !== false;
  const showClear = buttonConfig?.showClear !== false;

  return (
    <div className="flex items-center gap-3">
      {/* 정렬 컨트롤 */}
      {showSort && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
            <span className="text-xs font-medium text-gray-700">정렬</span>
          </div>
          <select
            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            value={sortConfig!.currentSort.col}
            onChange={(e) => sortConfig!.onSortChange({ 
              col: e.target.value, 
              dir: sortConfig!.currentSort.dir 
            })}
          >
            {sortConfig!.columns.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            value={sortConfig!.currentSort.dir}
            onChange={(e) => sortConfig!.onSortChange({ 
              col: sortConfig!.currentSort.col, 
              dir: e.target.value as 'ASC' | 'DESC' 
            })}
          >
            {sortConfig!.directions.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* 기존 액션 버튼들 */}
      <div className="flex gap-1">
        {showAddRow && (
          <Button type="button" onClick={withNoSubmit(handleAddRow)} variant="outline" size="sm">행 추가</Button>
        )}
        {/* <Button type="button" onClick={withNoSubmit(handleDelRow)} variant="outline" size="sm" className="text-orange-600">행 삭제</Button> */}
        {showDeleteData && (
          <Button type="button" onClick={withNoSubmit(handleDeleteData)} variant="outline" size="sm" className="text-red-600">데이터 삭제</Button>
        )}
        {showSave && (
          <Button type="button" onClick={withNoSubmit(handleSaveSelected)} variant="outline" size="sm" className="text-green-600">저장</Button>
        )}
        {showClear && (
          <Button type="button" onClick={withNoSubmit(handleClear)} variant="outline" size="sm">초기화</Button>
        )}
      </div>
    </div>
  );
}
