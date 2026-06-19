import { useState } from "react";

export function useSearchFilters<T extends Record<string, string | number>>(initialValues: T) {
    const [searchParams, setSearchParams] = useState<T>(initialValues);
    const [appliedParams, setAppliedParams] = useState<T>(initialValues);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 조건 초기화
    const resetFilters = () => {
        setSearchParams(initialValues);
    };

    // 검색
    const handleSearch = () => {
        setAppliedParams(searchParams); // 실제 검색 조건 적용
        setRefreshTrigger((prev) => prev + 1); // 강제 리렌더
    };

    // 그리드 리로드
    const forceRefresh = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    return {
        searchParams,
        setSearchParams,
        appliedParams,
        resetFilters,
        handleSearch,
        refreshTrigger,
        forceRefresh
    };
}
