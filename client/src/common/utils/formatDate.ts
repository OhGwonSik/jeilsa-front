/**
 * "2025-08-04 14:01:13.236" → "2025-08-04" 형식으로 잘라냄
 * @param dateTimeString - 날짜+시간 문자열
 * @returns yyyy-MM-dd 형식의 문자열 또는 빈 문자열
 */
export function formatDate(dateTimeString: string): string {
    if (!dateTimeString) return "";
    return dateTimeString.split("T")[0] ?? "";
}
