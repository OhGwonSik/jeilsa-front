/**
 * 매핑 관련 공통 유틸리티 함수들
 */

export interface MappingData {
  delYn: boolean | 'Y' | 'N' | 1 | 0;
  [key: string]: any;
}

export interface MasterDataRow {
  id?: string;
  name?: string;
  [key: string]: any;
}

/**
 * 매핑 상태를 boolean으로 정규화
 */
export const normalizeMappingActive = (value: boolean | 'Y' | 'N' | 1 | 0): boolean => {
  return value === true || value === 'Y' || value === 1;
};

/**
 * 마스터 데이터와 매핑 데이터를 결합하여 시트용 행 데이터 생성
 */
export const createMappingRows = <T extends MasterDataRow>(
  masterData: T[],
  mappingMap: Map<string, MappingData>,
  targetId: string,
  options: {
    idField: string;
    nameField: string;
    additionalFields?: Record<string, any>;
  }
): any[] => {
  return masterData.map((item: T, i: number) => {
    const itemId = String(item[options.idField] ?? item.id ?? '');
    const mappingData = mappingMap.get(itemId);
    const hasMapping = !!mappingData;

    return {
      SEQ: i + 1,
      [options.idField]: itemId,
      [options.nameField]: item[options.nameField] ?? item.name ?? '',
      ...options.additionalFields,
      [targetId]: targetId,
      mappingStatus: hasMapping,
      delYn: hasMapping ? normalizeMappingActive(mappingData.delYn) : false,
      select: hasMapping ? 1 : 0,
      _originalMapping: mappingData || null,
      _status: '',
      regDt: item.regDt || item.createdAt,
      chgDt: item.chgDt || item.updatedAt,
      regId: item.regId || item.createdBy,
      chgId: item.chgId || item.updatedBy,
    };
  });
};

/**
 * 매핑 데이터를 Map 형태로 변환
 */
export const createMappingMap = (
  mappingRows: any[],
  idField: string,
  mappingIdField?: string
): Map<string, MappingData> => {
  return new Map(
    (Array.isArray(mappingRows) ? mappingRows : []).map((r: any) => [
      String(r[idField] ?? r.id),
      {
        delYn: r.delYn,
        mappingId: r[mappingIdField || 'mappingId'] ?? '',
        ...r,
      },
    ])
  );
};

/**
 * onDblClick 이벤트의 공통 처리 로직
 */
export const handleMappingDblClick = async <T>(
  sheet: any,
  evt: any,
  {
    idField,
    ensureMasterData,
    refetchMappings,
    loadMappingData,
  }: {
    idField: string;
    ensureMasterData: () => Promise<T>;
    refetchMappings: (id: string) => Promise<any>;
    loadMappingData: (masterData: T, mappingData: any, selectedId: string) => void;
  }
) => {
  if (!sheet) return;

  const { row } = evt;
  const rowData = sheet.getRowValue(row);
  const selectedId = rowData[idField];

  if (!selectedId) return;

  try {
    const masterData = await ensureMasterData();
    const mappingData = await refetchMappings(String(selectedId));
    loadMappingData(masterData, mappingData, String(selectedId));
  } catch (err: any) {
    alert(`매핑 데이터 조회 실패:\n${err?.__parsedMessage ?? '알 수 없는 오류입니다.'}`);
  }
};