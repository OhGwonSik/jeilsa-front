import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {CalendarIcon, Edit, RotateCcw, Search} from "lucide-react";
import {addDays, format, subDays} from "date-fns";
import {ko} from "date-fns/locale";
import {cn} from "@/lib/utils";
import CommonSheet from "@/pages/ibsheet.tsx";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import {CommonCodeSelect} from "@/pages/codeSelectProps.tsx";
import {parse} from "date-fns/parse";
import {useEffect, useState, useCallback, useMemo, useRef} from "react";
import {Transport} from "@shared/schema.ts";
import {createSearchParams, useNavigate, useLocation} from "react-router-dom";
import {apiRequest} from "@/lib/queryClient.ts";
import { toast } from "@/hooks/use-toast";

export default function Check() {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null); // 선택한 데이터
    const sheetRef = useRef<any>(null);

    const today = new Date();
    // 자정 기준(시간 제거)
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 문자열 포맷
    const todayStr = format(startOfToday, "yyyy-MM-dd", {locale: ko});
    // 하루 전 (오늘 포함 X, 어제 날짜)
    const yesterday = subDays(startOfToday, 1);
    const yesterdayStr = format(yesterday, "yyyy-MM-dd", { locale: ko });

    const tomorrow = addDays(startOfToday, 1);
    const tomorrowStr = format(tomorrow, "yyyy-MM-dd", { locale: ko });

    // 달력 열림 상태 관리
    const [openStart, setOpenStart] = useState(false);
    const [openEnd, setOpenEnd] = useState(false); 
    
    const handleOpenStartChange = useCallback((val: boolean) => {
        setOpenStart(val);
    }, []);
    const handleOpenEndChange = useCallback((val: boolean) => {
        setOpenEnd(val);
    }, []);    

    // 검색조건 (페이지마다 key 만 변경해서 사용)
    const {
        searchParams,
        setSearchParams,
        appliedParams,
        resetFilters,
        handleSearch,
        refreshTrigger,
        forceRefresh
    } = useSearchFilters({
        startDate: yesterdayStr,
        endDate: tomorrowStr,
        deliveryRouteId: 0,
        senderCompanyNm: '',
        receiverCompanyNm: '',
        senderReceiverCd: 'CHECK',
        chargeCd: '',
        senderRegionCd: '',
        receiverRegionCd: '',
        waybillNo: '',
        calculationCd: ''
    });

    // 페이지 진입(location.key 변경) 시 무조건 재조회 실행
    // shipments.tsx와 동일한 방식입니다.
    useEffect(() => {
        // 1. URL 파라미터가 있다면 검색 조건에 동기화 (선택사항, 안전장치)
        const qs = new URLSearchParams(location.search);
        if (qs.toString()) {
             // 필요하다면 여기서 setSearchParams 로직 추가
        }

        // 2. 약간의 지연 후 검색 실행 (그리드가 마운트된 직후 실행 보장)
        const timer = setTimeout(() => {
            handleSearch(); // 현재 조건 확정
            forceRefresh(); // 그리드 데이터 재요청 (API 호출)
            setSelectedTransport(null); // 선택 상태 초기화
        }, 100); // 0ms보다는 50~100ms가 안정적임

        return () => clearTimeout(timer);
    }, [location.key]); // 페이지 이동 감지

    // 페이지를 나갈 때(Unmount) 그리드 메모리 해제
    // 이 코드가 있어야 '메뉴 클릭' 등 이동 시 기존 그리드가 꼬이지 않음
    useEffect(() => {
        return () => {
            if (sheetRef.current) {
                try {
                    sheetRef.current.dispose();
                } catch (e) {
                    console.warn(e);
                }
                sheetRef.current = null;
            }
        };
    }, []);


    // _ts를 포함하여 캐시 방지 (그리드 key 변경이 아님)
    const listParams = useMemo(() => ({
        ...appliedParams,
        _ts: Date.now() // sheetReloadKey 대신 현재 시간 사용
    }), [appliedParams, refreshTrigger]); // refreshTrigger가 바뀔 때마다 갱신됨

    // ib sheet에 사용할 컬럼
    const columns = [
        // 키/일자
        {Header: "운송pk", Name: "transportId", Align: "Center", Width: 50, ColMerge: 0, Visible: 0},
        {Header: "접수일시", Name: "shipmentOperationDate", Align: "Center", VAlign: "Top", Width: 150},
        {Header: "발신지역", Name: "senderRegionNm", Align: "Center", Width: 100},
        {Name: "senderRegionCd", Visible: 0},

        {Header: "발신지역구분", Name: "senderRegionDtlNm", Align: "Center", Width: 100},
        {Name: "senderRegionDtlCd", Visible: 0},

        {Header: "담당자명", Name: "senderManagerNm", Align: "Center", Width: 100},

        {Header: "발신처명", Name: "senderCompanyNm", Align: "Center", Width: 120},
        {
            Header: "운송구분", Name: "calculationCd", Align: "Center", Width: 80,
            Type: "Enum",
            Enum: "|택배|통신",
            EnumKeys: "|QTY|WEIGHT",
            DefaultValue: "QTY",
            ColMerge: 0
        },
        {Header: "운송장번호", Name: "waybillNo", Align: "Center", Width: 150, ColMerge: 0},

        {Header: "발신처Tel", Name: "senderTelNo", Align: "Center", Width: 200, ColMerge: 0},
        {Header: "발신처MBL", Name: "senderManagerTelNo", Align: "Center", Width: 200, ColMerge: 0, Visible: 0},

        {Header: "물품pk", Name: "transportDtlId", Align: "Center", Width: 50, Visible: 0, ColMerge: 0},
        {Header: "물품종류", Name: "kindCdNm", Align: "Center", Width: 100, ColMerge: 0},
        {Name: "kindCd", Visible: 0, ColMerge: 0},
        {Header: "수량/무게", Name: "qty", Align: "Center", Width: 120, ColMerge: 0},
        {Header: "단가", Name: "untpc", Align: "Center", Width: 120, ColMerge: 0},
        {Header: "합계금액", Name: "amount", Align: "Center", Width: 120, ColMerge: 0},


        {Header: "발신비고", Name: "senderRmk", Align: "Center", Width: 150, Visible: 0},

        {Header: "수신지역", Name: "receiverRegionNm", Align: "Center", Width: 100},
        {Name: "receiverRegionCd", Visible: 0},
        {Header: "수신지역구분", Name: "receiverRegionDtlNm", Align: "Center", Width: 200, Visible: 0},
        {Name: "receiverRegionDtlCd", Visible: 0},

        {Header: "수신처명", Name: "receiverCompanyNm", Align: "Center", Width: 120},
        {Header: "수신처Tel", Name: "receiverTelNo", Align: "Center", Width: 200},
        {Header: "수신처MBL", Name: "receiverManagerTelNo", Align: "Center", Width: 200, Visible: 0},
        {Header: "수신주소", Name: "receiverAddress", Align: "Center", Width: 250},


        // 숨김 키들(필요 시)
        {Name: "chargeNm", Align: "Center", Width: 80, Visible: 0},
        {Name: "chargeCd", Visible: 0},
        {Name: "receiverRmk", Align: "Center", Width: 120, Visible: 0},
        {Name: "senderTransportId", Align: "Center", Width: 50, Visible: 0},
        {Name: "senderAddress", Align: "Center", Width: 180, Visible: 0},
        {Name: "senderCompanyId", Visible: 0},
        {Name: "receiverId", Visible: 0},
        {Name: "receiverCompanyId", Align: "Center", Width: 50, Visible: 0},
    ];

    // 표시/캘린더용 Date 파생값 (상태 X)
    const startDate = searchParams.startDate
        ? parse(searchParams.startDate, "yyyy-MM-dd", new Date())
        : parse(todayStr, "yyyy-MM-dd", new Date());
    const endDate = searchParams.endDate
        ? parse(searchParams.endDate, "yyyy-MM-dd", new Date())
        : parse(todayStr, "yyyy-MM-dd", new Date());

    const fmt = (d: Date) =>
        format(new Date(d.getFullYear(), d.getMonth(), d.getDate()), "yyyy-MM-dd", {locale: ko});

    const goEditorWithFilters = (row: any, who: "SENDER" | "RECEIVER" = "SENDER") => {
        const companyId =
            who === "SENDER" ? row?.senderCompanyId : row?.receiverCompanyId;

        if (!companyId) return; // 안전장치

        const from = appliedParams.startDate ?? todayStr;
        const to = appliedParams.endDate ?? todayStr;

        navigate({
            pathname: `/transport/shipments-editor`,
            search: createSearchParams({
                startDate: from,
                endDate: to,
                transportId: String(row.transportId ?? ""), // 필요 시 상세에서 원본행 참조\
                senderCompanyId: String(row.senderCompanyId ?? ""),
                // todo 배송코스
                // todo 발신업체명
            }).toString(),
        });
    };

    const [selectedId, setSelectedId] = useState<number | null>(null);

    // row 선택
    const handleRowClick = (row: any, evt: any) => {
        // 테이블에 따라 키 이름이 다를 수 있으니 안전하게
        const id =
            Number(row?.transportId ?? 0);
        setSelectedId(id > 0 ? id : null);

        setSelectedTransport(row)
    };

    //더블클릭이벤트 동작 상태값
    const [openByDblClick, setOpenByDblClick] = useState(false);
    useEffect(() => {
        if (openByDblClick && selectedTransport) {
            goEditorWithFilters(selectedTransport, "SENDER");
            setOpenByDblClick(false);
        }
    }, [selectedTransport, openByDblClick]);

  //배송체크 현황 다운로드 JXLS
  const handleDeliveryStatusDownload = async () => {
    try {
      // fetch 래퍼(apiRequest) 사용
      const res = await apiRequest("POST", "/api/transport/arrivals/list/excel", searchParams);
      const blob = await res.blob();

      // 백엔드에서 내려주는 파일명 추출
      const disposition = res.headers.get("content-disposition");
      let fileName = "배송현황.zip";

      if (disposition) {
        // 1) filename* (RFC 5987, UTF-8 지원 브라우저)
        let match = disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/);
        if (match && match[1]) {
          fileName = decodeURIComponent(match[1].trim().replace(/['"]/g, ""));
        } else {
          // 2) fallback: filename="..." (구버전 브라우저)
          match = disposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) {
            try {
              fileName = decodeURIComponent(match[1].trim());
            } catch {
              fileName = match[1].trim();
            }
          }
        }
      }

      // 다운로드 처리
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err:any) {
        console.error("배송현황 다운로드 실패", err);

        let msg = "다운로드 중 오류가 발생했습니다.";

        try {
            // err.message 안에 JSON 문자열이 들어있다면 파싱
            const parsed = JSON.parse(err.message);
            msg = parsed?.error?.message || msg;
        } catch (e) {
            // JSON이 아니면 기본 메시지
            msg = err?.message || msg;
        }
        toast({ title: "오류", description: msg, variant: "destructive" });
    }
  };    

    return (
        <Layout>
            <div className="space-y-6 korean-text bg-gray-50 p-6">
                {/* Search Conditions Section */}
                <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">검색 조건</h3>
                        <div className="flex items-start gap-x-6">
                            {/* Search inputs in horizontal row */}
                            <div className="flex flex-wrap gap-x-6 gap-y-4">
                                <div className="flex items-center gap-x-6">
                                    {/* 접수 기간 */}
                                    <div className="flex items-center gap-x-2">
                                        <span
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">접수일시기간</span>

                                        {/* 시작일 */}
                                        <Popover open={openStart} onOpenChange={handleOpenStartChange}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn("w-36 justify-start text-left font-normal", !searchParams.startDate && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4"/>
                                                    {searchParams.startDate || "시작일"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    locale={ko}
                                                    selected={startDate}
                                                    onSelect={(d) => {
                                                        if (!d) return;
                                                        const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                                        setSearchParams(prev => ({...prev, startDate: fmt(d)}));
                                                        setOpenStart(false);
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        <span className="text-gray-500">~</span>

                                        {/* 마감일 */}
                                        <Popover open={openEnd} onOpenChange={handleOpenEndChange}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn("w-36 justify-start text-left font-normal", !searchParams.endDate && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4"/>
                                                    {searchParams.endDate || "마감일"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    locale={ko}
                                                    selected={endDate}
                                                    onSelect={(d) => {
                                                        if (!d) return;
                                                        const e = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                                        setSearchParams(prev => ({...prev, endDate: fmt(d)}));
                                                        setOpenEnd(false);
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* 요금 */}
                                    <div className="flex items-center gap-x-2">
                                        <Label
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">요금</Label>
                                        <CommonCodeSelect
                                            type="CHARGE"
                                            value={searchParams.chargeCd || "all"}
                                            onChange={(val) =>
                                                setSearchParams((prev) => ({
                                                    ...prev,
                                                    chargeCd: val === "all" ? "" : val,
                                                }))
                                            }
                                            placeholder="요금 선택"
                                            includeAll
                                        />
                                    </div>

                                    {/* 발신지역 */}
                                    <div className="flex items-center gap-x-2">
                                        <Label
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">발신지역</Label>
                                        <CommonCodeSelect
                                            type="REGION_TYPE"
                                            value={searchParams.senderRegionCd || "all"}
                                            onChange={(val) =>
                                                setSearchParams((prev) => ({
                                                    ...prev,
                                                    senderRegionCd: val === "all" ? "" : val,
                                                }))
                                            }
                                            placeholder="지역 선택"
                                            includeAll
                                        />
                                    </div>

                                    {/* 수신지역 */}
                                    <div className="flex items-center gap-x-2">
                                        <Label
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">수신지역</Label>
                                        <CommonCodeSelect
                                            type="REGION_TYPE"
                                            value={searchParams.receiverRegionCd || "all"}
                                            onChange={(val) =>
                                                setSearchParams((prev) => ({
                                                    ...prev,
                                                    receiverRegionCd: val === "all" ? "" : val,
                                                }))
                                            }
                                            placeholder="지역 선택"
                                            includeAll
                                        />
                                    </div>

                                </div>
                                <div className="flex items-center gap-x-6">
                                    {/* 운송장번호 */}
                                    <div className="flex items-center gap-x-2">
                                        <Label
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">운송장번호</Label>
                                        <Input
                                            className="w-32 md:w-40"
                                            placeholder="운송장번호를 입력하세요."
                                            value={searchParams.waybillNo ?? ""}
                                            onChange={(e) =>
                                                setSearchParams(prev => ({...prev, waybillNo: e.target.value}))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleSearch();
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 운송구분 */}
                                    <div className="flex items-center gap-x-2">
                                        <Label
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">운송구분</Label>
                                        <CommonCodeSelect
                                            type="CALCULATION_TYPE"
                                            value={searchParams.calculationCd || "all"}
                                            onChange={(val) =>
                                                setSearchParams((prev) => ({
                                                    ...prev,
                                                    calculationCd: val === "all" ? "" : val,
                                                }))
                                            }
                                            placeholder="운송구분 선택"
                                            includeAll
                                            labelOverrides={{ QTY: "택배", WEIGHT: "통신" }}
                                        />
                                    </div>

                                    {/* 배송코스 */}
                                    <div className="flex items-center gap-x-2">
                                        <Label
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">배송코스</Label>
                                        <CommonCodeSelect
                                            url="/api/delivery-route/list"
                                            includeAll
                                            valueKey="deliveryRouteId"
                                            labelKey="deliveryRouteNm"
                                            value={searchParams.deliveryRouteId ? String(searchParams.deliveryRouteId) : "all"}
                                            onChange={(val) =>
                                                setSearchParams(prev => ({
                                                    ...prev,
                                                    deliveryRouteId: val === "all" ? 0 : Number(val),
                                                }))
                                            }
                                            triggerClassName="w-40 md:w-44"
                                        />
                                    </div>

                                    {/* 발신처 */}
                                    <div className="flex items-center gap-x-2">
                                        <Label
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">발신처</Label>
                                        <Input
                                            className="w-32 md:w-40"
                                            placeholder="업체명/전화번호를 입력하세요."
                                            value={searchParams.senderCompanyNm ?? ""}
                                            onChange={(e) =>
                                                setSearchParams(prev => ({...prev, senderCompanyNm: e.target.value}))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleSearch();
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 수신처 */}
                                    <div className="flex items-center gap-x-2">
                                        <Label
                                            className="text-sm font-medium text-gray-700 whitespace-nowrap">수신처</Label>
                                        <Input
                                            className="w-32 md:w-40"
                                            placeholder="업체명/전화번호를 입력하세요."
                                            value={searchParams.receiverCompanyNm ?? ""}
                                            onChange={(e) =>
                                                setSearchParams(prev => ({...prev, receiverCompanyNm: e.target.value}))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleSearch();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Buttons aligned to right */}
                            <div className="shrink-0 self-end ml-auto flex items-center gap-x-3">
                                {/* 세금계산서 다운로드 버튼 */}
                                <Button
                                    onClick={handleDeliveryStatusDownload}   // 다운로드 핸들러 함수 연결
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    배송체크현황 다운로드
                                </Button>                                
                                <Button variant="outline" onClick={resetFilters}>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    조건 초기화
                                </Button>
                                <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{
                                    handleSearch();
                                    forceRefresh();
                                }}>
                                    <Search className="w-4 h-4 mr-2" />
                                    검색
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Transport List Section */}
                <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">배송 목록</h3>
                            <div className="flex items-center space-x-3">
                                <div className="flex space-x-3">
                                    {/* 선택 수정 */}
                                    {/*<Button*/}
                                    {/*    variant="outline"*/}
                                    {/*    onClick={() => {*/}
                                    {/*        if (!selectedId) return;*/}
                                    {/*        goEditorWithFilters(selectedTransport, "SENDER");*/}
                                    {/*    }}*/}
                                    {/*    disabled={!selectedId}*/}
                                    {/*    className={cn(*/}
                                    {/*        "transition-colors",*/}
                                    {/*        selectedId*/}
                                    {/*            ? "border-blue-600 text-blue-600 hover:bg-blue-50"*/}
                                    {/*            : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
                                    {/*    )}*/}
                                    {/*>*/}
                                    {/*    <Edit className="w-4 h-4 mr-2"/>*/}
                                    {/*    선택 수정*/}
                                    {/*</Button>*/}
                                </div>
                            </div>
                        </div>

                        {/* 데이터 영역 */}
                        {/* ib sheet 사용 */}
                        <CommonSheet url="/api/transport/arrivals/list"
                                     searchParams={listParams}
                                     usePaging={false}
                                     editMode={3}
                                     pagingMode = {1}
                                     emptyMessage="등록된 운송정보가 없습니다."
                                     gridName="shipments"
                                     columns={columns}
                                     handleRowClick={handleRowClick}
                                     refreshTrigger={refreshTrigger}
                                     extraOptions={{
                                         Cfg: {
                                             DataMerge: 1,
                                             FixPrevColumnMerge: 'transportId',
                                             CanSort: 0
                                         },
                                         Events: {
                                            // 렌더링 완료 후 인스턴스 저장 (clean-up용)
                                             onRenderFinish: (evt: any) => {
                                                 if (evt.sheet) {
                                                     sheetRef.current = evt.sheet;
                                                 }
                                             },                                            
                                             onDblClick: (evt : any) => {
                                                 if (evt.row?.Kind === "Header") return;
                                                 handleRowClick(evt.row, evt);
                                                 setOpenByDblClick(true);
                                             }
                                         }
                                     }}
                        />
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}