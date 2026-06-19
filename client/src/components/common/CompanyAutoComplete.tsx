// components/common/CompanyAutoComplete.tsx
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useRef,
    useState,
    useImperativeHandle,
} from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import axiosClient from "@/common/axios/AxiosClient";

export interface Company {
    rmk: string;
    managerTelNo: string;
    managerNm: string;
    companyId: number;
    companyNm: string;
    telNo: string;
    address: string;
    regionCd: string;
    regionDtlCd: string;
    untpc: number;
    weightUntpc: number;
    shipperYn: string;
    shipperCd: string;
    useYn: string;
    deliveryRouteNm : string;
}

interface CompanyAutoCompleteProps {
    value?: string;               // 외부 표시값 (controlled)
    placeholder?: string;
    minChars?: number;            // n자 이상부터 검색
    limit?: number;               // 미리보기 최대 개수
    className?: string;
    disabled?: boolean;
    onSelect: (company: Company) => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

// 간단 디바운스 훅
function useDebouncedValue<T>(value: T, delay = 250) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

const CompanyAutoComplete = forwardRef<HTMLInputElement, CompanyAutoCompleteProps>(
    (
        {
            value = "",
            placeholder = "업체명을 입력하세요",
            minChars = 1,
            limit = 10,
            className = "flex-1",
            onSelect,
            onChange,
            onBlur,
            disabled = false
        },
        ref
    ) => {
        const [keyword, setKeyword] = useState(value);
        const [open, setOpen] = useState(false);
        const [loading, setLoading] = useState(false);
        const [results, setResults] = useState<Company[]>([]);
        const [activeIndex, setActiveIndex] = useState(-1);
        const inputRef = useRef<HTMLInputElement | null>(null);
        const abortRef = useRef<AbortController | null>(null);

        const listRef = useRef<HTMLDivElement | null>(null);
        const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
        itemRefs.current = []; // 렌더마다 다시 채우기
        const setItemRef = (el: HTMLDivElement | null, idx: number) => {
            itemRefs.current[idx] = el;
        };

        // ✅ 선택 직후 자동 오픈 억제용 플래그
        const suppressOpenRef = useRef(false);

        useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

        useEffect(() => {
            if (!open) return;
            if (activeIndex < 0) return;
            const el = itemRefs.current[activeIndex];
            if (el) {
                el.scrollIntoView({ block: "nearest" });
            }
        }, [activeIndex, open]);

        // 외부 value 동기화 (팝업은 건드리지 않음)
        useEffect(() => {
            setKeyword(value || "");
        }, [value]);

        const debounced = useDebouncedValue(keyword, 250);

        const fetchCompanies = useCallback(
            async (term: string) => {
                if (!term || term.trim().length < minChars) {
                    setResults([]);
                    setOpen(false);
                    return;
                }

                if (abortRef.current) abortRef.current.abort();
                abortRef.current = new AbortController();

                try {
                    setLoading(true);
                    const qs = new URLSearchParams({
                        companyNm: term.trim(),
                        size: String(limit),
                    });
                    const headers: Record<string, string> = { "Content-Type": "application/json" };

                    // ✅ 토큰 주입
                    const token = localStorage.getItem("accessToken");
                    if (token) {
                        headers["Authorization"] = `Bearer ${token}`;
                    }                    
                    const res = await axiosClient.get(`/company/list`, {
                        params: { companyNm: term.trim(), size: limit },
                        signal: abortRef.current.signal,
                    });

                    const data = res.data;
                    const items: Company[] = Array.isArray(data) ? data : (data.list ?? []);
                    setResults(items);

                    const isFocused = inputRef.current && document.activeElement === inputRef.current;
                    // ✅ 선택 직후에는 자동 오픈 금지
                    const shouldOpen = items.length > 0 && !!isFocused && !suppressOpenRef.current;
                    setOpen(shouldOpen);

                    setActiveIndex(items.length ? 0 : -1);
                } catch (err: any) {
                    if (err?.name !== "AbortError") {
                        setResults([]);
                        setOpen(false);
                    }
                } finally {
                    setLoading(false);
                }
            },
            [limit, minChars]
        );

        useEffect(() => {
            fetchCompanies(debounced);
        }, [debounced, fetchCompanies]);

        const handlePick = (c: Company) => {
            setKeyword(c.companyNm);
            onSelect(c);
            // ✅ 선택 후엔 자동 오픈 억제 + 팝업 닫기
            suppressOpenRef.current = true;
            setOpen(false);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!open || results.length === 0) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((prev) => (prev + 1) % results.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                const picked = activeIndex >= 0 && activeIndex < results.length ? results[activeIndex] : null;
                if (picked) handlePick(picked);
            } else if (e.key === "Escape") {
                suppressOpenRef.current = true; // Esc로 닫았으면 즉시 재오픈 방지
                setOpen(false);
            }
        };

        const showEmpty = !loading && keyword.trim().length >= minChars && results.length === 0;

        return (
            <div className="relative">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <div className="w-full pointer-events-auto">
                            <Input
                                ref={inputRef}
                                value={keyword}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    setKeyword(next);
                                    onChange?.(e);
                                    // ✅ 유저가 다시 타이핑 시작하면 자동 오픈 허용
                                    suppressOpenRef.current = false;

                                    if (next.trim().length < minChars) {
                                        setOpen(false);
                                        setResults([]);
                                    }
                                }}
                                onFocus={() => {
                                    // 포커스 시에도 이전에 선택으로 억제된 상태면 바로 열지 않음
                                    if (results.length > 0 && !suppressOpenRef.current) {
                                        setOpen(true);
                                    }
                                }}
                                onBlur={(e) => {
                                    // blur 시 닫기 (팝업 클릭 선택 보완)
                                    setTimeout(() => setOpen(false), 100);
                                    onBlur?.(e);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                className={`${className} relative z-20`}
                                autoComplete="off"
                                readOnly={false}
                                aria-autocomplete="list"
                                aria-expanded={open}
                                aria-controls="company-autocomplete-listbox"
                                role="combobox"
                                disabled={disabled}
                            />
                        </div>
                    </PopoverTrigger>

                    <PopoverContent
                        className="w-96 p-0"
                        align="start"
                        sideOffset={4}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                        <div className="p-2 border-b">
                            <h4 className="text-sm font-medium">저장된 업체 목록</h4>
                        </div>

                        <div id="company-autocomplete-listbox" role="listbox" className="max-h-60 overflow-y-auto"
                             ref={listRef}                                      // ▼ 추가
                             aria-activedescendant={
                                 activeIndex >= 0 ? `company-option-${activeIndex}` : undefined  // ▼ 추가(접근성)
                             }>
                            {loading && <div className="p-3 text-sm text-gray-500">검색 중…</div>}

                            {showEmpty && <div className="p-3 text-sm text-gray-500">검색 결과 없음</div>}

                            {!loading &&
                                results.map((c, idx) => {
                                    const isActive = idx === activeIndex;
                                    const isInactive = c.useYn === "N";
                                    const isCom = c.shipperCd === "COM";

                                    const cardCls =
                                                    "p-3 cursor-pointer border-b last:border-b-0 transition-colors " +
                                                    (isInactive
                                                        ? (isActive ? "bg-red-100 " : "bg-red-50 ") + "text-red-700"
                                                        : c.shipperYn === "N"
                                                            ? (isActive ? "bg-orange-100 " : "bg-orange-50 ") + "text-orange-900" // ✅ 주황색 배경 추가
                                                            : (isActive ? "bg-gray-50 " : "bg-white ") + "text-gray-900");

                                                const badgeShipperCls =
                                                    "text-xs font-semibold underline " +
                                                    (isInactive
                                                        ? "text-red-600"
                                                        : c.shipperYn === "N"
                                                            ? "text-orange-700" // ✅ 배경이 주황색이니 글자는 좀 더 진하게(700)
                                                            : isCom
                                                                ? "text-blue-700"
                                                                : "text-green-600");

                                                const subTextCls = 
                                                    "text-xs " + 
                                                    (isInactive 
                                                        ? "text-red-500" 
                                                        : c.shipperYn === "N" 
                                                            ? "text-orange-600" // ✅ 보조 텍스트도 주황 톤으로 맞춤
                                                            : "text-gray-500");

                                    return (
                                        <div
                                            key={c.companyId}
                                            id={`company-option-${idx}`}         // ▼ 추가(접근성)
                                            ref={(el) => setItemRef(el, idx)}    // ▼ 추가(스크롤 타깃)
                                            role="option"
                                            aria-selected={isActive}
                                            className={cardCls}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                // if (isInactive) return; 09-30 제일사 요청(사용하지않는 업체도 선택가능)으로 주석 제거
                                                handlePick(c);
                                            }}
                                        >
                                            <div className={"font-semibold text-sm " + (isInactive ? "text-red-700" : "text-gray-900")}>
                                                {c.companyNm}
                                            </div>

                                            <div className="mt-1 flex gap-2">
                                                <span className={badgeShipperCls}>
                                                운송구분: {c.shipperYn === "Y"  ? (c.shipperCd === "COM" ? "통신" : "택배" ) : "-"}
                                                </span>
                                            </div>

                                            <div className={"mt-1 " + subTextCls}>
                                                {c.telNo || "-"} <span className="mx-1 text-gray-300">|</span>
                                                <span className="truncate inline-block max-w-[18rem] align-bottom">{c.address || "-"}</span>
                                            </div>

                                            {(c.managerNm || c.managerTelNo) && (
                                                <div className={"mt-0.5 " + subTextCls}>
                                                    담당: {c.managerNm || "-"}{" "}
                                                    {c.managerTelNo && (
                                                        <span className={isInactive ? "text-red-500" : "text-gray-400"}>({c.managerTelNo})</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>

                        <div className="px-3 py-2 text-[11px] text-gray-400 border-t">Enter 선택 • ↑↓ 이동 • Esc 닫기</div>
                    </PopoverContent>
                </Popover>
            </div>
        );
    }
);

export default CompanyAutoComplete;
