import { useEffect, useRef } from 'react';
import loader from '@ibsheet/loader';
import {useApiQuery} from "@/hooks/useApiQuery.ts";

interface CommonSheetProps<T = any> {
    url: string; // 요청 url
    pagingMode : number; // 페이징 처리 방법 ( 1: 클라이언트 / 3 : 인피티니스크롤 / 4 : 서버사이드 )
    emptyMessage : string; // 데이터 없을때 사용하는 문구
    columns: any[]; // 사용 컬럼
    handleRowClick?: (row: any) => void; // row 클릭 이벤트 (모든 페이지 공통 사용)
    extraOptions?: any; // 페이지에서 넘길 추가 옵션
    refreshTrigger : number; // 초기화
}

export default function CommonSheet3<T = any>({
                                                 url, pagingMode,
                                                 emptyMessage,
                                                 columns,
                                                 handleRowClick,
                                                 extraOptions = {},
                                                 refreshTrigger,
                                             }: CommonSheetProps<T>) {
    const sheetRef = useRef(null);
    const { data = [], isLoading } = useApiQuery<T[]>(url); // 데이터 조회

    useEffect(() => {
        console.log("🧪 IBSheet 생성 시작");
        if (!sheetRef.current) return;

        // 공통 옵션
        let options = {
            Cfg: {
                CanEdit: 3, // 전체 편집 불가능 & 배경색 표현 하지않음
                SearchMode: pagingMode, // ✅ 서버스크롤
                PageLength: 17, // 1페이지에 나오는 갯수
                Style: "IBSP", // SIMPLE 테마 적용
                CustomScroll : 1, //평범한 스타일의 스크롤바
                NoDataMessage: emptyMessage,
                Paging: 1,
                // 페이지 네비게이션 표시 설정
                InfoRowConfig: {
                    Visible: true,        // 정보 행 표시
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
                        handleRowClick(row);
                    }
                }
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
            };
        }
        
        // 기존 시트 제거 (명시적으로 제거)
        loader.removeSheet("mySheet");

        loader.createSheet({
            id: "mySheet",
            el: sheetRef.current,
            options,
            data : data, // ✅ 현 페이징 방식에서는 필요 없음
        });

        return () => {
            console.log("🧼 IBSheet 제거됨");
            loader.removeSheet("mySheet");
        };
     }, [data, refreshTrigger]); // refreshTrigger 추가, data와 columns도 추가


    // ✅ 현 페이징 방식에서는 필요 없음
    if (isLoading) {
        return (<div className="flex items-center justify-center min-h-96">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500 korean-text">사용자 목록을 불러오는 중...</p>
            </div>
        </div>);
    }

    if (data.length === 0) {
        return (
            <div className="p-4">
                <div className="h-[400px] flex items-center justify-center border rounded text-gray-500">
                    {emptyMessage}
                </div>
            </div>
        );
    }

    return <div ref={sheetRef} style={{ height: "600px", width: "100%" }} />;
}
