// src/hooks/useMenuAccess.ts
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/common/redux/store';

type MenuNode = {
    menuId?: number | string;
    menuName?: string;
    menuType?: 'HEADER' | 'MENU';
    menuPath?: string | null;
    menuOrder?: number;
    delYn?: string | boolean | null;   // 'N' | 'Y' | boolean
    isActive?: boolean | null;         // 토큰에 없을 수도 있음
    items?: MenuNode[];
};

const normalize = (p?: string | null) => {
    if (!p) return '/';
    let q = p.split('?')[0].replace(/\/+$/, '').toLowerCase();
    if (q === '') q = '/';
    return q;
};

const isActiveMenu = (m: MenuNode) => {
    // isActive가 명시 false면 제외
    if (m.isActive === false) return false;
    // delYn === 'Y' 또는 true 인 경우만 제외
    const del = typeof m.delYn === 'string' ? m.delYn.toUpperCase() === 'Y' : !!m.delYn;
    return !del;
};

export function useMenuAccess() {
    const auth = useSelector((s: RootState) => s.auth as any);
    const menus: MenuNode[] | undefined = auth?.menus;

    // menus가 아직 undefined면 "로딩 전" 상태로 간주
    const ready = useMemo(() => Array.isArray(menus), [menus]);

    const allowedPaths = useMemo(() => {
        const set = new Set<string>();
        if (!ready) return set;

        (menus as MenuNode[]).forEach((header) => {
            if (header?.menuType !== 'HEADER' || !isActiveMenu(header)) return;
            (header.items ?? []).forEach((child) => {
                if (child?.menuType !== 'MENU') return;
                if (!isActiveMenu(child)) return;
                const n = normalize(child.menuPath ?? '');
                if (n) set.add(n);
            });
        });

        // 디버깅 로그
        try {
            console.debug('[ACCESS] allowedPaths:', Array.from(set).sort());
        } catch {}
        return set;
    }, [menus, ready]);

    const hasAccess = (path: string) => {
        // 로딩 전에는 판단 보류
        if (!ready) return undefined as unknown as boolean;
        return allowedPaths.has(normalize(path));
    };

    return { hasAccess, allowedPaths, ready };
}
