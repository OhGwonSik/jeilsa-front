import {useEffect, useMemo, useState, useCallback} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {CalendarIcon, Edit, RotateCcw, Search} from "lucide-react";
import {cn} from "@/lib/utils";
import CommonSheet from "../ibsheet.tsx";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import type {Transport} from "@shared/schema";
import {createSearchParams, useLocation, useNavigate} from "react-router-dom";
import {CommonCodeSelect} from "@/pages/codeSelectProps.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Calendar} from "@/components/ui/calendar.tsx";
import {format} from "date-fns/format"
import {parse} from "date-fns/parse";
import {ko} from "date-fns/locale";
import {addDays, subDays} from "date-fns";

interface TransportData {
  //todo 발신, 수신, 물류 데이터 전체
  senderTransportId : number;
  senderCompanyId : number;
  senderCompanyNm : string; // 발신처명
  senderManagerNm : string;
  senderManagerTelNo : string;
  senderTelNo : string;
  senderQty : number;
  senderUntpc
  senderAmount
  senderRmk : string; // 발신업체 비고
  waybillNo : string;
  kindCd : string;
  managerNm : string; // 담당자명
  managerTelNo : string; // 담당자연락처
  receiverCompanyId : number;
  receiverCompanyNm : string;
  receiverTelNo : string;
  receiverManagerTelNo : string
  receiverAddress: string;
  regionCd : string; // 수신 지역
  regionDtlCd : string;// 수신 지역구
  trnsprtCd: string; // 운송 구분
  chargeCd : string; // 요금 구분
  deliveryRouteNm :  string; // 배송 코스
}

interface TransportDtl {
  senderTransportId : number;
  receiverTransportId : number;
}

export default function Arrivals() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null); // 선택한 데이터
  const [selectedTransportDtl, setSelectedTransportDtl] = useState<TransportDtl | null>(null);
  const [sheetReloadKey, setSheetReloadKey] = useState(0);


  const today = new Date();
  // 자정 기준(시간 제거)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // 문자열 포맷
  const todayStr = format(startOfToday, "yyyy-MM-dd", { locale: ko });
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
    startDate : yesterdayStr,
    endDate : tomorrowStr,
    deliveryRouteId : 0,
    senderCompanyNm: '',
    receiverCompanyNm: '',
    calculationCd : 'WEIGHT',
    senderReceiverCd : 'RECEIVER'
  });

  useEffect(() => {
    const st: any = location.state;
    if (st?.refetch) {
      // 1) URL 쿼리 → 검색조건으로 반영
      const qs = new URLSearchParams(location.search);
      const next = {
        startDate: qs.get("startDate") ?? searchParams.startDate,
        endDate: qs.get("endDate") ?? searchParams.endDate,
        deliveryRouteId: qs.get("deliveryRouteId")
            ? Number(qs.get("deliveryRouteId"))
            : searchParams.deliveryRouteId,
        senderCompanyNm: qs.get("senderCompanyNm") ?? searchParams.senderCompanyNm,
        receiverCompanyNm: qs.get("receiverCompanyNm") ?? searchParams.receiverCompanyNm,
      };
      setSearchParams(prev => ({ ...prev, ...next }));

      // 2) 적용 후 “검색 버튼” 누른 효과 + IBSheet 리프레시
      setTimeout(() => {
        // 👉 여기서 handleSearch()와 forceRefresh()를 호출
        handleSearch();   // searchParams → appliedParams로 복사 (실제 조회조건 변경)
        forceRefresh();   // 같은 조건이어도 재조회

        // 선택 초기화(선택사항)
        setSelectedId?.(null);
        setSelectedTransport?.(null);
      }, 0);

      // 3) refetch 플래그 제거 (뒤로가기 반복 방지)
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location.key]);

  // ib sheet에 사용할 컬럼
  const columns = [
    // 키/일자
    { Header: "운송pk", Name: "transportId", Align: "Center", Width: 50 , ColMerge: 0 , Visible: 0 },
    { Header: "수신업체pk", Name: "receiverCompanyId", Align: "Center", Width: 50, Visible: 0 },
    { Header: "접수일시", Name: "shipmentOperationDate", Align: "Center", VAlign: "Top", Width: 100 },

    // 수신측
    { Header: "수신지역", Name: "receiverRegionNm", Align: "Center", Width: 100 },
    { Name: "receiverRegionCd", Visible: 0 },

    { Header: "수신지역구분", Name: "receiverRegionDtlNm", Align: "Center", Width: 100 },
    { Name: "receiverRegionDtlCd", Visible: 0 },

    { Header: "배송코스", Name: "receiverDeliveryRouteNm", Align: "Center", Width: 100 },
      // 청구일
    { Header: "수신처명", Name: "receiverCompanyNm", Align: "Center", Width: 120 },

    { Header: "수신처Tel", Name: "receiverTelNo", Align: "Center", Width: 120 },
    { Header: "수신처MBL", Name: "receiverManagerTelNo", Align: "Center", Width: 120 },

    { Header: "요금구분", Name: "chargeNm", Align: "Center", Width: 80 },
    { Name: "chargeCd", Visible: 0 },

    { Header: "물품pk", Name: "transportDtlId", Align: "Center", Width: 50, Visible: 0 },
    { Header: "물품종류", Name: "kindCdNm", Align: "Center", Width: 80},
    { Name: "kindCd", Visible: 0 },

    { Header: "운송장번호", Name: "waybillNo", Align: "Center", Width: 120 , ColMerge:0},
    { Header: "수량/무게", Name: "qty", Align: "Center", Width: 120 , ColMerge:0},
    { Header: "단가", Name: "untpc", Align: "Center", Width: 120 , ColMerge:0},
    { Header: "합계금액", Name: "amount", Align: "Center", Width: 120 ,ColMerge:0 },

    { Header: "수신비고", Name: "receiverRmk", Align: "Center", Width: 120 },

    // 발신측
    { Header: "발신pk", Name: "senderTransportId", Align: "Center", Width: 50, Visible: 0 },
    { Header: "발신처명", Name: "senderCompanyNm", Align: "Center", Width: 120},
    { Header: "발신처Tel", Name: "senderTelNo", Align: "Center", Width: 120 },
    { Header: "발신처MBL", Name: "senderManagerTelNo", Align: "Center", Width: 120 },
    { Header: "발신주소", Name: "senderAddress", Align: "Center", Width: 180 },
    { Header: "발신비고", Name: "senderRmk", Align: "Center", Width: 120 },

    // 숨김 키들(필요 시)
    { Name: "senderCompanyId", Visible: 0 },
    { Name: "receiverId", Visible: 0 },
  ];

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // row 선택
  const handleRowClick = (row: any, evt: any) => {
    // 테이블에 따라 키 이름이 다를 수 있으니 안전하게
    const id =
        Number(row?.transportId ?? 0);
    setSelectedId(id > 0 ? id : null);

    setSelectedTransport(row)
    const colName = evt?.col;
    const rowData = row;

    if (colName === "transportDtl") {
      setSelectedTransportDtl({
        transportId : rowData.transportId,
        senderReceiverCd : 'RECEIVER'
      })
    }
  };


  // 표시/캘린더용 Date 파생값 (상태 X)
  const startDate = searchParams.startDate
      ? parse(searchParams.startDate , "yyyy-MM-dd", new Date())
         : parse(todayStr, "yyyy-MM-dd", new Date());
  const endDate = searchParams.endDate
      ? parse(searchParams.endDate, "yyyy-MM-dd", new Date())
         : parse(todayStr, "yyyy-MM-dd", new Date());

  const fmt = (d: Date) =>
      format(new Date(d.getFullYear(), d.getMonth(), d.getDate()), "yyyy-MM-dd", { locale: ko });

  const goEditorWithFilters = (row: any, who: "SENDER" | "RECEIVER" = "SENDER") => {
    const companyId =
        who === "SENDER" ? row?.senderCompanyId : row?.receiverCompanyId;

    if (!companyId) return; // 안전장치

    const from = appliedParams.startDate ?? todayStr;
    const to   = appliedParams.endDate   ?? todayStr;

    navigate({
      pathname: `/transport/arrivals-editor`,
      search: createSearchParams({
        startDate : from,
        endDate : to,
        transportId: String(row.transportId ?? ""), // 필요 시 상세에서 원본행 참조\
        receiverCompanyId : String(row.receiverCompanyId ?? ""),
        // todo 배송코스
        // todo 발신업체명
      }).toString(),
    },{ state: { refetch: true }});
  };


  const baseListUrl = "/api/transport/arrivals/list";
  const listUrlWithTs = useMemo(
      () => ({ ...appliedParams, _ts: Date.now() }),
      [appliedParams, sheetReloadKey]
  );
  const sheetKey = `${appliedParams.startDate}|${appliedParams.endDate}|${sheetReloadKey}`;

  //더블클릭이벤트 동작 상태값
  const [openByDblClick, setOpenByDblClick] = useState(false);
  useEffect(() => {
    if (openByDblClick && selectedTransport) {
      goEditorWithFilters(selectedTransport, "RECEIVER");
      setOpenByDblClick(false);
    }
  }, [selectedTransport, openByDblClick]);

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 p-6">
        {/* Search Conditions Section */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">검색 조건</h3>
            <div className="flex items-center justify-between gap-x-6">
              {/* Search inputs in horizontal row */}
              <div className="flex items-center gap-x-6">
                {/* 접수 기간 */}
                <div className="flex items-center gap-x-2">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">접수일시기간</span>

                  {/* 시작일 */}
                  <Popover open={openStart} onOpenChange={handleOpenStartChange}>
                    <PopoverTrigger asChild>
                      <Button
                          variant="outline"
                          className={cn("w-36 justify-start text-left font-normal", !searchParams.startDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {searchParams.startDate || "시작일"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                           mode="single"
                           selected={startDate}
                           locale={ko}
                           onSelect={(d) => {
                             if (!d) return;
                             const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                             setSearchParams(prev => ({ ...prev, startDate: fmt(d) }));
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
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {searchParams.endDate || "마감일"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                           mode="single"
                           selected={endDate}
                           locale={ko}
                           onSelect={(d) => {
                             if (!d) return;
                             const e = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                             setSearchParams(prev => ({ ...prev, endDate: fmt(d) }));
                             setOpenEnd(false);
                           }}
                           initialFocus
                         />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* 배송코스 */}
                <div className="flex items-center gap-x-2">
                  <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">배송코스</Label>
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
                  <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">발신처</Label>
                  <Input
                      className="w-32 md:w-40"
                      placeholder="업체명/전화번호를 입력하세요."
                      value={searchParams.senderCompanyNm ?? ""}
                      onChange={(e) =>
                          setSearchParams(prev => ({ ...prev, senderCompanyNm: e.target.value }))
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
                  <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">수신처</Label>
                  <Input
                      className="w-32 md:w-40"
                      placeholder="업체명/전화번호를 입력하세요."
                      value={searchParams.receiverCompanyNm ?? ""}
                      onChange={(e) =>
                          setSearchParams(prev => ({ ...prev, receiverCompanyNm: e.target.value }))
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

              {/* Buttons aligned to right */}
              <div className="flex items-center gap-x-3">
                <Button variant="outline" onClick={resetFilters}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  조건 초기화
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSearch}>
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery List Section */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">도착분</h3>
              <div className="flex space-x-3">
                {/* 선택 수정 */}
                {/*<Button*/}
                {/*    variant="outline"*/}
                {/*    onClick={() => {*/}
                {/*      if (!selectedId) return;*/}
                {/*      goEditorWithFilters(selectedTransport, "RECEIVER");*/}
                {/*    }}*/}
                {/*    disabled={!selectedId}*/}
                {/*    className={cn(*/}
                {/*        "transition-colors",*/}
                {/*        selectedId*/}
                {/*            ? "border-blue-600 text-blue-600 hover:bg-blue-50"*/}
                {/*            : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
                {/*    )}*/}
                {/*>*/}
                {/*  <Edit className="w-4 h-4 mr-2" />*/}
                {/*  선택 수정*/}
                {/*</Button>*/}
              </div>
            </div>

            {/* Complete Delivery Table with all required columns */}
            {/* 데이터 영역 */}
            {/* ib sheet 사용 */}
            <CommonSheet key={sheetKey}
                         url={baseListUrl}
                         searchParams={listUrlWithTs}
                         usePaging={false}
                         editMode = {3}
                         emptyMessage="등록된 도착분이 없습니다."
                         gridName = "shipments"
                         columns={columns}
                         handleRowClick={handleRowClick}
                         refreshTrigger={refreshTrigger}
                         extraOptions={{
                           Cfg: {
                             DataMerge: 1,
                             HeaderMerge : 3,
                             FixPrevColumnMerge : 'receiverCompanyId',
                             CanSort: 0
                           },
                           Events: {
                             onDblClick: (evt : any) => {
                               if (evt.row?.Kind === "Header") return;
                               handleRowClick(evt.row);
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