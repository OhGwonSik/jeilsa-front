// hooks/usePager.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApiPost } from '@/hooks/authUseApiQuery.ts';

export type SortDir = 'ASC' | 'DESC';

export interface PageMeta {
  pageNum: number;
  pageSize: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface usePagerConfig<TFilter> {
  endpoint: string;
  initialFilter: TFilter;
  initialPage?: number;
  initialSize?: number;
  // ⛔ 굳이 훅 레벨에서 강제하지 않음: sortBy, sortDirection 제거 가능
  sortBy?: string;
  sortDirection?: SortDir;
  transform: (list: any[]) => any[];
  autoLoad?: boolean;
}

export function usePager<TFilter>(config: usePagerConfig<TFilter>) {
  const {
    endpoint,
    initialFilter,
    initialPage = 1,
    initialSize = 20,
    transform,
    autoLoad = true,
  } = config;

  const [filter, setFilter] = useState<TFilter>(initialFilter);
  const [page, setPage] = useState<number>(initialPage);
  const [size, setSize] = useState<number>(initialSize);
  const [rows, setRows] = useState<any[]>([]);
  const [pager, setPager] = useState<PageMeta>({
    pageNum: config.initialPage ?? 1,
    pageSize: config.initialSize ?? 20,
    total: 0,
    pages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [started, setStarted] = useState<boolean>(autoLoad);

  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  const { mutateAsync: post, isPending } = useApiPost<any, any>(endpoint);

  // ✅ sortBy는 filter 안에 실려오도록 두고, 절대 덮어쓰지 않음
  const buildBody = useCallback(
    (override?: Partial<{ page: number; size: number; filter: TFilter }>) => {
      const f = (override?.filter ?? filter) as any;
      const safeFilter = f && typeof f === 'object' && !Array.isArray(f) ? f : {};
      return {
        page: override?.page ?? page,
        size: override?.size ?? size,
        ...safeFilter, // ← 마지막에 둬서 다른 필드(page/size) 오염 없고, sortBy 그대로 전달
      };
    },
    [filter, page, size]
  );

  const fetchPage = useCallback(
    async (override?: Partial<{ page: number; size: number; filter: TFilter }>) => {
      const body = buildBody(override);
      const resp = await post({ body });
      const data = resp?.data ?? resp;
      const list = data?.list ?? data?.data?.list ?? [];
      const mapped = transformRef.current(Array.isArray(list) ? list : []);
      const pageNum = data?.pageNum ?? body.page;
      const pageSize = data?.pageSize ?? body.size;
      const start = (pageNum - 1) * pageSize;

      mapped.forEach((r: any, i: number) => { if (r.SEQ == null) r.SEQ = start + i + 1; });

      setRows(mapped);
      setPager({
        pageNum,
        pageSize,
        total: data?.total ?? 0,
        pages: data?.pages ?? Math.ceil((data?.total ?? 0) / (pageSize || 1)),
        hasNextPage: !!data?.hasNextPage,
        hasPreviousPage: !!data?.hasPreviousPage,
      });

      return mapped;
    },
    [buildBody, post]
  );

  const fetchPageRef = useRef(fetchPage);
  useEffect(() => { fetchPageRef.current = fetchPage; }, [fetchPage]);

  const ignoreNextEffectRef = useRef(false);

  // ✅ 페이지/사이즈/필터가 바뀌면 한 번만 가져옴
  useEffect(() => {
    if (!started) return;
    if (ignoreNextEffectRef.current) {
      ignoreNextEffectRef.current = false;
      return;
    }
    fetchPageRef.current();
  }, [page, size, filter, started]); // ← filter, started 추가

  // ✅ filter만 바꿀 때 페이지를 초기화할지 옵션으로
  const updateFilter = useCallback((next: Partial<TFilter> | TFilter, opts?: { resetPage?: boolean }) => {
    const shouldReset = opts?.resetPage !== false;
    if (shouldReset) setPage(1);
    setFilter((prev: any) => (typeof next === 'object' && next !== null ? { ...prev, ...next } : next));
    setStarted(true);
  }, []);

  // ✅ 수동 refetch가 있으면 다음 effect 1회 무시 (중복 방지)
  const refetch = useCallback((override?: Partial<{ page: number; size: number; filter: TFilter }>) => {
    setStarted(true);
    ignoreNextEffectRef.current = true; // ← 항상 세워서 중복 방지
    // UI 동기화용으로 상태도 반영
    if (override?.page !== undefined) setPage(override.page);
    if (override?.size !== undefined) setSize(override.size);
    if (override?.filter) setFilter(prev => ({ ...(prev as any), ...(override!.filter as any) }));
    return fetchPage(override);
  }, [fetchPage]);

  const clear = useCallback(() => {
    setRows([]);
    setPager({
      pageNum: config.initialPage ?? 1,
      pageSize: config.initialSize ?? 20,
      total: 0,
      pages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });

    ignoreNextEffectRef.current = true;

    setPage(config.initialPage ?? 1);
    setSize(config.initialSize ?? 20);
  }, [config.initialPage, config.initialSize, setPage, setSize]);

  return {
    rows,
    pager,
    isLoading: isPending,
    page,
    size,
    setPage,
    setSize,
    filter,
    setFilter: updateFilter,
    refetch,
    fetchPage,
    clear
  };
}
