// utils/sheetColorRules.ts
export type ColorRuleFn = (value: any) => { bg: string; color: string };

export const colorMappingRules: Record<string, ColorRuleFn> = {
    transportProcessCd: (value: string) => ({
        bg: value === '통신수신' ? '#FFEDD5' : '#DBEAFE',
        color: value === '통신수신' ? '#C2410C' : '#1E3A8A',
    }),
    shipperCode: (value: string) => ({
        bg: value === '통신' ? '#FFEDD5' : '#DBEAFE',
        color: value === '통신' ? '#C2410C' : '#1E3A8A',
    }),
    trnsprtCode: (value: string) => ({
        bg: value === '택배' ? '#FFEDD5' : '#DBEAFE',
        color: value === '택배' ? '#C2410C' : '#1E3A8A',
    }),
};
