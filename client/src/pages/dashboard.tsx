import {Layout} from "@/components/layout/layout";
import {Card, CardContent} from "@/components/ui/card";
import {Building, DollarSign, FileText, Package} from "lucide-react";
import {useSelector} from "react-redux";
import {RootState} from "@/common/redux/store";
import {useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import {useApiQuery} from "@/hooks/useApiQuery.ts";

export default function Dashboard() {
    const name = useSelector((state: RootState) => state.auth.name) || '익명';
    const navigate = useNavigate();
    const role = useSelector((state: RootState) => state.auth.roles);

    // ib sheet에 사용할 컬럼
    const columns = [
        {Header: "구분", Name: "transportProcessCd", Align: "Center", Width: 70},
        {Header: "접수일", Name: "requstDt", Align: "Center", Width: 100},
        {Header: "발송지역", Name: "deliveryRegionId1", Align: "Center", Width: 80},
        {Header: "회수자", Name: "managerId", Align: "Center", Width: 80},
        {Header: "청구화주명", Name: "companyNm1", Align: "Center", Width: 150},
        {Header: "운송장", Name: "waybillNo", Align: "Center", Width: 150},
        {Header: "발신자", Name: "sender", Align: "Center", Width: 120},
        {Header: "요금구분", Name: "chargeCd", Align: "Center", Width: 80},
        {Header: "수량", Name: "qty", Align: "Center", Width: 60},
        {Header: "단가", Name: "untpc", Align: "Center", Width: 60},
        {Header: "합계금액", Name: "sumAmount", Align: "Center", Width: 100},
        {Header: "Kg단가", Name: "weight", Align: "Center", Width: 80},
        {Header: "단가", Name: "weightQty", Align: "Center", Width: 60},
        {Header: "무게합계", Name: "sumWeight", Align: "Center", Width: 100},
        {Header: "비고사항", Name: "rmk", Align: "Center", Width: 120},

        {Header: "수신지역", Name: "deliveryRegionId2", Align: "Center", Width: 100},
        {Header: "종류", Name: "kindCode", Align: "Center", Width: 60},
        {Header: "수신처", Name: "companyNm2", Align: "Center", Width: 120},
        {Header: "수신처Tel", Name: "telNo2", Align: "Center", Width: 120},
        {Header: "수신처MBL", Name: "mobileNo2", Align: "Center", Width: 120},
        {Header: "배송코스", Name: "transportCourse", Align: "Center", Width: 80},
        {Header: "픽업체크", Name: "pickupCheck", Align: "Center", Width: 110},
        {Header: "배송담당", Name: "transportManager", Align: "Center", Width: 110},
        {Header: "배송완료일", Name: "transportDate", Align: "Center", Width: 100},
        {Header: "배송코드", Name: "transportCode", Align: "Center", Width: 80},
        {Header: "메모", Name: "memo", Align: "Center", Width: 150},
        {Header: "수신 주소", Name: "companyNm2Address", Align: "Center", Width: 250}
    ];

    const handleShortcutClick = (path: string) => {
        navigate(path);
    };

    type Notice = {
        noticeId: number;
        title: string;
        content: string;
        regDt: string;     // "YYYY-MM-DD"
        regNm: string;
    };
    
    const [list, setList] = useState<Notice[]>([]);
    const [selected, setSelected] = useState<Notice | null>(null);
    
    // TODO 공지사항 조회 API 연결 & 검색 조건에 필터값 추가 (상위 3개만 나오게)
    const { data: NoticeData = [], isLoading } = useApiQuery<Notice[]>(
        "/api/notices/list",
        { limited: 'Y' }, // 대시보드 화면에서는 상위 3개만 노출
    );

    // 최초 로딩 (실서비스에선 API 호출 자리)
    useEffect(() => {
        if (isLoading) return;
        const rows = Array.isArray(NoticeData) ? NoticeData : [];
        if (rows.length === 0 && list.length === 0) return;
        setList(rows);
    }, [NoticeData, isLoading]);

    // 첫 항목 자동 선택
    useEffect(() => {
        if (!selected && list.length > 0) {
            setSelected(list[0]);
        }
    }, [list, selected]);

    return (
        <Layout>
            <div className="px-6 pt-6 space-y-6">
                {/* Welcome Message */}
                <Card className="mt-2">
                    <CardContent className="p-4">
                        <h1 className="text-lg font-semibold text-gray-800">
                            {name}님, 환영합니다.
                        </h1>
                        <p className="text-lg font-semibold text-gray-800">
                            좌측 메뉴를 통해 DMS 시스템을 이용하실 수 있습니다.</p>
                    </CardContent>
                </Card>

                {/* Shortcut Buttons */}
                {/* 모바일 빠른 버튼 */}
                <div className="block md:hidden">
                    <Card className="mt-8">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 실행</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div onClick={() => handleShortcutClick("/settings/companies")}
                                     className="flex items-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
                                    <div className="bg-yellow-100 rounded-full p-3 mr-3">
                                        <Building className="w-5 h-5 text-yellow-600"/>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">업체 관리</p>
                                        <p className="text-sm text-gray-500">업체 정보 수정</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {/* PC 빠른 버튼 */}
                <div className="hidden md:block">
                    <Card className="mt-8">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 실행</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {(role == "ADMIN" || role == "OWNER") ?
                                    <div onClick={() => handleShortcutClick("/settlement/invoices")}
                                         className="flex items-center p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                                        <div className="bg-blue-100 rounded-full p-3 mr-3">
                                            <FileText className="w-5 h-5 text-blue-600"/>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">청구서 관리</p>
                                            <p className="text-sm text-gray-500">새 청구서 확인</p>
                                        </div>
                                    </div>
                                    : null}
                                {(role == "USER") ?
                                    <div onClick={() => handleShortcutClick("/transport/settlement-by-shipper")}
                                         className="flex items-center p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                                        <div className="bg-blue-100 rounded-full p-3 mr-3">
                                            <FileText className="w-5 h-5 text-blue-600"/>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">화주별 정산서</p>
                                            <p className="text-sm text-gray-500">새 청구서 확인</p>
                                        </div>
                                    </div>
                                    : null}
                                {(role == "ADMIN" || role == "OWNER") ?
                                    <div onClick={() => handleShortcutClick("/transport/shipments")}
                                         className="flex items-center p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                                        <div className="bg-green-100 rounded-full p-3 mr-3">
                                            <Package className="w-5 h-5 text-green-600"/>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">배송 등록</p>
                                            <p className="text-sm text-gray-500">운송정보 입력</p>
                                        </div>
                                    </div>
                                    : null}
                                {(role == "USER") ?
                                    <div onClick={() => handleShortcutClick("/transport/shipper-details")}
                                         className="flex items-center p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                                        <div className="bg-green-100 rounded-full p-3 mr-3">
                                            <Package className="w-5 h-5 text-green-600"/>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">화주별 내역</p>
                                            <p className="text-sm text-gray-500">화주별 내역 확인</p>
                                        </div>
                                    </div>
                                    : null}
                                {(role == "ADMIN" || role == "OWNER" ) ?
                                    <div onClick={() => handleShortcutClick("/settings/companies")}
                                         className="flex items-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
                                        <div className="bg-yellow-100 rounded-full p-3 mr-3">
                                            <Building className="w-5 h-5 text-yellow-600"/>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">업체 관리</p>
                                            <p className="text-sm text-gray-500">업체 정보 수정</p>
                                        </div>
                                    </div>
                                    : null}
                                {(role == "MANAGER") ?
                                    <div onClick={() => handleShortcutClick("/settings/companies")}
                                         className="flex items-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
                                        <div className="bg-yellow-100 rounded-full p-3 mr-3">
                                            <Building className="w-5 h-5 text-yellow-600"/>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">업체 조회</p>
                                            <p className="text-sm text-gray-500">업체 정보 찾기</p>
                                        </div>
                                    </div>
                                    : null}
                                {(role == "ADMIN" || role == "OWNER") ?
                                    <div onClick={() => handleShortcutClick("/settlement/billCompany")}
                                         className="flex items-center p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                                        <div className="bg-purple-100 rounded-full p-3 mr-3">
                                            <DollarSign className="w-5 h-5 text-purple-600"/>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">통장 관리</p>
                                            <p className="text-sm text-gray-500">공급자 현황 확인</p>
                                        </div>
                                    </div>
                                    : null}
                            </div>
                        </CardContent>
                    </Card>
                </div>


                <Card className="mt-8">
                    <CardContent className="p-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">공지사항</h2>

                        {/* 2열 × 2행 그리드: 좌측 상세는 세로 2칸 차지, 우측은 위=목록 / 아래=하단영역 */}
                        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] md:grid-rows-[auto_auto] gap-4">
                        {/* 왼쪽: 상세 패널 (세로 2칸 차지) */}
                            <section className="border border-gray-200 rounded-lg bg-white shadow-sm min-h-[220px] md:row-span-2">
                                {!selected ? (
                                    <div className="p-6 text-sm text-gray-500">우측에서 공지를 선택하세요.</div>
                                ) : (
                                    <>
                                        {/* 헤더: 제목 왼쪽 / 작성자·날짜 오른쪽 */}
                                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                            <h3 className="text-lg font-medium text-gray-900 truncate">{selected.title}</h3>
                                            <div className="flex items-center gap-x-3 text-sm text-gray-600">
                <span>
                  작성자: <span className="font-medium text-gray-800">{selected.regNm}</span>
                </span>
                                                <span className="text-gray-300">|</span>
                                                <span className="text-gray-500">{selected.regDt}</span>
                                            </div>
                                        </div>
                                        {/* 내용 */}
                                        <div className="p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                            {selected.content}
                                        </div>
                                    </>
                                )}
                            </section>

                            {/* 오른쪽: 목록 패널 */}
                            <aside className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                                <ul className="max-h-[300px] overflow-auto divide-y divide-gray-100">
                                    {list.length === 0 ? (
                                        <li className="p-4 text-sm text-gray-500">등록된 공지가 없습니다.</li>
                                    ) : (
                                        list.map((n) => {
                                            const active = selected?.noticeId === n.noticeId;
                                            return (
                                                <li key={n.noticeId}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelected(n)}
                                                        className={[
                                                            "w-full text-left p-3 transition",
                                                            active ? "bg-blue-50" : "hover:bg-gray-50",
                                                        ].join(" ")}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-medium text-gray-900 truncate">{n.title}</p>
                                                            <span className="ml-3 shrink-0 text-xs text-gray-500">{n.regDt}</span>
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                            </aside>

                            {/* 오른쪽 칸 하단: 우측 정렬 텍스트 */}
                            <div className="text-right text-gray-500 text-sm pr-2">* 등록일 기준 최신 3건의 게시물만 조회됩니다.</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Today's Delivery Check Summary */}
                {/*<Card className="mt-8">*/}
                {/*  <CardContent className="p-6">*/}
                {/*    <div className="flex justify-between items-center mb-4">*/}
                {/*      <h2 className="text-base font-semibold text-gray-800">오늘 배송 체크 현황</h2>*/}
                {/*      /!*<span className="text-sm text-gray-600">총 {data.length}건</span>*!/*/}
                {/*    </div>*/}

                {/*      /!* 데이터 영역 *!/*/}
                {/*      /!* ib sheet 사용 *!/*/}
                {/*      <CommonSheet url="/api/transport/list"*/}
                {/*                   editMode = {3}*/}
                {/*                   emptyMessage="등록된 운송이 없습니다."*/}
                {/*                   columns={columns}*/}
                {/*                   extraOptions={{*/}
                {/*                     enableColorMapping: true*/}
                {/*                   }}/>*/}
                {/*  </CardContent>*/}
                {/*</Card>*/}
            </div>
        </Layout>
    );
}