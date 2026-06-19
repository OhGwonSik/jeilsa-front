// components/common/CompanySearchModal.tsx

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CommonSheet from "@/pages/ibsheet.tsx";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import {useEffect, useRef} from "react"; // 필요 시 경로 수정

interface ModalData {
    companyId : number;
    companyNm: string;
    telNo: string;
    address: string;

};

interface CompanySearchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (company: ModalData) => void;
    title?: string; // 예: "발신처 검색", "수신처 검색"
}

export default function CompanySearchModal({
                                               open,
                                               onOpenChange,
                                               onSelect,
                                               title = "업체 검색",
                                           }: CompanySearchModalProps) {
    const {
        searchParams,
        setSearchParams,
        appliedParams,
        refreshTrigger,
        handleSearch,
    } = useSearchFilters({
        companyNm: "",
    });

    // ib sheet에 사용할 컬럼
    const companyColumns = [
        { Header: "고유번호",  Name: "companyId",    Align: "Center", Width: 80 },
        { Header: "업체명",  Name: "companyNm",    Align: "Center", Width: 120 },
        { Header: "전화번호",  Name: "telNo", Align: "Center", Width: 150 },
        { Header: "주소",  Name: "address", Align: "Center", Width: 150 },
    ];

    const handleRowClick = (company: ModalData) => {
        onSelect(company);
        onOpenChange(false); // 모달 닫기
    };

    useEffect(() => {
        if (!open) return;

        // 모달 열릴 때: 검색 조건 초기화 + 시트 새로고침
        setSearchParams({ companyNm: "" });
        handleSearch();
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl bg-white rounded shadow p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Search Input */}
                    <Input
                        placeholder="업체명을 입력하세요"
                        value={searchParams.companyNm}
                        onChange={(e) =>
                            setSearchParams({ companyNm: e.target.value })
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                        }}
                        className="w-full mb-3"
                    />

                    {/* CommonSheet */}
                    <CommonSheet
                        url="/api/company/list"
                        searchParams={appliedParams}
                        refreshTrigger={refreshTrigger}
                        columns={companyColumns}
                        handleRowClick={handleRowClick}
                        pagingMode={1}
                        pageLength={12}
                        editMode={3}
                        emptyMessage="등록된 업체가 없습니다."
                        gridName="searchCompany"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
