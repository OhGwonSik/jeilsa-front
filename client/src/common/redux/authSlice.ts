// authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/** ===== Types ===== */
export interface UserRole {
    id: string;
    name: string;
    description?: string;
}

export interface UserPermission {
    id: string;
    name: string;
    resource: string;
    action: string;
}

export interface MenuItem {
    menuOrder: number;
    menuPath: string;
    menuId: string;
    menuName: string;
    menuType: 'HEADER' | 'MENU';
    delDt: string;
    delYn: string;
    items: MenuItem[];
    parentId?: string;
    icon?: string;
    description?: string;
}

export interface LoginPayload {
    userId: string;
    langkey: string;
    message: string;

    memberId: number;
    email?: string;
    name: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;

    roles?: string;
    permissions?: UserPermission[];
    menus?: MenuItem[];
}

export interface LoginFailurePayload {
    message: string;
}

/** 핵심: 상태 플래그 추가 */
export interface AuthState {
    status: 'idle' | 'authenticating' | 'authenticated' | 'unauthenticated';

    loading: boolean;
    isLoggingOut: boolean;
    error: string | null;
    message: string | null;

    memberId: number | null;
    userId: string | null;
    email: string | null;
    name: string | null;

    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;

    roles: string | null;
    permissions: UserPermission[];
    menus: MenuItem[];

    langkey: string | null;
    authReady: boolean;
}

/** ===== Initial State ===== */
const initialState: AuthState = {
    status: 'unauthenticated',

    loading: false,
    isLoggingOut: false,
    error: null,
    message: null,

    userId: null,
    memberId: null,
    email: null,
    name: null,

    accessToken: null,
    refreshToken: null,
    expiresAt: null,

    roles: null,
    permissions: [],
    menus: [],

    langkey: null,
    authReady: false,
};

/** ===== Slice ===== */
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        /** 앱 진입 시 1회: localStorage → 상태 복원 */
        hydrateFromStorage(state) {
            const accessToken = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');
            const expStr = localStorage.getItem('expiresAt');
            const userRaw = localStorage.getItem('user');
            const menusRaw = localStorage.getItem('menus');

            const now = Date.now();
            const expiresAt = expStr ? Number(expStr) : NaN;
            const valid = !!accessToken && !!refreshToken && (now < expiresAt || !!refreshToken);

            if (valid) {
                state.status = 'authenticated';
                state.accessToken = accessToken!;
                state.refreshToken = refreshToken ?? null;
                state.expiresAt = isNaN(expiresAt) ? null : expiresAt;

                try {
                    const user = userRaw ? JSON.parse(userRaw) : null;
                    state.memberId = user?.memberId ?? null;
                    state.userId = user?.userId ?? null;
                    state.name = user?.name ?? null;
                    state.langkey = user?.langkey ?? null;
                    state.roles = user.roles ||  null;
                } catch {
                    state.memberId = null;
                    state.userId = null;
                    state.name = null;
                    state.langkey = null;
                    state.roles = null;
                }

                try {
                    state.menus = menusRaw ? JSON.parse(menusRaw) : [];
                } catch {
                    state.menus = [];
                }
            } else {
                state.status = 'unauthenticated';
                state.memberId = null;
                state.userId = null;
                state.name = null;
                state.langkey = null;
                state.roles = null;
                state.permissions = [];
                state.menus = [];
                state.accessToken = null;
                state.refreshToken = null;
                state.expiresAt = null;
            }

            state.authReady = true;
        },

        /** 로그인 버튼 눌렀을 때 */
        loginAction(state) {
            state.status = 'authenticating';
            state.loading = true;
            state.error = null;
            state.message = null;
        },

        /** 로그인 성공 */
        loginSuccess(state, action: PayloadAction<LoginPayload>) {
            state.status = 'authenticated';
            state.loading = false;

            state.memberId = action.payload.memberId;
            state.userId = action.payload.userId;
            state.name = action.payload.name;
            state.langkey = action.payload.langkey;
            state.message = action.payload.message;

            state.roles = action.payload.roles ?? null;
            state.permissions = action.payload.permissions ?? [];
            state.menus = action.payload.menus ?? [];

            try {
                localStorage.setItem('menus', JSON.stringify(state.menus));
            } catch {}

            if (action.payload.accessToken) {
                state.accessToken = action.payload.accessToken;
                localStorage.setItem('accessToken', action.payload.accessToken);
            }
            if (action.payload.refreshToken) {
                state.refreshToken = action.payload.refreshToken;
                localStorage.setItem('refreshToken', action.payload.refreshToken);
            }
            if (typeof action.payload.expiresAt === 'number') {
                state.expiresAt = action.payload.expiresAt;
                localStorage.setItem('expiresAt', String(action.payload.expiresAt));
            }

            state.authReady = true;

            const prevUser = {
                memberId: action.payload.memberId,
                userId: action.payload.userId,
                name: action.payload.name,
                langkey: action.payload.langkey,
                roles: state.roles,
            };
            try {
                localStorage.setItem('user', JSON.stringify(prevUser));
            } catch {}
        },

        /** 로그인 실패 */
        loginFailure(state, action: PayloadAction<LoginFailurePayload>) {
            state.status = 'unauthenticated';
            state.loading = false;
            state.error = action.payload.message;

            state.memberId = null;
            state.userId = null;
            state.name = null;
            state.langkey = null;
            state.roles = null;
            state.permissions = [];
            state.menus = [];

            state.accessToken = null;
            state.refreshToken = null;
            state.expiresAt = null;

            state.authReady = true;
        },

        logoutAction(state) {
            state.isLoggingOut = true;
        },

        /** 로그아웃 */
        logout(state) {
            state.status = 'unauthenticated';
            state.isLoggingOut = false;

            state.memberId = null;
            state.userId = null;
            state.name = null;
            state.langkey = null;
            state.roles = null;
            state.permissions = [];
            state.menus = [];
            state.error = null;
            state.message = '로그아웃';

            state.accessToken = null;
            state.refreshToken = null;
            state.expiresAt = null;

            state.authReady = true;

            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('expiresAt');
            localStorage.removeItem('user');
            localStorage.removeItem('menus');
        },

        updatePermissions(state, action: PayloadAction<UserPermission[]>) {
            state.permissions = action.payload;
        },

        updateRoles(state, action: PayloadAction<string>) {
            state.roles = action.payload ?? null;
            try {
                const userRaw = localStorage.getItem('user');
                const user = userRaw ? JSON.parse(userRaw) : {};
                user.roles = state.roles;
                localStorage.setItem('user', JSON.stringify(user));
            } catch {}
        },

        updateRefreshToken(
            state,
            action: PayloadAction<{
                accessToken: string;
                refreshToken?: string;
                menus?: MenuItem[];
                expiresAt?: number;
            }>
        ) {
            state.accessToken = action.payload.accessToken;
            try {
                localStorage.setItem('accessToken', action.payload.accessToken);
            } catch {}

            if (action.payload.refreshToken) {
                state.refreshToken = action.payload.refreshToken;
                try {
                    localStorage.setItem('refreshToken', action.payload.refreshToken);
                } catch {}
            }
            if (action.payload.menus) {
                state.menus = action.payload.menus;
                try {
                    localStorage.setItem('menus', JSON.stringify(state.menus));
                } catch {}
            }
            if (typeof action.payload.expiresAt === 'number') {
                state.expiresAt = action.payload.expiresAt;
                try {
                    localStorage.setItem('expiresAt', String(action.payload.expiresAt));
                } catch {}
            }
        },

        setTokens(
            state,
            action: PayloadAction<{ accessToken: string; refreshToken: string }>
        ) {
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            try {
                localStorage.setItem('accessToken', action.payload.accessToken);
                localStorage.setItem('refreshToken', action.payload.refreshToken);
            } catch {}
        },

        clearTokens(state) {
            state.accessToken = null;
            state.refreshToken = null;
            state.expiresAt = null;
            try {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('expiresAt');
            } catch {}
        },
    },
});

/** ===== Actions / Reducer ===== */
export const {
    hydrateFromStorage,
    loginAction,
    loginSuccess,
    loginFailure,
    logoutAction,
    logout,
    updatePermissions,
    updateRoles,
    updateRefreshToken,
    setTokens,
    clearTokens,
} = authSlice.actions;

export default authSlice.reducer;

/** ===== Selectors ===== */
/** 옵션1 핵심: 상태 플래그로만 인증 판단 */
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
    state.auth.status === 'authenticated';

/** persist 준비 여부는 가드에서만 확인하고, 여기선 추가 셀렉터로 노출 */
export const selectAuthReady = (state: { auth: AuthState; _persist?: { rehydrated: boolean } }) =>
    state.auth.authReady && (state._persist?.rehydrated ?? true);
