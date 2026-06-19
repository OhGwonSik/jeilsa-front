import {useMemo, useState} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {CalendarIcon, ChevronLeft, ChevronRight, Download, RotateCcw, Search} from "lucide-react";
import {format, isAfter, isBefore, isEqual} from "date-fns";
import {ko} from "date-fns/locale";
import {cn} from "@/lib/utils";
import CommonSheet from "@/pages/ibsheet.tsx";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import { useSelector } from "react-redux";
import type { RootState } from "@/common/redux/store";
import { useCallback } from "react";

interface ClientDetailData {
  id: number;
  shipDate: Date;
  pickupLocation: string;
  deliveryPerson: string;
  sender: string;
  manager: string;
  managerPhone: string;
  receiver: string;
  receiverPhone: string;
  shape: string;
  type: string;
  quantity: number;
  weight: number;
  prepaidFee: number;
  collectFee: number;
  notes: string;
}

export default function ShipperDetails() {

  // 달력 열림 상태 관리
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const today = new Date();

  // 이번 달 1일
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // 이번 달 말일
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const defaultStartDate = formatDateLocal(firstDayOfMonth);
  const defaultEndDate = formatDateLocal(lastDayOfMonth);

  function formatDateLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }  
  const [companyName, setCompanyName] = useState("");
  const [transportByshipperData, setTransportByshipperData] = useState<any[]>([]);
  const role = useSelector((state: RootState) => state.auth.roles);

  const handleDataLoaded = useCallback((data: any[]) => {
    setTransportByshipperData(prev => {
      if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
      return data;
    });
  }, []);

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
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    companyNm: ''
  });  

  // ib sheet에 사용할 컬럼
  const columns = [
    { Header: "접수일시", Name: "shipmentOperationDate", Align: "Center", VAlign: "Top", Width: 100 },
    { Header: "발신지역", Name: "senderRegionNm", Align: "Center", Width: 100 },
    { Header: "발신지역구분", Name: "senderRegionDtlNm", Align: "Center", Width: 100 },
    // { Header: "배송코스", Name: "companyNm1Manager", Align: "Center", Width: 120 },
    { Header: "발신처", Name: "senderCompanyNm", Align: "Center", Width: 150 },
    { Header: "발신담당", Name: "senderManagerNm", Align: "Center", Width: 150 , Visible: 0},
    { Header: "발신처Tel", Name: "senderTelNo", Align: "Center", Width: 120 },
    { Header: "발신MBL", Name: "senderManagerTelNo", Align: "Center", Width: 120 },
    { Header: "수신처", Name: "receiverCompanyNm", Align: "Center", Width: 120 },
    { Header: "수신담당", Name: "receiverManagerNm", Align: "Center", Width: 120 , Visible: 0},
    { Header: "수신처Tel", Name: "receiverTelNo", Align: "Center", Width: 120 },
    { Header: "수신MBL", Name: "receiverManagerTelNo", Align: "Center", Width: 120 },
    { Header: "구분", Name: "calculationNm", Align: "Center", Width: 70 },
    { Header: "청구대상", Name: "calculationTargetNm", Align: "Center", Width: 70 },
    { Header: "종류", Name: "kindNm", Align: "Center", Width: 60 },
    { Header: "수량", Name: "comQty", Align: "Center", Width: 60, Type: "Int", Format: "#,###;-#,###;0"  },
    { Header: "무게", Name: "weightQty", Align: "Center", Width: 60, Type: "Int", Format: "#,###;-#,###;0"  },
    { Header: "선불금액", Name: "prepaidAmount", Align: "Center", Width: 100, Type: "Int", Format: "#,###;-#,###;0" },
    { Header: "착불금액", Name: "collectAmount", Align: "Center", Width: 100, Type: "Int", Format: "#,###;-#,###;0" },
    { Header: "비고", Name: "rmk", Align: "Center", Width: 120 },
  ];
  // Calculate summary totals
  const summary = useMemo(() => {
    let totalQty = 0;
    let totalWeight = 0;
    let totalPrepaid = 0;
    let totalCollect = 0;

    for (const row of transportByshipperData) {
      totalQty += row.comQty || 0;
      totalWeight += row.weightQty || 0;
      totalPrepaid += row.prepaidAmount || 0;
      totalCollect += row.collectAmount || 0;
    }

    return { totalQty, totalWeight, totalPrepaid, totalCollect };
  }, [transportByshipperData]);

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 p-6">
        {/* Search Conditions Box */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">검색 조건</h3>
            <div className="flex items-center gap-x-6">
              {/* Settlement Period */}
              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">접수일시기간</Label>
                <Popover open={openStart} onOpenChange={handleOpenStartChange}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-36 justify-start text-left font-normal",
                        !searchParams.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.startDate || "시작일"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={searchParams.startDate ? new Date(searchParams.startDate) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      const val = formatDateLocal(date);
                      setSearchParams((prev) => ({ ...prev, startDate: val }));
                      setOpenStart(false);
                    }}
                    locale={ko}
                    disabled={(date) =>
                      searchParams.endDate
                        ? format(date, "yyyy-MM-dd") > searchParams.endDate
                        : false
                    }
                    initialFocus
                  />
                  </PopoverContent>
                </Popover>
                <span className="text-gray-500">~</span>
                <Popover open={openEnd} onOpenChange={handleOpenEndChange}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-36 justify-start text-left font-normal",
                        !searchParams.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.endDate || "마감일"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={searchParams.endDate ? new Date(searchParams.endDate) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      const val = formatDateLocal(date);
                      setSearchParams((prev) => ({ ...prev, endDate: val }));
                      setOpenEnd(false);
                    }}
                    locale={ko}
                    disabled={(date) =>
                      searchParams.startDate
                        ? format(date, "yyyy-MM-dd") < searchParams.startDate
                        : false
                    }
                    initialFocus
                  />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Company Name */}
              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">업체명</Label>
                <Input
                  placeholder="업체명을 입력하세요"
                  value={companyName}
                  disabled = {role === 'USER'}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearchParams((prev) => ({ ...prev, companyNm: companyName }));
                    }
                  }}
                  className="w-40"
                />
              </div>

              {/* Buttons aligned to right */}
              <div className="flex items-center gap-x-3 ml-auto">
                <Button variant="outline" onClick={()=>{
                  setCompanyName("");
                  resetFilters();
                }}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  조건 초기화
                </Button>
                <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Client Details Table */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">화주별 내역</h3>
              {/* Settlement Period Summary Block */}
                <div className="flex gap-x-4 text-sm">
                  {/* 수량 */}
                  <div className="bg-gray-100 border border-gray-300 rounded px-4 py-2">
                    <div className="flex justify-between items-center gap-x-2">
                      <span className="font-medium text-gray-700">수량</span>
                      <span className="font-bold text-gray-900">{summary.totalQty.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* 무게 */}
                  <div className="bg-gray-100 border border-gray-300 rounded px-4 py-2">
                    <div className="flex justify-between items-center gap-x-2">
                      <span className="font-medium text-gray-700">무게</span>
                      <span className="font-bold text-gray-900">{summary.totalWeight.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* 선불요금 */}
                  <div className="bg-gray-100 border border-gray-300 rounded px-4 py-2">
                    <div className="flex justify-between items-center gap-x-2">
                      <span className="font-medium text-gray-700">선불</span>
                      <span className="font-bold text-gray-900">{summary.totalPrepaid.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* 착불요금 */}
                  <div className="bg-gray-100 border border-gray-300 rounded px-4 py-2">
                    <div className="flex justify-between items-center gap-x-2">
                      <span className="font-medium text-gray-700">착불</span>
                      <span className="font-bold text-gray-900">{summary.totalCollect.toLocaleString()}</span>
                    </div>
                  </div>
                </div>              
            </div>

            {/* 데이터 영역 */}
            <div className="p-4">
              {/* ib sheet 사용 */}
              <CommonSheet  url="/api/transport/shipper/info"
                            searchParams={searchParams}
                            usePaging={false}
                            editMode = {3}
                            emptyMessage="운송정보가 없습니다."
                            columns={columns}
                            refreshTrigger={refreshTrigger} 
                            height= "600px"
                            gridName="transport-shipper-detail"
                            onDataLoaded = {handleDataLoaded}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}