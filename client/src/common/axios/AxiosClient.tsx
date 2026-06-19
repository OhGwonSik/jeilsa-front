import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { store } from "../redux/store";
import { logoutUserThunk } from "../redux/authThunk";

// axios 타입 확장 (_isRetry 플래그)
declare module "axios" {
    export interface InternalAxiosRequestConfig {
        _isRetry?: boolean;
    }
}

console.log("API URL =", import.meta.env.VITE_API_BASE_URL);

// ─────────────────────────────────────────
// Axios 인스턴스
//  - refreshToken 쿠키 사용 → withCredentials: true
// ─────────────────────────────────────────
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
    headers: { "Content-Type": "application/json" },
    timeout: 300_000,
    withCredentials: true,
});

// 여러 401 동시 발생 시 refresh 1회만 수행
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
    config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: any = null, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject, config }) => {
        if (error) {
            reject(error);
        } else {
            if (token) {
                config.headers = config.headers ?? {};
                (config.headers as any).Authorization = `Bearer ${token}`;
            }
            resolve(axios(config));
        }
    });
    failedQueue = [];
};

// 공개 경로(토큰 불필요)
const PUBLIC_PATHS = [
    "/login",
    "/logout",
    "/auth/login",
    "/auth/refresh",
    "/auth/revoke",
    "/signup",
    "/signup/check",
];

// ─────────────────────────────────────────
// 요청 인터셉터
//  - /api/ 중복 제거
//  - PUBLIC에서 Authorization 생략
//  - 그 외엔 Redux/localStorage의 accessToken 주입
//  - 디버그 로깅
// ─────────────────────────────────────────
axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 1) 혹시 '/api/...'를 절대경로로 넘긴 경우 정규화
        if (typeof config.url === "string" && config.url.startsWith("/api/")) {
            config.url = config.url.replace(/^\/api\//, "/");
        }

        // 2) requestPath 계산(절대 URL 안전 합성)
        let requestPath = "/";
        let absUrlForLog = "";
        try {
            const baseAbs = new URL(config.baseURL ?? "/", window.location.origin);
            const abs = new URL(config.url ?? "", baseAbs);
            requestPath = abs.pathname;
            absUrlForLog = abs.toString();
        } catch (e) {
            console.warn("[Interceptor] URL compose failed:", config.url, e);
            requestPath = String(config.url ?? "/");
        }

        // 3) 공개 경로면 토큰 주입 스킵
        const isPublic = PUBLIC_PATHS.some((p) => requestPath.startsWith(p));
        if (isPublic) {
            try {
                console.debug(
                    "[REQ][PUBLIC]",
                    (config.method ?? "get").toUpperCase(),
                    absUrlForLog || requestPath
                );
            } catch {}
            return config;
        }

        // 4) 비공개 경로: accessToken 주입 (Redux → localStorage fallback)
        const JWT_RE = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
        const state = store.getState?.();
        const fromStore = state?.auth?.accessToken as string | undefined;
        const fromStorage = localStorage.getItem("accessToken") ?? "";
        const token = (fromStore && JWT_RE.test(fromStore)) ? fromStore :
            (JWT_RE.test(fromStorage) ? fromStorage : "");

        if (token) {
            config.headers = config.headers ?? {};
            (config.headers as any).Authorization = `Bearer ${token}`;
        } else {
            console.warn(
                "[Auth] missing/invalid accessToken (store/localStorage). Skip Authorization."
            );
        }

        // 5) 디버그 로그
        try {
            const method = (config.method ?? "get").toUpperCase();
            const authHeader = (config.headers as any)?.Authorization ?? "";
            const tokenStr =
                typeof authHeader === "string" && authHeader.startsWith("Bearer ")
                    ? authHeader.slice(7)
                    : "";
            const dots = tokenStr ? tokenStr.split(".").length - 1 : -1;
            const preview = tokenStr
                ? tokenStr.slice(0, 10) + "..." + tokenStr.slice(-10)
                : "null";

            console.debug("[REQ]", method, absUrlForLog || requestPath);
            console.debug(
                "[REQ][Authorization]",
                "present=",
                !!tokenStr,
                "dots=",
                dots,
                "preview=",
                preview
            );
        } catch (e) {
            console.warn("[REQ][debug-failed]", e);
        }

        return config;
    },
    (error) => {
        console.warn("[REQ][interceptor-error]", error);
        return Promise.reject(error);
    }
);

// ─────────────────────────────────────────
// 응답 인터셉터
//  - 401 → /auth/refresh (쿠키 기반, body 없음)
//  - 동시 401 큐잉 후 재시도
//  - 실패 시 로그아웃
// ─────────────────────────────────────────
axiosClient.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
        const originalConfig = error.config as InternalAxiosRequestConfig;

        if (!originalConfig || originalConfig._isRetry) {
            return Promise.reject(error);
        }

        const url = originalConfig.url || "";
        // 로그인/리프레시/로그아웃 요청은 401 재시도 안 함
        if (PUBLIC_PATHS.some((p) => url.includes(p))) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401) {
            originalConfig._isRetry = true;

            // 이미 갱신 중이면 큐에 넣고 완료 후 재시도
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject, config: originalConfig });
                });
            }

            isRefreshing = true;
            try {
                // ✅ 쿠키기반 refresh: body 없이 호출, withCredentials: true
                const refreshToken = localStorage.getItem('refreshToken');
                const res = await axiosClient.post("/auth/refresh", { refreshToken }, { withCredentials: true });

                // 서버 응답 키 가변 대응(accessToken | access_token)
                const newAccessToken: string | undefined = (res as any)?.data?.data?.access_token
                    ?? (res as any)?.data?.data?.accessToken
                    ?? (res as any)?.data?.accessToken
                    ?? (res as any)?.data?.access_token;

                if (!newAccessToken) {
                    throw new Error("No accessToken in refresh response");
                }

                // 새 토큰 저장 (Redux를 쓰더라도 최소 localStorage는 갱신)
                localStorage.setItem("accessToken", newAccessToken);

                const newRefreshToken: string | undefined = (res as any)?.data?.data?.refresh_token
                    ?? (res as any)?.data?.data?.refreshToken
                    ?? (res as any)?.data?.refreshToken;

                if (newRefreshToken) {
                    localStorage.setItem("refreshToken", newRefreshToken);
                }
                const { updateRefreshToken } = await import("../redux/authSlice");
                const decoded = JSON.parse(atob(newAccessToken.split('.')[1]));
                const newExpiresAt = decoded.exp * 1000;
                localStorage.setItem("expiresAt", String(newExpiresAt));
                store.dispatch(updateRefreshToken({ 
                    accessToken: newAccessToken, 
                    refreshToken: newRefreshToken,
                    expiresAt: newExpiresAt
                }));

                // 큐 처리 및 원요청 재시도
                processQueue(null, newAccessToken);

                originalConfig.headers = originalConfig.headers ?? {};
                (originalConfig.headers as any).Authorization = `Bearer ${newAccessToken}`;
                axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                return axiosClient(originalConfig);
            } catch (refreshError) {
                // 갱신 실패 → 강제 로그아웃
                try {
                    store.dispatch(logoutUserThunk());
                } catch {}
                processQueue(refreshError, null);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
