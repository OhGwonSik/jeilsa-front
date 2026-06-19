// waybillUtils.ts

/**
 * 운송장 번호에서 하이픈(-)을 제거한 숫자 문자열을 반환
 * @example "123-4567-8901" → "12345678901"
 */
export function removeHyphen(waybillNo: string | number | undefined | null): string {
    if (!waybillNo) return '';
    return String(waybillNo).replace(/-/g, '');
}

/**
 * 숫자만 있는 운송장 번호에 하이픈을 삽입 (기본 포맷: 3-4-나머지)
 * @example "12345678901" → "123-4567-8901"
 */
export function formatWaybill(rawWaybillNo: string | number | null | undefined): string {
    const raw = removeHyphen(rawWaybillNo);
    if (raw.length < 11) return raw; // 포맷 기준 미달 → 그대로 반환

    return raw.replace(/^(\d{3})(\d{4})(\d+)$/, '$1-$2-$3');
}

/**
 * 운송장 번호가 유효한지 검사 (하이픈 포함/미포함 모두 가능)
 * 조건: 숫자만 기준으로 11자리 이상
 */
export function isValidWaybillNo(waybillNo: string | number | null | undefined): boolean {
    const raw = removeHyphen(waybillNo);
    return /^\d{11,}$/.test(raw);
}
