import {useEffect, useRef, useState} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Edit, Plus, Trash2, Search} from "lucide-react";
import {cn} from "@/lib/utils";
import CommonSheet from "@/pages/ibsheet.tsx";
import {InsertInvoice, InsertMember, Invoice} from "@shared/schema.ts";
import {useMutation} from "@tanstack/react-query";
import {apiRequest, queryClient} from "@/lib/queryClient.ts";
import {toast} from "@/hooks/use-toast.ts";
import {CommonCodeSelect} from "@/pages/codeSelectProps";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {useModal} from "@/hooks/useModal.ts";
import {validationToast} from "@/common/utils/validationToast.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import BillInvoice from "@/pages/settlement/billInvoice";
import BillingSummaryTable from "@/pages/settlement/billSummaryTable";
import loader from '@ibsheet/loader'


export default function Invoices() {
  interface InvoiceData {
  year: number;
  month: number;
  billCd: string;
  billCompanyId: number;
  billCompanyNm: string;
  totAmount: number;
  communicationFee: number;
  communicationFeeVat: number;
  untpc: number;
  untpcVat: number;
  weightUntpc: number;
  weightUntpcVat: number;
  billId: number;
}
interface ModalData {
  billCompanyId? : number;
  year : number;
  month : number;
  billCd : string;
}

interface CompanyBilling {
  id: number;
  companyName: string;
  email: string;
  sendStatus: string;
  sendDate: string;
  fax: string;
  detailCount: number;
  totalAmount: number;
  basicShipping: number;
  shippingVAT: number;
  courier: number;
  courierVAT: number;
  commDiscount: number;
  commDiscountVAT: number;
}
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyBillings, setCompanyBillings] = useState<CompanyBilling[]>([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceKindModalOpen, setInvoiceKindModalOpen] = useState(false);
  const [invoiceParams, setInvoiceParams] = useState<any>(null);

  const billDetailSheetRef = useRef<any>(null);
  const [billDetailRefresh, setBillDetailRefresh] = useState(Date.now());

  // 세금계산서 다운로드용 로딩 state
  const [isDownloading, setIsDownloading] = useState(false);

  const isProcessingRef = useRef(false);

  //더블클릭이벤트 동작 상태값
  const [openByDblClick, setOpenByDblClick] = useState(false);  

  function setField<K extends keyof ModalData>(key: K, value: ModalData[K]) {
    setModalData((prev) => ({ ...prev, [key]: value }));
  }

  const [detailSearchInput, setDetailSearchInput] = useState(""); // 입력창 값
  const [detailSearchKeyword, setDetailSearchKeyword] = useState(""); // 실제 검색 적용 값
  
  const [sheetKey, setSheetKey] = useState(0);

  useEffect(() => {
    // 페이지에 들어오자마자 기존에 저장된 리스트 데이터를 "오래된 것"으로 표시하고 다시 가져오게 합니다.
    queryClient.invalidateQueries({ queryKey: ["/api/bill/list"] });
  }, []);

  // 모달이 열릴 때 검색어 초기화 (선택 사항)
  useEffect(() => {
    if (companyModalOpen) {
      setDetailSearchInput("");
      setDetailSearchKeyword("");
      setSheetKey(prev => prev + 1);
    }
  }, [companyModalOpen]);  

  const now = new Date();
  const defaultBillData : ModalData = {
    billCompanyId : 0,
    year : now.getFullYear(),
    month : now.getMonth() + 1,
    billCd : "20"
  }

  const {
    modalMode,
    modalOpen,
    modalData,
    setModalData,
    openModal,
    closeModal
  } = useModal<ModalData>(defaultBillData);    

    const {
      searchParams,
      setSearchParams,
      appliedParams,
      resetFilters,
      handleSearch,
      refreshTrigger,
      forceRefresh
    } = useSearchFilters({
    });


  // ib sheet에 사용할 컬럼
  const columns = [
    { Header: "년", Name: "year", Type: "Int", Format: "###0년", Align: "Center", Width: 80 },
    { Header: "월", Name: "month", Type: "Int", Format: "#,##0월", Align: "Center", Width: 80 },
    { Header: "청구일", Name: "billCd", Type: "Text", Format: "#,##일", Align: "Center", Width: 80 },
    { Header: "공급자", Name: "companyNm", Align: "Center", Width: 100 },
    { Header: "총액", Name: "totAmount", Type: "Int", Format: "#,##0 원", Align: "Center", Width: 100 },
    { Header: "기본운임", Name: "communicationFee", Type: "Int", Format: "#,##0 원", Align: "Center", Width: 100 },
    { Header: "기본운임(VAT)", Name: "communicationFeeVat", Type: "Int", Format: "#,##0 원", Align: "Center", Width: 100 },
    { Header: "택배", Name: "untpc", Type: "Int", Format: "#,##0 원", Align: "Center", Width: 100 },
    { Header: "택배(VAT)", Name: "untpcVat", Type: "Int", Format: "#,##0 원", Align: "Center", Width: 100 },
    { Header: "통신화주", Name: "weightUntpc", Type: "Int", Format: "#,##0 원", Align: "Center", Width: 100 },
    { Header: "통신화주(VAT)", Name: "weightUntpcVat", Type: "Int", Format: "#,##0 원", Align: "Center", Width: 100 },
  ];

  const detailColumns = [
    { Header: "업체명", Name: "companyNm", Type: "Text", Align: "Center", Width: 150 },
    { Header: "재계산", Name: "recalculationBtn", Type: "Button", Align: "Center", Width: 80,
      ButtonText: "재계산", 
      Button: "Button" // 버튼 클릭 가능하게
    },
    { Header: "재전송", Name: "resendBtn", Type: "Button", Align: "Center", Width: 80,
      ButtonText: "재전송", 
      Button: "Button" // 버튼 클릭 가능하게
    },
    { Header: "Email", Name: "email", Type: "Text", Align: "Center", Width: 200 },
    { Header: "발송상태", Name: "sendStatus", Type: "Text", Align: "Center", Width: 120 },
    { Header: "FAX", Name: "faxNo", Type: "Text", Align: "Center", Width: 120 },
    { Header: "총 건수", Name: "totCount", Type: "Int", Align: "Center", Width: 80 },
    { Header: "총액", Name: "totAmount", Type: "Int", Format: "#,##0 원", Align: "Right", Width: 120 },
    { Header: "기본운임", Name: "communicationFee", Type: "Int", Format: "#,##0 원", Align: "Right", Width: 120 },
    { Header: "기본운임(VAT)", Name: "communicationFeeVat", Type: "Int", Format: "#,##0 원", Align: "Right", Width: 120 },
    { Header: "택배", Name: "untpc", Type: "Int", Format: "#,##0 원", Align: "Right", Width: 120 },
    { Header: "택배(VAT)", Name: "untpcVat", Type: "Int", Format: "#,##0 원", Align: "Right", Width: 120 },
    { Header: "통신화주", Name: "weightUntpc", Type: "Int", Format: "#,##0 원", Align: "Right", Width: 120 },
    { Header: "통신화주(VAT)", Name: "weightUntpcVat", Type: "Int", Format: "#,##0 원", Align: "Right", Width: 120 },

    // ✅ 기능 버튼 영역
    { Header: "다운로드", Name: "pdfDownload", Type: "Button", Align: "Center", Width: 160,
      ButtonText: "상세 청구서 다운로드", 
      Button: "Button", // 버튼 클릭 가능하게
    },    
    { Header: "기능", Name: "actions", Type: "Button", Align: "Center", Width: 160,
      ButtonText: "상세 청구서", 
      Button: "Button", // 버튼 클릭 가능하게
    },
    { Header: "기능1", Name: "actions1", Type: "Button", Align: "Center", Width: 160,
      ButtonText: "종류별 청구서", 
      Button: "Button", // 버튼 클릭 가능하게
    }  
  ];  

  const handleButtonClick = (row: any, evt: any) => {
    // Ref 값을 확인해서 즉시 차단
    if (isProcessingRef.current) {
        toast({
            title: "처리 중",
            description: "현재 작업이 진행 중입니다. 잠시만 기다려주세요.",
            variant: "destructive",
        });
        return; 
    }
    if (recalcMutation.isPending || resendMutation.isPending) return; 

    const colName = evt?.col;
    const rowData = row;

    const blockedButtons = ["pdfDownload", "actions", "actions1"];
    if (blockedButtons.includes(colName) && (rowData?.totAmount === 0 || !rowData?.totAmount)) {
      toast({
        title: "알림",
        description: "총액이 0원인 경우 청구서를 조회하거나 다운로드할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }    
    setInvoiceParams({
      year : selectedInvoice?.year,
      month : selectedInvoice?.month,
      billCd : selectedInvoice?.billCd,
      billCompanyId : selectedInvoice?.billCompanyId,
      calculationCompanyId : rowData?.calculationCompanyId,
      billId : rowData?.billId
    })

    if(colName === "recalculationBtn"){
      const payload = {
          year : selectedInvoice?.year,
          month : selectedInvoice?.month,
          billCd : selectedInvoice?.billCd,
          billCompanyId : selectedInvoice?.billCompanyId,
          calculationCompanyId : rowData?.calculationCompanyId,
          billId : rowData?.billId
      }

      isProcessingRef.current = true;

      recalcMutation.mutate(payload, {
        // 끝나면 잠금 해제
        onSettled: () => {
           isProcessingRef.current = false;
        }
      });

    }

    if (colName === "resendBtn") {
      // 이메일 재전송 API 호출
      const payload = {
          year : selectedInvoice?.year,
          month : selectedInvoice?.month,
          billCd : selectedInvoice?.billCd,
          billCompanyId : selectedInvoice?.billCompanyId,
          calculationCompanyId : rowData?.calculationCompanyId,
          billId : rowData?.billId,
          billDtlId : rowData?.billDtlId
      }

      isProcessingRef.current = true;

      resendMutation.mutate(payload, {
        // 끝나면 잠금 해제
        onSettled: () => {
           isProcessingRef.current = false;
        }
      });
    }

    // 상세 청구서 pdf 다운로드
    if(colName === "pdfDownload"){
      const payload = {
          year : selectedInvoice?.year,
          month : selectedInvoice?.month,
          billCd : selectedInvoice?.billCd,
          billCompanyId : selectedInvoice?.billCompanyId,
          calculationCompanyId : rowData?.calculationCompanyId,
          calculationCompanyNm : rowData?.companyNm,
          billId : rowData?.billId,
          billDtlId : rowData?.billDtlId
      }

      handleSinglePdfDownload(payload);
      return;
    }

    if (colName === "actions") {
      // 상세 청구서 팝업 열기
      setInvoiceModalOpen(true);
    }

    if (colName === "actions1") {
      // 종류별 청구서 팝업 열기
      setInvoiceKindModalOpen(true);
    }

  };  

  const createInvoiceMutation = useCustomMutation<InsertInvoice>({
    mutationFn: async (invoiceData) => {
      const res = await apiRequest("POST", "/api/bill/insert", invoiceData);
      return res.json();
    },
    queryKeyToInvalidate: "/api/bill/list",
    successMessage: "청구서가 성공적으로 생성되었습니다.",
    errorMessage: undefined,
    closeModal,
    onExtraSuccess: () => {
      forceRefresh();
      setBillDetailRefresh(prev => prev + 1);
    },
  });

  const recalcMutation = useMutation({
    mutationFn: async (payload: {
      year?: number;
      month?: number;
      billCd?: string;
      billCompanyId?: number;
      calculationCompanyId?: number;
      billId?: number;
    }) => {
      // apiRequest는 Response 객체를 리턴하므로 json 변환 필요
      const res = await apiRequest("POST", "/api/bill/re-calculation", payload);
      return await res.json();
    },
    onSuccess: async () => { 
      await queryClient.invalidateQueries({ queryKey: ["/api/bill/list"] });

      toast({
        title: "성공",
        description: "재계산이 완료되었습니다.",
      });

      // 2. 모달 닫기 및 리프레시 트리거
      closeModal();
      setCompanyModalOpen(false);
      setBillDetailRefresh(Date.now());
    },
    onError: (error) => {
      console.error("재계산 실패:", error);
      toast({
        title: "오류",
        description: "재계산 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const recalcMutationAll = useMutation({
    mutationFn: async (payload: {
      year?: number;
      month?: number;
      billCd?: string;
      billCompanyId?: number;
      billId?: number;
    }) => {
      const res = await apiRequest("POST", "/api/bill/re-calculation", payload);
      return await res.json();
    },
    onSuccess: async (data) => {
      // ✅ 리스트 invalidate
      await queryClient.invalidateQueries({ queryKey: ["/api/bill/list"] });
      toast({
        title: "성공",
        description: "전체 재계산이 완료되었습니다.",
      });
      closeModal();
      setCompanyModalOpen(false);
      setBillDetailRefresh(Date.now());
    },
    onError: (error) => {
      console.error("재계산 실패:", error);
      toast({
        title: "오류",
        description: "전체 재계산 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
  
  const resendMutation = useMutation({
    mutationFn: async (payload: {
      year?: number;
      month?: number;
      billCd?: string;
      billCompanyId?: number;
      calculationCompanyId?: number;
      billId?: number;
    }) => {
      // apiRequest 호출
      const res = await apiRequest("POST", "/api/mail/resend", payload);
      const data = await res.json(); // axios.data 대신 직접 파싱
      return data;
    },
    onSuccess: (data) => {
      closeModal();
      toast({
        title: "성공",
        description: "메일 재발송이 완료되었습니다.",
      });
      setBillDetailRefresh(Date.now());
    },
    onError: (error) => {
      console.error("메일 재발송 실패:", error);
      toast({
        title: "오류",
        description: "메일 재발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });  

  const updateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InsertMember & { id: number }) => {
      // 실제 API 스펙에 맞게 수정
      const { id, ...payload } = invoiceData;
      const response = await apiRequest("PUT", `/api/Invoices/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/Invoices"] });
      closeModal();
      toast({
        title: "성공",
        description: "쳥구서 정보가 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "청구서 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 단건 PDF 다운로드 함수
const handleSinglePdfDownload = async (payload: any) => {
  // 이미 다운로드 중이거나, 필수 PK 값이 없으면 중단
  if (isDownloading) return;
  if (!payload.billId || !payload.billDtlId) {
    toast({
      title: "오류",
      description: "청구서 ID 정보가 부족합니다.",
      variant: "destructive",
    });
    return;
  }

  // 로딩 상태 시작
  setIsDownloading(true);

  // 서버 API 엔드포인트 및 페이로드 설정
  const url = "/api/bill-print/download-invoice-pdf"; 
  
  // TaxInvoiceExcelDTO에 필요한 모든 파라미터를 담습니다.
  const apiPayload = {
    year: payload.year,
    month: payload.month,
    billCd: payload.billCd,
    billCompanyId: payload.billCompanyId,
    calculationCompanyId: payload.calculationCompanyId,
    calculationCompanyNm: payload.calculationCompanyNm,
    billId: payload.billId,
    billDtlId: payload.billDtlId
  };

  try {
    // 1. 서버 API 호출 (apiRequest 사용)
    // apiRequest는 기본적으로 fetch를 래핑하며 Response 객체를 반환한다고 가정합니다.
    const res = await apiRequest("POST", url, apiPayload);

    if (!res.ok) {
        // 서버에서 에러 상태 코드를 반환한 경우
        const errorText = await res.text();
        console.error("Server error response:", errorText);
        throw new Error(`서버 오류: ${res.status} ${res.statusText}`);
    }
    
    // 2. 응답 본문에서 Blob 데이터 추출
    const blob = await res.blob();

    // 3. 파일 이름 추출 (Content-Disposition 헤더 사용)
    const disposition = res.headers.get("content-disposition");
    let fileName = `${payload.calculationCompanyNm || "청구서"}_${payload.year}년${payload.month}월.pdf`;

    if (disposition) {
      // 서버에서 인코딩된 파일명을 디코딩하여 사용
      let match = disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/);
      if (match && match[1]) {
        fileName = decodeURIComponent(match[1].trim().replace(/['"]/g, ""));
      }
    }

    // 4. 다운로드 처리
    const urlBlob = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = urlBlob;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlBlob);

    toast({
      title: "성공",
      description: "PDF 다운로드가 완료되었습니다.",
    });

  } catch (err) {
    console.error("PDF 다운로드 실패:", err);
    toast({
      title: "오류",
      description: `PDF 다운로드 중 오류가 발생했습니다.`,
      variant: "destructive",
    });
  } finally {
    setIsDownloading(false);
  }
};

  const deleteInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice) throw new Error("No delivery selected.");
      // pk 값 다 넘거야됨
      await apiRequest("DELETE", `/api/Invoices/${selectedInvoice?.year}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/Invoices"] });
      closeModal();
      toast({
        title: "성공",
        description: "청구서가 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "청구서 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // row 선택 ( 년 , 월...)
  const handleRowClick = (invoice: Invoice) => {
      setSelectedInvoice({...invoice});
  };

  //세금계산서 다운로드 JXLS
  const handleTaxInvoiceDownload = async () => {
    if (!selectedInvoice) return;

    // 이미 다운로드 중이면 함수 강제 종료
    if (isDownloading) return; 

    // 로딩 상태
    setIsDownloading(true);

    const payload = {
      year: selectedInvoice.year,
      month: selectedInvoice.month,
      billCd: selectedInvoice.billCd,
      billCompanyId: selectedInvoice.billCompanyId,
    };

    try {
      // fetch 래퍼(apiRequest) 사용
      const res = await apiRequest("POST", "/api/bill-print/download", payload);
      const blob = await res.blob();

      // 백엔드에서 내려주는 파일명 추출
      const disposition = res.headers.get("content-disposition");
      let fileName = "세금계산서.zip";

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
    } catch (err) {
      console.error("세금계산서 다운로드 실패", err);
    }finally {
      setIsDownloading(false);
    }
  };

  // 전체 이메일 발송
  const handleTotalMailSend = async () => {

    const payload = {
          year : selectedInvoice?.year,
          month : selectedInvoice?.month,
          billCd : selectedInvoice?.billCd,
          billCompanyId : selectedInvoice?.billCompanyId,
          billId : selectedInvoice?.billId
      }

      resendMutation.mutate(payload);

  }

  const handleModalSave = () => {

    if (validationToast(!modalData.billCompanyId || modalData.billCompanyId <= 0, "공급자 및 입금통장")) return;
    if (validationToast(!modalData.year || Number.isNaN(modalData.year), "연도")) return;
    if (validationToast(!modalData.month || Number.isNaN(modalData.month), "월")) return;
    if (validationToast(!modalData.billCd, "청구일")) return;

    const basePayload = {
      billCompanyId : modalData.billCompanyId,
      year : modalData.year,
      month : modalData.month,
      billCd : modalData.billCd
    } as unknown as InsertInvoice;

    if (modalMode === "create") {
      console.log("before",selectedInvoice)
      createInvoiceMutation.mutate(basePayload);
      console.log("after",selectedInvoice)
      return
    }

    // if (modalMode === "edit" && selectedCompany) {
    //   updateCompanyMutation.mutate({ ...basePayload, companyId: selectedCompany.companyId, shipperId: selectedCompany.shipperId}as any);
    //   return;
    // }
  };

  const handleModalCancel = () => {
    closeModal();
  };

  const handleModalDelete = () => {
    if (!selectedInvoice) return;
    deleteInvoiceMutation.mutate();
  };

  useEffect(() => {
    if (openByDblClick && selectedInvoice) {
      setCompanyModalOpen(true);
      setOpenByDblClick(false);
    }
  }, [selectedInvoice, openByDblClick]);  

  // invoices.tsx 내부의 기존 useEffect 수정
 useEffect(() => {
    const clearSheet = () => {
      const win = window as any;
      if (win.IBSheet && win.IBSheet.getIBSheetId) {
        const oldSheet = win.IBSheet.getIBSheetId("billDtl");
        if (oldSheet) {
          console.log("🧹 billDtl 시트 강제 파괴 (dispose)");
          try {
            oldSheet.dispose();
          } catch (e) {
            console.warn("Sheet dispose 중 에러:", e);
          }
        }
      }
      // loader를 통해서도 한 번 더 확인
      if (loader && loader.removeSheet) {
        try {
          loader.removeSheet("billDtl");
        } catch (e) {
          console.warn("Loader removeSheet 중 에러:", e);
        }
      }
    };

    // 모달이 열릴 때 기존 시트 정리
    if (companyModalOpen) {
      clearSheet();
      // 약간의 딜레이를 주어 정리 후 재생성
      const timer = setTimeout(() => {
        // CommonSheet가 생성될 준비
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // 모달이 닫힐 때도 정리
      clearSheet();
    }
  }, [companyModalOpen]);

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">청구서관리</h1>
          <div className="flex space-x-3">
            {/*<Button*/}
            {/*    variant="outline"*/}
            {/*    onClick={() => selectedInvoice && setCompanyModalOpen(true)}*/}
            {/*    disabled={!selectedInvoice}*/}
            {/*    className={cn(*/}
            {/*        "transition-colors",*/}
            {/*        selectedInvoice*/}
            {/*            ? "border-blue-600 text-blue-600 hover:bg-blue-50"*/}
            {/*            : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
            {/*    )}*/}
            {/*>*/}
            {/*  <Edit className="w-4 h-4 mr-2" />*/}
            {/*  선택 업체별보기*/}
            {/*</Button>*/}
            <Button
                onClick={() => openModal("create")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              신규 추가
            </Button>
          </div>
        </div>
        {/* ib sheet 사용 */}
        <CommonSheet url="/api/bill/list"
                      key={`main-invoice-${billDetailRefresh}`}
                     searchParams={{ ...appliedParams, _rt: billDetailRefresh }}
                      usePaging={false}
                      editMode = {3}
                      emptyMessage="등록된 청구서가 없습니다."
                      columns={columns}
                      handleRowClick={handleRowClick}
                      refreshTrigger={billDetailRefresh} 
                      height= "600px"
                      gridName="invoice"
                      extraOptions={{
                                    Events: {
                                      onDblClick: (evt : any) => {
                                        if (evt.row?.Kind === "Header" || evt.row?.Kind === "Space") return;
                                        handleRowClick(evt.row);
                                        setOpenByDblClick(true);
                                      }
                                    }                                                
                                  }}                       
                      />

        {/* Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="bg-white rounded shadow p-6 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {modalMode === "create" ? "청구서 신규 등록" : "청구서 정보 수정"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-y-4">
              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium">공급자</Label>
                <div className="flex-1 [&_[role=combobox]]:h-10 [&_[role=combobox]]:w-full [&_[role=combobox]]:text-base">
                  <CommonCodeSelect
                    type=""
                    value={modalData.billCompanyId && modalData.billCompanyId > 0 
                            ? String(modalData.billCompanyId) 
                            : undefined}
                    onChange={(val) => {
                      setModalData((prev) => ({
                        ...prev,
                        billCompanyId: Number(val) || 0,
                      }));
                    }}
                    placeholder="공급자 선택"
                    url="/api/bill-company/code/detail/list"
                  />
                </div>
              </div>

              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 w-20">연도</Label>
                <Input
                  type="number"
                  value={modalData.year}
                  onChange={(e) => setField("year", Number(e.target.value))}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 w-20">월</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={modalData.month}
                  onChange={(e) => setField("month", Number(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 w-20">청구일</Label>
                <RadioGroup
                  value={modalData.billCd || "20"}
                  onValueChange={(val) => setField("billCd", val)}
                  className="flex gap-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="20" id="date20" />
                    <Label htmlFor="date20" className="text-sm">20일</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30" id="date30" />
                    <Label htmlFor="date30" className="text-sm">30일</Label>
                  </div>
                </RadioGroup>
              </div>   
            </div>           

            <div className="flex justify-end gap-x-3 pt-4 border-t">
              {modalMode === "edit" && (
                  <Button
                      variant="destructive"
                      onClick={handleModalDelete}
                      className="mr-auto"
                      disabled={deleteInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteInvoiceMutation.isPending ? "삭제 중..." : "삭제"}
                  </Button>
              )}

              <Button
                  variant="outline"
                  onClick={handleModalCancel}
                  disabled={
                      createInvoiceMutation.isPending ||
                      updateInvoiceMutation.isPending ||
                      deleteInvoiceMutation.isPending
                  }
              >
                취소
              </Button>

              <Button
                  onClick={handleModalSave}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={
                      (modalMode === "create" && createInvoiceMutation.isPending) ||
                      (modalMode === "edit" && updateInvoiceMutation.isPending) ||
                      deleteInvoiceMutation.isPending
                  }
              >
                {modalMode === "create"
                    ? (createInvoiceMutation.isPending ? "등록 중..." : "등록")
                    : (updateInvoiceMutation.isPending ? "수정 중..." : "수정")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Company Breakdown Modal */}
        {companyModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white w-[90vw] max-w-[1400px] max-h-[90vh] overflow-auto rounded shadow p-6">
              <div className="flex justify-between items-center mb-4">                
                <h2 className="text-xl font-bold text-gray-900">
                  업체별 청구 내역 - {selectedInvoice?.billCompanyNm} {selectedInvoice?.year}년 {selectedInvoice?.month}월 -{selectedInvoice?.billCd}일-
                </h2>
                {/* [추가됨] 검색 조건 영역 (members.tsx 스타일 적용) */}
                <div className="flex items-center gap-x-2 mr-4 p-1.5 rounded border border-gray-100">
                  <Label className="text-sm font-medium text-gray-800 whitespace-nowrap">업체명</Label>
                  <Input
                    value={detailSearchInput}
                    placeholder="업체명을 입력하세요(빈값시 전체 조회)"
                    className="h-9 w-60 bg-white" // 높이와 너비 조정
                    onChange={(e) => setDetailSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setDetailSearchKeyword(detailSearchInput);
                      }
                    }}
                  />
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3"
                    onClick={() => setDetailSearchKeyword(detailSearchInput)}
                  >
                    <Search className="w-4 h-4" />
                    검색
                  </Button>
                </div>            
                <div className="flex space-x-3">
                  {/* 전체 재계산 버튼 */}
                  <Button
                    onClick={()=>{
                      if (!selectedInvoice?.billId) {
                        alert("다시 선택후 버튼을 클릭해주세요.");
                        return;
                      }

                      recalcMutationAll.mutate({
                        year: selectedInvoice.year,
                        month: selectedInvoice.month,
                        billCd: selectedInvoice.billCd,
                        billCompanyId: selectedInvoice.billCompanyId,
                        billId: selectedInvoice.billId
                      });
                    }} 
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                    disabled={!selectedInvoice || recalcMutationAll.isPending}
                  >
                    {recalcMutationAll.isPending ? "재계산 중..." : "전체 재계산"}
                  </Button>                  
                  {/* 이메일 청구서 전체 발송 버튼 */}
                  <Button
                    onClick={handleTotalMailSend}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                    disabled={!selectedInvoice || resendMutation.isPending}
                  >
                    {resendMutation.isPending ? "발송 중..." : "이메일 청구서 전체 발송"}
                  </Button>                  
                  {/* 세금계산서 다운로드 버튼 */}
                  <Button
                    onClick={handleTaxInvoiceDownload}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={!selectedInvoice || isDownloading}
                  >
                    {isDownloading ? "다운로드 중..." : "세금계산서 다운로드"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCompanyModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>                  
                </div>   
              </div>
              <div className="overflow-x-auto">
                <CommonSheet url="/api/bill-detail/list"
                              searchParams={
                                selectedInvoice
                                  ? {
                                      year: selectedInvoice.year,
                                      month: selectedInvoice.month,
                                      billCd: selectedInvoice.billCd,
                                      billCompanyId: selectedInvoice.billCompanyId,
                                      billId: selectedInvoice.billId,
                                      _refresh: billDetailRefresh,

                                      // 버튼을 눌러 setDetailSearchKeyword 값이 바뀌면, 이 값이 바뀌면서 재조회됩니다.
                                      companyNm: detailSearchKeyword                                      
                                    }
                                  : {}
                              }
                              usePaging={false}
                              editMode = {3}
                              emptyMessage="등록된 회사별 청구서가 없습니다."
                              columns={detailColumns}
                              refreshTrigger={billDetailRefresh} 
                              handleRowClick={handleButtonClick}
                              height= "600px"
                              gridName={`billDtl-${sheetKey}`}
                              key={`billDtl-${sheetKey}`}
                              externalSheetRef={billDetailSheetRef}
                              />
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => {
                    setCompanyModalOpen(false);
                    // billDetailSheetRef.current?.refetch()
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 상세 청구서 */}
          {invoiceModalOpen && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: isDownloading ? "transparent" : "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 2000,
                pointerEvents: isDownloading ? "none" : "auto",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  position: "relative",
                  opacity: isDownloading ? 0 : 1,
                  transition: "opacity 0.2s"
                }}
              >
                <button
                  onClick={() => setInvoiceModalOpen(false)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    border: "none",
                    background: "transparent",
                    color: "#4b5563",
                    fontSize: "20px",
                    lineHeight: "1",
                    padding: "10px",
                    cursor: "pointer",
                    transition: "background-color 0.2s, color 0.2s",
                    zIndex: "10",
                    display: isDownloading ? "none" : "block"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = "#1f2937";
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = "#4b5563";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  ✕
                </button>
                <div
                  style={{
                    padding: "20px",
                    maxHeight: "80vh",
                    overflowY: "auto",
                  }}
                >
                  <div id="print-modal-content">
                    <div style={{ padding: "10px" }}>
                      <div style={{ margin: "0 auto", width: "620px" }}>
                        <BillInvoice params={invoiceParams} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        {/* 종류별 상세 청구서 */}
        {invoiceKindModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 2000, // 모달보다 위
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "8px",
                position: "relative",
              }}
            >
              <button
                onClick={() => setInvoiceKindModalOpen(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  border: "none",
                  background: "transparent",
                  color: "#4b5563",
                  fontSize: "20px",
                  lineHeight: "1",
                  padding: "10px",
                  cursor: "pointer",
                  transition: "background-color 0.2s, color 0.2s",
                  zIndex: "10",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = "#1f2937";
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = "#4b5563";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                ✕
              </button>
              {/* 이 div에 padding과 스크롤을 적용합니다. */}
              <div
                style={{
                  padding: "20px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                }}
              >
                <div id="print-modal-content">
                  <div style={{ padding: "10px" }}>
                    <div style={{ margin: "0 auto", width: "620px" }}>
                      <BillingSummaryTable params={invoiceParams} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}