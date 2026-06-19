// components/common/CommonSheetServerPaging.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import loader from "@ibsheet/loader";
import { useApiGet } from "@/hooks/authUseApiQuery.ts";
import {applySheetColorRules} from "@/common/utils/applySheetColorRules.ts";

type AnyObj = Record<string, any>;
interface PageResp { items: AnyObj[]; total: number; }

export interface CommonSheetServerPagingProps {
    url: string;
    searchParams?: AnyObj;
    refreshTrigger?: number | string;
    gridName: string;             // 고유
    columns: AnyObj[];            // 반드시 Name이 데이터 키와 일치해야 함
    editMode?: number;
    usePaging?: boolean;
    pageSize?: number;
    handleRowClick?: (row: AnyObj, evt?: any) => void;
    extraOptions?: AnyObj;
    onDataLoaded?: (data: T[]) => void;
    externalSheetRef?: React.MutableRefObject<any>;
    emptyMessage : string;
}

export default function CommonSheetServerPaging<T = any>({
                                                    url,
                                                    searchParams = {},
                                                    refreshTrigger,
                                                    gridName,
                                                    columns,
                                                    editMode = 0,
                                                    usePaging = true,
                                                    pageSize = 200,
                                                    handleRowClick,
                                                    extraOptions = {},
                                                    pagingMode = 1,
                                                    onDataLoaded,
                                                    height = "600px",
                                                    pageLength = 200,
                                                    externalSheetRef,
                                                    emptyMessage
                                                }: CommonSheetServerPagingProps) {
    const [pageIndex, setPageIndex] = useState(1);              // 1-base
    const [pageSizeState, setPageSizeState] = useState(pageSize);
    const [total, setTotal] = useState(0);

    const totalPages = useMemo(
        () => (total > 0 ? Math.ceil(total / pageSizeState) : 0),
        [total, pageSizeState]
    );

    const sheetRef = useRef(null);

    const effectiveParams = useMemo(
        () => ({
            ...searchParams,
            pageIndex,        // 현재 페이지 번호
            pageSize: pageSizeState,  // 현재 페이지 크기
        }),
        [searchParams, pageIndex, pageSizeState]
    );

    const query = useApiGet<T[]>(
        url,
        effectiveParams ?? {},
        {
            enabled: !!url,
        }
    );

    const data: T[] = url
        ? (query.data?.items ?? query.data ?? [])
        : [];

    useEffect(() => {
        if (!url) return;

        // 응답이 PageResp면 total 사용, 배열이면 length 사용
        const nextTotal =
            (query.data && typeof query.data === "object" && "total" in query.data)
                ? (query.data as PageResp).total ?? 0
                : (Array.isArray(query.data) ? query.data.length : 0);

        setTotal(nextTotal);
    }, [url, query.data]);


    const isLoading: boolean = url ? query.isLoading : false;
    useEffect(() => {
        if (data && onDataLoaded) {
            onDataLoaded(data);  // 부모 컴포넌트로 데이터 전달
        }
    }, [data, onDataLoaded]);

    const initialLoadRef = useRef(false);

    useEffect(() => {
        if (!sheetRef.current) return;

        // 공통 옵션
        let options = {
            Cfg: {
                // SearchMode: pagingMode,
                PageLength: pageLength, // 1페이지에 나오는 갯수
                CanEdit: editMode, // 전체 편집 불가능 & 배경색 표현 하지않음
                Style: "IBSP", // SIMPLE 테마 적용
                CustomScroll : 1, //평범한 스타일의 스크롤바
                CanFormula: 1,
                Paging: 1,
                CanSort: 0,
                // 페이지 네비게이션 표시 설정
                InfoRowConfig: {
                    Visible: usePaging,        // 정보 행 표시
                    Layout: ["Paging2"],
                    Space: "Bottom" // 기본값. 원하는 경우 "Top"으로 바꿀 수 있음
                }
            },
            Cols: columns,
            Events: {
                onClick: (evt: any) => {
                    console.log("🔥 IBSheet onClick 발생!");
                    if (evt?.row?.Kind === "Header") return; // 헤더 클릭 무시
                    const row = evt?.row;
                    if (row && handleRowClick) {
                        handleRowClick(row, evt);
                    }
                },
                onRenderFinish: (evt) => {
                    if(pagingMode != 1){
                        if (initialLoadRef.current) return;
                        initialLoadRef.current = true;

                        sheetRef.current = evt.sheet;

                        const opt = {
                            url: url,
                            method: "GET",
                            param : searchParams, // 서버로 전송할 조회 조건 파라미터
                            pageLengthParam : options.Cfg.PageLength, // 서버로 전송할 pageLength 변수 (default: 'ibpagelength' 20)
                            callback: function (rtn) {
                                try {
                                    const rtnData = JSON.parse(rtn.data);
                                    console.log("✅ 파싱된 응답", rtnData);
                                } catch (err) {
                                    console.error("❌ JSON 파싱 오류", err, rtn.data);
                                }
                            }

                        };

                        evt.sheet?.doSearchPaging(opt);
                    } else {
                        if (externalSheetRef) {
                            externalSheetRef.current = evt.sheet;
                        }
                    }
                    if (gridName !== "shipments" && gridName !== "companies" && gridName !== "transport-shipper-detail" && gridName !== "billDtl") {
                        evt.sheet.fitColWidth();
                    }
                },
            }
        };

        // 각페이지에서 추가적인 옵션이 있는 경우에 사용
        if (extraOptions) {
            options = {
                ...options,
                ...extraOptions,
                Cfg: {
                    ...options.Cfg,
                    ...(extraOptions.Cfg || {}),
                },
                Def: {
                    ...(options.Def || {}),
                    ...(extraOptions.Def || {}),
                },
                Cols: columns.map(col => {
                    const override = extraOptions?.Cols?.find((c: any) => c.Name === col.Name);
                    return override ? { ...col, ...override } : col;
                }),
                Events: {
                    ...(options.Events || {}),
                    ...(extraOptions.Events || {}),
                }
            };
        }

        // 기존 시트 제거 (명시적으로 제거)
        loader.removeSheet(gridName!);

        loader.createSheet({
            id: gridName,
            el: sheetRef.current,
            options,
            data: pagingMode > 1 ? [] : data, // pagingMode가 1이면 실제 데이터 사용, 아니면 빈 배열
        });

        return () => {
            // loader.removeSheet("mySheet");
        };
    }, [refreshTrigger,data]); // refreshTrigger 추가


    // refreshTrigger 변경되면 초기화
    useEffect(() => {
        if(pagingMode != 1){
            // refreshTrigger가 변경되면 최초 로딩 상태를 리셋
            initialLoadRef.current = false;
        }
    }, [refreshTrigger]);

    if(pagingMode == 1){
        if (isLoading) {
            return (<div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 korean-text">목록을 불러오는 중...</p>
                </div>
            </div>);
        }
        if (data.length === 0 && emptyMessage !== undefined) {
            if (sheetRef.current) {
                loader.removeSheet(gridName); // ✅ 기존 IBSheet 제거
            }
            return (
                <div className="p-4">
                    <div className="h-[400px] flex items-center justify-center border rounded text-gray-500">
                        {emptyMessage}
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {/* 컨테이너: 높이 반드시 확보 */}
            <div ref={sheetRef} style={{ height: height, width: "100%" }} />

            {usePaging && (
                <div className="flex items-center gap-2 justify-end text-sm text-gray-700 mt-2">
                    <span className="mr-auto">{isLoading ? "로딩 중..." : `총 ${total.toLocaleString()}건`}</span>

                    <button className="px-2 py-1 border rounded disabled:opacity-50"
                            onClick={() => setPageIndex(1)} disabled={isLoading || pageIndex <= 1}>처음</button>
                    <button className="px-2 py-1 border rounded disabled:opacity-50"
                            onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                            disabled={isLoading || pageIndex <= 1}>이전</button>

                    <span className="px-2">{totalPages > 0 ? `${pageIndex} / ${totalPages}` : "0 / 0"}</span>

                    <button className="px-2 py-1 border rounded disabled:opacity-50"
                            onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                            disabled={isLoading || pageIndex >= totalPages}>다음</button>
                    <button className="px-2 py-1 border rounded disabled:opacity-50"
                            onClick={() => setPageIndex(totalPages)}
                            disabled={isLoading || pageIndex >= totalPages}>마지막</button>

                    <select className="ml-2 border rounded px-2 py-1"
                            value={pageSizeState}
                            onChange={(e) => { const next = Number(e.target.value) || 200; setPageSizeState(next); setPageIndex(1); }}>
                        <option value={100}>100/페이지</option>
                        <option value={200}>200/페이지</option>
                        <option value={300}>300/페이지</option>
                        <option value={500}>500/페이지</option>
                    </select>
                </div>
            )}
        </div>
    );
}
