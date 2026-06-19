export function formatFax(value: string): string {
    const onlyNumbers = value.replace(/\D/g, '');
    // 지역번호 2~3자리 + 국번호 3~4자리 + 4자리
    return onlyNumbers
        .replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3')
        .substring(0, 13);
}
export function isValidFax(value: string): boolean {
    const onlyNumbers = value.replace(/\D/g, '');
    return /^0\d{9,10}$/.test(onlyNumbers); // 02, 031, 070 등 허용
}
