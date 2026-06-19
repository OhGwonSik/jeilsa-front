// hooks/useDebounce.ts
import {useCallback, useEffect, useRef} from 'react';

export function useDebouncedCommit(fn: () => void, delay = 250) {
    const t = useRef<number | null>(null);
    const fnRef = useRef(fn);
    useEffect(() => { fnRef.current = fn; }, [fn]);   // ★ 최신 fn 유지

    const flush = useCallback(() => {
        if (t.current) window.clearTimeout(t.current);
        t.current = null;
        fnRef.current();                                // ★ 최신 fn 호출
    }, []);

    const schedule = useCallback(() => {
        if (t.current) window.clearTimeout(t.current);
        // @ts-ignore
        t.current = window.setTimeout(() => { t.current = null; fnRef.current(); }, delay); // ★ 최신 fn 호출
    }, [delay]);

    return { schedule, flush };
}
