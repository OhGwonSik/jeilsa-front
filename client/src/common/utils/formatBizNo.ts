// common/utils/formatBizNo.ts
export function formatBizNo(value: string): string {
    const onlyNums = value.replace(/\D/g, '');

    return onlyNums
        .replace(/^(\d{3})(\d{2})(\d{5})$/, '$1-$2-$3')
        .substring(0, 12); // 최대 길이 제한
}

export const isValidBizNo = (value: string): boolean => {
    const regex = /^(\d{3})-(\d{2})-(\d{5})$/;
    return regex.test(value.trim());
};

