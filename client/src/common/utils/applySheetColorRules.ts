// utils/applySheetColorRules.ts
import {colorMappingRules} from "@/common/utils/colorMappingRules.ts";

export const applySheetColorRules = <T extends Record<string, any>>(data: T[]): T[] => {
    return data.map(item => {
        const newItem = { ...item };
        Object.keys(colorMappingRules).forEach(field => {
            const value = item[field];
            const { bg, color } = colorMappingRules[field](value);
            newItem[`${field}Color`] = bg;
            newItem[`${field}TextColor`] = color;
        });
        return newItem;
    });
};
