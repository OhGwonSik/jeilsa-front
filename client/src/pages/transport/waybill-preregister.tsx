import {useEffect, useState} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Edit, Plus, RotateCcw, Search, Trash2} from "lucide-react";
import {cn} from "@/lib/utils";
import {Company, InsertWaybill, Waybill} from "@shared/schema.ts";
import {apiRequest} from "@/lib/queryClient.ts";
import CommonSheet from "@/pages/ibsheet.tsx";
import CommonSheetServerPaging from "@/pages/ibsheetWithPaging";
import {useCurrentUser} from "@/hooks/useCurrentUser.ts";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import {useModal} from "@/hooks/useModal.ts";
import {useApiMutation} from "@/hooks/useApiMutation.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import {validationToast} from "@/common/utils/validationToast.ts";
import {formatWaybill, isValidWaybillNo} from "@/common/utils/waybillUtils.ts";
import CompanyAutoComplete from "@/components/common/CompanyAutoComplete.tsx";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {formatPhone} from "@/common/utils/formatPhone.ts";


interface ModalData {
    waybillId: number;
    receiverCompanyId: number;
    receiverCompanyNm: string;
    receiverTelNo: string;
    receiverManagerTelNo: string;
    receiverAddress: string;
    senderCompanyId: number;
    senderCompanyNm: string;
    senderTelNo: string;
    senderManagerTelNo: string;
    senderAddress: string;
    chargeCd: string;
    qty: number;
    startNo: string;
    endNo: string;
};

export default function WaybillPreregister() {
    const currentUser = useCurrentUser(); // 현 사용자
    const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null); // 선택한 데이터

    //더블클릭이벤트 동작 상태값
    const [openByDblClick, setOpenByDblClick] = useState(false);

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
        senderCompanyNm: "",
        receiverCompanyNm: "",
        searchNo: "",
    });

    // 모달 데이터 ( 모달 별로 필요한 데이터 기본값만 세팅 )
    const defaultData: ModalData = {
        waybillId: 0,
        receiverCompanyId: 0,
        receiverCompanyNm: "",
        receiverTelNo: "",
        receiverAddress: "",
        senderCompanyId: 0,
        senderCompanyNm: "",
        senderTelNo: "",
        senderAddress: "",
        chargeCd: "credit",
        qty: 0,
        startNo: "",
        endNo: "",
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

    // ib sheet에 사용할 컬럼
    const columns = [
        {Header: "번호", Name: "waybillId", Align: "Center", Width: 80}, //Visible: false 히든
        {Header: "발신처", Name: "senderCompanyNm", Align: "Center", Width: 120},
        {Header: "발신전화번호", Name: "senderTelNo", Align: "Center", Width: 150},
        {Header: "수신처", Name: "receiverCompanyNm", Align: "Center", Width: 120},
        {Header: "수신전화번호", Name: "receiverTelNo", Align: "Center", Width: 150},
        {Header: "수량", Name: "qty", Align: "Center", Width: 150},
        {Header: "시작번호", Name: "startNo", Align: "Center", Width: 150},
        {Header: "종료번호", Name: "endNo", Align: "Center", Width: 150}
    ];

    function setField<K extends keyof ModalData>(key: K, value: ModalData[K]) {
        setModalData((prev) => ({...prev, [key]: value}));
    }

    const createWayBillMutation = useApiMutation<InsertWaybill>({
        method: "POST",
        url: "/api/waybill/insert",
        invalidateQueryKey: "/api/waybill/list",
        closeModal,
        successMessage: "선등록 운송장이 성공적으로 생성되었습니다.",
        errorMessage: "선등록 운송장 생성에 실패했습니다.",
        onExtraSuccess: () => forceRefresh(),
    });

    const updateWayBillMutation = useApiMutation<InsertWaybill & { id: number }>({
        method: "PUT",
        url: "/api/waybill/update",
        invalidateQueryKey: "/api/waybill/list",
        closeModal,
        successMessage: "선등록 운송장 정보가 수정되었습니다.",
        errorMessage: "선등록 운송장 수정에 실패했습니다.",
        onExtraSuccess: () => {
            forceRefresh();
            setSelectedWaybill(null);
        },
    });

    const deleteWayBillMutation = useCustomMutation<{ id: number }>({
        mutationFn: async ({id, ...payload}) => {
            const response = await apiRequest("DELETE", `/api/waybill/delete/${id}`, payload);
            return response.json();
        },
        queryKeyToInvalidate: [
            ['/api/waybill/list'],                  // 기본
            ['/api/waybill/list', appliedParams],   // 화면이 실제로 쓰는 키
        ],
        closeModal,
        onExtraSuccess: () => forceRefresh(),
        successMessage: "선등록 운송장이 성공적으로 삭제되었습니다.",
        errorMessage: "선등록 운송장 삭제에 실패했습니다.",
    });

    // row 선택
    const handleRowClick = (wayBill: Waybill) => {
        setSelectedWaybill(wayBill);
        setModalData({
            waybillId: wayBill.waybillId,
            receiverCompanyId: wayBill.receiverCompanyId,
            receiverCompanyNm: wayBill.receiverCompanyNm || "",
            receiverTelNo: wayBill.receiverTelNo || "",
            receiverManagerTelNo: wayBill.receiverManagerTelNo || "",
            receiverAddress: wayBill.receiverAddress || "",
            senderCompanyId: wayBill.senderCompanyId,
            senderCompanyNm: wayBill.senderCompanyNm || "",
            senderTelNo: wayBill.senderTelNo || "",
            senderManagerTelNo: wayBill.senderManagerTelNo || "",
            senderAddress: wayBill.senderAddress || "",
            chargeCd: wayBill.chargeCd || "credit",
            qty: wayBill.qty,
            startNo: wayBill.startNo || "",
            endNo: wayBill.endNo || ""
        });
    };

    useEffect(() => {
        if (openByDblClick && modalData) {
            openModal("edit", modalData);
            setOpenByDblClick(false);
        }
    }, [modalData, openByDblClick]);

    function handleSelectedPrint() {
        window.location.href = `jeilsaprint://print/${modalData.waybillId}`;
        // TODO 함수 추가
        // if (validationToast(String(selectedWaybill.startNo).trim() === "", "", false, "시작번호와 종료번호를 입력해주세요.")) return;
    }

    const handleModalDelete = () => {
        const basePayload = {
            chgId: currentUser
        } as unknown as InsertWaybill; // 타입 맞추기 (필요 시 조정)

        deleteWayBillMutation.mutate({...basePayload, id: selectedWaybill.waybillId});
    };

    function normalizeStr(v: string | number | null | undefined): string {
        return String(v ?? '').trim();
    }

    // 모달 저장
    const handleModalSave = () => {
        //12-01 제일사 요청으로 인해 벨리데이션 제거
        //if (validationToast(String(modalData.senderCompanyNm).trim() === "", "", false, "발신처를 선택해주세요.")) return;
        //09-29 제일사 요청으로 인해 벨리데이션 제거
        // if(modalMode === "edit"){
        //   if (validationToast(!normalizeStr(modalData.startNo).trim(), "운송장 시작번호")) return;
        //   if (validationToast(!isValidWaybillNo(normalizeStr(modalData.startNo)), "운송장 시작번호", true)) return;
        //   if (validationToast(!normalizeStr(modalData.endNo), "운송장 종료번호")) return;
        //   if (validationToast(!isValidWaybillNo(normalizeStr(modalData.endNo)), "운송장 종료번호", true)) return;
        // }
        if (validationToast(!modalData.qty, "수량")) return;

        const basePayload = {
            senderCompanyId: modalData.senderCompanyId,
            receiverCompanyId: modalData.receiverCompanyId,
            senderCompanyNm: modalData.senderCompanyNm,
            senderAddress: modalData.senderAddress,
            senderTelNo: formatPhone(modalData.senderTelNo),
            senderManagerTelNo: formatPhone(modalData.senderManagerTelNo),
            receiverAddress: modalData.receiverAddress,
            receiverCompanyNm: modalData.receiverCompanyNm,
            receiverTelNo: formatPhone(modalData.receiverTelNo),
            receiverManagerTelNo: formatPhone(modalData.receiverManagerTelNo),
            qty: modalData.qty,
            startNo: modalData.startNo,
            endNo: modalData.endNo,
            chargeCd: modalData.chargeCd
        } as unknown as InsertWaybill; // 타입 맞추기 (필요 시 조정)

        if (modalMode === "create") {
            createWayBillMutation.mutate(basePayload);
            return;
        }

        if (modalMode === "edit" && selectedWaybill) {
            updateWayBillMutation.mutate({...basePayload, waybillId: selectedWaybill.waybillId});
            return;
        }
    };

    const pick = (who: "sender" | "receiver") => (c: Company) => {
        setModalData(prev => ({
            ...prev,
            [`${who}CompanyId`]: c.companyId,
            [`${who}CompanyNm`]: c.companyNm || "",
            [`${who}TelNo`]: c.telNo || "",
            [`${who}ManagerTelNo`]: c.managerTelNo || "",
            [`${who}Address`]: c.address || "",
        }) as any);
    };

    return (
        <Layout>
            <div className="space-y-6 korean-text bg-gray-50 p-6">
                {/* Search Conditions Box */}
                <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">검색 조건</h3>
                        <div className="flex items-center gap-x-4">

                            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">발신처</Label>
                            <Input
                                value={searchParams.senderCompanyNm}
                                placeholder="업체명/전화번호를 입력하세요."
                                onChange={(e) =>
                                    setSearchParams((prev) => ({
                                        ...prev,
                                        senderCompanyNm: e.target.value
                                    }))
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault(); // 필요하면 폼 제출 방지
                                        handleSearch();
                                    }
                                }}
                                className="w-48"
                            />
                            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">수신처</Label>
                            <Input
                                value={searchParams.receiverCompanyNm}
                                placeholder="업체명/전화번호를 입력하세요."
                                onChange={(e) =>
                                    setSearchParams((prev) => ({
                                        ...prev,
                                        receiverCompanyNm: e.target.value
                                    }))
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault(); // 필요하면 폼 제출 방지
                                        handleSearch();
                                    }
                                }}
                                className="w-48"
                            />
                            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">운송장번호</Label>
                            <Input
                                value={searchParams.searchNo}
                                placeholder="운송장번호를 입력하세요."
                                onChange={(e) =>
                                    setSearchParams((prev) => ({
                                        ...prev,
                                        searchNo: e.target.value
                                    }))
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault(); // 필요하면 폼 제출 방지
                                        handleSearch();
                                    }
                                }}
                                className="w-48"
                            />

                            {/* Buttons aligned to right */}
                            <div className="flex items-center gap-x-3 ml-auto">
                                <Button variant="outline" onClick={resetFilters}>
                                    <RotateCcw className="w-4 h-4 mr-2"/>
                                    조건 초기화
                                </Button>
                                <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                                    <Search className="w-4 h-4 mr-2"/>
                                    검색
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Waybill List Section */}
                <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">운송장 선등록</h3>
                            <div className="flex justify-end mb-2 gap-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => handleSelectedPrint()}
                                    disabled={!selectedWaybill}
                                    className={cn(
                                        "transition-colors",
                                        selectedWaybill
                                            ? "border-blue-600 text-blue-600 hover:bg-blue-50"
                                            : "text-gray-400 border-gray-300 cursor-not-allowed"
                                    )}
                                >
                                    <Edit className="w-4 h-4 mr-2"/>
                                    선택 출력
                                </Button>
                                {/*<Button*/}
                                {/*    variant="outline"*/}
                                {/*    onClick={() => selectedWaybill && openModal("edit", selectedWaybill)}*/}
                                {/*    disabled={!selectedWaybill}*/}
                                {/*    className={cn(*/}
                                {/*        "transition-colors",*/}
                                {/*        selectedWaybill*/}
                                {/*            ? "border-blue-600 text-blue-600 hover:bg-blue-50"*/}
                                {/*            : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
                                {/*    )}*/}
                                {/*>*/}
                                {/*  <Edit className="w-4 h-4 mr-2" />*/}
                                {/*  선택 수정*/}
                                {/*</Button>*/}
                                <Button
                                    onClick={() => openModal("create")}
                                    className="bg-blue-600 hover:bg-blue-700 text-white btn-sm"
                                >
                                    <Plus className="w-4 h-4 mr-2"/>
                                    신규 추가
                                </Button>
                            </div>
                        </div>
                        {/* 데이터 영역 */}
                        {/* ib sheet 사용 */}
                        {/*<CommonSheet url="/api/waybill/list"*/}
                        {/*             searchParams={{ ...appliedParams, _rt: refreshTrigger }}*/}
                        {/*             usePaging={false}*/}
                        {/*             editMode={3}*/}
                        {/*             columns={columns}*/}
                        {/*             gridName="wayBill-preregister"*/}
                        {/*             handleRowClick={handleRowClick}*/}
                        {/*             refreshTrigger={refreshTrigger}*/}
                        {/*             extraOptions={{*/}
                        {/*                            Events: {*/}
                        {/*                              onDblClick: (evt : any) => {*/}
                        {/*                                if (evt.row?.Kind === "Header" || evt.row?.Kind === "Space") return;*/}
                        {/*                                handleRowClick(evt.row);*/}
                        {/*                                setOpenByDblClick(true);*/}
                        {/*                              }*/}
                        {/*                            }*/}
                        {/*                          }}*/}
                        {/*             />*/}
                        <CommonSheetServerPaging
                            url="/api/waybill/list"
                            searchParams={{
                                ...appliedParams,
                                _rt: refreshTrigger
                            }}         // _rt는 빼고, 아래 refreshTrigger로만 갱신
                            refreshTrigger={refreshTrigger}       // 트리거 바뀌면 1페이지부터 재조회
                            gridName="wayBill-preregister"        // 기존 gridName 유지
                            columns={columns}
                            editMode={3}
                            usePaging={true}                      // 기본 true이긴 하지만 명시해둬도 OK
                            pageSize={200}                        // 필요 시 100/300/500 등 조정
                            handleRowClick={(row: any) => {        // 더블클릭 시 내부에서 이 핸들러 호출됨
                                handleRowClick(row);
                            }}
                            extraOptions={{
                                Events: {
                                    onDblClick: (evt: any) => {
                                        if (evt.row?.Kind === "Header" || evt.row?.Kind === "Space") return;
                                        handleRowClick(evt.row);
                                        setOpenByDblClick(true);
                                    }
                                }
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Main Modal - Waybill Registration/Edit */}
                <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
                    <DialogContent
                        className="max-w-4xl bg-white rounded shadow p-6"
                        onOpenAutoFocus={(e) => {
                            e.preventDefault();           // ✅ 모달 오픈 시 자동 포커스 막기
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold text-gray-900">
                                {modalMode === "create" ? "운송장 신규 등록" : "운송장 수정"}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 mt-6">
                            {/* Section A: Receiver Information (Optional) */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-md font-semibold text-gray-800">수신처 정보</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* 수신처 회사명 */}
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">수신처명</Label>
                                        <CompanyAutoComplete
                                            value={String(modalData.receiverCompanyNm || "")}
                                            onSelect={pick("receiver")}
                                            placeholder="수신처를 입력하세요"
                                            onChange={(e) => {
                                                setModalData(prev => ({
                                                    ...prev,
                                                    receiverCompanyNm: e.target.value, // 입력값 반영
                                                    receiverCompanyId: 0      // 수기 입력시 ID 초기화
                                                }));
                                            }}
                                        />
                                    </div>

                                    {/* 수신처 주소 */}
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">수신처 주소</Label>
                                        <Input
                                            value={modalData.receiverAddress || ""}
                                            onChange={(e) => setField("receiverAddress", e.target.value)}
                                            className="bg-white-100"
                                        />
                                    </div>
                                    {/* 수신처 전화번호 */}
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">수신처 전화번호</Label>
                                        <Input
                                            value={formatPhone(modalData.receiverTelNo) || ""}
                                            onChange={(e) => setField("receiverTelNo", formatPhone(e.target.value))}
                                            className="bg-white-100"
                                        />
                                    </div>

                                    {/* 수신처 담당자 전화번호 */}
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">수신처 담당자 전화번호</Label>
                                        <Input
                                            value={formatPhone(modalData.receiverManagerTelNo) || ""}
                                            onChange={(e) => setField("receiverManagerTelNo", formatPhone(e.target.value))}
                                            className="bg-white-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Sender Information (Required) */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-md font-semibold text-gray-800">발신처 정보</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* 발신처 회사명 */}
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">발신처명</Label>
                                        <CompanyAutoComplete
                                            value={String(modalData.senderCompanyNm || "")}
                                            onSelect={pick("sender")}
                                            placeholder="발신처를 입력하세요"
                                            onChange={(e) => {
                                                setModalData(prev => ({
                                                    ...prev,
                                                    senderCompanyNm: e.target.value, // 입력값 반영
                                                    senderCompanyId: 0      // 수기 입력시 ID 초기화
                                                }));
                                            }}
                                        />
                                    </div>

                                    {/* 발신처 주소 */}
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">발신처 주소</Label>
                                        <Input
                                            value={modalData.senderAddress || ""}
                                            onChange={(e) => setField("senderAddress", e.target.value)}
                                            className="bg-white-100"
                                        />
                                    </div>

                                    {/* 발신처 전화번호 */}
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">발신처 전화번호</Label>
                                        <Input
                                            value={formatPhone(modalData.senderTelNo) || ""}
                                            onChange={(e) => setField("senderTelNo", formatPhone(e.target.value))}
                                            className="bg-white-100"
                                        />
                                    </div>

                                    {/* 발신처 전화번호 */}
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">발신처 담당자 전화번호</Label>
                                        <Input
                                            value={formatPhone(modalData.senderManagerTelNo) || ""}
                                            onChange={(e) => setField("senderManagerTelNo", formatPhone(e.target.value))}
                                            className="bg-white-100"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">요금</Label>
                                        <RadioGroup
                                            value={modalData.chargeCd || "credit"}
                                            onValueChange={(val) => setField("chargeCd", val)}
                                            className="flex space-x-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="pre" id="tax-yes"/>
                                                <Label htmlFor="tax-yes">선불</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="collect" id="tax-no"/>
                                                <Label htmlFor="tax-no">착불</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="credit" id="tax-no"/>
                                                <Label htmlFor="tax-no">신용</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>
                            </div>

                            {/* Section C: Waybill Information */}
                            <div>
                                <h4 className="text-md font-semibold text-gray-800 mb-3">운송장 정보</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">시작번호</Label>
                                        <Input
                                            value={formatWaybill(modalData.startNo) || ""}
                                            onChange={(e) => setField("startNo", e.target.value)}
                                            placeholder="시작번호를 입력하세요"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">종료번호</Label>
                                        <Input
                                            value={formatWaybill(modalData.endNo) || ""}
                                            onChange={(e) => setField("endNo", e.target.value)}
                                            placeholder="종료번호를 입력하세요"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <Label className="text-sm font-medium text-gray-700">수량</Label>
                                        <Input
                                            type="number"
                                            value={modalData.qty || ""}
                                            onChange={(e) => setField("qty", Number(e.target.value))}
                                            placeholder="수량을 입력하세요"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end space-x-3 pt-4">
                            {modalMode === "edit" && (
                                <Button
                                    variant="destructive"
                                    onClick={handleModalDelete}
                                    className="mr-auto"
                                    disabled={deleteWayBillMutation.isPending || updateWayBillMutation.isPending}
                                >
                                    <Trash2 className="w-4 h-4 mr-2"/>
                                    {deleteWayBillMutation.isPending ? "삭제 중..." : "삭제"}
                                </Button>
                            )}
                            <Button variant="outline" type="button" onClick={handleModalCancel}>
                                취소
                            </Button>
                            <Button
                                type="button"
                                onClick={handleModalSave}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={
                                    (modalMode === "create" && createWayBillMutation.isPending) ||
                                    (modalMode === "edit" && updateWayBillMutation.isPending)
                                }
                            >
                                {modalMode === "create"
                                    ? (createWayBillMutation.isPending ? "생성 중..." : "등록")
                                    : (updateWayBillMutation.isPending ? "수정 중..." : "수정")}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}