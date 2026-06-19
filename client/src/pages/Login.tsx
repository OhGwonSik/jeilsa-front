/* essential */
import React, {useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
// Redux action import
import {loginUserThunk} from '@/common/redux/authThunk';
// RootState 타입 추가
import {AppDispatch, RootState} from '../common/redux/store';
/* css */
import loginStyle from '../assets/css/login.module.css';
import {useNavigate} from "react-router-dom";

/* 로그인 페이지 */
function LoginPage() {
    const navigate = useNavigate();
    // state
    //아이디와 비밀번호는 테스트 후 입력값 초기화 해야함
    const [id, setId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // Hooks
    const dispatch = useDispatch<AppDispatch>();
    const reduxError = useSelector((state: RootState) => state.auth.error);

    // Ref
    const idInputRef = useRef<HTMLInputElement>(null);
    const pwInputRef = useRef<HTMLInputElement>(null);

    // Event Handlers
    // 아이디 변경
    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setId(e.target.value);
    };
    // 비밀번호 변경
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    };
    // 엔터 키 입력
    const handleLoginByEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const isValid = checkLoginError(id, password);
            if(isValid) {
                await loginApi(id, password);
            } else {
                if(!id){
                    idInputRef.current?.focus();
                } else if(!password) {
                    pwInputRef.current?.focus();
                }
            }
        }
    };
    // 로그인 버튼 클릭
    const handleLoginByButton = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const isLoginError = checkLoginError(id, password);
        if(isLoginError) {
            await loginApi(id, password);
        }
    };

    // 로그인 api
    const loginApi = async (userId: string, userPw: string) => {
        setIsLoading(true);
        try {
            await dispatch(loginUserThunk({ userId, userPw })).unwrap(); // 실패시 throw
            navigate("/", { replace: true });
        } catch (error: any) {
            setLoginError(error?.message || "로그인에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 로그인 에러 체크
    const checkLoginError = (id: string, password: string) => {
        if(!id) {
            setLoginError("아이디를 입력해주세요.");
            return false;
        } else if(!password) {
            setLoginError("비밀번호를 입력해주세요.");
            return false;
        }

        setLoginError(null);
        return true;
    };

    // 회원가입 / 아이디 패스워드 찾기 시 alert
    const handleInfoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        alert("관리자에게 문의 바랍니다.");
    };    

    // Render
    return (
        <>
            <div className={loginStyle.loginWrapper}>
                <div className={`${loginStyle.loginWrap} ${loginStyle.conBox}`}>
                    <div className={loginStyle.loginTitleWrap}>
                        <div className={loginStyle.loginTitle}>
                            <span>DMS</span>
                        </div>
                    </div>
                    {loginError && <div className={loginStyle.errmsg}>{loginError}</div>}
                    {reduxError && !loginError && <div className={loginStyle.errmsg}>{reduxError}</div>}
                    <div className={loginStyle.inputLoginWrapper}>
                        <input
                            ref={idInputRef}
                            type="text"
                            className={loginStyle.icId}
                            placeholder="아이디"
                            value={id}
                            onChange={handleIdChange}
                            onKeyDown={handleLoginByEnter}
                            disabled={isLoading}
                        />
                        <input
                            ref={pwInputRef}
                            type="password"
                            className={loginStyle.icPw}
                            placeholder="비밀번호"
                            value={password}
                            onChange={handlePasswordChange}
                            onKeyDown={handleLoginByEnter}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            className={loginStyle.btnLogin}
                            id="login-button"
                            onClick={handleLoginByButton}
                            disabled={isLoading}
                        >
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                        <div className={loginStyle.joinFind}>
                        <span onClick={handleInfoClick} className={loginStyle.linkText}>
                            회원가입
                        </span>
                        <span className={loginStyle.divider}>|</span>
                        <span onClick={handleInfoClick} className={loginStyle.linkText}>
                            아이디·비밀번호 찾기
                        </span>
                        </div>
                    </div>
                    <div className={loginStyle.copyright}>Copyright © WMS All right reserved.</div>
                </div>
            </div>
        </>
    );
}

export default LoginPage;
