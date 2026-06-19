import React, {useMemo, useState} from "react";
import {Layout} from "@/components/layout/layout.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import "react-datepicker/dist/react-datepicker.css"
import DatePicker from "react-datepicker"
import {Calendar} from "@/components/ui/calendar.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, Search} from "lucide-react";
import {cn} from "@/lib/utils.ts";
import CommonSheet from "@/pages/ibsheet.tsx";
import {ko} from "date-fns/locale";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import { useSelector } from "react-redux";
import type { RootState } from "@/common/redux/store";

interface ShipperSettlementData {
  companyNm: string;
  deliveryRegionId: string;
  // 발송 데이터
  send_documents: number;
  send_boxes: number;
  send_roll: number;
  send_samples: number;
  send_tarp: number;
  send_bags: number;
  send_luggage: number;
  // 수신 데이터
  receive_documents: number;
  receive_boxes: number;
  receive_roll: number;
  receive_samples: number;
  receive_tarp: number;
  receive_bags: number;
  receive_luggage: number;
  // 합계 (자동 계산)
  total_documents: number;
  total_boxes: number;
  total_roll: number;
  total_samples: number;
  total_tarp: number;
  total_bags: number;
  total_luggage: number;
  grand_total: number;
}
interface SearchParam {
  companyId? : number;
  companyNm? : string;
  year : number;
  month : number;
}


export default function SettlementByShipper() {

  const {
    searchParams,
    setSearchParams,
    appliedParams,
    resetFilters,
    handleSearch,
    refreshTrigger,
    forceRefresh
  } = useSearchFilters({
    companyNm: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  //date-picker 오픈 상태 관리
  const [open, setOpen] = useState(false)

  function setField<K extends keyof SearchParam>(key: K, value: SearchParam[K]) {
    setSearchParams((prev) => ({ ...prev, [key]: value }));
  }  
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(new Date())
  const [companyName, setCompanyName] = useState("");
  const role = useSelector((state: RootState) => state.auth.roles);

  function formatDateLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // ib sheet에 사용할 컬럼
  const columns = [
    { Header: "화주명", Name: "companyNm", Align: "Center", Width: 100, Colmerge : 1},  
    { Header: "구분", Name: "type", Align: "Center", Width: 60 },
    { Header: "서류", Name: "documents", Align: "Right", Width: 60, Format: "#,###" ,ColMerge:0 },
    { Header: "박스", Name: "boxes", Align: "Right", Width: 60, Format: "#,###" , ColMerge:0},
    { Header: "롤", Name: "roll", Align: "Right", Width: 60, Format: "#,###" , ColMerge:0},
    { Header: "샘플", Name: "samples", Align: "Right", Width: 60, Format: "#,###" , ColMerge:0},
    { Header: "갑바", Name: "tarp", Align: "Right", Width: 60, Format: "#,###" , ColMerge:0},
    { Header: "마대", Name: "bags", Align: "Right", Width: 60, Format: "#,###" ,ColMerge:0},
    { Header: "행랑", Name: "luggage", Align: "Right", Width: 60, Format: "#,###" , ColMerge:0},
    {
      Header: "합계",
      Name: "total",
      Align: "Right",
      Width: 80,
      Format: "#,###",
      Style: "font-weight:bold;color:#1e40af;"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 p-6">
        {/* Search Conditions Box */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">검색 조건</h3>
            <div className="flex items-center gap-x-6">
            {/* 정산 기간 */}
            <div className="flex items-center gap-x-2">
              <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">정산 월</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-36 justify-start text-left font-normal",
                      !selectedMonth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {`${searchParams.year}년 ${String(searchParams.month).padStart(2, "0")}월`}
                  </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <DatePicker
                      selected={new Date(searchParams.year, searchParams.month - 1)}
                      onChange={(date) => {
                        if (date) {
                          setField("year", date.getFullYear())
                          setField("month", date.getMonth() + 1)
                          setOpen(false)
                        }
                      }}
                      dateFormat="yyyy년 MM월"
                      showMonthYearPicker
                      locale={ko}
                      maxDate={new Date()}
                      inline
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
                  disabled={role === 'USER'}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearchParams((prev) => ({ ...prev, companyNm: companyName }))
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
                  }
                }>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  조건 초기화
                </Button>                
                <Button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settlement Summary Table */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-end justify-between">
              <h3 className="text-lg font-semibold text-gray-900">화주별 정산서</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500 text-right">
              ※ <span className="font-semibold">화주명 더블클릭</span> 시{" "}
              <span className="text-blue-600">상세 청구서</span> 창이 열립니다.
            </p>
            {/* 데이터 영역 */}
            <div className="p-4">

                    {/* ib sheet 사용 */}
                    <CommonSheet  url = "/transport/shipper/invoice/info"
                                  searchParams={searchParams}
                                  columns={columns}
                                  usePaging={false}
                                  editMode = {3}
                                  emptyMessage="등록된 청구서가 없습니다."
                                  refreshTrigger={refreshTrigger} 
                                  height= "600px"
                                  gridName="invoice-shipper"                                                               
                                  extraOptions={{
                                                Cfg: {
                                                  DataMerge: 1,
                                                  CanSort: 0
                                                },
                                                Events: {
                                                  onDblClick: (evt : any) => {
                                                    if (evt.row?.Kind === "Header" || evt.row?.Kind === "Space") return;

                                                    if (evt.col === "companyNm") {
                                                      if(!(evt.row.billId && evt.row.billDtlId))return;
                                                      window.open(`/bill/invoice/detail/${evt.row.billId}/${evt.row.billDtlId}`, "_blank");
                                                    }
                                                  }
                                                }                                                
                                              }}/>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );  
};


