import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@/common/redux/store";
import {Link, useNavigate} from "react-router-dom";
import {logoutUserThunk} from "@/common/redux/authThunk.ts";
import { Menu, LogOut } from "lucide-react";
import { selectIsAuthenticated } from "@/common/redux/authSlice";
import { useQueryClient } from "@tanstack/react-query";


export function Header({ isSidebarOpen, setIsSidebarOpen }) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { useract } = useSelector((state: RootState) => state.auth);
  const queryClient = useQueryClient(); // React Query 캐시 접근
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const name = useSelector((state: RootState) => state.auth.name) || '익명';
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\./g, '.').replace(/\s/g, '');

  const handleLogout = () => {
    dispatch(logoutUserThunk())
      .unwrap()
      .then(() => {
        queryClient.clear();   // ✅ 로그아웃 후 캐시 초기화
        navigate("/login");    // ✅ 그 다음 로그인 페이지 이동
      })
      .catch(() => {
        navigate("/login");    // 실패해도 이동
      });
  };

  return (
    <header className="bg-white h-16 flex items-center justify-between px-6 border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-x-3">
        {/* ☰ 햄버거 (모바일 전용) */}
        <button className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="w-6 h-6 text-gray-800" />
        </button>

        {/* 제목 */}
        {/*<Link to="/dashboard" className="block">*/}
        <Link to="/dashboard" className="block">
          <div className="cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]">
            <h1 className="text-xl font-bold text-gray-900">DMS 시스템</h1>
            <p className="text-sm text-gray-600">택배 관리 시스템</p>
          </div>
        </Link>
      </div>

      {/* Right Area - User Info and Actions */}
      {isAuthenticated && (
          <div className="flex items-center gap-x-6 flex-wrap justify-end min-w-0">
            {/* 유저 정보 묶음 */}
            <div className="flex flex-col items-end gap-y-1 text-right md:flex-row md:items-center md:gap-x-4">
              {/* 이름 + 날짜 */}
              <div className="flex flex-col md:flex-row md:items-center md:gap-x-2">
                <span className="text-sm font-medium text-gray-800">{name}</span>
                <span className="text-sm text-gray-500">{currentDate}</span>
              </div>
            </div>

            {/* Avatar */}
            <div className="rounded-full bg-blue-100 text-blue-700 font-bold w-8 h-8 flex items-center justify-center text-sm">
              {name[0]}
            </div>
            {/* 프린트PG설치(NEW) 다운로드 링크 */}
            <a
                href="/jeil_print_program.zip"
                className="text-blue-600 hover:underline text-sm font-medium"
                download
            >
              프린트PG설치(NEW)
            </a>

            {/* Logout */}
            <LogOut
                onClick={handleLogout}
                className="w-5 h-5 text-gray-600 cursor-pointer hover:text-red-500 transition-colors"
            />
          </div>
      )}
    </header>
  );
}
