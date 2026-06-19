// src/utils/commonSheetTransformer.ts

export type CommonStatus = 'Added' | 'Changed' | 'Deleted';

export interface CommonFieldKeys {
  idKey?: string;        // 기본값: 'id'
  nameKey?: string;      // 기본값: 'name'
  uniqueKey?: string;    // 기본값: 'uniqueKey'
  activeKey?: string;    // 기본값: 'delYn'
  tempIdKey?: string;    // 기본값: 'tempId'
}

export interface CommonOptions {
  /** 상태 문자열을 백엔드 Enum 등으로 매핑하고 싶을 때 */
  statusMap?: Partial<Record<CommonStatus, string>>;
  /**
   * Deleted일 때도 전체 rowData를 포함할지 여부
   * 요구사항상 기본값을 true 로 변경 (기존 기본 false에서 변경)
   */
  includeNonIdOnDelete?: boolean;
  /** 행 → 추가 필드 변환 (rowData를 인자로 받음) */
  extraMapper?: (rowData: Record<string, any>) => Record<string, any>;
}

/** 🔧 payload.options 공통 규격 */
export interface CommonPayloadOptions {
  stopOnError?: boolean;        // 기본 true: 첫 에러에서 중단
  validateAll?: boolean;        // 기본 true: 전체 유효성 검사
  bulkSize?: number;            // 기본 100: 서버 배치 사이즈
  overwriteExisting?: boolean;  // 기본 true: upsert 성격 허용
  // 필요 시 확장 키 허용
  [k: string]: any;
}

/** 기본 옵션값 */
const DEFAULT_PAYLOAD_OPTIONS: Required<Pick<
  CommonPayloadOptions,
  'stopOnError' | 'validateAll' | 'bulkSize' | 'overwriteExisting'
>> = {
  stopOnError: true,
  validateAll: true,
  bulkSize: 100,
  overwriteExisting: true,
};
/** 앱 전역에서 덮어쓸 수 있는 옵션(선택) */
let GLOBAL_PAYLOAD_OPTIONS: CommonPayloadOptions = {};

/** 앱 초기화 구간 등에서 전역 기본 옵션을 세팅하고 싶을 때 사용 */
export function setCommonPayloadOptions(opts: CommonPayloadOptions) {
  GLOBAL_PAYLOAD_OPTIONS = { ...GLOBAL_PAYLOAD_OPTIONS, ...opts };
}

const hasFlag = (v: any) => v === 1 || v === '1' || v === true || v === 'Y';

const normalizeState = (sheet: any, row: any): 'added' | 'changed' | 'deleted' | '' => {
  // IBSheet 공식 API/내부값만 신뢰 (_status 제거)
  const raw =
    sheet?.getRowStatus?.(row) ??
    sheet?.getRowState?.(row) ??
    row?._ibstatus ??
    row?._status ??
    '';
  const s = typeof raw === 'string' ? raw : String(raw ?? '');
  return s.toLowerCase() as any;
};

const normalizeBool = (v: any): boolean | undefined => {
  if (v === true || v === 1 || v === 'Y') return true;
  if (v === false || v === 0 || v === 'N') return false;
  return undefined;
};

const toYN = (v: any): 'Y' | 'N' => {
  if (v === 'Y' || v === 'N') return v;
  if (v === true || v === 1 || v === '1') return 'Y';
  if (v === false || v === 0 || v === '0') return 'N';
  if (v === 'y' || v === 'n') return v.toUpperCase() as 'Y' | 'N';
  return 'N'; // 기본값
};

/**
 * undefined / null 만 제거 (이제 빈 문자열은 유지)
 */
const pickIfHasValue = (o: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
};

/** 공통 변환 함수: status + tempId + 전체 rowData 를 한 항목으로 만듦 */
export function buildCommonItems(
  sheet: any,
  fieldKeys?: CommonFieldKeys,
  options?: CommonOptions
) {
  const fk: Required<CommonFieldKeys> = {
    idKey: fieldKeys?.idKey ?? 'id',
    nameKey: fieldKeys?.nameKey ?? 'name',
    uniqueKey: fieldKeys?.uniqueKey ?? 'uniqueKey',
    activeKey: fieldKeys?.activeKey ?? 'delYn',
    tempIdKey: fieldKeys?.tempIdKey ?? 'tempId',
  };

  const statusMap = {
    Added: options?.statusMap?.Added ?? 'Added',
    Changed: options?.statusMap?.Changed ?? 'Changed',
    Deleted: options?.statusMap?.Deleted ?? 'Deleted',
  };

  const includeAllOnDelete = options?.includeNonIdOnDelete ?? true;

  const changedRows: any[] = sheet?.getRowsByStatus?.('Added,Changed,Deleted') ?? [];

  return changedRows.reduce((acc: any[], row: any, idx: number) => {
    // 1) 행의 원시 상태 문자열
    const state = normalizeState(sheet, row);

    // 2) 플래그(숫자/문자/불리언) 보조 판정
    const isAdded   = state === 'added'   || hasFlag(row?.Added);
    const isDeleted = state === 'deleted' || hasFlag(row?.Deleted);
    const isChanged = state === 'changed' || hasFlag(row?.Changed);

    // 3) 우선순위: Deleted > Added > Changed
    let status: CommonStatus | null = null;
    if (isDeleted) status = 'Deleted';
    else if (isAdded) status = 'Added';
    else if (isChanged) status = 'Changed';
    else return acc; // 상태 없으면 스킵

    // 4) rowData 수집
    const rowData: Record<string, any> =
      (typeof sheet?.getRowValue === 'function' ? sheet.getRowValue(row) : { ...row }) || {};

    const idVal     = rowData[fk.idKey]     ?? row[fk.idKey];
    const nameVal   = rowData[fk.nameKey]   ?? row[fk.nameKey];
    const uniqueVal = rowData[fk.uniqueKey] ?? row[fk.uniqueKey];
    const activeRaw = rowData[fk.activeKey] ?? row[fk.activeKey];
    let activeYN: 'Y' | 'N' | undefined;
    if (activeRaw === undefined) {
         // 신규행인데 delYn이 비어 있으면 기본값 'N'
             activeYN = (state === 'added' && fk.activeKey === 'delYn') ? 'N' : undefined;
       } else {
         activeYN = toYN(activeRaw);
    }

    const tempId =
      rowData[fk.tempIdKey] ||
      row[fk.tempIdKey] ||
      row.id ||
      `tmp-${Date.now()}-${idx}`;

    let base: Record<string, any> = { ...rowData };

    if (idVal !== undefined)     base[fk.idKey]     = typeof idVal === 'string' ? idVal.trim() : idVal;
    if (nameVal !== undefined)   base[fk.nameKey]   = typeof nameVal === 'string' ? nameVal.trim() : nameVal;
    if (uniqueVal !== undefined) base[fk.uniqueKey] = typeof uniqueVal === 'string' ? uniqueVal.trim() : uniqueVal;
    if (activeYN !== undefined) base[fk.activeKey] = activeYN;

    if (typeof options?.extraMapper === 'function') {
      base = { ...base, ...options.extraMapper(rowData) };
    }

    if (!includeAllOnDelete && status === 'Deleted') {
      base = pickIfHasValue({
        [fk.idKey]:     idVal,
        [fk.uniqueKey]: uniqueVal,
      });
    }

    acc.push({
      ...base,
      status: statusMap[status], // ← Added/Deleted가 Changed보다 우선 반영됨
      tempId,
    });
    return acc;
  }, []);
}

/** 공통 payload 빌더
 *  - 기존 시그니처 유지
 *  - items는 이제 각 행의 전체 rowData 를 포함
 */
export function buildCommonPayload(
  sheet: any,
  fieldKeys?: CommonFieldKeys,
  rowTransformOptions?: CommonOptions,
  payloadOptions?: CommonPayloadOptions
) {
  const items = buildCommonItems(sheet, fieldKeys, rowTransformOptions);

  // 최종 options = 기본값 → 전역설정 → 호출시 옵션 순으로 병합
  const finalOptions: CommonPayloadOptions = {
    ...DEFAULT_PAYLOAD_OPTIONS,
    ...GLOBAL_PAYLOAD_OPTIONS,
    ...payloadOptions,
  };

  return { items, options: finalOptions };
}
