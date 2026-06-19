export type RequiredMode = 'always' | 'add-only' | 'touched-only' | 'skip';

export interface RequiredValidateOptions {
  /** 기본 모드 (지정 안 된 컬럼에 적용). 기본값: 'always' */
  defaultMode?: RequiredMode;
  /** 컬럼별 모드 오버라이드 */
  perColumnMode?: Record<string, RequiredMode>;
  /** 메시지 포맷터 (행/컬럼별 커스텀 메시지) */
  formatMessage?: (args: { rowIndex: number; header: string; col: string }) => string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  row: any;
  rowIndex: number;
  col: string;
  message: string;
  time?: number;
  buttons?: string[];
}

export const requiredValidate = async (sheet: any, opts: RequiredValidateOptions = {}): Promise<ValidationResult> => {
  const asBool = (v: any) => v === 1 || v === '1' || v === true || v === 'Y';
  const isFn = (f: any) => typeof f === 'function';
  const {
    defaultMode = 'always',
    perColumnMode = {},
    formatMessage = ({ rowIndex, header }) => `${rowIndex + 1}행의 [${header}]은(는) 필수값입니다.`,
  } = opts;

  // Required 컬럼 수집
  const cols: any[] =
    (sheet?.options?.Cols as any[]) ||
    (sheet?.options?.columns as any[]) ||
    (sheet?.InitInfo?.Cols as any[]) ||
    [];

  const requiredCols = cols
    .filter((c) => asBool(c?.Required) && !!c?.Name)
    .map((c) => ({
      name: String(c.Name),
      type: c.Type ?? 'Text',
      header: c.Header ?? c.Name,
    }));

  if (!requiredCols.length) return { ok: true, errors: [] };

  // 행 수집
  const rows: any[] =
    (isFn(sheet.getDataRows) && sheet.getDataRows()) ||
    (isFn(sheet.getAllRows) && sheet.getAllRows()) ||
    (sheet?.data as any[]) ||
    [];

  const getRowState = (row: any) => {
    const s =
      (isFn(sheet.getRowStatus) && sheet.getRowStatus(row)) ||
      (isFn(sheet.getRowState) && sheet.getRowState(row)) ||
      row?._ibstatus ||
      row?._status ||
      '';
    return String(s).toLowerCase(); // 'added' | 'changed' | 'deleted' | ''
  };

  const getValue = (row: any, col: string) => {
    if (isFn(sheet.getValue)) return sheet.getValue(row, col);
    return row?.[col];
  };

  const isEmptyValue = (val: any) => {
    if (val == null) return true;
    if (typeof val === 'string') return val.trim().length === 0;
    if (typeof val === 'number') return Number.isNaN(val);
    if (typeof val === 'boolean') return false;
    if (val instanceof Date) return Number.isNaN(val.getTime());
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  };

  // 셀 수정 여부 판단 (가능한 경우에만)
  const isCellTouched = (row: any, col: string) => {
    if (isFn(sheet.isChangedCell)) return !!sheet.isChangedCell(row, col);
    if (isFn(sheet.getRowChangedCells)) {
      const list = sheet.getRowChangedCells(row) || [];
      return Array.isArray(list) && list.includes(col);
    }
    // 최후의 수단: 변경 플래그가 없으면 "모름" → false
    return false;
  };

  const errors: ValidationError[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const state = getRowState(row);

    const isAdded = state === 'added' || asBool(row?.Added);
    const isChanged = state === 'changed' || asBool(row?.Changed);
    const isDeleted = state === 'deleted' || asBool(row?.Deleted);

    if (isDeleted) continue;
    if (!isAdded && !isChanged) continue;

    for (const col of requiredCols) {
      const mode: RequiredMode = perColumnMode[col.name] ?? defaultMode;

      if (mode === 'skip') continue;                // 완전 제외
      if (mode === 'add-only' && !isAdded) continue; // 추가일 때만

      if (mode === 'touched-only' && isChanged) {
        // 수정행이고, 해당 셀을 실제로 건드렸을 때만 검사
        if (!isCellTouched(row, col.name)) continue;
      }

      const v = getValue(row, col.name);
      if (isEmptyValue(v)) {
        errors.push({
          row,
          rowIndex: i,
          col: col.name,
          message: formatMessage({ rowIndex: i, header: col.header, col: col.name }),
        });
      }
    }
  }

  if (errors.length) {
    const first = errors[0];
    try {
      sheet.setFocus?.(first.row, first.col);
      sheet.selectCell?.(first.row, first.col);

      const time = first.time ?? 2000;
      const btns = Array.isArray(first.buttons) && first.buttons.length ? first.buttons : ['OK'];

      if (isFn(sheet.showMessageTime)) {
        sheet.showMessageTime(first.message, time, ...btns);
      } else if (isFn(sheet.showMessage)) {
        sheet.showMessage(first.message);
        setTimeout(() => sheet.hideMessage?.(), time);
      }
    } catch {}
    return { ok: false, errors };
  }


  return { ok: true, errors: [] };
};
