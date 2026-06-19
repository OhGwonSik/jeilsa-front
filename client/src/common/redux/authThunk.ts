import {createAsyncThunk} from '@reduxjs/toolkit';
import axiosClient from '../../common/axios/AxiosClient';
import {loginAction, loginFailure, loginSuccess, logout, logoutAction, selectIsAuthenticated} from './authSlice';
import type {RootState} from '@/common/redux/store';
import {validateJWT} from "@/common/utils/jwtUtils.ts";

type LoginReq = { userId: string; userPw: string };
type LoginPayload = {
    userId: string;
    memberId: number;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    expiresAt?: number;
    role?: string;
    permissions: { id: string; name: string; resource: string; action: string }[];
    menus: any[];
};

// Thunk 액션 생성 - navigate를 선택적으로 만듦
export const loginUserThunk = createAsyncThunk<LoginPayload, LoginReq>(
    '/auth/login',
    async ({ userId, userPw }, { dispatch, rejectWithValue }) => {
        dispatch(loginAction());
        try {
            const response = await axiosClient.post('/auth/login', { userId, userPw });
            if (response.status !== 200) {
                const msg = '로그인에 실패했습니다.';
                dispatch(loginFailure({ userId, langkey: 'ko', message: msg }));
                return rejectWithValue(new Error(msg));
            }

            const responseData = response.data;
            if (!responseData.success) {
                const msg = responseData.error?.message || '로그인에 실패했습니다.';
                dispatch(loginFailure({ userId, langkey: 'ko', message: msg }));
                return rejectWithValue(new Error(msg));
            }

            const data = responseData.data;
            const accessToken = data.accessToken as string;
            const refreshToken = data.refreshToken as string;

            // 토큰 유효성
            const tokenValidation = validateJWT(accessToken);
            if (!tokenValidation.valid) {
                const msg = `토큰 검증 실패: ${tokenValidation.reason}`;
                dispatch(loginFailure({ userId, langkey: 'ko', message: msg }));
                return rejectWithValue(new Error(msg));
            }
            const expiresAt = tokenValidation.exp ? tokenValidation.exp * 1000 : undefined;

            // 권한/메뉴 가공
            const permissions = (data.permissions || []).map((permission: string) => ({
                id: permission,
                name: permission,
                resource: permission.split('.')?.[0] || 'unknown',
                action: permission.split('.')?.[1] || 'unknown',
            }));
            const menus = data.menus || [];

            // ✅ localStorage에 전부 저장 (초기화 로직/가드가 참조)
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('expiresAt', expiresAt ? String(expiresAt) : '');
            localStorage.setItem('menus', JSON.stringify(menus));
            localStorage.setItem('user', JSON.stringify({
                userId: data.userId,
                memberId: data.memberId,
                email: data.email,
                name: data.name,
                roles:data.roles
            }));

            // axios 헤더 갱신
            axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            // ✅ slice에 넘길 payload
            const payload: LoginPayload = {
                userId: data.userId,
                memberId: data.memberId,
                email: data.email,
                name: data.name,
                roles:data.roles,
                accessToken,
                refreshToken,
                expiresAt,
                permissions,
                menus,
            };

            // 기존 로직 유지
            dispatch(loginSuccess({
                userId: data.userId,
                langkey: 'ko',
                message: '로그인에 성공했습니다',
                memberId: data.memberId,
                email: data.email,
                name: data.name,
                roles:data.roles,
                accessToken,
                refreshToken,
                expiresAt,
                permissions,
                menus,
            }));

            // ✅ 꼭 반환 (컴포넌트에서 unwrap으로 받음)
            return payload;
        } catch (error: any) {
            const msg =
                error.response?.data?.error?.message ||
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                '잘못된 이메일 또는 비밀번호입니다.';
            dispatch(loginFailure({
                userId, langkey: 'ko',
                message: typeof msg === 'string' ? msg : JSON.stringify(msg),
            }));
            return rejectWithValue(new Error(msg));
        }
    }
);

// 토큰 검증 Thunk
export const validateTokenThunk = createAsyncThunk(
    '/auth/validate',
    async (_, { getState }) => {
        const state = getState() as RootState;

        if (!selectIsAuthenticated(state)) {
            return Promise.reject(new Error('Not authenticated'));
        }

        try {
            const response = await axiosClient.post('/auth/validate');

            // 백엔드 응답 구조에 맞게 처리
            const responseData = response.data;
            if (!responseData.success) {
                throw new Error(responseData.error?.message || 'Token validation failed');
            }

            return responseData.data;
        } catch (error: any) {
            console.error('토큰 검증 중 오류 발생:', error);
            return Promise.reject(error);
        }
    }
);


// 로그아웃 Thunk 액션 생성
export const logoutUserThunk = createAsyncThunk(
    '/auth/logout',
    async (_, { dispatch, getState }) => {
        const state = getState() as RootState;

        try {
            // 로그아웃 시작 상태로 설정
            dispatch(logoutAction());

            // refreshToken을 Redux에서 가져오기
            const refreshToken = state.auth.refreshToken;

            // 백엔드 로그아웃 API 호출 (토큰 무효화)
            const response = await axiosClient.post('/auth/logout', {
                refreshToken: refreshToken
            });

            // 백엔드 응답 구조에 맞게 처리
            const responseData = response.data;
            if (!responseData.success) {
                console.warn('Backend logout failed:', responseData.error?.message);
            }

            // 로그아웃 완료 처리
            dispatch(logout());

            return responseData.data || { success: true, message: '로그아웃되었습니다.' };
        } catch (error: any) {
            console.error('로그아웃 중 오류 발생:', error);
            // 에러가 발생해도 로컬 상태는 정리
            dispatch(logout());
            return { success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' };
        }
    }
);