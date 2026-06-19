import { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/common/redux/store';
import { selectIsAuthenticated } from "@/common/redux/authSlice";
import { logoutUserThunk } from '@/common/redux/authThunk';
import { 
  isTokenExpiringSoon, 
  getTokenRemainingTime, 
  formatTokenExpiration,
  extractUserIdFromToken 
} from '@/utils/jwtUtils';

/**
 * 토큰 관리를 위한 커스텀 훅
 */
export const useTokenManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accessToken, refreshToken } = useSelector(
    (state: RootState) => state.auth
  );
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 토큰 상태 체크
   */
  const checkTokenStatus = useCallback(() => {
    if (!accessToken || !isAuthenticated) return;

    const remainingTime = getTokenRemainingTime(accessToken);
    if (remainingTime === null) {
      console.warn('토큰 만료 시간을 확인할 수 없습니다.');
      return;
    }

    // 토큰 만료 5분 전 경고
    if (remainingTime < 5 * 60 * 1000) {
      console.warn(`토큰이 ${Math.floor(remainingTime / 1000 / 60)}분 후 만료됩니다.`);
      
      // 사용자에게 경고 메시지 표시 (토스트 등)
      if (remainingTime < 2 * 60 * 1000) {
        // 2분 전: 긴급 경고
        console.error('토큰이 곧 만료됩니다!');
      }
    }
  }, [accessToken, isAuthenticated]);

  /**
   * 토큰 만료 시 자동 로그아웃
   */
  const handleTokenExpiration = useCallback(() => {
    if (!accessToken) return;

    if (isTokenExpiringSoon(accessToken, 0)) {
      console.log('토큰이 만료되었습니다. 자동 로그아웃을 진행합니다.');
      dispatch(logoutUserThunk());
    }
  }, [accessToken, dispatch]);

  /**
   * 토큰 정보 조회
   */
  const getTokenInfo = useCallback(() => {
    if (!accessToken) return null;

    const remainingTime = getTokenRemainingTime(accessToken);
    const expirationTime = formatTokenExpiration(accessToken);
    const userId = extractUserIdFromToken(accessToken);

    return {
      remainingTime,
      expirationTime,
      userId,
      isExpiringSoon: isTokenExpiringSoon(accessToken, 5), // 5분 전
      isExpired: remainingTime === null || remainingTime <= 0
    };
  }, [accessToken]);

  /**
   * 토큰 상태 모니터링 시작
   */
  const startTokenMonitoring = useCallback(() => {
    if (!isAuthenticated || !accessToken) return;

    // 30초마다 토큰 상태 체크
    tokenCheckIntervalRef.current = setInterval(() => {
      checkTokenStatus();
      handleTokenExpiration();
    }, 30000);

    // 토큰 만료 1분 전 경고
    const remainingTime = getTokenRemainingTime(accessToken);
    if (remainingTime && remainingTime > 60000) {
      const warningTime = remainingTime - 60000; // 1분 전
      warningTimeoutRef.current = setTimeout(() => {
        console.warn('토큰이 1분 후 만료됩니다. 갱신이 필요합니다.');
        // 여기에 사용자 알림 로직 추가 가능
      }, warningTime);
    }
  }, [isAuthenticated, accessToken, checkTokenStatus, handleTokenExpiration]);

  /**
   * 토큰 상태 모니터링 중지
   */
  const stopTokenMonitoring = useCallback(() => {
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }
    
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  // 컴포넌트 마운트/언마운트 시 모니터링 시작/중지
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      startTokenMonitoring();
    } else {
      stopTokenMonitoring();
    }

    return () => {
      stopTokenMonitoring();
    };
  }, [isAuthenticated, accessToken, startTokenMonitoring, stopTokenMonitoring]);

  // 토큰 변경 시 모니터링 재시작
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      stopTokenMonitoring();
      startTokenMonitoring();
    }
  }, [accessToken]);

  return {
    // 토큰 정보
    tokenInfo: getTokenInfo(),
    
    // 토큰 상태
    isTokenValid: !!accessToken && !isTokenExpiringSoon(accessToken, 0),
    isTokenExpiringSoon: accessToken ? isTokenExpiringSoon(accessToken, 5) : false,
    
    // 모니터링 제어
    startTokenMonitoring,
    stopTokenMonitoring,
    
    // 유틸리티
    checkTokenStatus,
    handleTokenExpiration
  };
};
