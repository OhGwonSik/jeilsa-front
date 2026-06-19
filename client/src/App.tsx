// src/App.tsx

import React, {useEffect, useRef} from "react";
import {BrowserRouter} from "react-router-dom";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "@/components/ui/toaster";
import {TooltipProvider} from "@/components/ui/tooltip";
import {Provider, useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState, store} from "@/common/redux/store";
import {ActionsCtx} from "@/components/common/SheetActionContext.tsx";
import AppRoutes from "@/AppRoutes.tsx";
import {selectIsAuthenticated} from "./common/redux/authSlice";

import loader from "@ibsheet/loader";
import {hydrateFromStorage} from "@/common/redux/authSlice.ts";
import {validateTokenThunk} from "@/common/redux/authThunk.ts";
import axiosClient from "@/common/axios/AxiosClient.tsx";


loader.config({
    registry: [
        {
            name: "ibsheet",
            baseUrl: "/libs/IBSheet8",
            files: ["ibsheet.js", "css/simple/main.css"],
        },
    ],
});

// 전역 단일 클라이언트 (마스터 데이터 캐싱 정책 적용)
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 포커스 복귀 시 재검증 활성화 (마스터 데이터 최신성 보장)
            refetchOnWindowFocus: true,
            // 네트워크 재연결 시 재검증 활성화
            refetchOnReconnect: true,
            // 실패 재시도 횟수 (네트워크 순간 오류 대비)
            retry: 1,
            // 데이터 신선도: 5분 (마스터 데이터 캐싱 정책)
            staleTime: 5 * 60 * 1000, // 5분
            // 가비지 컬렉션: 60분 (캐시 보관 시간)
            gcTime: 60 * 60 * 1000, // 60분
            // 이전 데이터 유지 (깜빡임 최소화)
            // ✅ v5 방식: 이전 데이터 유지
            placeholderData: (prev:any) => prev,
        },
        mutations: {
            retry: 0,
        },
    },
});

export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <ActionsCtx.Provider value={{ endpoints: { saveSelected: "/users/save" } }}>
            {children}
        </ActionsCtx.Provider>
    );
}

// 토큰 상태 확인 및 NavigationGuard 초기화 컴포넌트
function AppInitializer({ children }: { children: React.ReactNode }) {
    const { accessToken, refreshToken } = useSelector((state: RootState) => state.auth);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const dispatch = useDispatch<AppDispatch>();

    const { isLoggingOut } = useSelector(
        (s: RootState) => s.auth
    );

    // 1) 하이드레이트는 한 번만
    const didHydrate = useRef(false);
    useEffect(() => {
        if (!didHydrate.current) {
            didHydrate.current = true;
            dispatch(hydrateFromStorage());
        }
    }, [dispatch]);

    // 2) 토큰 → Authorization 헤더 동기화 (없으면 제거)
    useEffect(() => {
        if (accessToken) {
            axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } else {
            delete axiosClient.defaults.headers.common['Authorization'];
        }
    }, [accessToken]);

    // 3) 토큰 검증 (조건부 1회)
    const didValidate = useRef(false);
    useEffect(() => {
        // 로그아웃 중이면 아무 것도 하지 않음
        if (isLoggingOut) return;

        // 토큰이 둘 다 있고, isAuthenticated=true 일 때만 검증
        if (accessToken && refreshToken && isAuthenticated && !didValidate.current) {
            didValidate.current = true;
            console.log('[AuthInit] Redux에서 토큰 복구됨. 서버 검증 시도');
            dispatch(validateTokenThunk())
                .unwrap()
                .then(() => {
                    console.log('[AuthInit] 토큰 검증 성공');
                })
                .catch((err) => {
                    console.error('[AuthInit] 토큰 검증 실패:', err);
                    // 실패 시의 로그아웃/리다이렉트는 axios 인터셉터 또는 ProtectedRoute가 처리
                });
        }
    }, [accessToken, refreshToken, isAuthenticated, isLoggingOut, dispatch]);

    return <>{children}</>;
}

function App() {
    return (
        <div style={{ overflowX: "hidden", width: "100%" }}>
            <Provider store={store}>
                <QueryClientProvider client={queryClient}>
                    <TooltipProvider>
                        <Toaster />
                        <BrowserRouter>
                            <AppLayout>
                                <AppInitializer>
                                    <AppRoutes />
                                </AppInitializer>
                            </AppLayout>
                        </BrowserRouter>
                    </TooltipProvider>
                </QueryClientProvider>
            </Provider>
        </div>
    );
}

export default App;
