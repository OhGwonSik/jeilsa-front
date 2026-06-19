// Sidebar.tsx (붙여넣기용: 헤더만 아이콘, 자식은 텍스트)
// Named/Default 둘 다 export해서 import 방식 어떤 것이든 동작합니다.

import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Building,
  Package,
  FileText,
  Menu as MenuIcon,
  X,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { RootState } from "@/common/redux/store";
import { selectIsAuthenticated } from "@/common/redux/authSlice";

// ─────────────────────────────────────────────
// 헤더명 → 아이콘 매핑 (원래 사이드바와 동일 느낌)
// ─────────────────────────────────────────────
const getHeaderIcon = (name?: string) => {
  const n = (name || "").trim();
  if (n === "기본설정") return Building;
  if (n === "택배" || n === "제일택배") return Package;
  if (n === "정산관리") return FileText;
  if (n.startsWith("임시")) return FileText;
  return Folder; // 기본값
};

// delYn / isActive 혼용 대응
const isActiveMenu = (m: any) =>
    m?.isActive ?? (m?.delYn ? String(m.delYn).toUpperCase() !== "Y" : true);

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsedSections, setCollapsedSections] = useState<
      Record<string | number, boolean>
  >({});

  const menus = useSelector((state: RootState) => state.auth.menus);
    const isAuthenticated = useSelector(selectIsAuthenticated);

  const toggleCollapse = (sectionId: string | number) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleNavigation = (path?: string | null) => {
    if (!path) return;
    setIsOpen(false);
    navigate(path);
  };

  // HEADER만 아이콘, children은 텍스트만 (menuPath 사용)
  const processedMenus = useMemo(() => {
    if (!menus || menus.length === 0) return [];

    return menus
        .filter((m: any) => m.menuType === "HEADER" && isActiveMenu(m))
        .sort((a: any, b: any) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0))
        .map((header: any) => {
          const children =
              (header.items || [])
                  .filter((c: any) => c.menuType === "MENU" && isActiveMenu(c))
                  .sort((a: any, b: any) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0))
                  .map((c: any) => ({
                    ...c,
                    url: c.menuPath || "",
                  })) || [];
          return { header, children };
        });
  }, [menus]);

  if (!isAuthenticated) return null;

  return (
      <>
        {/* 모바일 햄버거 버튼 */}
        <button
            className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded shadow"
            onClick={() => setIsOpen(true)}
        >
          <MenuIcon className="w-6 h-6 text-gray-800" />
        </button>

        {/* 오버레이 */}
        {isOpen && (
            <div
                className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden"
                onClick={() => setIsOpen(false)}
            />
        )}

        {/* 사이드바 */}
        <nav
            className={cn(
                "fixed top-0 left-0 z-40 h-full w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out",
                "transform md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full",
                "md:top-[64px] md:h-[calc(100vh-64px)]"
            )}
        >
          {/* 닫기 (모바일) */}
          <div className="md:hidden flex justify-end p-4">
            <button onClick={() => setIsOpen(false)}>
              <X className="w-6 h-6 text-gray-800" />
            </button>
          </div>

          {/* 스크롤 영역 */}
          <div className="p-4 korean-text overflow-y-auto h-[calc(100%-64px)] md:h-full">
            {processedMenus.length === 0 ? (
                <div className="text-center text-gray-500 text-sm korean-text">
                  메뉴가 없습니다
                </div>
            ) : (
                processedMenus.map((group) => {
                  const sectionId = group.header.menuId;
                  const collapsed = !!collapsedSections[sectionId];
                  const HeaderIcon = getHeaderIcon(group.header.menuName);

                  return (
                      <div key={sectionId} className="mb-4">
                        {/* HEADER (아이콘 표시) */}
                        <button
                            onClick={() => toggleCollapse(sectionId)}
                            className="w-full flex items-center justify-between p-2 text-left text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <div className="flex items-center">
                            <HeaderIcon className="w-4 h-4 mr-2" />
                            <span>{group.header.menuName}</span>
                          </div>
                          {group.children.length > 0 && (
                              collapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                              ) : (
                                  <ChevronDown className="w-4 h-4" />
                              )
                          )}
                        </button>

                        {/* CHILDREN (아이콘 없이 텍스트만) */}
                        {!collapsed && group.children.length > 0 && (
                            <div className="mt-2 ml-2">
                              <ul className="space-y-1">
                                {group.children.map((item: any) => {
                                  const active = location.pathname === (item.url || "");
                                  return (
                                      <li key={item.menuId}>
                                        {item.url ? (
                                            <div
                                                onClick={() => handleNavigation(item.url)}
                                                className={cn(
                                                    "block px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                                                    active
                                                        ? "bg-blue-100 text-blue-700 font-medium border-r-2 border-blue-500"
                                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                                )}
                                            >
                                              {item.menuName}
                                            </div>
                                        ) : (
                                            <div
                                                className="block px-3 py-2 text-sm rounded-md text-gray-400 cursor-not-allowed"
                                                title="경로가 설정되지 않았습니다"
                                            >
                                              {item.menuName}
                                            </div>
                                        )}
                                      </li>
                                  );
                                })}
                              </ul>
                            </div>
                        )}
                      </div>
                  );
                })
            )}
          </div>
        </nav>
      </>
  );
}

export default Sidebar;
export { Sidebar };
