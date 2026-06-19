// AppRoutes.tsx
import {Navigate, Outlet, Route, Routes} from "react-router-dom";
import {useSelector} from "react-redux";
import {RootState} from "@/common/redux/store";

// Pages
import Dashboard from "@/pages/dashboard";
import LoginPage from "@/pages/Login";
import NotFound from "@/pages/not-found";

// Settings
import Members from "@/pages/settings/members.tsx";
import Companies from "@/pages/settings/companies.tsx";
import Notices from "@/pages/settings/notices.tsx";

// Delivery
import Shipments from "@/pages/transport/shipments";
import ShipmentEditor from "@/pages/transport/shipments-editor";
import Check from "@/pages/transport/check";
import SettlementByShipper from "@/pages/transport/settlement-by-shipper";
import ShipperDetails from "@/pages/transport/shipper-details";
import RouteSettings from "@/pages/transport/route-settings";
import WaybillPreregister from "@/pages/transport/waybill-preregister";

// Settlement
import Invoices from "@/pages/settlement/invoices";
import BillCompany from "@/pages/settlement/billCompany.tsx";
import Arrivals from "@/pages/transport/arrivals.tsx";
import ArrivalEditor from "@/pages/transport/arrivals-editor.tsx";
import InvoiceDetailPage from "@/pages/settlement/invoiceDetailPage.tsx";
import Unauthorized from "@/pages/Unauthorized.tsx";
import MenuProtectedRoute from "@/MenuProtectedRoute.tsx";
import RolePage from "@/pages/RolePage.tsx";
import UserPage from "@/pages/UserPage.tsx";

import {selectAuthReady, selectIsAuthenticated} from "@/common/redux/authSlice";

/* -----------------------------
   보호된 레이아웃
----------------------------- */
function ProtectedLayout() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const ready = useSelector(selectAuthReady);

    if (!ready) return null;                 // ✨ 중요: 준비 끝날 때까지 대기
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return <Outlet />;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
    const isAuthed = useSelector(selectIsAuthenticated);
    const ready = useSelector(selectAuthReady);
    if (!ready) return null;                 // persist/hydrate 끝날 때까지 대기
    return isAuthed ? <Navigate to="/" replace /> : children;
}


/* -----------------------------
   첫 메뉴 경로 찾기
----------------------------- */
function findFirstMenuUrl(menus: any[] = []): string | null {
    const isActive = (m: any) =>
        m?.isActive ?? (m?.delYn ? String(m.delYn).toUpperCase() !== "Y" : true);

    // 깊이에 상관없이 모든 MENU flatten
    const flatten = (nodes: any[] = []): any[] => {
        const out: any[] = [];
        const stack = [...nodes];
        while (stack.length) {
            const n = stack.pop();
            if (!n) continue;
            out.push(n);
            if (Array.isArray(n.items) && n.items.length) {
                stack.push(...n.items);
            }
        }
        return out;
    };

    return flatten(menus)
        .filter((m) => m.menuType === "MENU" && isActive(m) && m.menuPath)
        .sort((a, b) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0))[0]?.menuPath ?? null;
}

/* -----------------------------
   RootRedirect (최초 진입 시)
----------------------------- */
function RootRedirect() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const authReady = useSelector(selectAuthReady);
    const menus = useSelector((s: RootState) => s.auth.menus);

    if (!authReady) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    
    const first = findFirstMenuUrl(menus || []);
    return <Navigate to={first ?? "/unauthorized"} replace />;
}

/* -----------------------------
   가드 적용 헬퍼
----------------------------- */
const withGuard = (node: JSX.Element) => (
    <MenuProtectedRoute>{node}</MenuProtectedRoute>
);

/* -----------------------------
   라우트 정의
----------------------------- */
export default function AppRoutes() {
    return (
        <Routes>
            {/* 로그인 안 된 사람만 로그인 페이지로 */}
            <Route
                path="/login"
                element={
                    <PublicOnlyRoute>
                        <LoginPage />
                    </PublicOnlyRoute>
                }
            />

            {/* 권한 없음 페이지 */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />

            {/* 로그인 필요없는 상세 청구서내역 페이지 */}
            <Route path="/bill/invoice/detail/:billId?/:billDtlId?" element={<InvoiceDetailPage />} />

            {/* 로그인한 사람만 접근 가능한 보호된 경로들 */}
            <Route element={<ProtectedLayout />}>
                {/* ✅ index 라우트 → RootRedirect */}
                <Route index element={<RootRedirect />} />

                <Route path="/dashboard" element={withGuard(<Dashboard />)} />

                {/* 설정 */}
                <Route path="/settings/members" element={withGuard(<Members />)} />
                <Route path="/settings/companies" element={withGuard(<Companies />)} />
                <Route path="/settings/notices" element={withGuard(<Notices />)} />
                {/* 배송 */}
                <Route path="/transport/shipments" element={withGuard(<Shipments />)} />
                <Route path="/transport/shipments-editor" element={<ShipmentEditor />} />
                <Route path="/transport/shipments-editor/:deliveryId" element={<ShipmentEditor />} />
                <Route path="/transport/arrivals" element={withGuard(<Arrivals />)} />
                <Route path="/transport/arrivals-editor" element={<ArrivalEditor />} />
                <Route path="/transport/arrivals-editor/:deliveryId" element={<ArrivalEditor />} />
                <Route path="/transport/check" element={withGuard(<Check />)} />
                <Route path="/transport/settlement-by-shipper" element={withGuard(<SettlementByShipper />)} />
                <Route path="/transport/shipper-details" element={withGuard(<ShipperDetails />)} />
                <Route path="/transport/route-settings" element={withGuard(<RouteSettings />)} />
                <Route path="/transport/waybill-preregister" element={withGuard(<WaybillPreregister />)} />

                {/* 정산 */}
                <Route path="/settlement/invoices" element={withGuard(<Invoices />)} />
                <Route path="/settlement/billCompany" element={withGuard(<BillCompany />)} />

                {/* 권한 관련 페이지 */}
                <Route path="/user" element={withGuard(<UserPage />)} />
                <Route path="/role" element={withGuard(<RolePage />)} />
                {/*<Route path="/permission" element={withGuard(<PermissionPage />)} />*/}
            </Route>
        </Routes>
    );
}
