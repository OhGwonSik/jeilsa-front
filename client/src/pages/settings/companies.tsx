import {useEffect, useState} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Textarea} from "@/components/ui/textarea";
import {Checkbox} from "@/components/ui/checkbox";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Edit, Plus, RotateCcw, Search} from "lucide-react";
import {cn} from "@/lib/utils";
import CommonSheet from "@/pages/ibsheet.tsx";
import CommonSheetServerPaging from "@/pages/ibsheetWithPaging";
import {useToast} from "@/hooks/use-toast.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import {InsertCompany} from "@shared/schema.ts";
import {apiRequest} from "@/lib/queryClient.ts";
import {formatBizNo, isValidBizNo} from "@/common/utils/formatBizNo.ts";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import {useModal} from "@/hooks/useModal.ts";
import {isValidFax} from "@/common/utils/formatFax.ts";
import {useDupCheckHandler} from "@/hooks/useDupCheckHandler.ts";
import {formatPhone, isValidPhone} from "@/common/utils/formatPhone.ts";
import {formatEmail, isValidEmail} from "@/common/utils/formatEmail.ts";
import {validationToast} from "@/common/utils/validationToast.ts";
import CompanyAutoComplete from "@/components/common/CompanyAutoComplete.tsx";
import {CommonCodeSelect} from "@/pages/codeSelectProps";
import { useSelector } from "react-redux";
import type { RootState } from "@/common/redux/store";
import { isNull } from "drizzle-orm";

interface CompanyData {
  companyId: number;
  bizNo : string;
  companyNm: string;
  representativeNm: string;
  bizType : string;
  bizItem : string;
  address: string;
  telNo: string;
  faxNo: string;
  email?: string;
  rmk?: string;
  shipperYn?: string; // 화주 여부
  shipperId : number;
  shipperCd: string; // 택배 / 통신
  regionCd: string; // 배송 지역 code
  regionDtlCd: string; // 배송 지역 상세 code
  deliveryRouteId: number; // 배송 코스 id
  deliveryRouteCd: string;
  deliveryRouteNm: string;
  deliveryRouteLabel: string;
  useYn: string; // 사용여부
  vatYn: string; // vat 여부
  billStdrCd: number; // 청구 기준일 (20,30일)
  taxbilOutputYn: string; // 세금계산서 출력 여부
  billCharCd: string; // 요금 청구코드 (신용 / 일반)
  communicationFee: number; // 통신료
  weightUntpc: number; // 무게 단가(통신)
  untpc: number; // 수량 단가
  billCompanyId: number; // 청구 회사 id
  excclcCompanyId : number; // 정산회사
  excclcCompanyNm : string; // 정산회사명
  managerNm: string; // 담당자명
  managerTelNo: string; //담당자 휴대폰
  registDt: Date;
}

interface ContactData {
  companyManagerId: number;
  companyId: number;
  managerNm: string;
  managerTelNo: string;
}

interface ModalData {
  bizNo : string;
  companyId: number;
  companyNm: string;
  representativeNm: string;
  bizType : string;
  bizItem : string;
  address: string;
  telNo: string;
  faxNo: string;
  email: string;
  rmk?: string;
  shipperYn?: string; // 화주 여부
  shipperId : number;
  shipperCd: string; // 택배 / 통신
  regionCd: string; // 배송 지역 code
  regionDtlCd: string; // 배송 지역 상세 code
  deliveryRouteId?: number; // 배송 코스 id
  deliveryRouteCd: string;
  deliveryRouteNm: string;
  deliveryRouteLabel: string;
  useYn: string; // 사용여부
  vatYn: string; // vat 여부
  billStdrCd: number; // 청구 기준일 (20,30일)
  taxbilOutputYn: string; // 세금계산서 출력 여부
  billCharCd: string; // 요금 청구코드 (신용 / 일반)
  communicationFee: number; // 통신료
  weightUntpc: number; // 무게 단가(통신)
  untpc: number; // 수량 단가
  billCompanyId?: number; // 청구 회사 id
  excclcCompanyId : number; // 정산회사
  excclcCompanyNm : string; // 정산회사명
  managerNm: string; // 담당자명
  managerTelNo: string; //담당자 휴대폰
};

interface DeleteCompanyRequest {
  companyId: number;
};

export default function Companies() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);

  // Modal form state
  // const [formData, setFormData] = useState<Partial<CompanyData>>({});
  const [shipperYn, setShipperYn] = useState("N");
  const [contacts, setContacts] = useState<ContactData[]>([]);

  const [type, setType] = useState(""); // 택배/통신 선택 값

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const toggleMobileFilter = () => setIsMobileFilterOpen(prev => !prev);

  const [companySearchModalOpen, setCompanySearchModalOpen] = useState(false);
  const [selectedCompanyInSearch, setSelectedCompanyInSearch] = useState<CompanyData | null>(null);

  const [companyList, setCompanyList] = useState<CompanyData[]>([]);

  //더블클릭이벤트 동작 상태값
  const [openByDblClick, setOpenByDblClick] = useState(false);

  // 사업자등록번호 수정 가능 여부
  const [isBizNoDisabled, setIsBizNoDisabled] = useState(false);
  const role = useSelector((state: RootState) => state.auth.roles);

  // 검색조건 값이 있는지 -> 데이터가 많기떄문에 조건을 1개라도 넣기로 임시
  const hasSearchCondition = (params: Record<string, any>) => {
    return Object.values(params ?? {}).some(
      (v) => v !== undefined && v !== null && String(v).trim() !== ""
    );
  };

  const defaultCompanyData : ModalData = {
    address: "",
    billCompanyId: 0,
    billStdrCd: 20,
    billCharCd: "credit",
    bizItem: "",
    bizNo: "",
    bizType: "",
    companyId: 0,
    companyNm: "",
    regionCd: "",
    regionDtlCd: "",
    deliveryRouteId: undefined,
    deliveryRouteCd: "",
    deliveryRouteNm: "",
    deliveryRouteLabel: "",
    email: "",
    excclcCompanyId: 0, // 정산회사
    excclcCompanyNm : "", // 정산회사명
    faxNo: "",
    rmk: "",
    representativeNm: "",
    shipperId: 0,
    shipperCd: "", // 택배 / 통신
    shipperYn: "N", // 기본값 세팅 필수
    taxbilOutputYn: "Y", // 기본값 세팅 필수
    telNo: "",
    useYn: "Y", // 기본값 세팅 필수
    vatYn: "Y", // 기본값 세팅 필수
    communicationFee: 0, // 통신료
    weightUntpc: 0, // 무게 단가(통신)
    untpc: 0, // 수량 단가
    managerNm: "", // 담당자명
    managerTelNo: "" //담당자 휴대폰
  };

  const {
    modalMode,
    modalOpen,
    modalData,
    setModalData,
    openModal,
    closeModal
  } = useModal<ModalData>(defaultCompanyData);  

  const [isUserIdValid, setIsUserIdValid] = useState(false);

  const handleBizNoDupCheck = () => {
  if (modalData.bizNo.trim() === "") {
    validationToast(true, "사업자등록번호");
    return;
  }

  if (!isValidBizNo(modalData.bizNo)) {
    validationToast(true, "사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)", true);
    return;
  }

  // 위 조건을 모두 통과했을 때만 중복 체크 실행
  trigger();
};

  const { trigger } = useDupCheckHandler({
    url: "/api/company/biz-no/check",
    column: "bizNo",
    value: modalData.bizNo,
    successMessage: "사용할 수 있는 사업자등록번호 입니다.",
    duplicateMessage: "이미 사용 중인 사업자등록번호 입니다.",
    setIsValid: setIsUserIdValid,
    deps: [modalData.bizNo], // 입력 변경 감지
  });

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
    regionCd: '',
    billCompanyId: '',
    companyNm: '',
    shipperYn: '',
    shipperCd: '',
  });

  const {
    searchParams: modalSearchParams,
    setSearchParams: setModalSearchParams,
    appliedParams: appliedModalParams,
    handleSearch: handleModalSearch,
    refreshTrigger: modalRefreshTrigger,
  } = useSearchFilters({ companyNm: "" });

  const { toast } = useToast();

  // ib sheet에 사용할 컬럼 TODO 정리
  const columns = [
    { Header: "지역",      Name: "regionNm",     Align: "Center", Width: 50 },
    { Header: "공급자",    Name: "billCompanyNm",        Align: "Center", Width: 100 },
    { Header: "화주여부",      Name: "shipperYn",          Align: "Center", Width: 70 },
    { Header: "화주구분",    Name: "shipperNm",        Align: "Center", Width: 70 },
    { Header: "사용유무",  Name: "useYn",        Align: "Center", Width: 70 },
    { Header: "업체명",  Name: "companyNm",    Align: "Center", Width: 300 },
    { Header: "정산그룹",  Name: "excclcCompanyNm", Align: "Center", Width: 300 },
    { Header: "배송코스",  Name: "deliveryRouteNm", Align: "Center", Width: 100 },
    { Header: "VAT",       Name: "vatYn",             Align: "Center", Width: 60  },
    { Header: "출력여부",      Name: "taxbilOutputYn",          Align: "Center", Width: 70  },
    { Header: "청구일",    Name: "billStdrCd",      Align: "Center", Width: 60 },
    { Header: "통신료",      Name: "communicationFee",       Align: "Center", Width: 60 },
    { Header: "수량단가",      Name: "untpc",         Align: "Center", Width: 70 },
    { Header: "무게단가",      Name: "weightUntpc",           Align: "Center", Width: 70 },
    { Header: "대표자",    Name: "representativeNm",  Align: "Center", Width: 60 },
    { Header: "전화번호",  Name: "telNo",           Align: "Center", Width: 140 },
    { Header: "주소",      Name: "address",         Align: "Center", Width: 400 },
    { Header: "등록일",    Name: "regDt",Align: "Center", Width: 100,  Type:"Date", Format:"yyyy-MM-dd", EditFormat:"yyyy-MM-dd", DataFormat: "yyyyMMddHHmmss"}
  ];

  // 숫자 입력 핸들러 (공통)
  const handleNumberChange = (field: keyof typeof modalData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;

      if (val === "") {
        // 화면은 빈칸, 실제 값은 0
        setField(field, 0);
        return;
      }

      // 0900 같은 입력은 900으로 정규화
      if (/^0\d+/.test(val)) {
        val = String(Number(val));
      }

      setField(field, Number(val));
    };

  function setField<K extends keyof ModalData>(key: K, value: ModalData[K]) {
    setModalData((prev) => ({ ...prev, [key]: value }));
  }

  const createCompanyMutation = useCustomMutation<InsertCompany>({
    mutationFn: async (companyData) => {
      const res = await apiRequest("POST", "/api/company/insert", companyData);
      return res.json();
    },
    queryKeyToInvalidate: [
      ['/api/company/list'],                  // 기본
      ['/api/company/list', appliedParams],   // 화면이 실제로 쓰는 키
    ],
    successMessage: "업체가 성공적으로 생성되었습니다.",
    errorMessage: "업체 생성에 실패했습니다.",
    closeModal,
    onExtraSuccess: () => forceRefresh(),
  });


  const updateCompanyMutation = useCustomMutation<InsertCompany>({
    mutationFn: async (companyData) => {
      const res = await apiRequest("PUT", "/api/company/update", companyData);
      return res.json();
    },
    queryKeyToInvalidate: [
      ['/api/company/list'],                  // 기본
      ['/api/company/list', appliedParams],   // 화면이 실제로 쓰는 키
    ],
    successMessage: "업체 정보가 수정되었습니다.",
    errorMessage: "업체 수정에 실패했습니다.",
    closeModal,
    onExtraSuccess: (updatedData) => {

      forceRefresh();
      setSelectedCompany(null);
    },
  });

  const deleteCompanyMutation = useCustomMutation<DeleteCompanyRequest>({
    mutationFn: async (companyData) => {
      const res = await apiRequest("DELETE", "/api/company/delete", companyData);
      return res.json();
    },
    queryKeyToInvalidate: [
      ['/api/company/list'],                  // 기본
      ['/api/company/list', appliedParams],   // 화면이 실제로 쓰는 키
    ],
    successMessage: "업체 정보가 삭제되었습니다.",
    errorMessage: "업체 삭제에 실패했습니다.",
    closeModal,
    onExtraSuccess: (updatedData) => {

      forceRefresh();
      setSelectedCompany(null);
    },
  });  


  // row 선택
const handleRowClick = (company: CompanyData) => {
    const filledCompany = {
    ...company,
    companyId: company.companyId ?? 0,
    vatYn: company.vatYn ?? "Y",
    taxbilOutputYn: company.taxbilOutputYn ?? "Y",
    billStdrCd: company.billStdrCd ?? 20,
    billCharCd: company.billCharCd ?? "credit",
    communicationFee: company.communicationFee ?? 0,
    untpc: company.untpc ?? 0,
    weightUntpc: company.weightUntpc ?? 0,
    billCompanyId: company.billCompanyId ?? 0,
    excclcCompanyId: company.excclcCompanyId ?? 0,
    regionCd: company.regionCd ?? "",
    regionDtlCd: company.regionDtlCd ?? "",
    shipperCd: company.shipperCd ?? "",
    email: company.email ?? "",
    rmk: company.rmk ?? "",
    telNo: formatPhone(company.telNo) ?? "",
    managerNm : company.managerNm ?? "",
    managerTelNo: formatPhone(company.managerTelNo ?? ""),
    faxNo: formatPhone(company.faxNo ?? ""),
    deliveryRouteCd : company.deliveryRouteCd ?? "",
    deliveryRouteLabel : company.deliveryRouteLabel ?? ""
  };
    setModalData(filledCompany);
    setShipperYn(filledCompany.shipperYn ?? "N");
    setSelectedCompany(filledCompany);
};

  // 모달 취소
  function handleModalCancel() {
    closeModal();
  }

  const handleModalDelete = () => {
    
  const companyId = selectedCompany?.companyId;

    if (!companyId) {
      validationToast(true, "업체를 다시 선택하고 삭제해주세요.");
      return;
    }

    deleteCompanyMutation.mutate({ companyId });
  }

  // 모달 저장
  const handleModalSave = () => {


  if (modalMode === "create") { // 생성 모드일 경우만 사업자등록번호 검증
      if (validationToast((modalData.companyNm ?? "").trim() === "", "상호")) return;
      if (validationToast(modalData.bizNo.trim() === "", "사업자등록번호")) return;
      if (validationToast(!isValidBizNo(modalData.bizNo), "사업자등록번호", true)) return;
      if (validationToast(!isUserIdValid, "사업자등록번호 중복 확인을 해주세요")) return;

      if (validationToast((String(modalData.regionCd) ?? "") === "", "지역")) return;
      if (validationToast((String(modalData.regionDtlCd) ?? "") === "", "지역구분")) return;
      
      if (validationToast((String(modalData.representativeNm)?? "").trim() === "", "대표자")) return;
      if (validationToast((String(modalData.address)??"").trim() === "", "주소")) return;

      if (validationToast((String(modalData.bizType)??"").trim() === "", "업태")) return;

      if (validationToast((modalData.telNo??"").trim() === "", "전화번호")) return;
      
      if (validationToast((String(modalData.bizItem)??"").trim() === "", "업종")) return;

      if (validationToast((modalData.email??"").trim() === "", "이메일")) return;

      // 화주 업체 추가 체크 시
      if (modalData.shipperYn === "Y" && role !== 'USER' && role !== 'MANAGER') {

        if(validationToast((modalData.useYn == "" || modalData.useYn == null), "사용유무"))return;

        if (validationToast(modalData.shipperCd.trim() === "", "화주 구분")) return;
        if (validationToast(!modalData.deliveryRouteId, "배송코스")) return;
        if(modalData.deliveryRouteLabel !== '미사용'){
        if (validationToast(!modalData.deliveryRouteCd, "배송코스구분")) return;
        }

        if (validationToast(![20, 30].includes(modalData.billStdrCd), "청구 기준일")) return;
        if (validationToast(!["Y", "N"].includes(modalData.taxbilOutputYn), "세금계산서 출력")) return;
        if (validationToast(!["Y", "N"].includes(modalData.vatYn), "VAT 발행 여부")) return;
        if (validationToast(!["credit", "regular"].includes(modalData.billCharCd), "요금청구 구분")) return;

        if (validationToast(!modalData.billCompanyId, "공급자 및 입급통장")) return;

        if (validationToast(modalData.communicationFee < 0, "통신료")) return;
        if (validationToast(modalData.untpc < 0, "수량단가")) return;
        if (validationToast(modalData.weightUntpc < 0, "무게단가")) return;
      }      
  }
    const basePayload = {
      bizNo: modalData.bizNo,
      regionCd: modalData.regionCd,
      regionDtlCd: modalData.regionDtlCd,
      companyNm: modalData.companyNm,
      managerNm: modalData.managerNm,
      managerTelNo: modalData.managerTelNo,
      representativeNm: modalData.representativeNm,
      bizType: modalData.bizType,
      bizItem: modalData.bizItem,
      address: modalData.address,
      telNo: modalData.telNo,
      faxNo: modalData.faxNo,
      email: modalData.email,
      rmk: modalData.rmk,
      shipperYn: modalData.shipperYn,

      // 화주 여부에 따라 입력 받은 값 or 기본값으로 분기
      shipperCd: modalData.shipperCd,
      billStdrCd: modalData.billStdrCd,
      billCharCd: modalData.billCharCd,
      vatYn: modalData.vatYn,
      taxbilOutputYn: modalData.taxbilOutputYn,
      communicationFee: modalData.communicationFee,
      untpc: modalData.untpc,
      weightUntpc: modalData.weightUntpc,
      deliveryRouteId: modalData.deliveryRouteId,
      deliveryRouteCd: modalData.deliveryRouteCd,

      billCompanyId: modalData.billCompanyId,
      excclcCompanyId: modalData.excclcCompanyId,
      useYn: modalData.useYn,
    } as unknown as InsertCompany; // 타입 맞추기 (필요 시 조정)

    if (modalMode === "create") {
      createCompanyMutation.mutate(basePayload);
      return;
    }
    if (modalMode === "edit" && selectedCompany) {
      updateCompanyMutation.mutate({ ...basePayload, companyId: selectedCompany.companyId, shipperId: selectedCompany.shipperId}as any);
      return;
    }
  };

// 모달 열릴 때 bizNo 값 보고 disabled 상태 결정
useEffect(() => {
  if (modalOpen) {
    if (modalMode === "edit" && modalData.bizNo) {
      setIsBizNoDisabled(true);   // 수정 + 값 있으면 막음
    } else {
      setIsBizNoDisabled(false);  // 생성이거나 값 없으면 입력 가능
    }
  }
}, [modalOpen, modalMode]);  

// 정산업체모달 리스트 불러옴
useEffect(() => {
  if (!companySearchModalOpen) return;

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`/api/company/list?companyNm=${encodeURIComponent(appliedModalParams.companyNm)}`);
      const data = await res.json();
      setCompanyList(data);
    } catch (e) {
      console.error("회사 리스트 불러오기 실패", e);
    }
  };

  fetchCompanies();
  }, [modalRefreshTrigger]);

  //정산업체 모달 초기화
  useEffect(() => {
  if (!companySearchModalOpen) {
    setSelectedCompanyInSearch(null);
    setCompanyList([]);
    setModalSearchParams({ companyNm: "" }); // 조건도 초기화할 경우
  }
  }, [companySearchModalOpen]);

  useEffect(() => {
    if (openByDblClick && selectedCompany && role !== "MANAGER") {
      openModal("edit", selectedCompany);
      setOpenByDblClick(false);
    }
  }, [selectedCompany, openByDblClick, role]);

  return (
    <Layout>
      <div className="bg-gray-50 p-4 sm:p-6">
        {/* ✅ 모바일에서만 보이는 토글 버튼 */}
        <div className="sm:hidden mb-4">
          <Button variant="outline" onClick={toggleMobileFilter} className="w-full">
            {isMobileFilterOpen ? '검색 조건 닫기' : '검색 조건 열기'}
          </Button>
        </div>
        {/* Search Conditions Box */}
        <div
            className={cn(
                "transition-all duration-300 overflow-hidden",
                "sm:block",                          // 데스크탑에서는 항상 보이기
                isMobileFilterOpen ? "block" : "hidden", // 모바일에서는 toggle
                "mb-6"
            )}
        >
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">검색 조건</h3>
              {role !== 'USER'&& role !== 'MANAGER' && (
                <span className="text-gray-500 text-sm ml-3">
                  * 검색조건 중 하나를 입력하여 검색
                </span>
              )}
            </div>     
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              {/* Search filters in horizontal row */}

              <div className="flex items-center gap-x-2 w-full sm:w-auto">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">업체</Label>
                <Input 
                  placeholder="업체명/전화번호를 입력하세요."
                  value={searchParams.companyNm}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      companyNm: e.target.value
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  disabled={role === 'USER'}
                />
              </div>

              <div className="flex items-center gap-x-2 w-full sm:w-auto">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">지역</Label>
                <CommonCodeSelect
                  type="REGION_TYPE"
                  value={searchParams.regionCd || "all"}
                  onChange={(val) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      regionCd: val === "all" ? "" : val,
                    }))
                  }
                  placeholder="지역 선택"
                  includeAll
                  disabled={role === 'USER'}
                />
              </div>

              <div className="flex items-center gap-x-2 w-full sm:w-auto">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">공급자</Label>
                <CommonCodeSelect
                  type=""
                  value={searchParams.billCompanyId || "all"}
                  onChange={(val) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      billCompanyId: val === "all" ? "" : val,
                    }))
                  }
                  placeholder="공급자 선택"
                  includeAll
                  url="/api/bill-company/code/list"
                  disabled={role === 'USER'}
                />
              </div>

              <div className="flex items-center gap-x-2 w-full sm:w-auto">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">화주업체</Label>
                <CommonCodeSelect
                  type="USE_TYPE"
                  value={searchParams.shipperYn || "all"}
                  onChange={(val) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      shipperYn: val === "all" ? "" : val,
                    }))
                  }
                  placeholder="화주여부 선택"
                  includeAll
                  disabled={role === 'USER'}
                />
              </div>

              <div className="flex items-center gap-x-2 w-full sm:w-auto">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">화주업체구분</Label>
                <CommonCodeSelect
                  type="SHIPPER_TYPE"
                  value={searchParams.shipperCd || "all"}
                  onChange={(val) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      shipperCd: val === "all" ? "" : val,
                    }))
                  }
                  placeholder="화주구분 선택"
                  includeAll
                  disabled={role === 'USER'}
                />
              </div>

              {/* 버튼 그룹: 모바일에서는 세로, PC에서는 우측 정렬 */}
              <div className="flex items-center gap-x-2 w-full sm:w-auto sm:ml-auto">
                <Button variant="outline" onClick={resetFilters}>
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
        </div>
        {/* Company List Section */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">업체관리</h3>
              <div className="flex space-x-3">
                {/*{role !== "MANAGER" && (*/}
                {/*  <Button*/}
                {/*  variant="outline"*/}
                {/*  onClick={() => selectedCompany && openModal("edit", selectedCompany)}*/}
                {/*  disabled={!selectedCompany}*/}
                {/*  className={cn(*/}
                {/*    "transition-colors",*/}
                {/*    selectedCompany */}
                {/*      ? "border-blue-600 text-blue-600 hover:bg-blue-50" */}
                {/*      : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
                {/*  )}*/}
                {/*>*/}
                {/*  <Edit className="w-4 h-4 mr-2" />*/}
                {/*  선택 수정*/}
                {/*</Button>*/}
                {/*)}*/}
                {role !== "USER" && role !== "MANAGER" && ( <Button 
                  onClick={() => openModal("create")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  신규 추가
                </Button>
                )}
              </div>
            </div>

            {/* ib sheet 사용 */}
            {/*<CommonSheet   url={*/}
            {/*                      role === "USER" */}
            {/*                        ? "/api/company/list"  // USER는 조건 없어도 통신 허용*/}
            {/*                        : hasSearchCondition(appliedParams) */}
            {/*                          ? "/api/company/list" // USER 외는 기존처럼 조건 필요*/}
            {/*                          : ""*/}
            {/*                    }*/}
            {/*             searchParams={{ ...appliedParams, _rt: refreshTrigger }}*/}
            {/*              usePaging={false}*/}
            {/*              pageLength={100}*/}
            {/*              editMode = {3}*/}
            {/*              emptyMessage="검색조건에 맞는 업체가 없습니다."*/}
            {/*              columns={columns}*/}
            {/*              handleRowClick={handleRowClick}*/}
            {/*              gridName = "companies"*/}
            {/*              refreshTrigger={refreshTrigger}*/}
            {/*              height= "600px"*/}
            {/*              extraOptions={{*/}
            {/*                            Events: {*/}
            {/*                              onDblClick: (evt : any) => {*/}
            {/*                                if (evt.row?.Kind === "Header" || evt.row?.Kind === "Space") return;*/}
            {/*                                handleRowClick(evt.row);*/}
            {/*                                setOpenByDblClick(true);*/}
            {/*                              }*/}
            {/*                            }                                                */}
            {/*                          }}                          */}
            {/*              />*/}
              <CommonSheetServerPaging
                  url={
                      role === "USER"
                          ? "/api/company/list"  // USER는 조건 없어도 통신 허용
                          : "/api/company/listPaged" // 페이징 처리
                  }
                  searchParams={{ ...appliedParams, _rt: refreshTrigger }}
                  refreshTrigger={refreshTrigger}       // 트리거 바뀌면 1페이지부터 재조회
                  gridName="companies"        // 기존 gridName 유지
                  columns={columns}
                  editMode={3}
                  usePaging={true}                      // 기본 true이긴 하지만 명시해둬도 OK
                  pageSize={200}                        // 필요 시 100/300/500 등 조정
                  handleRowClick={(row:any) => {        // 더블클릭 시 내부에서 이 핸들러 호출됨
                      handleRowClick(row);
                      setOpenByDblClick(true);
                  }}
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
          </CardContent>
        </Card>

        {/* company Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="bg-white rounded shadow p-6 w-[1200px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {modalMode === "create" ? "업체 신규 등록" : "업체 정보 수정"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Section 1: 기본 정보 입력 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 border-b pb-2">기본 정보 입력</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">상호</Label>
                    <Input
                        value={modalData.companyNm || ""}
                        onChange={(e) => setField("companyNm", e.target.value)}
                        placeholder="상호를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">사업자등록번호</Label>
                    <div className="flex gap-2">
                    <Input
                        placeholder="사업자등록번호를 입력하세요."
                        value={modalData.bizNo}
                        disabled={isBizNoDisabled}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const formatted = formatBizNo(raw);
                          setField("bizNo", formatted);
                          if(modalMode === 'create'){
                            setIsUserIdValid(false);
                          }
                        }}
                    />
                    {modalMode === "create" && (
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2"
                            onClick={() => {
                              handleBizNoDupCheck();
                            }}
                        >중복확인</Button>
                    )}

                    {/* 수정모드 → 값 없을 때만 버튼 노출 */}
                    {modalMode === "edit" && !isBizNoDisabled && (
                      <Button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2"
                        onClick={handleBizNoDupCheck}>중복확인</Button>
                    )}                    
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {/* 왼쪽: 이메일 / 지역 / 지역구 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">지역</Label>
                      <CommonCodeSelect
                        type="REGION_TYPE"
                        value={modalData.regionCd || ""}
                        onChange={(val) => {
                          setField("regionCd", val);
                          setField("regionDtlCd", ""); // 부모 바뀌면 자식 초기화
                        }}
                        placeholder="지역 선택"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">지역구분</Label>
                      <CommonCodeSelect
                        type="REGION_DTL_TYPE"
                        value={modalData.regionDtlCd || ""}
                        onChange={(val) => {
                          setField("regionDtlCd", val);
                        }}
                        placeholder="상세지역 선택"
                        parent={modalData.regionCd}
                        requireParent
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">대표자</Label>
                    <Input
                        value={modalData.representativeNm || ""}
                        onChange={(e) => setField("representativeNm", e.target.value)}
                        placeholder="대표자명을 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">주소</Label>
                    <Input
                        value={modalData.address || ""}
                        onChange={(e) => setField("address", e.target.value)}
                        placeholder="주소를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">업태</Label>
                    <Input
                        value={modalData.bizType || ""}
                        onChange={(e) => setField("bizType", e.target.value)}
                        placeholder="업태를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">전화번호</Label>
                    <Input
                        value={modalData.telNo || ""}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setField("telNo", formatted);
                        }}
                        placeholder="전화번호를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">업종</Label>
                    <Input
                        value={modalData.bizItem || ""}
                        onChange={(e) => setField("bizItem", e.target.value)}
                        placeholder="업종을 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">담당자명</Label>
                    <Input
                        value={modalData.managerNm || ""}
                        onChange={(e) => setField("managerNm", e.target.value)}
                        placeholder="담당자명을 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">담당자 휴대폰</Label>
                    <Input
                        value={modalData.managerTelNo || ""}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setField("managerTelNo", formatted);
                        }}
                        placeholder="담당자 휴대폰 번호를 입력하세요."
                    />
                  </div>                  

                </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">팩스번호</Label>
                      <Input
                          value={modalData.faxNo || ""}
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value);
                            setField("faxNo", formatted);
                          }}
                          placeholder="팩스번호를 입력하세요."
                      />
                    </div>
                    {/* 오른쪽: 메모 (3행 높이 차지) */}
                    <div className="space-y-2 row-span-3">
                      <Label className="text-sm font-medium">업체 메모</Label>
                      <Textarea
                          value={modalData.rmk || ""}
                          onChange={(e) => setField("rmk", e.target.value)}
                          placeholder="메모를 입력하세요."
                          rows={5} // row-span-3과 비슷하게 맞춰짐
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">이메일</Label>
                      <Input
                          value={modalData.email || ""}
                          onChange={(e) => setField("email", e.target.value)}
                          onBlur={(e)=> {
                            const raw = e.target.value;
                            const formated = formatEmail(raw);
                            setField("email", formated);
                          }}
                          placeholder="이메일을 입력하세요."
                      />
                    </div>
                  </div>
                  {
                    role != 'USER' && role != 'MANAGER' && (
                      <div className="space-y-2 col-span-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                              id="shipperYn"
                              checked={modalData.shipperYn === "Y"}
                              onCheckedChange={(checked) =>
                                  setModalData((prev) => ({
                                    ...prev,
                                    shipperYn: checked ? "Y" : "N"
                                  }))
                              }
                              disabled={role === "USER"}
                          />
                          <Label htmlFor="shipperYn" className="text-sm font-medium">
                            화주업체 여부
                          </Label>
                        </div>
                      </div>
                    )
                  }
              </div>

              {/* Section 3: 화주업체 관련 정보 (shipperYn === "Y"일 때만 노출) */}
              {role != 'USER' && role != 'MANAGER' && modalData.shipperYn === "Y" && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">화주업체 관련 정보</h4>
                  
                  {/* Subsection 1: 화주업체 정보 */}
                  <div className="bg-yellow-50 p-4 rounded mb-4">
                    <h5 className="font-medium text-gray-800 mb-3">화주업체 정보</h5>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      {/* 사용유무 라디오 */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">사용유무</Label>
                        <RadioGroup value={modalData.useYn} 
                          onValueChange={(val) => setField("useYn", val)} 
                          className="flex gap-x-6 items-center"
                          disabled={role==="USER"}
                          >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="Y" id="useY" />
                            <Label htmlFor="useY">정상</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="N" id="useN" />
                            <Label htmlFor="useN">일시중지</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* 구분 선택 셀렉트 */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">화주 구분</Label>
                        <CommonCodeSelect
                          type="SHIPPER_TYPE"
                          value={modalData.shipperCd || ""}
                          onChange={(val) => {
                            setField("shipperCd", val);
                          }}
                          placeholder="화주구분 선택"
                          disabled={role==="USER"}
                        />
                      </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">배송코스</Label>
                          <CommonCodeSelect
                            type=""
                            value={modalData.deliveryRouteId ? String(modalData.deliveryRouteId) : ""}
                            onChange={(val, label) => {
                              setField("deliveryRouteId", parseInt(val));
                              setField("deliveryRouteLabel", label!);

                              if(label === '미사용'){
                                setField("deliveryRouteCd", "");
                              }
                            }}
                            placeholder="배송코스 선택"
                            url="/api/delivery-route/code/list"
                            disabled={role==="USER"}
                          />
                        </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">구분</Label>
                        <CommonCodeSelect
                          type="ROUTE_TIME"
                          value={modalData.deliveryRouteCd || ""}
                          onChange={(val) => {
                            setField("deliveryRouteCd", val);
                          }}
                          placeholder="시간 선택"
                          disabled={role==="USER" || modalData.deliveryRouteLabel === '미사용'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subsection 2: 정산 관련 정보 */}
                  <div className="bg-yellow-50 p-4 rounded mb-4">
                    <h5 className="font-medium text-gray-800 mb-3">정산 관련 정보</h5>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">청구 기준일</Label>
                          <RadioGroup
                            value={modalData.billStdrCd?.toString() || "20"}
                            onValueChange={(val) => setField("billStdrCd", parseInt(val))}
                            className="flex space-x-4"
                            disabled={role==="USER"}
                          >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="20" id="day-20" />
                            <Label htmlFor="day-20">20일</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="30" id="day-30" />
                            <Label htmlFor="day-30">30일</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">세금계산서 출력</Label>
                          <RadioGroup
                            value={modalData.taxbilOutputYn || "Y"}
                            onValueChange={(val) => setField("taxbilOutputYn", val)}
                            className="flex space-x-4"
                            disabled={role==="USER"}
                          >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Y" id="tax-yes" />
                            <Label htmlFor="tax-yes">예</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="N" id="tax-no" />
                            <Label htmlFor="tax-no">아니오</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">VAT 발행</Label>
                          <RadioGroup
                            value={modalData.vatYn || "Y"}
                            onValueChange={(val) => setField("vatYn", val)}
                            className="flex space-x-4"
                            disabled={role==="USER"}
                          >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Y" id="vatYn-yes" />
                            <Label htmlFor="vatYn-yes">예</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="N" id="vatYn-no" />
                            <Label htmlFor="vatYn-no">아니오</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">요금청구</Label>
                          <RadioGroup
                            value={modalData.billCharCd}
                            onValueChange={(val) => setField("billCharCd", val)}
                            className="flex space-x-4"
                            disabled={role==="USER"}
                          >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="credit" id="billCharCd-yes" />
                            <Label htmlFor="billCharCd-yes">신용</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="billCharCd-no" />
                            <Label htmlFor="billCharCd-no">일반</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">공급자 및 입급통장</Label>
                        <CommonCodeSelect
                          type=""
                          value={modalData.billCompanyId && modalData.billCompanyId > 0 
                                  ? String(modalData.billCompanyId) 
                                  : undefined}
                          onChange={(val) =>{
                            setModalData((prev) => ({
                              ...prev,
                              billCompanyId: Number(val),
                            }))
                          }
                          }
                          placeholder="공급자/계좌 선택"
                          url="/api/bill-company/code/detail/list"
                          disabled={role==="USER"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">정산그룹업체</Label>
                        <div className="flex gap-2">
                          <CompanyAutoComplete
                              value={modalData.excclcCompanyNm || ""}
                              onSelect={(company) => {
                                setModalData((prev) => ({
                                  ...prev,
                                  excclcCompanyId: company.companyId,
                                  excclcCompanyNm: company.companyNm,
                                }));
                              }}
                              className="flex-1"
                              placeholder="업체명을 입력하세요"
                              minChars={1}  // 1자부터 검색 시작 (원하면 2~3자로 조정)
                              disabled={role === "USER"}
                          />
                        </div>
                        <span className="text-xs text-gray-500 ml-[10px]">
                          ※ 정산그룹업체는 기등록된 업체만 선택 가능합니다. 
                          자동완성 목록에 없는 값을 입력한 경우 <br/>
                          <span className="pl-4">
                            미입력으로 간주하여 수정중인 업체로 등록이 됩니다.
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subsection 3: 배송 기본 정보 */}
                  <div className="bg-yellow-50 p-4 rounded mb-4">
                    <h5 className="font-medium text-gray-800 mb-3">배송 기본 정보</h5>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-4 text-sm">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">통신료</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={modalData.communicationFee.toString()}
                            onChange={handleNumberChange("communicationFee")}
                            onFocus={(e) => {
                              // 포커스 들어오면 자동으로 전체 선택 → 0을 바로 덮어쓸 수 있음
                              e.currentTarget.select();
                            }}
                            className="flex-1"
                            disabled={role === "USER"}
                          />
                          <span className="text-sm text-gray-600">원</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">택배단가</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={modalData.untpc.toString()}
                            onChange={handleNumberChange("untpc")}
                            onFocus={(e) => {
                              // 포커스 들어오면 자동으로 전체 선택 → 0을 바로 덮어쓸 수 있음
                              e.currentTarget.select();
                            }}
                            className="flex-1"
                            disabled={role === "USER"}
                          />
                          <span className="text-sm text-gray-600">원</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">무게단가</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={modalData.weightUntpc.toString()}
                            onChange={handleNumberChange("weightUntpc")}
                            onFocus={(e) => {
                              // 포커스 들어오면 자동으로 전체 선택 → 0을 바로 덮어쓸 수 있음
                              e.currentTarget.select();
                            }}
                            className="flex-1"
                            disabled={role === "USER"}
                          />
                          <span className="text-sm text-gray-600">Kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 mt-6">
              {modalMode === 'edit' && (role !== "USER" && role !== "MANAGER") && (
                <Button
                    type="button"
                    onClick={handleModalDelete}
                    className="bg-red-600 hover:bg-red-700"
                >
                  삭제
                </Button> 
              )}

              <Button variant="outline" onClick={handleModalCancel}>
                취소
              </Button>             
              <Button
                  type="button"
                  onClick={handleModalSave}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={
                    // 생성 모드 → 반드시 중복확인 성공해야 등록 가능
                    (modalMode === "create" && (!isUserIdValid || (modalData.bizNo ?? "").trim() === "")) ||

                    // 수정 모드 → 
                    (modalMode === "create" && createCompanyMutation.isPending) ||
                    (modalMode === "edit" && updateCompanyMutation.isPending)
                  }
              >
                {modalMode === "create"
                    ? (createCompanyMutation.isPending ? "생성 중..." : "등록")
                    : (updateCompanyMutation.isPending ? "수정 중..." : "수정")}
              </Button>
            </div>
          </DialogContent>
          <Dialog open={companySearchModalOpen} onOpenChange={setCompanySearchModalOpen}>
            <DialogContent className="max-w-xl bg-white rounded shadow p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">정산그룹업체 검색</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="업체명을 입력하세요"
                  value={modalSearchParams.companyNm}
                  onChange={(e) =>
                    setModalSearchParams((prev) => ({ ...prev, companyNm: e.target.value }))
                  }
                  className="flex-1"
                />
              <Button onClick={handleModalSearch} className="bg-blue-600 hover:bg-blue-700">
                <Search className="w-4 h-4 mr-2" />
                검색
              </Button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-center">업체코드</TableHead>
                      <TableHead className="text-center">업체명</TableHead>
                      <TableHead className="text-center">전화번호</TableHead>
                      <TableHead className="text-center">주소</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          검색 결과가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      companyList.map((company) => (
                          <TableRow
                            key={company.companyId}
                            onClick={() => setSelectedCompanyInSearch(company)}
                            className={cn(
                              "cursor-pointer hover:bg-gray-100",
                              selectedCompanyInSearch?.companyId === company.companyId && "bg-blue-100"
                            )}
                          >
                          <TableCell className="text-center">{company.companyId}</TableCell>
                          <TableCell className="text-center">{company.companyNm}</TableCell>
                          <TableCell className="text-center">{company.telNo}</TableCell>
                          <TableCell className="text-center">{company.address}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>                  
                </Table>
              </div>

              <div className="flex justify-end gap-x-2 mt-6">
                <Button variant="outline" onClick={() => setCompanySearchModalOpen(false)}>취소</Button>
                <Button
                  onClick={() => {
                    if (selectedCompanyInSearch) {
                      setModalData((prev) => ({
                        ...prev,
                        excclcCompanyId: selectedCompanyInSearch.companyId,
                        excclcCompanyNm: selectedCompanyInSearch.companyNm, // optional, 표시용
                      }));
                      setCompanySearchModalOpen(false);
                    }
                  }}
                  disabled={!selectedCompanyInSearch}
                  className={cn(
                    "text-white",
                    !selectedCompanyInSearch ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  선택
                </Button>
              </div>
            </DialogContent>
          </Dialog>          
        </Dialog>
      </div>
    </Layout>
  );
}
