// src/common/utils/format.ts
export type Yn = 'Y' | 'N';

/** true/'Y'/1/'1' → 'Y', 그 외 → 'N' */
export const toYN = (v: unknown): Yn => (v === true || v === 'Y' || v === 1 || v === '1' ? 'Y' : 'N');

/** true-like 검사 */
export const isOn = (v: any) =>
  v === true || v === 1 || v === '1' || v === 'Y' || v === 'true' || v === 'T';
/**
 * 안전한 날짜 문자열(YYYY-MM-DD) 생성
 * - '', null, invalid → '' 반환
 * - 'YYYY-MM-DD' 문자열 → 그대로
 * - ISO 문자열 → 'T' 앞부분
 * - 숫자(초/밀리초)·Date → 지정 타임존 기준 YYYY-MM-DD
 *
 * 주의: 기존 new Date(...).toISOString().slice(0, 10)은 UTC 기준이라
 *       KST(Asia/Seoul)에서 하루 밀림 이슈가 날 수 있습니다.
 */
export const dateStr = (v: unknown, timeZone: string = 'Asia/Seoul'): string => {
  if (v == null || v === '') return '';

  // 문자열 입력: 'YYYY-MM-DD' 혹은 ISO
  if (typeof v === 'string') {
    const s = v.trim();
    const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymd) return ymd[1];
    if (s.includes('T')) return s.split('T')[0]; // ISO에서 날짜부만
    // 그 외 일반 문자열은 Date 파싱으로 위임
  }

  // 숫자(초/밀리초) 또는 Date 처리
  let d: Date;
  if (v instanceof Date) {
    d = v;
  } else if (typeof v === 'number') {
    // 1e12 미만이면 초로 보고 ms 변환
    d = new Date(v < 1e12 ? v * 1000 : v);
  } else {
    d = new Date(v as any);
  }
  if (isNaN(d.getTime())) return '';

  // 타임존 기준으로 YYYY-MM-DD 생성
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d); // en-CA => 'YYYY-MM-DD'
};
