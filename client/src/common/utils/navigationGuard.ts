// src/common/utils/navigationGuard.ts
import { store } from '@/common/redux/store';

let origPush: History['pushState'];
let origReplace: History['replaceState'];
let inited = false;

/** 공개 경로 prefix (절대 '/' 넣지 말 것!) */
const PUBLIC_PREFIXES = [
  '/login',
  '/unauthorized',
  '/signup',
  '/not-found',
  '/bill/invoice/detail',
  '/assets',
  '/favicon',
] as const;

const norm = (p: string) =>
    (p || '/')
        .split('?')[0]
        .split('#')[0]
        .replace(/\/+$/, '')
        .toLowerCase() || '/';

const isPublic = (path: string) =>
    path === '/' || PUBLIC_PREFIXES.some((pref) => path === pref || path.startsWith(pref + '/'));

function isAuthedByState(): boolean {
  const state: any = store.getState();
  const at: string | null = state?.auth?.accessToken ?? null;
  const exp: number | null = state?.auth?.expiresAt ?? null;

  if (!at) return false;
  if (typeof exp === 'number') return Date.now() < exp;

  // fallback: JWT exp 파싱
  try {
    const payload = JSON.parse(atob(at.split('.')[1]));
    return payload?.exp ? payload.exp * 1000 > Date.now() : true;
  } catch {
    return true; // 토큰은 있는데 exp 파싱 실패 → 일단 true
  }
}

/** 메뉴 트리 전체에서 허용 path 집합 생성 */
function computeAllowed(): Set<string> {
  const { auth } = store.getState() as any;
  const menus = auth?.menus || [];

  const set = new Set<string>();
  const stack = Array.isArray(menus) ? [...menus] : [];

  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;

    const delYn = String(n?.delYn ?? 'N').toUpperCase();
    if (delYn === 'Y') continue;

    if (n?.menuPath) set.add(norm(n.menuPath));
    if (Array.isArray(n?.items) && n.items.length) stack.push(...n.items);
  }
  return set;
}

// 🔐 여기서는 "차단 여부만 계산" — 절대 redirect 하지 않음.
function shouldBlock(pathname: string): boolean {
  const target = norm(pathname);

  // 공개 경로는 항상 허용
  if (isPublic(target)) return false;

  // 미인증은 여기서 막지 않음 (실제 차단은 라우트 가드에서)
  if (!isAuthedByState()) return false;

  // 메뉴 준비 전에도 막지 않음 (초기 부팅 깜빡임 방지)
  const state: any = store.getState();
  const menusReady = Array.isArray(state?.auth?.menus);
  if (!menusReady) return false;

  const allowed = computeAllowed();
  return !allowed.has(target);
}

function wrap(method: 'pushState' | 'replaceState') {
  return function (this: History, ...args: any[]) {
    try {
      const url = args[2];
      const dest =
          typeof url === 'string'
              ? new URL(url, window.location.origin).pathname
              : window.location.pathname;

      const block = shouldBlock(dest);
      // 관찰 로그만 (필요시 ON)
      // console.debug('[NavGuard]', method, '→', dest, 'block=', block);
    } catch {
      // no-op
    }
    return (method === 'pushState' ? origPush : origReplace).apply(history, args as any);
  };
}

export const navigationGuard = {
  init() {
    if (inited) return;
    inited = true;
    origPush = history.pushState;
    origReplace = history.replaceState;
    history.pushState = wrap('pushState') as any;
    history.replaceState = wrap('replaceState') as any;

    // 뒤/앞으로 가기 — 관찰만
    window.addEventListener('popstate', () => {
      // const dest = norm(window.location.pathname);
      // console.debug('[NavGuard] popstate →', dest);
    });
  },
  destroy() {
    if (!inited) return;
    history.pushState = origPush;
    history.replaceState = origReplace;
    inited = false;
  },
};
