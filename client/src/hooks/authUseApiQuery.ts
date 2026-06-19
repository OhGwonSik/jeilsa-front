// hooks/useApi.ts
import {
  useQuery,
  useMutation,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
  useQueryClient,
} from '@tanstack/react-query';
import axios from '@/common/axios/AxiosClient';
import type { AxiosError } from 'axios';

// ---------- 공통 유틸 ----------
type SearchParams = Record<string, any>;

function buildQueryString(params: SearchParams = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === '') return;
    if (Array.isArray(v)) v.forEach((item) => sp.append(k, String(item)));
    else sp.append(k, String(v));
  });
  return sp.toString();
}

function makeUrl(endpoint: string, query?: SearchParams) {
  const qs = buildQueryString(query);
  return qs ? `${endpoint}?${qs}` : endpoint;
}

// ---------- GET: 조회 전용 ----------
export function useApiGet<T>(
  endpoint: string,
  searchParams?: SearchParams,
  options?: Omit<UseQueryOptions<T, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, AxiosError>({
    queryKey: [endpoint, searchParams],
    queryFn: async () => {
      const url = makeUrl(endpoint, searchParams);
      const res = await axios.get<T>(url);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ---------- POST: 조회 전용(useQuery) ----------
export function useApiPostQuery<T>(
  endpoint: string,
  body?: Record<string, any>,
  options?: Omit<UseQueryOptions<T, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, AxiosError>({
    // body를 key에 포함해야 동일 파라미터일 때만 캐시 재사용/무효화가 정확해집니다.
    queryKey: [endpoint, body],
    queryFn: async () => {
      const res = await axios.post<T>(endpoint, body);
      return res.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
    ...options,
  });
}

// ---------- 공통 Mutation 팩토리 ----------
type HttpMethod = 'post' | 'put' | 'patch' | 'delete';

interface MutationParams<TBody> {
  body?: TBody;         // 요청 본문 (DELETE도 data 전송 필요 시 지원)
  query?: SearchParams; // 쿼리스트링
}

interface ExtraMutationOptions<TRes, TBody> extends Omit<
  UseMutationOptions<TRes, AxiosError, MutationParams<TBody>>,
  'mutationFn'
> {
  /** 성공 후 무효화할 queryKey 목록 (필요한 경우에만 넣으세요) */
  invalidateKeys?: QueryKey[];
}

function useApiMutationBase<TRes, TBody = unknown>(
  method: HttpMethod,
  endpoint: string,
  options?: ExtraMutationOptions<TRes, TBody>
) {
  const qc = useQueryClient();

  return useMutation<TRes, AxiosError, MutationParams<TBody>>({
    mutationFn: async ({ body, query }: MutationParams<TBody>) => {
      const url = makeUrl(endpoint, query);
      switch (method) {
        case 'post': {
          const res = await axios.post<TRes>(url, body);
          return res.data;
        }
        case 'put': {
          const res = await axios.put<TRes>(url, body);
          return res.data;
        }
        case 'patch': {
          const res = await axios.patch<TRes>(url, body);
          return res.data;
        }
        case 'delete': {
          // axios.delete는 data를 config로 전달
          const res = await axios.delete<TRes>(url, { data: body });
          return res.data;
        }
      }
    },
    onSuccess: async (data, vars, ctx) => {
      // 🎯 원치 않는 /search 재호출을 막으려면 invalidateKeys를 생략하세요.
      if (options?.invalidateKeys?.length) {
        await Promise.all(
          options.invalidateKeys.map((key) =>
            qc.invalidateQueries({ queryKey: key })
          )
        );
      }
      await options?.onSuccess?.(data, vars, ctx as any);
    },
    ...options,
  });
}

// ---------- 메서드별 래퍼 ----------
export function useApiPost<TRes, TBody = unknown>(
  endpoint: string,
  options?: ExtraMutationOptions<TRes, TBody>
) {
  return useApiMutationBase<TRes, TBody>('post', endpoint, options);
}

export function useApiPut<TRes, TBody = unknown>(
  endpoint: string,
  options?: ExtraMutationOptions<TRes, TBody>
) {
  return useApiMutationBase<TRes, TBody>('put', endpoint, options);
}

export function useApiPatch<TRes, TBody = unknown>(
  endpoint: string,
  options?: ExtraMutationOptions<TRes, TBody>
) {
  return useApiMutationBase<TRes, TBody>('patch', endpoint, options);
}

export function useApiDelete<TRes, TBody = unknown>(
  endpoint: string,
  options?: ExtraMutationOptions<TRes, TBody>
) {
  return useApiMutationBase<TRes, TBody>('delete', endpoint, options);
}
