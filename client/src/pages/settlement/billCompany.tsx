import {useEffect, useState} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Edit, Plus, Trash2} from "lucide-react";
import {cn} from "@/lib/utils";
import {InsertCompany} from "@shared/schema.ts";
import {apiRequest} from "@/lib/queryClient.ts";
import CommonSheet from "@/pages/ibsheet.tsx";
import {useToast} from "@/hooks/use-toast.ts";
import {useCurrentUser} from "@/hooks/useCurrentUser.ts";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import {useModal} from "@/hooks/useModal.ts";
import {useApiMutation} from "@/hooks/useApiMutation.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import {validationToast} from "@/common/utils/validationToast.ts";
import {formatPhone, isValidPhone} from "@/common/utils/formatPhone.ts";
import {formatFax, isValidFax} from "@/common/utils/formatFax.ts";
import {formatEmail, isValidEmail} from "@/common/utils/formatEmail.ts";
import {formatAccountNumber, isValidAccountNumber} from "@/common/utils/formatAccountNumber.ts";
import {formatBizNo} from "@/common/utils/formatBizNo.ts";

interface BillCompanyData {
    billCompanyId: number;
    companyNm: string;
    representativeNm: string;
    bizNo: string;
    address: string;
    postNo: string;
    bizType: string;
    bizItem: string;
    telNo: string;
    faxNo: string;
    email: string;
    bankNm: string;
    depositorNm: string;
    accountNo: string;
    rmk?: string;
    bassUntpc: number;
    billStdrCode: string;
    deliveryRegionDtlId: number;
    deliveryRegionId: number;
    deliveryUntpc: number;
    excclcCompanyId: number;
    shipperId: number;
    shipperYn?: string;
    taxbilOutputYn: string;
    unit: number;
    useYn: string;
    vatYn: string;
}

interface ModalData {
    bizNo: string;
    companyNm: string;
    representativeNm: string;
    bizType: string;
    bizItem: string;
    address: string;
    telNo: string;
    faxNo: string;
    email: string;
    rmk?: string;
    shipperYn?: string; // 화주 여부
    shipperId: number;
    deliveryRegionId: number; // 배송 지역 id
    deliveryRegionDtlId: number; // 배송 지역 상세 id
    useYn: string; // 사용여부
    vatYn: string; // vat 여부
    billStdrCode: string; // 청구 기준일 (20,30일)
    taxbilOutputYn: string; // 세금계산서 출력 여부
    unit: number; // 단위
    bassUntpc: number; // 기본 단가
    deliveryUntpc: number; // 택배 단가
    billCompanyId: number; // 청구 회사 id
    excclcCompanyId: number; // 정산회사
    accountNo: string;
    bankNm: string;
    depositorNm: string;
    postNo: string;
};

export default function BillCompany() {
    const currentUser = useCurrentUser(); // 현 사용자
    const [selectedBillCompany, setSelectedBillCompany] = useState<BillCompanyData | null>(null);

    //더블클릭이벤트 동작 상태값
    const [openByDblClick, setOpenByDblClick] = useState(false);
    
    // 검색조건 ( 해당 페이지 미사용 )
    const {
        searchParams,
        setSearchParams,
        appliedParams,
        resetFilters,
        handleSearch,
        refreshTrigger,
        forceRefresh
    } = useSearchFilters({});

    // 모달 데이터 ( 모달 별로 필요한 데이터 기본값만 세팅 )
    const defaultData: ModalData = {
        bankNm: "",
        depositorNm: "",
        address: "",
        bassUntpc: 0,
        billCompanyId: 0,
        billStdrCode: "",
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
        rmk: "",
        representativeNm: "",
        shipperId: 0,
        shipperYn: "",
        taxbilOutputYn: "",
        telNo: "",
        unit: 0,
        useYn: "",
        vatYn: "",
        postNo: "",
        accountNo: ""
    };

    const {
        modalMode,
        modalOpen,
        modalData,
        setModalData,
        openModal,
        closeModal,
        handleModalCancel
    } = useModal<ModalData>(defaultData);

    const {toast} = useToast();

    // ib sheet에 사용할 컬럼
    const columns = [
        {Header: "상호", Name: "companyNm", Align: "Center", Width: 220},
        {Header: "대표자", Name: "representativeNm", Align: "Center", Width: 120},
        {Header: "사업자등록번호", Name: "bizNo", Align: "Center", Width: 150},
        {Header: "은행명", Name: "bankNm", Align: "Center", Width: 80},
        {Header: "은행예금주", Name: "depositorNm", Align: "Center", Width: 100},
        {Header: "계좌번호", Name: "accountNo", Align: "Center", Width: 150},
        {Header: "메모", Name: "rmk", Align: "Center", Width: 200},
    ];

    function setField<K extends keyof ModalData>(key: K, value: ModalData[K]) {
        setModalData((prev) => ({...prev, [key]: value}));
    }

    const createCompanyMutation = useApiMutation<InsertCompany>({
        method: "POST",
        url: "/api/bill-company/insert",
        invalidateQueryKey: "/api/bill-company/list",
        closeModal,
        successMessage: "공급자가 성공적으로 생성되었습니다.",
        errorMessage: "공급자 생성에 실패했습니다.",
        onExtraSuccess: () => forceRefresh(),
    });

    const updateCompanyMutation = useCustomMutation<InsertCompany & { id: number }>({
        mutationFn: async ({id, ...payload}) => {
            const response = await apiRequest("PUT", `/api/bill-company/update`, {
                ...payload,
                memberId: id,
            });
            return response.json();
        },
        queryKeyToInvalidate: "/api/bill-company/list",
        closeModal,
        onExtraSuccess: (updatedData) => {
            forceRefresh();
            setSelectedBillCompany(updatedData);
        },
        successMessage: "공급자 정보가 수정되었습니다.",
        errorMessage: "공급자 수정에 실패했습니다.",
    });

    const deleteCompanyMutation = useCustomMutation<{ id: number }>({
        mutationFn: async ({ id }) => {
            try {
                const res = await apiRequest("DELETE", `/api/bill-company/delete/${id}`);
                return res.json();
            } catch (e: any) {
                let msg = e?.message ?? "삭제 실패";
                try {
                    const j = JSON.parse(msg);
                    msg = j?.error?.details || j?.error?.message || msg;
                } catch {}
                toast({ title: msg, variant: "destructive" }); // ✅ 여기서 사용
                throw new Error(msg); // 훅/리액트쿼리에 전달
            }
        },
        queryKeyToInvalidate: "/api/bill-company/list",
        closeModal,
        onExtraSuccess: () => forceRefresh(),
        successMessage: "공급자가 성공적으로 삭제되었습니다.",
        // 기본 에러 토스트가 또 뜨면 중복이니 끄거나(지원 시) 메시지 생략
        errorMessage: undefined,
    });

// row 선택
    const handleRowClick = (company: BillCompanyData) => {
        setSelectedBillCompany(company);

        // 모달 데이터도 갱신
        setModalData({
            accountNo: company.accountNo,
            address: company.address,
            bankNm: company.bankNm,
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
            depositorNm: company.depositorNm,
            email: company.email,
            excclcCompanyId: company.excclcCompanyId,
            faxNo: company.faxNo,
            rmk: company.rmk,
            postNo: company.postNo,
            representativeNm: company.representativeNm,
            shipperId: company.shipperId,
            shipperYn: company.shipperYn,
            taxbilOutputYn: company.taxbilOutputYn,
            telNo: company.telNo,
            unit: company.unit,
            useYn: company.useYn,
            vatYn: company.vatYn,
        });
    };

    const handleModalDelete = () => {
        const basePayload = {
            chgId: currentUser
        } as unknown as InsertCompany;

        deleteCompanyMutation.mutate({...basePayload, id: selectedBillCompany.billCompanyId});
    };

    // 모달 저장
    const handleModalSave = () => {

        if (validationToast(String(modalData.companyNm).trim() === "", "상호")) return;
        if (validationToast(String(modalData.bizNo).trim() === "", "사업자등록번호")) return;
        if (validationToast(String(modalData.representativeNm).trim() === "", "대표자")) return;
        if (validationToast(String(modalData.address).trim() === "", "사업장 주소")) return;
        if (validationToast(String(modalData.postNo).trim() === "", "우편번호")) return;
        if (validationToast(String(modalData.telNo).trim() === "", "전화번호")) return;
        if (validationToast(!isValidPhone(modalData.telNo), "전화번호", true)) return;
        if (validationToast(String(modalData.email).trim() === "", "이메일")) return;
        if (validationToast(!isValidEmail(modalData.email), "이메일", true)) return;
        if (validationToast(String(modalData.bankNm).trim() === "", "은행명")) return;
        if (validationToast(String(modalData.depositorNm).trim() === "", "예금주")) return;
        if (validationToast(String(modalData.accountNo).trim() === "", "계좌번호")) return;
        if (validationToast(!isValidAccountNumber(modalData.accountNo), "계좌번호", true)) return;

        const basePayload = {
            billCompanyId : modalData.billCompanyId,
            bizNo: modalData.bizNo,
            companyNm: modalData.companyNm,
            representativeNm: modalData.representativeNm,
            bizType: modalData.bizType,
            bizItem: modalData.bizItem,
            address: modalData.address,
            telNo: modalData.telNo,
            faxNo: modalData.faxNo,
            email: modalData.email,
            rmk: modalData.rmk,
            bankNm: modalData.bankNm,
            depositorNm: modalData.depositorNm,
            accountNo: modalData.accountNo,
            postNo: modalData.postNo,
        } as unknown as InsertCompany; // 타입 맞추기 (필요 시 조정)

        if (modalMode === "create") {
            createCompanyMutation.mutate(basePayload);
            return;
        }
        if (modalMode === "edit" && selectedBillCompany) {
            updateCompanyMutation.mutate({...basePayload, id: selectedBillCompany.billCompanyId});
            return;
        }
    };

    useEffect(() => {
        if (openByDblClick && selectedBillCompany) {
        openModal("edit", selectedBillCompany);
        setOpenByDblClick(false);
        }
    }, [selectedBillCompany, openByDblClick]);    


    return (
        <Layout>
            <div className="space-y-6 korean-text bg-gray-50 p-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">공급자관리</h1>
                    <div className="flex space-x-3">
                        {/*<Button*/}
                        {/*    variant="outline"*/}
                        {/*    onClick={() => selectedBillCompany && openModal("edit", selectedBillCompany)}*/}
                        {/*    disabled={!selectedBillCompany}*/}
                        {/*    className={cn(*/}
                        {/*        "transition-colors",*/}
                        {/*        selectedBillCompany*/}
                        {/*            ? "border-blue-600 text-blue-600 hover:bg-blue-50"*/}
                        {/*            : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
                        {/*    )}*/}
                        {/*>*/}
                        {/*    <Edit className="w-4 h-4 mr-2"/>*/}
                        {/*    선택 수정*/}
                        {/*</Button>*/}
                        <Button
                            onClick={() => openModal("create")}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2"/>
                            신규 추가
                        </Button>
                    </div>
                </div>
                {/* 데이터 영역 */}
                {/* ib sheet 사용 */}
                <CommonSheet url="/api/bill-company/list"
                             searchParams={{ ...appliedParams, _rt: refreshTrigger }}
                             pageLength={17}
                             editMode={3}
                             usePaging={false}
                             columns={columns}
                             handleRowClick={handleRowClick}
                             refreshTrigger={refreshTrigger}
                             extraOptions={{
                                Events: {
                                    onDblClick: (evt : any) => {
                                        if (evt.row?.Kind === "Header"|| evt.row?.Kind === "Space") return;
                                            handleRowClick(evt.row);
                                            setOpenByDblClick(true);
                                    }
                                }                                                
                            }}                                
                             />

                {/* Modal */}
                <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
                    <DialogContent
                        className="bg-white rounded shadow p-6 w-[1200px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">
                                {modalMode === "create" ? "공급자 신규 등록" : "공급자 정보 수정"}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">상호</Label>
                                    <Input
                                        placeholder="상호를 입력하세요"
                                        value={modalData.companyNm || ""}
                                        onChange={(e) => setField("companyNm", e.target.value)}
                                        className="flex-1 text-sm rounded"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">사업자등록번호</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="사업자등록번호를 입력하세요."
                                            value={modalData.bizNo}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                const formatted = formatBizNo(raw);
                                                setField("bizNo", formatted);
                                            }}
                                            className="flex-1 text-sm rounded"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">대표자</Label>
                                    <Input
                                        placeholder="대표자명을 입력하세요"
                                        value={modalData.representativeNm}
                                        onChange={(e) => setField("representativeNm", e.target.value)}
                                        className="flex-1 text-sm rounded"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">사업장주소</Label>
                                    <Input
                                        placeholder="사업장 주소를 입력하세요"
                                        value={modalData.address}
                                        onChange={(e) => setField("address", e.target.value)}
                                        className="flex-1 text-sm rounded"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">우편번호</Label>
                                    <Input
                                        placeholder="00000"
                                        value={modalData.postNo}
                                        onChange={(e) => setField("postNo", e.target.value)}
                                        className="flex-1 text-sm rounded"
                                    />
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">업태</Label>
                                    <Input
                                        placeholder="업태를 입력하세요"
                                        value={modalData.bizType}
                                        onChange={(e) => setField("bizType", e.target.value)}
                                        className="flex-1 text-sm rounded"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">업종</Label>
                                    <Input
                                        placeholder="업종을 입력하세요"
                                        value={modalData.bizItem}
                                        onChange={(e) => setField("bizItem", e.target.value)}
                                        className="flex-1 text-sm rounded"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">전화번호</Label>
                                    <Input
                                        placeholder="전화번호를 입력하세요"
                                        value={modalData.telNo}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            const formatted = formatPhone(raw);
                                            setField("telNo", formatted);
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">팩스번호</Label>
                                    <Input
                                        placeholder="팩스번호를 입력하세요"
                                        value={modalData.faxNo}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            const formatted = formatFax(raw);
                                            setField("faxNo", formatted);
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 w-20">이메일</Label>
                                    <Input
                                        type="email"
                                        placeholder="이메일을 입력하세요"
                                        value={modalData.email}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            const formatted = formatEmail(raw);
                                            setField("email", formatted);
                                        }}
                                        className="text-sm rounded border px-3 py-1 w-full"
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Full Width - Banks Account */}
                        <div className="bg-yellow-50 p-4 rounded mb-4 flex flex-col gap-y-4">
                            {/* 1열: 은행명, 예금주 */}
                            <div className="flex gap-x-4">
                                <div className="w-1/2">
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">은행명</Label>
                                    <Input
                                        placeholder="은행명을 입력하세요"
                                        value={modalData.bankNm}
                                        onChange={(e) => setField("bankNm", e.target.value)}
                                        className="text-sm rounded border px-3 py-1 w-full"
                                    />
                                </div>
                                <div className="w-1/2">
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">예금주</Label>
                                    <Input
                                        placeholder="예금주를 입력하세요"
                                        value={modalData.depositorNm}
                                        onChange={(e) => setField("depositorNm", e.target.value)}
                                        className="text-sm rounded border px-3 py-1 w-full"
                                    />
                                </div>
                            </div>

                            {/* 2열: 계좌번호, 메모 */}
                            <div className="flex gap-x-4">
                                <div className="w-1/2">
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">계좌번호</Label>
                                    <Input
                                        placeholder="계좌번호를 입력하세요"
                                        value={modalData.accountNo}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            const formatted = formatAccountNumber(raw);
                                            setField("accountNo", formatted);
                                        }}
                                        className="text-sm rounded border px-3 py-1 w-full"
                                    />
                                </div>
                                <div className="w-1/2">
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">메모</Label>
                                    <Input
                                        placeholder="메모를 입력하세요"
                                        value={modalData.rmk}
                                        onChange={(e) => setField("rmk", e.target.value)}
                                        className="text-sm rounded border px-3 py-1 w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end gap-x-3 pt-4 border-t">
                            {modalMode === "edit" && (
                                <Button
                                    variant="destructive"
                                    onClick={handleModalDelete}
                                    className="mr-auto"
                                    disabled={deleteCompanyMutation.isPending || updateCompanyMutation.isPending}
                                >
                                    <Trash2 className="w-4 h-4 mr-2"/>
                                    {deleteCompanyMutation.isPending ? "삭제 중..." : "삭제"}
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                onClick={handleModalCancel}
                                disabled={
                                    createCompanyMutation.isPending ||
                                    updateCompanyMutation.isPending ||
                                    deleteCompanyMutation.isPending
                                }
                            >
                                취소
                            </Button>

                            <Button
                                onClick={handleModalSave}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={
                                    (modalMode === "create" && createCompanyMutation.isPending) ||
                                    (modalMode === "edit" && updateCompanyMutation.isPending) ||
                                    deleteCompanyMutation.isPending
                                }
                            >
                                {modalMode === "create"
                                    ? (createCompanyMutation.isPending ? "등록 중..." : "등록")
                                    : (updateCompanyMutation.isPending ? "수정 중..." : "수정")}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}