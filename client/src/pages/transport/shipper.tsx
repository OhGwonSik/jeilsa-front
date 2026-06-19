import {useMemo, useState} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Textarea} from "@/components/ui/textarea";
import {Checkbox} from "@/components/ui/checkbox";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {ChevronLeft, ChevronRight, Edit, Plus, RotateCcw, Search, Trash2} from "lucide-react";
import {cn} from "@/lib/utils";
import CommonSheet from "@/pages/ibsheet.tsx";
import {useToast} from "@/hooks/use-toast.ts";
import {useMutation} from "@tanstack/react-query";
import {Company, InsertCompany, InsertMember} from "@shared/schema.ts";
import {apiRequest, queryClient} from "@/lib/queryClient.ts";

interface CompanyData {
  companyId: number;
  bizNo?: string;
  companyNm: string;
  representativeNm: string;
  bizType?: string;
  bizItem?: string;
  address: string;
  telNo: string;
  faxNo: string;
  email?: string;
  memo?: string;
  shipperYn: boolean;
  shipperId : number;
  deliveryRegionId: string;
  deliveryRegionDtlId: number; // 배송 지역 상세 id
  useYn: boolean;
  vatYn: string;
  billStdrCode: string;
  taxbilOutputYn: string;
  unit: string;
  bassUntpc: string;
  deliveryUntpc: number; // 택배 단가
  billCompanyId: string;
  excclcCompanyId: string;
  registDt: Date;
  courier: string;
}

interface ContactData {
  companyManagerId: number;
  companyId: number;
  managerNm: string;
  managerTelNo: string;
}

interface ModalData {
  bizNo : string;
  companyNm: string;
  representativeNm: string;
  bizType : string;
  bizItem : string;
  address: string;
  telNo: string;
  faxNo: string;
  email?: string;
  memo?: string;
  shipperYn?: string; // 화주 여부
  shipperId : number;
  deliveryRegionId: number; // 배송 지역 id
  deliveryRegionDtlId: number; // 배송 지역 상세 id
  useYn: string; // 사용여부
  vatYn: string; // vat 여부
  billStdrCode: number; // 청구 기준일 (20,30일)
  taxbilOutputYn: string; // 세금계산서 출력 여부
  unit: number; // 단위
  bassUntpc: number; // 기본 단가
  deliveryUntpc: number; // 택배 단가
  billCompanyId: number; // 청구 회사 id
  excclcCompanyId : number; // 정산회사
};

export default function Shipper() {
  const [regionFilter, setRegionFilter] = useState("all");
  const [billCompanyIdFilter, setbillCompanyIdFilter] = useState("all");
  const [companyNameFilter, setCompanyNameFilter] = useState("");
  const [telNoFilter, setPhoneFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  type ModalMode = "create" | "edit" | null;
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const modalOpen = modalMode !== null;

  // Modal form state
  // const [formData, setFormData] = useState<Partial<CompanyData>>({});
  const [shipperYn, setShipperYn] = useState("N");
  const [contacts, setContacts] = useState<ContactData[]>([]);

  const [modalData, setModalData] = useState<ModalData>({
    address: "",
    bassUntpc: 0,
    billCompanyId: 0,
    billStdrCode: 0,
    bizItem: "",
    bizNo: "",
    bizType: "",
    companyNm: "",
    deliveryRegionDtlId: 0,
    deliveryRegionId: 0,
    deliveryUntpc: 0,
    email: "",
    excclcCompanyId: 0,
    faxNo: "",
    memo: "",
    representativeNm: "",
    shipperId: 0,
    shipperYn: "",
    taxbilOutputYn: "",
    telNo: "",
    unit: 0,
    useYn: "",
    vatYn: ""
  });

  const { toast } = useToast();

  // todo 벡엔드 연결후에 데이터 확인
  // const { data: companies = [], isLoading } = useQuery<User[]>({
  //   queryKey: ["/api/companies"],
  //   queryFn: async () => {
  //     const res = await fetch("/api/companies");
  //     if (!res.ok) throw new Error("Network response was not ok");
  //     return res.json();
  //   },
  // });

  // ib sheet에 사용할 컬럼
  const columns = [
    { Header: "소속",      Name: "deliveryRegionId",     Align: "Center", Width: 140 },
    { Header: "공급자",    Name: "billCompanyId",        Align: "Center", Width: 200 },
    { Header: "사업자명",  Name: "companyNm",    Align: "Center", Width: 220 },
    { Header: "정산그룹",  Name: "excclcCompanyId", Align: "Center", Width: 120 },
    { Header: "사용여부",  Name: "useYn",        Align: "Center", Width: 100 },
    { Header: "VAT",       Name: "vatYn",             Align: "Center", Width: 80  },
    { Header: "출력여부",      Name: "taxbilOutputYn",          Align: "Center", Width: 80  },
    { Header: "청구일",    Name: "billStdrCode",      Align: "Center", Width: 100 },
    { Header: "단위",      Name: "unit",       Align: "Center", Width: 100 },
    { Header: "기본",      Name: "bassUntpc",         Align: "Center", Width: 140 },
    { Header: "택배",      Name: "deliveryUntpc",           Align: "Center", Width: 140 },
    { Header: "대표자",    Name: "representativeNm",  Align: "Center", Width: 140 },
    { Header: "전화번호",  Name: "telNo",           Align: "Center", Width: 160 },
    { Header: "주소",      Name: "address",         Align: "Center", Width: 300 },
    { Header: "등록일",    Name: "registDt",Align: "Center", Width: 160 },
  ];

// 해당 페이지에서 조회한 데이터 연결
  const data = [
    {
      companyId: 1,
      deliveryRegionId: "대구",
      billCompanyId: "(주)제일사",
      companyNm: "대구물류센터",
      excclcCompanyId: "일반정산",
      useYn: true,
      vatYn: "별도",
      taxbilOutputYn: "일반",
      billStdrCode: "매월 25일",
      unit: "표준단가",
      courier: "제일택배",
      bassUntpc: "기본형",
      representativeNm: "김대표",
      telNo: "053-123-4567",
      address: "대구시 북구 칠성동 123-45",
      registDt: new Date(2024, 0, 15),
      shipperYn: true
    },
    {
      companyId: 2,
      deliveryRegionId: "서울",
      billCompanyId: "제일사(주) 서울지사",
      companyNm: "서울화주물류",
      excclcCompanyId: "특별정산",
      useYn: true,
      vatYn: "포함",
      taxbilOutputYn: "간소",
      billStdrCode: "매월 말일",
      unit: "협의단가",
      courier: "제일택배",
      bassUntpc: "고급형",
      representativeNm: "박대표",
      telNo: "02-234-5678",
      address: "서울시 강남구 역삼동 678-90",
      registDt: new Date(2024, 1, 20),
      shipperYn: true
    },
    {
      companyId: 3,
      deliveryRegionId: "경기",
      billCompanyId: "(주)제일사_",
      companyNm: "경기화주협회",
      excclcCompanyId: "일반정산",
      useYn: false,
      vatYn: "별도",
      taxbilOutputYn: "일반",
      billStdrCode: "매월 15일",
      unit: "표준단가",
      courier: "제일택배",
      bassUntpc: "기본형",
      representativeNm: "이대표",
      telNo: "031-345-6789",
      address: "경기도 수원시 영통구 매탄동 234-56",
      registDt: new Date(2024, 2, 10),
      shipperYn: true
    },
    {
      companyId: 4,
      deliveryRegionId: "부산",
      billCompanyId: "제일사",
      companyNm: "부산항물류",
      excclcCompanyId: "특별정산",
      useYn: true,
      vatYn: "포함",
      taxbilOutputYn: "상세",
      billStdrCode: "매월 20일",
      unit: "협의단가",
      courier: "제일택배",
      bassUntpc: "프리미엄",
      representativeNm: "최대표",
      telNo: "051-456-7890",
      address: "부산시 해운대구 우동 345-67",
      registDt: new Date(2024, 3, 5),
      shipperYn: true
    }
  ];

  // 조회 조건 추가 (권한, 이름, 전화번호)
  const filteredData = useMemo(() => {
    return data.filter(item => {
      return item
    })
        .map(item => ({
          // 구분값 cell 색상 추가
          ...item,
        }));
  }, [data, null]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // 현재 페이지에 맞는 데이터 슬라이싱
  const paginatedData = filteredData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = (currentPage, totalPages, goToPage) => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
        <div className="flex justify-end items-center gap-x-2 mt-4">
          <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {pages.map(page => (
              <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className={cn(
                      "px-3 py-1",
                      currentPage === page ? "bg-blue-500 text-white" : "bg-white border hover:bg-gray-100"
                  )}
              >
                {page}
              </Button>
          ))}

          <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
    );
  };

  const resetFilters = () => {
    setRegionFilter("all");
    setbillCompanyIdFilter("all");
    setCompanyNameFilter("");
    setPhoneFilter("");
  };

  const handleSearch = () => {
    // 조회 조건 추가
    setCurrentPage(1);        // 페이지 초기화
  };

  function setField<K extends keyof ModalData>(key: K, value: ModalData[K]) {
    setModalData((prev) => ({ ...prev, [key]: value }));
  }

  function openModal(mode: Exclude<ModalMode, null>, company?: Company) {
    if (mode === "edit" && company) {
      setSelectedCompany(company);
      setModalData({
        address: company.address,
        bassUntpc: company.bassUntpc,
        billCompanyId: company.billCompanyId,
        billStdrCode: company.billStdrCode,
        bizItem: company.bizItem,
        bizNo: company.bizNo,
        bizType: company.bizType,
        companyNm: company.companyNm,
        deliveryRegionDtlId: company.deliveryRegionDtlId,
        deliveryRegionId: company.deliveryRegionId,
        deliveryUntpc: company.deliveryUntpc,
        email: company.email,
        excclcCompanyId: company.excclcCompanyId,
        faxNo: company.faxNo,
        memo: company.memo,
        representativeNm: company.representativeNm,
        shipperId: company.shipperId,
        shipperYn: company.shipperYn,
        taxbilOutputYn: company.taxbilOutputYn,
        telNo: company.telNo,
        unit: company.unit,
        useYn: company.useYn,
        vatYn: company.vatYn,
      });
      setShipperYn(company.shipperYn|| "N")
    } else {
      setSelectedCompany(null);
      setModalData({
        address: "",
        bassUntpc: 0,
        billCompanyId: 0,
        billStdrCode: 0,
        bizItem: "",
        bizNo: "",
        bizType: "",
        companyNm: "",
        deliveryRegionDtlId: 0,
        deliveryRegionId: 0,
        deliveryUntpc: 0,
        email: "",
        excclcCompanyId: 0,
        faxNo: "",
        memo: "",
        representativeNm: "",
        shipperId: 0,
        shipperYn: "",
        taxbilOutputYn: "",
        telNo: "",
        unit: 0,
        useYn: "",
        vatYn: ""
      });
      setShipperYn(null)
    }
    setModalMode(mode);
  };

  function closeModal() {
    setModalMode(null);
  }

  const createUserMutation = useMutation({
    mutationFn: async (companyData: InsertMember) => {
      const response = await apiRequest("POST", "/api/companies", companyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      closeModal();
      toast({
        title: "성공",
        description: "화주업체가 성공적으로 생성되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "화주업체 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (companyData: InsertMember & { id: number }) => {
      // 실제 API 스펙에 맞게 수정
      const { id, ...payload } = companyData;
      const response = await apiRequest("PUT", `/api/companies/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      closeModal();
      toast({
        title: "성공",
        description: "화주업체 정보가 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "화주업체 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // row 선택
  const handleRowClick = (company: CompanyData) => {
    setSelectedCompany(selectedCompany?.companyId === company.companyId ? null : company);
  };

  // 모달 취소
  function handleModalCancel() {
    closeModal();
  }

  // 모달 저장
  const handleModalSave = () => {
    // 간단 검증 ( validation 체크용, 아래 토스트 사용 )
    // if (modalData.password !== modalData.passwordConfirm) {
    //   toast({
    //     title: "오류",
    //     description: "비밀번호와 확인 값이 다릅니다.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    const basePayload = {
      bizNo: modalData.bizNo,
      companyNm: modalData.companyNm,
      representativeNm: modalData.representativeNm,
      bizType: modalData.bizType,
      bizItem: modalData.bizItem,
      address: modalData.address,
      telNo: modalData.telNo,
      faxNo: modalData.faxNo,
      email: modalData.email,
      memo: modalData.memo,
    } as unknown as InsertCompany; // 타입 맞추기 (필요 시 조정)

    if (modalMode === "create") {
      createUserMutation.mutate(basePayload);
      return;
    }
    if (modalMode === "edit" && selectedCompany) {
      updateUserMutation.mutate({ ...basePayload, id: selectedCompany.companyId });
      return;
    }
  };

  // 담당자 목록 추가 버튼
  const addContact = () => {
    const newContact: ContactData = {
      companyId: 0, companyManagerId: 0, managerNm: "", managerTelNo: ""
    };
    setContacts(prev => [...prev, newContact]);
  };

  // 담당자 목록 삭제 버튼
  const removeContact = (id: number) => {
    setContacts(prev => prev.filter(contact => contact.companyManagerId !== id));
  };

  const updateContact = (id: number, field: keyof ContactData, value: string) => {
    setContacts(prev => prev.map(contact =>
        contact.companyManagerId === id ? { ...contact, [field]: value } : contact
    ));
  };

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 min-h-screen p-6">
        {/* Search Conditions */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">화주업체 검색 조건</h3>
            <div className="flex items-center gap-x-6">
              {/* Region Filter */}
              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">지역</Label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="대구">대구</SelectItem>
                    <SelectItem value="서울">서울</SelectItem>
                    <SelectItem value="경기">경기</SelectItem>
                    <SelectItem value="부산">부산</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Filter */}
              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">공급자</Label>
                <Select value={billCompanyIdFilter} onValueChange={setbillCompanyIdFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="(주)제일사">(주)제일사</SelectItem>
                    <SelectItem value="제일사">제일사</SelectItem>
                    <SelectItem value="제일사(주) 서울지사">제일사(주) 서울지사</SelectItem>
                    <SelectItem value="(주)제일사_">(주)제일사_</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Company Name */}
              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">업체명</Label>
                <Input
                    placeholder="업체명을 입력하세요"
                    value={companyNameFilter}
                    onChange={(e) => setCompanyNameFilter(e.target.value)}
                    className="w-40"
                />
              </div>

              {/* Phone */}
              <div className="flex items-center gap-x-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">전화번호</Label>
                <Input
                    placeholder="전화번호를 입력하세요"
                    value={telNoFilter}
                    onChange={(e) => setPhoneFilter(e.target.value)}
                    className="w-40"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-x-2 ml-auto">
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

        {/* Company List */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">화주업체관리</h3>
              <div className="flex gap-x-2">
                <Button
                    variant="outline"
                    onClick={() => selectedCompany && openModal("edit", selectedCompany)}
                    disabled={!selectedCompany}
                    className={cn(
                        "transition-colors",
                        selectedCompany
                            ? "border-blue-600 text-blue-600 hover:bg-blue-50"
                            : "text-gray-400 border-gray-300 cursor-not-allowed"
                    )}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  선택 수정
                </Button>
                <Button
                    onClick={() => openModal("create")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  신규 추가
                </Button>
              </div>
            </div>

            {/* Table with comprehensive columns */}
            {/* 데이터 영역 */}
            <div className="p-4">
              {paginatedData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center border rounded text-gray-500">
                    등록된 화주 업체가 없습니다.
                  </div>
              ) : (
                  <>
                    {/* ib sheet 사용 */}
                    <CommonSheet pageNum={currentPage} columns={columns} data={paginatedData} handleRowClick={handleRowClick} />
                    {/* Pagination */}
                    {renderPagination(currentPage, totalPages, goToPage)}
                  </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="bg-white rounded shadow p-6 w-[1800px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
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
                    <Label className="text-sm font-medium">사업자등록번호</Label>
                    <div className="flex gap-2">
                      <Input
                          value={modalData.bizNo || ""}
                          onChange={(e) => setField("bizNo", e.target.value)}
                          placeholder="사업자등록번호를 입력하세요."
                          className="flex-1"
                      />
                      <Button variant="outline" size="sm" className="whitespace-nowrap">중복확인</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">상호</Label>
                    <Input
                        value={modalData.companyNm || ""}
                        onChange={(e) => setField("companyNm", e.target.value)}
                        placeholder="상호를 입력하세요."
                    />
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
                    <Label className="text-sm font-medium">업태</Label>
                    <Input
                        value={modalData.bizItem || ""}
                        onChange={(e) => setField("bizType", e.target.value)}
                        placeholder="업태를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">업종</Label>
                    <Input
                        value={modalData.bizType || ""}
                        onChange={(e) => setField("bizItem", e.target.value)}
                        placeholder="업종을 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">소재지</Label>
                    <Input
                        value={modalData.address || ""}
                        onChange={(e) => setField("address", e.target.value)}
                        placeholder="소재지를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">전화</Label>
                    <Input
                        value={modalData.telNo || ""}
                        onChange={(e) => setField("telNo", e.target.value)}
                        placeholder="전화번호를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">팩스</Label>
                    <Input
                        value={modalData.faxNo || ""}
                        onChange={(e) => setField("faxNo", e.target.value)}
                        placeholder="팩스번호를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">이메일</Label>
                    <Input
                        value={modalData.email || ""}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="이메일을 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">업체 메모</Label>
                    <Textarea
                        value={modalData.memo || ""}
                        onChange={(e) => setField("memo", e.target.value)}
                        placeholder="메모를 입력하세요."
                        rows={2}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                          id="shipperYn"
                          checked={shipperYn === "Y"}
                          onCheckedChange={(checked) => setShipperYn(checked ? "Y" : "N")}
                      />
                      <Label htmlFor="shipperYn" className="text-sm font-medium">화주업체 여부</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: 업체 담당자 목록 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="text-md font-medium text-gray-900">담당자 목록</h4>
                  <Button
                      type="button"
                      onClick={addContact}
                      className="bg-gray-200 px-2 py-1 text-sm rounded hover:bg-gray-300 text-gray-800"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </div>
                <div className="space-y-4">
                  <Table className="w-full text-sm border mt-4">
                    <TableHeader>
                      <TableRow>
                        {/*<TableHead className="border">최근사용일</TableHead>*/}
                        <TableHead className="border">담당자</TableHead>
                        <TableHead className="border">전화번호</TableHead>
                        <TableHead className="border">삭제</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="border text-center py-4 text-gray-500">
                              등록된 담당자가 없습니다.
                            </TableCell>
                          </TableRow>
                      ) : (
                          contacts.map((contact) => (
                              <TableRow key={contact.companyManagerId}>
                                {/*TODO 인터뷰후 수정 */}
                                {/*<TableCell className="border">*/}
                                {/*<Input */}
                                {/*  type="date"*/}
                                {/*  value={contact.lastUsed}*/}
                                {/*  onChange={(e) => updateContact(contact.id, 'lastUsed', e.target.value)}*/}
                                {/*  className="text-sm"*/}
                                {/*/>*/}
                                {/*</TableCell>*/}
                                <TableCell className="border">
                                  <Input
                                      placeholder="담당자명"
                                      value={contact.managerNm}
                                      onChange={(e) => updateContact(contact.companyManagerId, 'managerNm', e.target.value)}
                                      className="text-sm"
                                  />
                                </TableCell>
                                <TableCell className="border">
                                  <Input
                                      placeholder="전화번호"
                                      value={contact.managerTelNo}
                                      onChange={(e) => updateContact(contact.companyManagerId, 'managerTelNo', e.target.value)}
                                      className="text-sm"
                                  />
                                </TableCell>
                                <TableCell className="border text-center">
                                  <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeContact(contact.companyManagerId)}
                                      className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Section 3: 화주업체 관련 정보 (shipperYn === "Y"일 때만 노출) */}
              {shipperYn === "Y" && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">화주업체 관련 정보</h4>

                    {/* Subsection 1: 화주업체 정보 */}
                    <div className="bg-yellow-50 p-4 rounded mb-4">
                      <h5 className="font-medium text-gray-800 mb-3">화주업체 정보</h5>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">사용유무</Label>
                          <RadioGroup defaultValue="normal" className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="normal" id="normal" />
                              <Label htmlFor="normal">정상</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="suspended" id="suspended" />
                              <Label htmlFor="suspended">일시중지</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">VAT 발행</Label>
                          <RadioGroup defaultValue="yes" className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="vatYn-yes" />
                              <Label htmlFor="vatYn-yes">예</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="vatYn-no" />
                              <Label htmlFor="vatYn-no">아니오</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">소속지역</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="지역 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daegu">대구</SelectItem>
                              <SelectItem value="seoul">서울</SelectItem>
                              <SelectItem value="gyeonggi">경기</SelectItem>
                              <SelectItem value="busan">부산</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">소속지역 Sub</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="세부지역 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="north">북구</SelectItem>
                              <SelectItem value="south">남구</SelectItem>
                              <SelectItem value="east">동구</SelectItem>
                              <SelectItem value="west">서구</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">청구지주소</Label>
                          <Input placeholder="청구지주소를 입력하세요" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">담당자</Label>
                          <div className="flex gap-2">
                            <Input placeholder="담당자명을 입력하세요" className="flex-1" />
                            <Button variant="outline" size="sm">찾기</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">청구 기준일</Label>
                          <RadioGroup defaultValue="20" className="flex space-x-4">
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
                          <RadioGroup defaultValue="yes" className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="tax-yes" />
                              <Label htmlFor="tax-yes">예</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="tax-no" />
                              <Label htmlFor="tax-no">아니오</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">단가</Label>
                          <div className="flex items-center gap-2">
                            <Input placeholder="3500" className="flex-1" />
                            <span className="text-sm text-gray-600">Kg</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">기본금액</Label>
                          <div className="flex items-center gap-2">
                            <Input placeholder="2000" className="flex-1" />
                            <span className="text-sm text-gray-600">원</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">택배단가</Label>
                          <div className="flex items-center gap-2">
                            <Input placeholder="4000" className="flex-1" />
                            <span className="text-sm text-gray-600">원</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subsection 2: 정산 관련 정보 */}
                    <div className="bg-yellow-50 p-4 rounded mb-4">
                      <h5 className="font-medium text-gray-800 mb-3">정산 관련 정보</h5>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">관리지역</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="관리지역 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="region1">대구권</SelectItem>
                              <SelectItem value="region2">서울권</SelectItem>
                              <SelectItem value="region3">경기권</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">공급자</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="공급자 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="billCompanyId1">(주)제일사</SelectItem>
                              <SelectItem value="billCompanyId2">제일사</SelectItem>
                              <SelectItem value="billCompanyId3">제일사(주) 서울지사</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">입금통장</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="입금통장 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="account1">신한은행 123-456-789</SelectItem>
                              <SelectItem value="account2">우리은행 987-654-321</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">정산그룹업체</Label>
                          <div className="flex gap-2">
                            <Input placeholder="정산그룹업체명" className="flex-1" />
                            <Button variant="outline" size="sm">찾기</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">요금청구</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="요금청구 방식 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">월말정산</SelectItem>
                              <SelectItem value="daily">일일정산</SelectItem>
                              <SelectItem value="immediate">즉시정산</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Subsection 3: 배송 기본 정보 */}
                    <div className="bg-yellow-50 p-4 rounded mb-4">
                      <h5 className="font-medium text-gray-800 mb-3">배송 기본 정보</h5>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">배송지역</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="배송지역 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="delivery1">대구권</SelectItem>
                              <SelectItem value="delivery2">서울권</SelectItem>
                              <SelectItem value="delivery3">경기권</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">지역</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="지역 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local1">북구</SelectItem>
                              <SelectItem value="local2">남구</SelectItem>
                              <SelectItem value="local3">동구</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">화주코드</Label>
                          <div className="flex gap-2">
                            <Input placeholder="화주코드를 입력하세요" className="flex-1" />
                            <Button variant="outline" size="sm">중복확인</Button>
                            <Button variant="outline" size="sm">신규</Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subsection 4: 배송 정보 */}
                    <div className="bg-yellow-50 p-4 rounded mb-4">
                      <h5 className="font-medium text-gray-800 mb-3">배송 정보</h5>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">배송지역</Label>
                          <Input placeholder="배송지역을 입력하세요" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">담당자 전화</Label>
                          <Input placeholder="담당자 전화번호를 입력하세요" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">장소(Station)</Label>
                          <Input placeholder="장소를 입력하세요" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">주소</Label>
                          <Input placeholder="주소를 입력하세요" />
                        </div>
                      </div>
                    </div>

                    {/* Subsection 5: 회수 정보 */}
                    <div className="bg-yellow-50 p-4 rounded mb-4">
                      <h5 className="font-medium text-gray-800 mb-3">회수 정보</h5>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">회수지역</Label>
                          <Input placeholder="회수지역을 입력하세요" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">담당자 전화</Label>
                          <Input placeholder="담당자 전화번호를 입력하세요" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">장소(Station)</Label>
                          <Input placeholder="장소를 입력하세요" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">주소</Label>
                          <Input placeholder="주소를 입력하세요" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">회수구분</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="회수구분 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pickup1">정기회수</SelectItem>
                              <SelectItem value="pickup2">임시회수</SelectItem>
                              <SelectItem value="pickup3">긴급회수</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={handleModalCancel}>
                취소
              </Button>
              <Button onClick={handleModalSave} className="bg-blue-600 hover:bg-blue-700">
                {modalMode === "create" ? "등록" : "저장"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}