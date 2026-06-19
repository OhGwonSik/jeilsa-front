/**
 * JWT 토큰 관련 유틸리티 함수들
 */

export interface JWTValidationResult {
  valid: boolean;
  reason?: string;
  exp?: number;
  iat?: number;
  payload?: any;
}

/**
 * JWT 토큰을 디코딩합니다.
 * @param token JWT 토큰 문자열
 * @returns 디코딩된 페이로드 또는 null
 */
export const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 디코딩 실패:', error);
    return null;
  }
};

/**
 * JWT 토큰의 유효성을 검증합니다.
 * @param token JWT 토큰 문자열
 * @returns 검증 결과
 */
export const validateJWT = (token: string): JWTValidationResult => {
  const payload = decodeJWT(token);
  if (!payload) {
    return { valid: false, reason: 'Invalid token format' };
  }
  
  const now = Date.now() / 1000; // 초 단위
  
  // 만료 시간 체크
  if (payload.exp && payload.exp < now) {
    return { valid: false, reason: 'Token expired' };
  }
  
  // 발급 시간 체크 (미래에 발급된 토큰)
  if (payload.iat && payload.iat > now) {
    return { valid: false, reason: 'Token issued in future' };
  }
  
  return { 
    valid: true, 
    exp: payload.exp, 
    iat: payload.iat,
    payload 
  };
};

/**
 * JWT 토큰이 곧 만료될 예정인지 확인합니다.
 * @param token JWT 토큰 문자열
 * @param bufferMinutes 만료 전 체크할 시간 (분)
 * @returns 만료 예정 여부
 */
export const isTokenExpiringSoon = (token: string, bufferMinutes: number = 2): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return false;
  
  const expTime = payload.exp * 1000; // 초를 밀리초로 변환
  const currentTime = Date.now();
  const bufferTime = bufferMinutes * 60 * 1000;
  
  return (expTime - currentTime) < bufferTime;
};

/**
 * expiresAt을 사용하여 토큰이 곧 만료될 예정인지 확인합니다.
 * @param expiresAt 토큰 만료 시점 (밀리초)
 * @param bufferMinutes 만료 전 체크할 시간 (분)
 * @returns 만료 예정 여부
 */
export const isTokenExpiringSoonByExpiresAt = (expiresAt: number | null, bufferMinutes: number = 2): boolean => {
  if (!expiresAt) return false;
  
  const currentTime = Date.now();
  const bufferTime = bufferMinutes * 60 * 1000;
  
  return (expiresAt - currentTime) < bufferTime;
};

/**
 * JWT 토큰에서 사용자 ID를 추출합니다.
 * @param token JWT 토큰 문자열
 * @returns 사용자 ID 또는 null
 */
export const extractUserIdFromToken = (token: string): string | null => {
  const payload = decodeJWT(token);
  return payload?.sub || payload?.userId || null;
};

/**
 * JWT 토큰에서 권한 정보를 추출합니다.
 * @param token JWT 토큰 문자열
 * @returns 권한 배열 또는 빈 배열
 */
export const extractPermissionsFromToken = (token: string): string[] => {
  const payload = decodeJWT(token);
  return payload?.permissions || payload?.authorities || [];
};

/**
 * JWT 토큰의 남은 유효 시간을 계산합니다.
 * @param token JWT 토큰 문자열
 * @returns 남은 시간 (밀리초) 또는 null
 */
export const getTokenRemainingTime = (token: string): number | null => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;
  
  const expTime = payload.exp * 1000;
  const currentTime = Date.now();
  const remainingTime = expTime - currentTime;
  
  return remainingTime > 0 ? remainingTime : null;
};

/**
 * expiresAt을 사용하여 남은 유효 시간을 계산합니다.
 * @param expiresAt 토큰 만료 시점 (밀리초)
 * @returns 남은 시간 (밀리초) 또는 null
 */
export const getTokenRemainingTimeByExpiresAt = (expiresAt: number | null): number | null => {
  if (!expiresAt) return null;
  
  const currentTime = Date.now();
  const remainingTime = expiresAt - currentTime;
  
  return remainingTime > 0 ? remainingTime : null;
};

/**
 * JWT 토큰의 만료 시간을 포맷팅합니다.
 * @param token JWT 토큰 문자열
 * @returns 포맷팅된 만료 시간 문자열
 */
export const formatTokenExpiration = (token: string): string => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return 'Unknown';
  
  const expTime = new Date(payload.exp * 1000);
  return expTime.toLocaleString('ko-KR');
};

/**
 * expiresAt을 사용하여 만료 시간을 포맷팅합니다.
 * @param expiresAt 토큰 만료 시점 (밀리초)
 * @returns 포맷팅된 만료 시간 문자열
 */
export const formatTokenExpirationByExpiresAt = (expiresAt: number | null): string => {
  if (!expiresAt) return 'Unknown';
  
  const expTime = new Date(expiresAt);
  return expTime.toLocaleString('ko-KR');
};
