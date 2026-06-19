export function formatAccountNumber(value: string): string {
    const onlyNumbers = value.replace(/\D/g, '');

    // 너무 많은 경우는 중간만 나누는 기본 포맷 (예: 3-3-6 or 3-2-7 등)
    if (onlyNumbers.length <= 10) {
        return onlyNumbers.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1-$2-$3').replace(/-$/, '');
    } else if (onlyNumbers.length <= 13) {
        return onlyNumbers.replace(/(\d{3,4})(\d{2,3})(\d{0,6})/, '$1-$2-$3').replace(/-$/, '');
    } else {
        return onlyNumbers; // 너무 길면 포맷 안 함
    }
}

export function isValidAccountNumber(value: string): boolean {
    const onlyNumbers = value.replace(/\D/g, '');
    return onlyNumbers.length >= 10 && onlyNumbers.length <= 14;
}

