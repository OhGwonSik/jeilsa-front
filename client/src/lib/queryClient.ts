import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** 숫자/문자 가드 (선택) */
const T = (v: any) => (v ?? "").toString().trim();

/** 1) 환경별 베이스 URL: 개발/운영 모두 /api 전략 유지 */
const API_BASE_RAW = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** 2) 절대/상대 경로를 모두 안전하게 풀어주는 URL 빌더 */
function resolveUrl(input: string): string {
  // 절대 URL이면 그대로
  if (/^https?:\/\//i.test(input)) return input;

  // base 정규화
  const base = API_BASE_RAW.endsWith("/") ? API_BASE_RAW : API_BASE_RAW + "/";

  // input 정규화(선행 슬래시 제거)
  const path = T(input).replace(/^\//, "");

  // URL 조합
  return new URL(path, base).toString();
}

/** 3) 공통 에러 처리 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${text}`);
  }
}

/** 4) JSON API 요청용 헬퍼 */
export async function apiRequest(
    method: string,
    url: string,
    data?: unknown,
): Promise<Response> {
  let finalUrl = resolveUrl(url);
    //주석처리하기 /api자르는거
    finalUrl = finalUrl.replace(/^(https?:\/\/[^/]+)\/api/, "$1");
    console.log(finalUrl)
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = localStorage.getItem("accessToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // body가 있으면 JSON으로 전송 (FormData 등을 쓸 땐 별도 함수 사용)
  if (data !== undefined && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: data
        ? data instanceof FormData
            ? data
            : JSON.stringify(data)
        : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/** (옵션) Spring Security formLogin 사용할 때 x-www-form-urlencoded 전송 */
export async function apiFormRequest(
    url: string,
    form: Record<string, string>,
): Promise<Response> {
  const finalUrl = resolveUrl(url);
  const body = new URLSearchParams(form);
  const res = await fetch(finalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}

/** 5) React Query용 기본 queryFn */
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
    ({ on401: unauthorizedBehavior }) =>
        async ({ queryKey }) => {
          // 기존에는 join("/")만 했는데, 이제 resolveUrl로 베이스를 붙여줌
          const raw = Array.isArray(queryKey) ? queryKey.join("/") : (queryKey as any);
          let url = resolveUrl(String(raw));

          const headers: Record<string, string> = { Accept: "application/json" };

          if (import.meta.env.MODE === "development") {
            url = url.replace(/^(https?:\/\/[^/]+)\/api/, "$1");
          }

          // ✅ 여기서도 토큰 주입
          const token = localStorage.getItem("accessToken");
          console.log(token)
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }          

          const res = await fetch(url, {
            credentials: "include",
            headers,
          });
          

          if (unauthorizedBehavior === "returnNull" && res.status === 401) {
            // @ts-expect-error - 호출부에서 T | null로 캐스팅해서 사용 권장
            return null;
          }

          await throwIfResNotOk(res);

          // 204 같은 경우를 대비
          const ct = res.headers.get("content-type") || "";
          if (!ct.includes("application/json")) {
            // @ts-expect-error - 비 JSON 응답인 경우 호출자가 직접 res를 쓰도록 하려면 apiRequest를 쓰세요
            return null;
          }
          return (await res.json()) as any;
        };

/** 6) QueryClient 기본 옵션 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
