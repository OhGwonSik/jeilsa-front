import {useEffect, useMemo, useRef} from 'react';
import loader from '@ibsheet/loader';
import {applySheetColorRules} from "@/common/utils/applySheetColorRules.ts";
import {useApiGet} from "@/hooks/authUseApiQuery.ts";


interface CommonSheetProps<T = any> {
    url: string; // 요청 url
    searchParams: Record<string, any>; // 검색 조건 추가
    usePaging : boolean; // 페이지네이션 사용 여부
    pagingMode : number; // 페이징 처리 방법 ( 1: 클라이언트 / 3 : 서버스크롤 / 4 : 서버사이드 )
    pageLength? : number; // 한페이지에 나오는 데이터 수
    editMode : number; // 편집 가능 여부 ( 0: 불가능 / 1:  가능 / 3: 전체 편집 불가능(편집 가능 불가능에 대한 배경색을 표시하지 않음) / 4: 전체 편집 불가능 + 배경색 표현안함 + 아이콘 표시
    emptyMessage : string; // 데이터 없을때 사용하는 문구
    columns: any[]; // 사용 컬럼
    handleRowClick?: (row: any, evt?: any) => void; // row 클릭 이벤트 (모든 페이지 공통 사용)
    extraOptions?: any; // 페이지에서 넘길 추가 옵션
    refreshTrigger : number; // 초기화
    gridName ?: string ; // 그리드 이름 ( 다중으로 그려질때 구분하기 위함 )
    height : string; // 그리드 높이
    externalSheetRef?: React.MutableRefObject<any>;
    onDataLoaded?: (data: T[]) => void; // 부모컴포넌트로 데이터 전달 (data List넘겨줌)
}

export default function CommonSheet<T = any>({
                                                 url,
                                                 searchParams,
                                                 usePaging = true,
                                                 pagingMode = 1,
                                                 pageLength,
                                                 editMode,
                                                 emptyMessage,
                                                 columns,
                                                 handleRowClick,
                                                 extraOptions = {},
                                                 refreshTrigger,
                                                 gridName = "mySheet" ,
                                                 height = "600px",
                                                 externalSheetRef,
                                                 onDataLoaded
                                             }: CommonSheetProps<T>) {
    const sheetRef = useRef(null);
    
    const query = useApiGet<T[]>(
        url,
        searchParams ?? {},
        {
            enabled: !!url,
        }
    );

    const data: T[] = url ? query.data ?? [] : [];
    const isLoading: boolean = url ? query.isLoading : false;

    useEffect(() => {
        if (data && onDataLoaded) {
        onDataLoaded(data);  // 부모 컴포넌트로 데이터 전달
        }
    }, [data, onDataLoaded]);    
    const initialLoadRef = useRef(false);

    // 특정 텍스트 배경 및 색상 변경 ( 기능이 필요한 컬럼이 있는 경우에만 extraOptions 에 enableColorMapping: true 로 보내면됨 )
    const processedData = useMemo(() => {
        if (!extraOptions?.enableColorMapping) return data;
        return applySheetColorRules(data);
    }, [data, extraOptions]);

    useEffect(() => {
        if (!sheetRef.current) return;

        // 공통 옵션
        let options = {
            Cfg: {
                SearchMode: pagingMode,
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
                    if (gridName !== "shipments" && gridName !== "companies" && gridName !== "transport-shipper-detail" && !gridName.startsWith("billDtl")) {
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
            data: pagingMode > 1 ? [] : processedData, // pagingMode가 1이면 실제 데이터 사용, 아니면 빈 배열
        });

        return () => {
            // loader.removeSheet("mySheet");
        };
     }, [refreshTrigger,processedData]); // refreshTrigger 추가


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

    return <div ref={sheetRef} style={{ height: height, width: "100%" }} />;
}
