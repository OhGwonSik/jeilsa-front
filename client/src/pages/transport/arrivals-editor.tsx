import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {ArrowLeft, CalendarIcon, Edit, Save, Search} from 'lucide-react';
import {useLocation, useNavigate} from "react-router-dom";
import CommonSheet from "@/pages/ibsheet.tsx";
import {cn} from "@/lib/utils.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import {apiRequest} from "@/lib/queryClient.ts";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import CompanyAutoComplete from "@/components/common/CompanyAutoComplete.tsx";
import {InsertTransport} from "@shared/schema.ts";
import {CommonCodeSelect} from "@/pages/codeSelectProps.tsx";
import {useDebouncedCommit} from "@/hooks/useDebouncedCommit.ts";
import {useApiQuery} from "@/hooks/useApiQuery.ts";
import {validationToast} from "@/common/utils/validationToast.ts";
import {isValidPhone} from "@/common/utils/formatPhone.ts";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Calendar} from "@/components/ui/calendar.tsx";
import {format} from "date-fns/format";
import {ko} from "date-fns/locale";

interface Company {
    companyId: number;
    companyNm: string;
    shipperCd?: string;
    telNo: string;
    address: string;
    managerNm?: string;
    managerTelNo?: string;
    rmk?: string;
    regionCd?: string;
    regionDtlCd?: string;
    untpc?: number;       // 정책에 따라 상세로 내릴 거면 제거
    weightUntpc?: number; // "
    deliveryRouteNm : string;
}

interface Transport {
    transportId: number;   // PK (신규면 0 또는 undefined)
    chargeCd: string;
    sender: Company;
    receiver: Company;
}

interface TransportDtl {
    _recvDraftKey?: string;
    transportId: number;
    transportDtlId: number;
    senderCompanyId: number;
    receiverTransportId: number;
    receiverCompanyId: number;
    kindCd: string;
    waybillNo: string;
    calculationCd: string; // 운송 구분
    senderQty: number;
    receiverQty: number;
    senderUntpc: number;
    receiverUntpc: number;
    senderAmount: number;
    receiverAmount: number;
    delYn: string;
}

export default function ShipmentEditor(){
    const location = useLocation();
    const qs = new URLSearchParams(location.search);

    const startDate = qs.get("startDate") ?? "";
    const endDate = qs.get("endDate") ?? "";
    const transportId = Number(qs.get("transportId") ?? 0);
    const senderCompanyId = Number(qs.get("senderCompanyId") ?? 0);
    const receiverCompanyId = Number(qs.get("receiverCompanyId") ?? 0);

    const recvDraftKeyRef = useRef<string>("");

    const navigate = useNavigate();

    const emptyCompany = (): Company => ({
        companyId: 0,
        companyNm: "",
        shipperCd: "",
        telNo: "",
        address: "",
        managerNm: "",
        managerTelNo: "",
        rmk: "",
        regionCd: "DAEGU",
        regionDtlCd: "BUKGU",
        untpc: 0,
        weightUntpc: 0,
    });

    const emptyTransport = (): Transport => ({
        transportId: 0,
        chargeCd: "CH001",
        sender: emptyCompany(),
        receiver: emptyCompany(),
    });

    const [selectedTransport, setSelectedTransport] = useState<Transport>(emptyTransport()); // 선택한 발신,수신 데이터
    const [selectedSenderTransport, setSelectedSenderTransport] = useState<Transport>(null);
    const [leftReloadKey, setLeftReloadKey] = useState(0);

    // 수신처 데이터 조회
    const { data, isLoading } = useApiQuery<Transport>(
        receiverCompanyId > 0 ? `/api/transport/listById?receiverCompanyId=${receiverCompanyId}` : "",
        undefined,
        { enabled: receiverCompanyId > 0 }
    );

    // 조회된 값이 있으면 바로 상태에 넣기
    useEffect(() => {
        if (data) setSelectedTransport(data.transport);
    }, [data]);


    const selectedtTransportRef = useRef<typeof selectedTransport | null>(null);

    const [deletedReceiverIds, setDeletedReceiverIds] = useState<number[]>([]);
    const [deletedTransportDtlIds, setDeletedTransportDtlIds] = useState<Record<number, number[]>>({});

    useEffect(() => {
        selectedtTransportRef.current = selectedTransport;
    }, [selectedTransport]);

    const updateSender = (patch: Partial<Company>) => {
        setSelectedTransport(prev => ({
            ...prev,
            sender: {
                ...(prev?.sender ?? emptyCompany()),
                ...patch,
            },
        }));
        markDirty();
    };

    const [transportDtl, setTransportDtl] = useState<TransportDtl[]>([]);
    const [selectedTransportDtl, setSelectedTransportDtl] = useState<TransportDtl | null>(null); // 선택한 물품 데이터

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
        startDate : startDate,
        endDate : endDate,
        deliveryRouteId : 0,
        senderCompanyNm: '',
        receiverCompanyNm: '',
    });

    const {
        searchParams: leftParams,
        setSearchParams: setLeftParams,
        refreshTrigger: leftRefreshTrigger,
        forceRefresh: leftForceRefresh
    } = useSearchFilters({
        receiverCompanyId : transportId > 0 ? receiverCompanyId : 0,
        startDate : startDate,
        endDate : endDate
    });

    useEffect(() => {
        const qs = new URLSearchParams(location.search);

        const next = {
            startDate: qs.get("startDate") ?? "",
            endDate: qs.get("endDate") ?? "",
            senderCompanyId: qs.get("senderCompanyId") ? Number(qs.get("senderCompanyId")) : 0,
            transportId: qs.get("transportId") ? Number(qs.get("transportId")) : 0,
        };

        setLeftParams(prev => ({ ...prev, ...next }));
        setLeftReloadKey(k => k + 1); // 무조건 재조회
    }, [location.search]); // ✅ search에 반응

    const {
        searchParams: rightParams,
        setSearchParams: setRightParams,
        refreshTrigger: rightRefreshTrigger,
        forceRefresh: rightForceRefresh
    } = useSearchFilters({
        transportId: transportId > 0 ? transportId : 0,
        startDate : startDate,
        endDate : endDate,
        senderReceiverCd : 'RECEIVER'
    });

    // ib sheet에 사용할 컬럼 ( CanEdit : 그리드 시트 자체는 row 추가를 위해 editMode 1로 열려있어야하나, 컬럼별 수정은 막기위함 )
    const leftColumns = [
        {Name: "transportId", Align: "Center", Width: 120, Visible: 0},
        {Name: "receiverCompanyId", Align: "Center", Width: 120, Visible: 0},
        {Header: "접수일시", Name: "shipmentOperationDate", Align: "Center", Width: 100, CanEdit: 3},
        {
            Header: "요금구분", Name: "chargeCd", Align: "Center", Width: 80,
            Type: "Enum",
            Enum: "|선불|착불|양방향",
            EnumKeys: "|CH001|CH002|CH003",
            CanEdit: 3
        },
        {Header: "작성일시", Name: "regDt", Align: "Center", Width: 100 , CanEdit: 3,Type: "Date",Format: "yyyy-MM-dd" , Visible: 0},
        {Header: "발신처명", Name: "senderCompanyNm", Align: "Center", Width: 100, CanEdit: 3},
        {Name: "senderTransportShipperCd", Type: "Text", Width: 100, Visible: 0},
        {Header: "전화번호", Name: "senderTelNo", Align: "Center", Width: 150, CanEdit: 3},
        {Name: "senderManagerNm", Align: "Center", Width: 150, CanEdit: 3,Visible: 0},
        {Header: "휴대폰", Name: "senderManagerTelNo", Align: "Center", Width: 150, CanEdit: 3},
        {Name: "senderRegionCd",    Align: "Center", Width: 80, CanEdit: 3, Visible: 0},
        {Name: "senderRegionDtlCd", Align: "Center", Width: 80 ,CanEdit: 3, Visible: 0},
        {Header: "주소", Name: "senderAddress", Align: "Center", Width: 200, CanEdit: 3},
        {Header: "합계금액", Name: "totalReceiverAmount", Align: "Center", Width: 100,Type: "Int", Format: "#,##0;-#,##0;0;@", CanEdit: 3},
        {Header: "비고", Name: "senderRmk", Align: "Center", Width: 100, CanEdit: 3},
        {Name: "receiverUntpc", Align: "Center", Width: 100, CanEdit: 3 ,Visible: 0},
        {Name: "receiverWeightUntpc", Align: "Center", Width: 100, CanEdit: 3 ,Visible: 0},
        {Header: "draftKey", Name: "_draftKey", Type: "Text", Visible: 0},
        {Name: "untpc", Type: "Text", Width: 100, Visible: 0},
        {Name: "weightUntpc", Type: "Text", Width: 100, Visible: 0},
        {Name: "chargeCd", Type: "Text", Width: 100, Visible: 0},
        {Name: "senderCompanyId", Type: "Text", Width: 100, Visible: 0},
        {Name: "receiverCompanyNm", Type: "Text", Width: 100, Visible: 0},
        {Name: "receiverTransportShipperCd", Type: "Text", Width: 100, Visible: 0},
        {Name: "receiverRegionCd",    Align: "Center", Width: 80, CanEdit: 3, Visible: 0},
        {Name: "receiverRegionDtlCd", Align: "Center", Width: 80 ,CanEdit: 3, Visible: 0},
        {Name: "receiverManagerNm", Align: "Center", Width: 150, CanEdit: 3,Visible: 0},
        {Name: "receiverAddress", Align: "Center", Width: 200, CanEdit: 3,Visible: 0},
        {Name: "receiverTelNo", Align: "Center", Width: 150, CanEdit: 3,Visible: 0},
        {Name: "receiverManagerTelNo", Align: "Center", Width: 150, CanEdit: 3,Visible: 0},
        {Name: "receiverRmk", Align: "Center", Width: 100, CanEdit: 3,Visible: 0}
    ];

    const rightColumns = [
        {Header: "recvDraftKey", Name: "_recvDraftKey", Visible: 0, CanEdit: 0},
        {Name: "transportId", Visible: 0},
        {Name: "transportDtlId", Visible: 0},
        {Header: "delYn", Name: "delYn", Visible: 0, CanEdit: 0},
        {
            Header: "정산기준", Name: "calculationCd", Align: "Center", Width: 80,
            Type: "Enum",
            Enum: "|수량|무게",
            EnumKeys: "|QTY|WEIGHT",
            DefaultValue: "QTY"
        },
        // TODO 정산기준에 따른 단위 칸 자동 완성
        // { Header: "단위",      Name: "test3",      Align: "Center", Width: 100, CanEdit: 3},
        {
            Header: "물품종류",
            Name: "kindCd",
            Align: "Center",
            Width: 100,
            Type: "Enum",
            Enum: "|-- 선택 --|서류|박스|롤|샘플|갑바|마대|행랑",   // 화면에 보여지는 값
            EnumKeys: "||TAC0201|TAC0202|TAC0203|TAC0204|TAC0205|TAC0206|TAC0207", // 실제 저장될 값
            DefaultValue: ""  // 빈값을 기본값으로 설정
        },
        {Header: "운송장번호", Name: "waybillNo", Align: "Center", Width: 150},
        {Header: "수량/무게", Name: "qty", Align: "Center", Width: 150, Type: "Int"},
        {Header: "단가", Name: "untpc", Align: "Center", Width: 80, Type: "Int", Format: "#,##0;-#,##0;0;@"},
        {
            Header: "합계금액", Name: "amount", Align: "Right", Width: 100, Type: "Int",
            Format: "#,##0;-#,##0;0;@", CanEdit: 0
        },
    ]

    // 발신처 선택 변경 시: 이전행은 이미 onAfterChange에서 저장됐으니, 새 행 로드만
    useEffect(() => {
    }, [selectedTransport]);

    const handleCancel = () => {
        const search = location.search ?? "";
        navigate(
            { pathname: "/transport/arrivals", search: location.search ?? "" },
            { state: { refetch: true } }
        );
    };

    const N = (v: any, d = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : d;
    };
    const T = (v: any) => (v ?? "").toString().trim();

    function isSenderMeaningful(r: any) {
        // 회사가 선택되었거나, 표시 필드가 하나라도 채워졌거나, 물품이 있으면 의미 있음
        const hasId = N(r.senderTransportId) > 0 || N(r.senderCompanyId) > 0;
        const hasText = !!(T(r.companyNm) || T(r.telNo) || T(r.address) || T(r.rmk));
        const hasShip = Array.isArray(r.transportDtl) && r.transportDtl.length > 0;
        return hasId || hasText || hasShip;
    }

    const R = (v: any) => Number(v) || 0;

    const recvKey = (r: any) =>
        R(r.receiverTransportId) > 0
            ? `rt:${R(r.receiverTransportId)}`
            : `dk:${String((r as any)?._draftKey ?? '')}`;


    function buildPayload({ transport, transportDtl, deletedDtlIds = {} }) {
        const tid = R(selectedSenderTransport?.transportId ?? 0);
        const deletedForThis = deletedDtlIds[tid] ?? [];

        const inlineFallback = Array.isArray((transport as any)?.receiver?.shipments)
            ? ((transport as any).receiver.shipments as TransportDtl[])
            : [];

        const rawLines = (transportDtl && transportDtl.length > 0) ? transportDtl : inlineFallback;

        const normalizedDtl = rawLines
            .map(d => ({
                ...d,
                transportDtlId: R((d as any).transportDtlId ?? 0),
                transportId: tid,
            }))
            .filter(d => {
                const id = R((d as any).transportDtlId);
                return !(id > 0 && deletedForThis.includes(id));
            });

        const result: any = {
            transport: {
                transportId: tid,
                chargeCd: T(transport.chargeCd),
                sender: {
                    companyId: R(transport.sender.companyId),
                    companyNm: T(transport.sender.companyNm),
                    shipperCd: T(transport.sender.shipperCd),
                    telNo: T(transport.sender.telNo),
                    address: T(transport.sender.address),
                    managerNm: T(transport.sender.managerNm),
                    managerTelNo: T(transport.sender.managerTelNo),
                    rmk: T(transport.sender.rmk),
                    regionCd: T(transport.sender.regionCd),
                    regionDtlCd: T(transport.sender.regionDtlCd),
                    untpc: R(transport.sender.untpc),
                    weightUntpc: R(transport.sender.weightUntpc),
                },
                receiver: {
                    companyId: R(transport.receiver.companyId),
                    companyNm: T(transport.receiver.companyNm),
                    shipperCd: T(transport.receiver.shipperCd),
                    telNo: T(transport.receiver.telNo),
                    address: T(transport.receiver.address),
                    managerNm: T(transport.receiver.managerNm),
                    managerTelNo: T(transport.receiver.managerTelNo),
                    rmk: T(transport.receiver.rmk),
                    regionCd: T(transport.receiver.regionCd),
                    regionDtlCd: T(transport.receiver.regionDtlCd),
                    untpc: R(transport.receiver.untpc),
                    weightUntpc: R(transport.receiver.weightUntpc),
                },
            },
            transportDtl: normalizedDtl,
            ...(deletedForThis.length ? { deletedDtlIds: deletedForThis } : {}),
        };

        if (deletedForThis.length) {
            result.deletedDtlIds = deletedForThis;
        }

        return result;
    }


    // 응답에서 id를 안전하게 뽑아내는 유틸
    const extractIdFromLocation = (res: any) => {
        const loc =
            res?.headers?.get?.("Location") ??
            res?.headers?.Location ??
            res?.headers?.location;
        if (typeof loc === "string") {
            const m = loc.match(/(\d+)(?:\D*)$/);
            return m ? Number(m[1]) : undefined;
        }
        return undefined;
    };

    const pickReceiverTransportId = (res: any) =>
        res?.data?.transportId ??
        res?.transportId ??
        extractIdFromLocation(res);


    const handleSave = () => {
        flushCommit();

        const payload = buildPayload({
            transport: selectedTransport,
            transportDtl: transportDtl,
            deletedDtlIds: deletedTransportDtlIds, // Record<number, number[]>
        });

        let transport = payload.transport;
        let sender = transport.sender;
        let receiver = transport.receiver;

        if (validationToast(!transport.chargeCd.trim(), "발신처 요금구분")) return;
        // if (validationToast(!sender.address.trim(), "발신처 주소")) return;
        // if (validationToast(!sender.telNo.trim(), "발신처 전화번호")) return;
        // if (validationToast(!isValidPhone(sender.telNo), "발신처 전화번호", true)) return;

        // if (validationToast(!receiver.address.trim(), "수신처 주소")) return;
        // if (validationToast(!receiver.telNo.trim(), "수신처 전화번호")) return;
        // if (validationToast(!isValidPhone(receiver.telNo), "수신처 전화번호", true)) return;
        // if (validationToast(receiver.deletedShipmentIds.length === 0 && receiver.transportDtl.length === 0, "",false,"추가된 물품이 없습니다.")) return;
        // todo 물류의 필수 입력값 확인

        // if (transportId === 0) {
        //     createTransportMutation.mutate(payload, {
        //         onSuccess: (res) => {
        //             clearDirtyWithSnapshot();
        //             purgeDrafts();
        //             const newId = pickReceiverTransportId(res);
        //             if (!newId) return;
        //
        //             // 오늘 00:00
        //             const today = new Date();
        //             const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        //
        //             // 문자열 포맷
        //             const todayStr = format(startOfToday, "yyyy-MM-dd", { locale: ko });
        //
        //             // 일주일 전(오늘 포함 7일 전)
        //             const aWeekAgo = subDays(startOfToday, 7);
        //             const aWeekAgoStr = format(aWeekAgo, "yyyy-MM-dd", { locale: ko });
        //
        //             const qs = new URLSearchParams();
        //             qs.set("startDate", aWeekAgoStr);
        //             qs.set("endDate", todayStr);
        //             qs.set("transportId", String(newId));
        //
        //             // 수신처(companyId) — 선택된 상태에서 가져옴
        //             const sid = Number(selectedTransport?.receiver?.companyId || 0);
        //             if (sid > 0) qs.set("receiverCompanyId", String(sid));
        //
        //             window.location.assign(`/transport/arrivals-editor?${qs.toString()}`);
        //         },
        //     });
        //     return;
        // }

        if (transportId > 0) {
            updateTransportMutation.mutate(
                {...payload, id: transportId},
                {
                    onSuccess: () => {
                        clearDirtyWithSnapshot();
                        purgeDrafts();

                        // 캐시 버스터
                        setRightParams(prev => ({ ...prev, _ts: Date.now() }));

                        // 실제 호출
                        rightForceRefresh();

                        // 좌측도 필요하면
                        setLeftParams(prev => ({ ...prev, _ts: Date.now() }));
                        leftForceRefresh();
                    }
                }
            );
        }
    };

    // 우측 그리드 초기화
    const clearRightGrid = useCallback(() => {
        const goods: any = rightSheetRef.current;
        if (!goods) return;

        // 1) 가능한 clear 메서드 호출
        const removeAll =
            goods.removeAll ?? goods.RemoveAll ??
            goods.removeRows ?? goods.RemoveRows ??
            goods.ClearRows ?? goods.clearRows ??
            goods.RemoveAllData ?? goods.ClearData ?? goods.Clear;
        if (removeAll) {
            removeAll.call(goods);
        }

        // 2) 혹시 위 메서드가 없으면 빈 데이터로 강제 로드
        if (goods.LoadSearchData) {
            goods.LoadSearchData({Data: []});
        } else if (goods.LoadJson) {
            goods.LoadJson([]);
        }

        // 3) 즉시 화면 반영
        goods.RefreshBody?.();
        goods.RefreshCalc?.(1);
    }, []);

    const leftSheetRef = useRef(null); // 왼쪽 그리드
    const rightSheetRef = useRef(null); // 오른쪽 그리드

    const makeDraftKey = () =>
        `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    function getColNames(sheet: any): string[] {
        try {
            if (Array.isArray(sheet?.Cols)) {
                return sheet.Cols.map((c: any) => c?.Name).filter(Boolean);
            }
            const cnt = sheet?.getColCount?.() ?? sheet?.GetColCount?.();
            const names: string[] = [];
            if (typeof cnt === "number") {
                for (let i = 0; i < cnt; i++) {
                    const nm = sheet?.getColName?.(i) ?? sheet?.GetColName?.(i);
                    if (nm) names.push(String(nm));
                }
            }
            return names;
        } catch {
            return [];
        }
    }

    function addRowCompat(sheet: any, init: Record<string, any>) {
        // IBSheet8 구버전: addRow(next, visible, focus, parent, init, render)
        if (typeof sheet?.addRow === "function" && sheet.addRow.length >= 1) {
            sheet.addRow(null, 1, 1, null, init, 1);
            return;
        }
        // 대문자 API 객체시그니처
        if (typeof sheet?.AddRow === "function") {
            sheet.AddRow({ Init: init });
            return;
        }
        throw new Error("IBSheet addRow/AddRow API를 찾을 수 없습니다.");
    }

    function getLastRowCompat(sheet: any) {
        return sheet?.getLastRow?.() ?? sheet?.GetLastRow?.() ?? null;
    }

    function getValueCompat(sheet: any, row: any, col: string) {
        return sheet?.getValue?.(row, col) ?? sheet?.GetValue?.(row, col);
    }

    function showMessageCompat(sheet: any, html: string) {
        const show = sheet?.showMessageTime ?? sheet?.ShowMessageTime;
        show?.call?.(sheet, { message: html, buttons: ["확인"] });
    }

    const handleAddRow = (section: "left" | "right") => {
        const chargeCd = selectedTransport.chargeCd;
        const sender = selectedTransport.sender;
        const receiver = selectedTransport.receiver;

        if (section === "left") {
            const left: any = getLeftSheet?.();
            if (dirtyRef.current) {
                showMessageCompat(
                    left,
                    "<span style='color:black'>현재 발신처 변경사항을 먼저 저장하세요.</span>"
                );
                return;
            }
        }

        // 1) 시트 인스턴스
        const sheet =
            section === "left" ? leftSheetRef.current : rightSheetRef.current;

        if (!sheet) {
            console.error("❌ sheet ref가 비어있습니다.", { section, sheet });
            return;
        }

        const hasAddRow =
            typeof sheet.addRow === "function" || typeof sheet.AddRow === "function";
        if (!hasAddRow) {
            console.error("❌ IBSheet 인스턴스가 아닐 수 있습니다 (addRow/AddRow 없음).", sheet);
            return;
        }

        // 2) (참고) 마지막 행 핸들 — 빈 그리드면 null
        const last = getLastRowCompat(sheet);
        let leftInit = {};
        let rightInit = {};

        // 4) 수신처 드래프트키 확보
        // 현재 선택된 수신처(드래프트 키 포함)
        const rc = selectedtTransportRef.current;
        let recvDraftKey: string = String((rc as any)?._draftKey ?? "");
        if (section === "right") {
            // 3) 우측 기본값(단가 자동)
            let calculationCd: "QTY" | "WEIGHT" = "QTY";
            if (sender.shipperCd === "COM" && receiver.shipperCd === "COM") {
                calculationCd = "WEIGHT";
            }

            const unit =
                calculationCd === "QTY"
                    ? (chargeCd === "CH001" ? Number(sender.untpc ?? 0) : Number(receiver.untpc ?? 0))
                    : Number(sender.weightUntpc ?? 0);

            const receiverUnit =
                calculationCd === "QTY"
                    ? Number(receiver.untpc ?? 0)
                    : Number(receiver.weightUntpc ?? 0);

            if (!rc) {
                showMessageCompat(sheet, "<span style='color:black'>먼저 발신처를 선택(또는 추가)하세요.</span>");
                return;
            }

            const left: any = getLeftSheet?.();
            recvDraftKey = (transportId > 0) ? "" : ensureRecvDraftKey(left);

            // 5) 행 init 값
            rightInit = {
                transportDtlId: 0,
                transportId: 0,
                _recvDraftKey: recvDraftKey, // 화면용 (수신처 드래프트키)
                calculationCd,
                untpc: unit,
                receiverUntpc: receiverUnit,
                amount: 0,
                receiverAmount: 0,
            };
        } else {
            leftInit = {
                receiverTransportId: 0,
                receiverCompanyId: 0,
                receiverCompanyNm: "",
                receiverTelNo: "",
                receiverManagerTelNo: "",
                receiverManagerNm: "",
                receiverAddress: "",
                receiverRegionCd: "",
                receiverRegionDtlCd: "",
                totalSenderAmount: 0,
                receiverRmk: "",
                receiverWeightUntpc: selectedTransport.receiver.weightUntpc,
                receiverUntpc: selectedTransport.receiver.untpc,
                _draftKey: makeDraftKey(),
            };
        }

        // 6) 마지막 행 유효성 체크 (필수값 미입력 시 추가 금지)
        if (last) {
            const required =
                section === "left" ? ["senderCompanyNm"] : ["calculationCd", "kindCd"];

            const hasEmpty = required.some((field) => {
                const v = getValueCompat(sheet, last, field);
                return v === null || v === undefined || v === "";
            });

            if (hasEmpty) {
                const msg =
                    section === "left"
                        ? `<span style='color:black'>이전 발신처의 정보가 모두 입력되어야 새로운 발신처를 추가할 수 있습니다.</span>`
                        : `<span style='color:black'>이전 물품의 정보가 모두 입력되어야 새로운 물품을 추가할 수 있습니다.</span>`;
                showMessageCompat(sheet, msg);
                return;
            }
        }

        // 7) Init에서 "시트에 존재하지 않는 컬럼" 제거 (가장 흔한 addRow 실패 원인)
        const colNames = getColNames(sheet);
        const initRaw = section === "left" ? leftInit : rightInit;

        const removed = Object.keys(initRaw).filter((k) => !colNames.includes(k));
        if (removed.length) {
            console.warn("⚠️ Init에서 제거된 컬럼:", removed);
            // 필요하면 Cols에 숨김컬럼으로 추가: { Name: "_draftKey", Visible:0, CanEdit:0, Width:0 }
        }

        // 8) 행 추가 — **맨 끝에 추가**(next/parent 생략) + API 호환
        try {
            addRowCompat(sheet, initRaw);
        } catch (e) {
            console.error("💥 addRow 호출 실패:", e, { initRaw });
            showMessageCompat(
                sheet,
                "<span style='color:black'>행 추가 중 오류가 발생했습니다. 콘솔 로그를 확인하세요.</span>"
            );
            return;
        }

        // 9) 새 행 핸들 & 포커스
        const newRow = getLastRowCompat(sheet);
        if (!newRow) return;

        const stripDraft = <T extends { _draftKey?: string }>(o: T) => {
            const { _draftKey, ...rest } = o;
            return rest as Omit<T, "_draftKey">;
        };

        const focus =
            sheet.focus ?? sheet.Focus ?? sheet.FocusRow ?? sheet.GoToCell;

        if (section === "left") {
            setEditingRowKey(newRow);

            // 그리드에서 방금 추가된 행 값 읽어오기
            const picked = (pickRowDataFromHandle?.(sheet, newRow) as any) ?? {};

            const newSender = {
                ...emptyCompany(),
                ...picked,
                _draftKey: leftInit._draftKey, // 화면용 키(상태 저장 시 제거)
            } as any;

            // 선택 상태 갱신 (발신 유지, 수신 초기화)
            setSelectedTransport((prev: any) => ({
                transportId: 0,
                chargeCd: prev.chargeCd,
                receiver: { ...prev.receiver },
                sender: stripDraft(newSender),
            }));

            // 우측 그리드 초기화 & 파라미터 리셋
            clearRightGrid();
            setRightParams({
                transportId: transportId > 0 ? transportId : 0,
                startDate : startDate,
                endDate : endDate,
                senderReceiverCd : 'RECEIVER'
            });

            focus?.call(sheet, newRow, "senderCompanyNm");
        } else {
            focus?.call(sheet, newRow, "kindCd");
        }
    };

    const [editingRowKey, setEditingRowKey] = useState<any>(null); // 좌측 IBSheet 행 핸들

    function getLeftSheet() {
        const r: any = leftSheetRef.current;
        if (!r) return null;
        if (typeof r.getSheet === 'function') return r.getSheet();
        if (r.sheet) return r.sheet;
        return r; // 이미 인스턴스라면
    }

    // 렌더 직전 계산
    const editingLabel = (() => {
        const sheet: any = getLeftSheet();
        if (!sheet || !editingRowKey) return '';
        const idx =
            sheet.getRowIndex?.(editingRowKey) ??
            sheet.GetRowIndex?.(editingRowKey) ??
            editingRowKey?.Index;
        return typeof idx === 'number' ? idx : '';
    })();

    const call = (sheet: any, fn?: Function, ...args: any[]) => fn && fn.call(sheet, ...args);

    const commitSendetToLeftGrid = useCallback(() => {
        const sheet: any = getLeftSheet();
        const r = selectedTransport.sender;
        if (!sheet || !r) return;

        // 행이 선택(혹은 방금 추가)되어 있어야만 업데이트 허용
        const row = editingRowKey ?? call(sheet, sheet.getFocusedRow) ?? call(sheet, sheet.GetFocusedRow);
        if (!row) {
            // ADD 금지: 행이 없으면 아무 것도 하지 않음
            return;
        }
        const draftKey = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const payload = {
            transportDtl: [],
            senderTransportId: Number(
                (r as any)?.senderTransportId ??
                sheet?.getValue?.(row, "senderTransportId") ??
                sheet?.GetValue?.(row, "senderTransportId") ?? 0
            ),
            senderCompanyId: Number(
                (r as any)?.senderCompanyId ??
                sheet?.getValue?.(row, "senderCompanyId") ??
                sheet?.GetValue?.(row, "senderCompanyId") ?? 0
            ),
            senderCompanyNm: (r.companyNm ?? '').trim(),
            senderTelNo: (r.telNo ?? '').trim(),
            senderManagerTelNo: (r.managerTelNo ?? '').trim(),
            senderManagerNm: (r.managerNm ?? '').trim(),
            senderAddress: (r.address ?? '').trim(),
            senderRegionCd: r.regionCd ?? '',
            senderRegionDtlCd: r.regionDtlCd ?? '',
            totalReceiverAmount: Number((r as any).amount ?? 0),
            senderRmk: (r.rmk ?? '').trim(),
            untpc: Number(r.untpc ?? 0),
            weightUntpc: Number(r.weightUntpc ?? 0),
            _draftKey: String(
                (r as any)?._draftKey ??
                sheet?.getValue?.(row, "_draftKey") ??
                sheet?.GetValue?.(row, "_draftKey") ??
                draftKey // fallback
            ),
        };

        if (!isSenderMeaningful(payload)) {
            // 시트 셀 값은 넣되, 상태(receivers)엔 추가/교체하지 않음
            const setV = sheet.setValue ?? sheet.SetValue;
            Object.entries(payload).forEach(([k, v]) => setV?.call(sheet, row, k, v, 1));
            setV?.call(sheet, row, '_draftKey', payload._draftKey, 0);
            sheet.RefreshCalc?.(1, row);
            return;
        }

        const setter = sheet.setValue ?? sheet.SetValue;
        if (setter) {
            Object.entries(payload).forEach(([k, v]) => setter.call(sheet, row, k, v, 1));
        } else if (sheet.setDataRow) {
            call(sheet, sheet.setDataRow, row, payload);
        }
        call(sheet, sheet.RefreshCalc, 1, row);
    }, [selectedTransport, editingRowKey]);


    const {schedule: scheduleCommit, flush: flushCommit} = useDebouncedCommit(() => {
        commitSendetToLeftGrid();
    }, 300);

    const sameReceiver = (a: any, b: any) => {
        if (!a || !b) return false;
        return (
            a.companyId === b.companyId
        );
    };

    const sameSender = (a: any, b: any) => {
        if (!a || !b) return false;
        return (
            a.transportId === b.transportId &&
            String(a._draftKey ?? "") === String(b._draftKey ?? "")
        );
    };

    const toSender = (row: any) => ({
        transportId: Number(row.transportId ?? 0),
        companyId: Number(row.senderCompanyId ?? 0),
        companyNm: String(row.senderCompanyNm ?? ""),
        telNo: String(row.senderTelNo ?? ""),
        address: String(row.senderAddress ?? ""),
        managerNm: String(row.senderManagerNm ?? ""),
        managerTelNo: String(row.senderManagerTelNo ?? ""),
        rmk: String(row.senderRmk ?? ""),
        regionCd: String(row.sender_region_cd ?? row.senderRegionCd ?? ""),
        regionDtlCd: String(row.sender_region_dtl_cd ?? row.senderRegionDtlCd ?? ""),
        shipperCd: String(row.sender_transport_shipper_cd ?? row.senderTransportShipperCd ?? ""),
        billStdrCd: String(row.bill_stdr_cd ?? row.billStdrCd ?? ""),
    });

    const toReceiver = (row: any) => ({
        transportId: Number(row.transportId ?? 0),
        chargeCd : String(row.chargeCd ?? ""),
        companyId: Number(row.receiverCompanyId ?? 0),
        companyNm: String(row.receiverCompanyNm ?? ""),
        telNo: String(row.receiverTelNo ?? ""),
        address: String(row.receiverAddress ?? ""),
        managerNm: String(row.receiverManagerNm ?? ""),
        managerTelNo: String(row.receiverManagerTelNo ?? ""),
        rmk: String(row.receiverRmk ?? ""),
        regionCd: String(row.receiver_region_cd ?? row.receiverRegionCd ?? ""),
        regionDtlCd: String(row.receiver_region_dtl_cd ?? row.receiverRegionDtlCd ?? ""),
        shipperCd: String(row.receiver_transport_shipper_cd ?? row.receiverTransportShipperCd ?? ""),
        billStdrCd: String(row.bill_stdr_cd ?? row.billStdrCd ?? ""),
        receiverUntpc: Number(row.receiver_untpc ?? row.receiverUntpc ?? ""),
        receiverWeightUntpc: Number(row.receiver_weight_untpc ?? row.receiverWeightUntpc ?? ""),
        _draftKey: String(row._draftKey ?? "")
    });

    const isReceiverMeaningful = (row: any) => {
        const N = (v: any) => Number(v) || 0;
        const T = (v: any) => (v ?? "").toString().trim();
        // 아이디가 있거나 / 표시 필드 중 하나라도 채워져 있으면 의미 있음
        return (
            N(row.receiverCompanyId) > 0 ||
            !!(T(row.receiverCompanyNm) || T(row.receiverTelNo) || T(row.receiverAddress) ||
                T(row.receiverManagerNm) || T(row.receiverManagerTelNo))
        );
    };

    const upsertSender = (rowData: any) => {
        const nextReceiverRaw = toReceiver(rowData);
        const nextSender  = toSender(rowData);

        setSelectedTransport(prev => {
            // sender는 row에 값이 '의미 있게' 있을 때만 교체, 아니면 기존 유지
            const receiverToUse = isReceiverMeaningful(rowData) ? nextReceiverRaw : prev.receiver;

            const receiverChanged   = !sameReceiver(prev.receiver, receiverToUse);
            const senderChanged = !sameSender(prev.sender, nextSender);

            if (!senderChanged && !receiverChanged) return prev;

            return {
                ...prev,
                // row가 서버 데이터면 transportId가 있을 것이고, 초안이면 0 유지
                transportId: Number(prev.transportId ?? rowData.transportId ?? 0),
                chargeCd : String(rowData.chargeCd ?? ""),
                sender: nextSender,
                receiver: receiverToUse,
            };
        });
    };

    function pickRowDataFromHandle(sheet: any, rowHandle: any): Transport | null {
        // 1) 가능한 API 시도
        const viaApi =
            call(sheet, sheet.getRowData, rowHandle) ||
            call(sheet, sheet.GetRowData, rowHandle) ||
            call(sheet, sheet.getDataRow, rowHandle) ||
            call(sheet, sheet.GetDataRow, rowHandle);
        if (viaApi) return viaApi;

        // 2) 컬럼 이름 기반 수동 구성 (leftColumns의 Name 사용)
        try {
            const obj: any = {};
            for (const c of leftColumns) {
                const name = (c as any).Name || (c as any).name;
                if (!name) continue;
                const v = call(sheet, sheet.getValue, rowHandle, name) ?? call(sheet, sheet.GetValue, rowHandle, name);
                obj[name] = v;
            }
            if (Object.keys(obj).length) return obj as Transport;
        } catch {
        }
        return null;
    }

    // (재사용) row 기준 식별 키
    const keyOfRow = (row: any) =>
        `${Number(row.transportId ?? 0)}:${Number(row.senderCompanyId ?? 0)}:${String(row._draftKey ?? "")}`;

// (재사용) 현재 선택된 값 기준 식별 키
    const keyOfSelected = (st: any) =>
        `${Number(st?.transportId ?? 0)}:${Number(st?.sender?.senderCompanyId ?? 0)}:${String(st?.receiver?._draftKey ?? "")}`;


    // row 선택 (왼쪽 그리드)
    const handleLeftRowClick = (maybeDataOrRow: any, maybeRow?: any) => {
        // 1) 미저장 변경 방지
        if (dirtyRef.current) {
            const left: any = getLeftSheet?.();
            left?.showMessageTime?.({
                message: "<span style='color:black'>현재 발신처 변경사항을 먼저 저장하세요.</span>",
                buttons: ["확인"],
            });
            return;
        }

        //flushCommit(); // 미커밋 확정

        // 2) 선택 행 데이터 확보
        const sheet = getLeftSheet();
        const rowHandle = maybeRow ?? maybeDataOrRow;
        const rowData = pickRowDataFromHandle(sheet, rowHandle);
        if (!rowData) return;

        // 3) 동일 선택 여부 판단 (transportId + receiverCompanyId + _draftKey)
        const prevKey = keyOfSelected(selectedTransport);
        const nextKey = keyOfRow(rowData);
        const isSame = prevKey === nextKey;

        // 4) receiver 업서트(= selectedTransport.receiver 갱신)
        //    - 옵션 A 버전 upsertReceiver 사용 (이 함수가 내부에서 selectedTransport를 set함)
        setSelectedSenderTransport(rowData);
        upsertSender(rowData);
        // 5) 편집 키는 유지
        setEditingRowKey(rowHandle);

        // 6) 동일 선택이 아니면 우측 파라미터/새로고침
        if (!isSame) {
            setRightParams({
                transportId: Number(rowData.transportId ?? 0),
                startDate,
                endDate,
                senderReceiverCd : 'RECEIVER',
                _ts: Date.now(),     // ← 캐시 버스터
            });
            rightForceRefresh();
        }

        // 7) 플래그 초기화
        dirtyRef.current = false;
    };


    // row 선택 (오른쪽 그리드)
    const handleRightRowClick = (shipment: TransportDtl) => {
        setSelectedTransportDtl(shipment);
    };

    // row 삭제
    const handleDeleteSelected = async (section: 'left' | 'right') => {
        const sheet: any = section === 'left' ? leftSheetRef.current : rightSheetRef.current;

        const rowHandle =
            section === 'left'
                ? (editingRowKey ?? sheet?.getFocusedRow?.() ?? sheet?.GetFocusedRow?.())
                : selectedTransportDtl; // (right는 지금 row handle을 상태에 들고 있음)

        // 메시지/ID는 '데이터'에서 읽기
        const selectedId =
            section === 'left'
                ? Number(selectedSenderTransport?.transportId || 0)
                : Number(selectedTransportDtl?.transportDtlId || 0);

        if (!rowHandle) {
            sheet?.showMessageTime?.({ message: "<span style='color:black'>선택된 행이 없습니다.</span>", buttons: ["확인"] });
            return;
        }

        const msg =
            section === 'left'
                ? `<span style='color:black'>발신처 '${selectedTransport?.sender.companyNm ?? ''}'을(를) 삭제하시겠습니까?</span>`
                : `<span style='color:black'>물품 '${selectedTransportDtl?.kindCd ?? ''}'을(를) 삭제하시겠습니까?</span>`;

        if(selectedId>0){
            sheet.showMessageTime?.({
                message: msg,
                buttons: ["확인", "취소"],
                func: (args: number) => {
                    if (args !== 1) return;
                    sheet.removeRow?.(rowHandle);

                    const tId = Number(selectedSenderTransport?.transportId || 0);
                    const tdId = Number(selectedTransportDtl?.transportDtlId || 0);
                    if (section === 'left') {
                        setSelectedSenderTransport(null);
                        if (tId > 0) {
                            deleteReceiverMutation.mutate({ id: tId });
                        }
                    } else {
                        setSelectedTransportDtl(null);
                        if (tId > 0 && tdId > 0) {
                            setDeletedTransportDtlIds((prev) => {
                                const next = { ...prev };
                                const arr = next[tId] ?? [];
                                if (!arr.includes(tdId)) next[tId] = [...arr, tdId];
                                return next;
                            });
                        }
                    }
                },
            });
        } else {
            sheet.removeRow?.(rowHandle);
        }
    };


    // 저장된 수신처 삭제
    const deleteReceiverMutation = useCustomMutation<{ id: number }>({
        mutationFn: async ({id}) => {
            const response = await apiRequest("DELETE", `/api/transport/delete/${id}`);
            return response.json();
        },
        queryKeyToInvalidate: "/transport/receiver-list",
        onExtraSuccess: () => leftForceRefresh,
        successMessage: "수신처가 성공적으로 삭제되었습니다.",
        errorMessage: "수신처 삭제에 실패했습니다.",
    });

    const purgeDrafts = () => {
        //setReceivers(prev => prev.filter(r => Number(r.receiverTransportId) > 0));
        // 선택 상태도 정리
        setSelectedSenderTransport(null);
        setTransportDtl(prev => prev.filter(s => Number(s.senderTransportId) > 0));
        // 우측 그리드 초기화(선택 해제 느낌)
        clearRightGrid();
    };

    // 해당 화면에서는 신규 추가 기능 없음
    // const createTransportMutation = useApiMutation<InsertTransport>({
    //     method: "POST",
    //     url: "/api/transport/shipment-save",
    //     invalidateQueryKey: "/transport/receiver-list",
    //     successMessage: "운송정보가 성공적으로 생성되었습니다.",
    //     errorMessage: "운송정보 생성에 실패했습니다.",
    //     onExtraSuccess: () => leftForceRefresh,
    // });

    const updateTransportMutation = useCustomMutation<InsertTransport & { id: number }>({
        mutationFn: async ({id, ...payload}) => {
            const response = await apiRequest("POST", `/api/transport/shipment-save`, {
                ...payload,
                senderTransportId: id,
            });
            return response.json();
        },
        queryKeyToInvalidate: "/transport/receiver-list",
        onExtraSuccess: (updatedData) => {
            leftForceRefresh();
            purgeDrafts();
        },
        successMessage: "운송정보가 수정되었습니다.",
        errorMessage: "운송정보 수정에 실패했습니다.",
    });

    // 변경 여부
    const dirtyRef = useRef(false);

    // 마지막 저장상태로 더티 리셋
    function clearDirtyWithSnapshot() {
        dirtyRef.current = false;
    }

    // 변경 발생 시 호출
    function markDirty() {
        dirtyRef.current = true;
    }

    const activeRecvKeyRef = useRef<string>("");

    function ensureRecvDraftKey(left: any): string {
        // 1) 이미 있으면 재사용
        if (activeRecvKeyRef.current) return activeRecvKeyRef.current;

        // 2) 좌측 포커스 행에서 읽기
        const row = left?.getFocusedRow?.() || left?.GetFocusedRow?.();
        let key = row ? (left.getValue?.(row, "_draftKey") ?? left.GetValue?.(row, "_draftKey") ?? "") : "";

        // 3) 그래도 없으면 ‘딱 1번’ 생성
        if (!key) {
            key = makeDraftKey();
            if (left && row) {
                const setV = left.setValue ?? left.SetValue;
                setV?.call(left, row, "_draftKey", key, 0);
                left.RefreshCalc?.(1, row);
            }
        }

        activeRecvKeyRef.current = String(key);

        // 선택 상태에도 반영(있으면)
        setSelectedTransport(prev =>
            prev ? ({ ...prev, receiver: { ...(prev.receiver ?? {}), _draftKey: key } } as any) : prev
        );

        return key;
    }


    // 값이 없으면 삭제, 있으면 set
    const setOrDelete = (qs: URLSearchParams, key: string, val?: string | number | null) => {
        const v = (val ?? "").toString().trim();
        if (v) qs.set(key, v);
        else qs.delete(key);
    };

// 검색 조건 → URL 반영
    const pushFiltersToUrl = (opts?: { replace?: boolean }) => {
        const qs = new URLSearchParams(location.search); // 기존 쿼리 유지한 뒤 일부만 갱신

        // 1) 기간
        setOrDelete(qs, "startDate", searchParams.startDate);
        setOrDelete(qs, "endDate", searchParams.endDate);

        // 2) 선택된 발신/운송 건 정보(있으면 유지)
        setOrDelete(qs, "transportId", transportId > 0 ? transportId : null);
        setOrDelete(qs, "receiverCompanyId", selectedTransport?.receiver?.companyId || receiverCompanyId || null);

        navigate(
            { pathname: location.pathname, search: qs.toString() },
            { replace: Boolean(opts?.replace) } // 히스토리에 남기고 싶으면 false(기본)
        );
    };

    // 기존: <Button ... onClick={handleSearch}>
// 변경: URL 반영 + 그리드 새로고침까지 한 번에
    const onClickSearch = () => {
        // 1) URL 먼저 갱신
        pushFiltersToUrl(); // or pushFiltersToUrl({ replace: true });

        // 2) 내부 훅 검색 실행 (appliedParams 갱신)
        handleSearch();

        // 3) 좌/우 그리드 조건도 동기화 후 새로고침
        setLeftParams(prev => ({
            ...prev,
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
            // senderCompanyId는 기존 state 흐름 유지
        }));
        leftForceRefresh();

        setRightParams(prev => ({
            ...prev,
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
            senderReceiverCd: 'RECEIVER',
            _ts: Date.now(),  // 캐시 버스터
        }));
        rightForceRefresh();
    };

    const fmt = (d: Date) =>
        format(new Date(d.getFullYear(), d.getMonth(), d.getDate()), "yyyy-MM-dd", { locale: ko });

    const leftParamsWithTs = useMemo(
        () => ({ ...leftParams, _ts: Date.now() }),
        [leftParams, leftReloadKey]
    );

    const senderUrl = "/api/transport/sender-list";
    const senderSheetKey =
        `sender|${leftParams.startDate}|${leftParams.endDate}|${leftParams.receiverCompanyId}|${leftReloadKey}`;


    return (
        <div className="min-h-screen bg-white korean-text">
            {/* Fixed Header - Full Width */}
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-3 sticky top-0 z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            className="flex items-center gap-2 h-8"
                        >
                            <ArrowLeft className="w-4 h-4"/>
                            목록으로
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">도착분 수정</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 h-10">
                            <Save className="w-4 h-4 mr-2"/>
                            저장
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content - 2-Column Layout */}
            <div className="flex h-[calc(100vh-60px)]">
                {/* Left Panel - Sender Info + Recipients List */}
                <div className={`w-3/5 overflow-hidden transition-all duration-300 ${
                    selectedTransport !== null
                        ? 'bg-gray-200'
                        : 'bg-gray-50'
                }`}>
                    <div className="p-6 space-y-6">
                        {transportId > 0 && (
                            <div className="bg-white border border-gray-200 rounded-lg">
                                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-sm font-semibold text-gray-800">검색 조건</h3>
                                </div>

                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-2 md:gap-3 lg:gap-4 flex-wrap">
                                        {/* 접수일시기간 */}
                                        <div className="flex items-center gap-x-2">
                                            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">접수일시 기간</Label>

                                            {/* 시작일 */}
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn("w-36 justify-start text-left font-normal", !searchParams.startDate && "text-muted-foreground")}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {searchParams.startDate || "시작일"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        locale={ko}
                                                        selected={startDate}
                                                        onSelect={(d) => {
                                                            if (!d) return;
                                                            setSearchParams(prev => ({ ...prev, startDate: fmt(d) }));
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>

                                            <span className="text-gray-400">~</span>

                                            {/* 마감일 */}
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn("w-36 justify-start text-left font-normal", !searchParams.endDate && "text-muted-foreground")}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {searchParams.endDate || "마감일"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        locale={ko}
                                                        selected={endDate}
                                                        onSelect={(d) => {
                                                            if (!d) return;
                                                            setSearchParams(prev => ({ ...prev, endDate: fmt(d) }));
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* 배송코스 */}
                                        {/*<div className="flex items-center gap-x-2">*/}
                                        {/*    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">배송코스</Label>*/}
                                        {/*    <CommonCodeSelect*/}
                                        {/*        url="/api/delivery-route/list"*/}
                                        {/*        includeAll*/}
                                        {/*        valueKey="deliveryRouteId"*/}
                                        {/*        labelKey="deliveryRouteNm"*/}
                                        {/*        value={searchParams.deliveryRouteId ? String(searchParams.deliveryRouteId) : "all"}*/}
                                        {/*        onChange={(val) =>*/}
                                        {/*            setSearchParams(prev => ({*/}
                                        {/*                ...prev,*/}
                                        {/*                deliveryRouteId: val === "all" ? 0 : Number(val),*/}
                                        {/*            }))*/}
                                        {/*        }*/}
                                        {/*        triggerClassName="w-28"*/}
                                        {/*    />*/}
                                        {/*</div>*/}

                                        {/* 발신처 */}
                                        {/*<div className="flex items-center gap-x-2">*/}
                                        {/*    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">발신처</Label>*/}
                                        {/*    <Input*/}
                                        {/*        className="w-32 md:w-40"*/}
                                        {/*        value={searchParams.senderCompanyNm ?? ""}*/}
                                        {/*        onChange={(e) => setSearchParams(prev => ({ ...prev, senderCompanyNm: e.target.value }))}*/}
                                        {/*        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}*/}
                                        {/*        placeholder="업체명"*/}
                                        {/*    />*/}
                                        {/*</div>*/}

                                        {/* 수신처 */}
                                        {/*<div className="flex items-center gap-x-2">*/}
                                        {/*    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">수신처</Label>*/}
                                        {/*    <Input*/}
                                        {/*        className="w-32 md:w-40"*/}
                                        {/*        value={searchParams.receiverCompanyNm ?? ""}*/}
                                        {/*        onChange={(e) => setSearchParams(prev => ({ ...prev, receiverCompanyNm: e.target.value }))}*/}
                                        {/*        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}*/}
                                        {/*        placeholder="업체명"*/}
                                        {/*    />*/}
                                        {/*</div>*/}

                                        {/* 버튼 영역 (오른쪽 정렬) */}
                                        <div className="ml-auto flex items-center gap-x-2">
                                            {/*<Button variant="outline" onClick={resetFilters}>*/}
                                            {/*    <RotateCcw className="w-4 h-4 mr-2" />*/}
                                            {/*    초기화*/}
                                            {/*</Button>*/}
                                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={onClickSearch}>
                                                <Search className="w-4 h-4 mr-2" />
                                                검색
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* 1. Sender Information Section */}
                        <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                            <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                                <h3 className="text-sm font-semibold text-gray-800">수신처 정보</h3>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-12 md:col-span-3 relative">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">업체명*</Label>
                                        <CompanyAutoComplete
                                            value={selectedTransport.receiver.companyNm || ""}
                                            onSelect={(company) => {
                                                setSelectedTransport((prev) => ({
                                                    ...prev, // transportId, chargeCd는 그대로
                                                    receiver: {
                                                        ...prev.receiver,
                                                        companyId: Number(company.companyId) || 0,
                                                        companyNm: company.companyNm ?? "",
                                                        shipperCd: company.shipperCd ?? "",
                                                        telNo: company.telNo ?? "",
                                                        address: company.address ?? "",
                                                        managerNm: company.managerNm ?? "",
                                                        managerTelNo: company.managerTelNo ?? "",
                                                        rmk: company.rmk ?? "",
                                                        regionCd: company.regionCd ?? "",
                                                        regionDtlCd: company.regionDtlCd ?? "",
                                                        untpc: Number(company.untpc) || 0,
                                                        weightUntpc: Number(company.weightUntpc) || 0,
                                                    },
                                                }));
                                                // 왼쪽 조건 자동 세팅
                                                setLeftParams({
                                                    receiverCompanyId: Number(company.companyId) || 0 ,
                                                    startDate : startDate,
                                                    endDate : endDate
                                                });
                                            }}
                                            className="flex-1"
                                            placeholder="업체명을 입력하세요"
                                            minChars={1}  // 1자부터 검색 시작 (원하면 2~3자로 조정)
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-1">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">운송구분</Label>
                                        <CommonCodeSelect
                                            type="SHIPPER_TYPE"
                                            value={String(selectedTransport?.receiver.shipperCd ||"COM")}
                                            onChange={(v) => updateSender({shipperCd: String(v)})}
                                            onBlur={scheduleCommit}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-1">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">요금구분</Label>
                                        <CommonCodeSelect
                                            type="CHARGE"
                                            value={selectedTransport.chargeCd}
                                            onChange={(val) => setSelectedTransport(prev => ({
                                                ...prev,
                                                chargeCd: val
                                            }))}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">지역</Label>
                                        <CommonCodeSelect
                                            type="REGION_TYPE"
                                            value={selectedTransport.receiver.regionCd || "DAEGU"}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    receiver: {
                                                        ...prev.receiver,
                                                        regionCd: val,
                                                        regionDtlCd: ""
                                                    },
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">지역구분</Label>
                                        <CommonCodeSelect
                                            type="REGION_DTL_TYPE"
                                            value={selectedTransport.receiver.regionDtlCd}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    receiver :{
                                                        ...prev.receiver,
                                                        regionDtlCd: val
                                                    }
                                                }))
                                            }
                                            parent={selectedTransport.receiver.regionCd}
                                            requireParent={true}
                                            parentKey="parentsCodeVal"
                                            disabled={!selectedTransport.receiver.regionCd}
                                        />
                                    </div>
                                    {/*<div className="col-span-12 md:col-span-3">*/}
                                    {/*    <Label className="text-xs font-medium text-gray-700 mb-1 block">담당자명</Label>*/}
                                    {/*    <Input*/}
                                    {/*        className={`relative z-20 ${!selectedTransport.receiver.managerNm ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}*/}
                                    {/*        placeholder="담당자 이름"*/}
                                    {/*        value={selectedTransport.receiver.managerNm}*/}
                                    {/*        onChange={(val) =>*/}
                                    {/*            setSelectedTransport((prev) => ({*/}
                                    {/*                ...prev,*/}
                                    {/*                receiver :{*/}
                                    {/*                    ...prev.receiver,*/}
                                    {/*                    managerNm: val.target.value*/}
                                    {/*                }*/}
                                    {/*            }))*/}
                                    {/*        }*/}
                                    {/*    />*/}
                                    {/*</div>*/}
                                    <div className="col-span-12 md:col-span-3">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">배송코스</Label>
                                        <Input
                                            readOnly
                                            className={`relative z-20 ${!selectedTransport.receiver.deliveryRouteNm ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            value={selectedTransport.receiver.deliveryRouteNm}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    receiver :{
                                                        ...prev.receiver,
                                                        deliveryRouteNm: val.target.value
                                                    }
                                                }))
                                            }
                                        />
                                    </div>

                                    {/* 2행 */}
                                    <div className="col-span-12 md:col-span-6">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">주소</Label>
                                        <Input
                                            className={`relative z-20 ${!selectedTransport.receiver.address ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            placeholder="주소"
                                            value={selectedTransport.receiver.address}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    receiver :{
                                                        ...prev.receiver,
                                                        address: val.target.value
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">전화번호</Label>
                                        <Input
                                            className={`relative z-20 ${!selectedTransport.receiver.telNo ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            placeholder="전화번호"
                                            value={selectedTransport.receiver.telNo}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    receiver :{
                                                        ...prev.receiver,
                                                        telNo: val.target.value
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">휴대폰</Label>
                                        <Input
                                            className={`relative z-20 ${!selectedTransport.receiver.managerTelNo ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            placeholder="담당자 연락처"
                                            value={selectedTransport.receiver.managerTelNo}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    receiver :{
                                                        ...prev.receiver,
                                                        managerTelNo: val.target.value
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                    {/* 3행 */}
                                    <div className="col-span-12">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">비고</Label>
                                        <Input
                                            className={`relative z-20 overflow-hidden text-ellipsis ${!selectedTransport.receiver.rmk ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            placeholder="비고"
                                            value={selectedTransport.receiver.rmk}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    receiver :{
                                                        ...prev.receiver,
                                                        rmk: val.target.value
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Recipients List Section - Grid/Table Format */}
                        <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                            <div
                                className="bg-gray-50 border-b border-gray-300 px-4 py-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-800">발신처 목록</h3>
                                {/*<div className="flex space-x-3">*/}
                                {/*    /!* 선택 삭제 *!/*/}
                                {/*    <Button*/}
                                {/*        variant="outline"*/}
                                {/*        onClick={() => handleDeleteSelected("left")}*/}
                                {/*        disabled={!selectedTransport}*/}
                                {/*        className={cn(*/}
                                {/*            "transition-colors",*/}
                                {/*            selectedTransport*/}
                                {/*                ? "border-red-600 text-red-600 hover:bg-red-50"*/}
                                {/*                : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
                                {/*        )}*/}
                                {/*    >*/}
                                {/*        <Edit className="w-4 h-4 mr-2"/>*/}
                                {/*        선택 삭제*/}
                                {/*    </Button>*/}
                                {/*    <Button*/}
                                {/*        onClick={() => handleAddRow("left")}*/}
                                {/*        className="bg-blue-600 hover:bg-blue-700 text-white"*/}
                                {/*    >*/}
                                {/*        <Plus className="w-3 h-3 mr-1"/>*/}
                                {/*        수신처 추가*/}
                                {/*    </Button>*/}
                                {/*</div>*/}
                            </div>

                            {/* Table Grid Format - Excel Compatible */}
                            <div className="flex-1 overflow-auto">
                                {/* 데이터 영역 */}
                                {/* ib sheet 사용 */}
                                <CommonSheet key={senderSheetKey}
                                             url={senderUrl}
                                             searchParams={leftParamsWithTs}
                                             usePaging={false}
                                             // pageLength={17}
                                             editMode={1}
                                             columns={leftColumns}
                                             handleRowClick={handleLeftRowClick}
                                             gridName="receiverTransport"
                                             height="400px"
                                             refreshTrigger={leftRefreshTrigger}
                                             externalSheetRef={leftSheetRef}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Detail Editing */}
                <div className={`w-2/5 overflow-y-auto transition-all duration-300 ${
                    selectedTransport !== null
                        ? 'bg-white'
                        : 'bg-gray-200'
                }`}>
                    <div className="p-6">
                        {selectedSenderTransport !== null ? (
                            <div className="space-y-6">
                                <div
                                    className="bg-gradient-to-r from-blue-100 to-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
                                    <h3 className="text-lg font-bold text-blue-900 mb-1 flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                                        발신처 {editingLabel}번 편집 중
                                    </h3>
                                    <p className="text-sm text-blue-800 font-medium">
                                        선택된 발신처의 상세 정보를 수정할 수 있습니다.
                                    </p>
                                </div>

                                {/* Recipient Basic Info */}
                                <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                                    <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                                        <h4 className="text-sm font-semibold text-gray-800">발신처 정보 입력</h4>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-4 gap-3">
                                            <div className="relative">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">업체명*</Label>
                                                <CompanyAutoComplete
                                                    value={selectedTransport?.sender.companyNm ?? ""}
                                                    onSelect={(company) => {
                                                        updateSender({
                                                            companyId: Number(company.companyId) || 0,
                                                            companyNm: company.companyNm ?? "",
                                                            shipperCd: company.shipperCd ?? "",
                                                            telNo: company.telNo ?? "",
                                                            address: company.address ?? "",
                                                            managerNm: company.managerNm ?? "",
                                                            managerTelNo: company.managerTelNo ?? "",
                                                            rmk: company.rmk ?? "",
                                                            regionCd: company.regionCd ?? "",
                                                            regionDtlCd: company.regionDtlCd ?? "",
                                                            untpc: Number(company.untpc) || 0,
                                                            weightUntpc: Number(company.weightUntpc) || 0,
                                                            deliveryRouteNm : company.deliveryRouteNm
                                                        });
                                                        scheduleCommit();
                                                    }}
                                                    onChange={(e) => updateSender({companyNm: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                    className="flex-1"
                                                    placeholder="업체명을 입력하세요"
                                                    minChars={1}  // 1자부터 검색 시작 (원하면 2~3자로 조정)
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">운송구분(구독여부)</Label>
                                                <CommonCodeSelect
                                                    type="SHIPPER_TYPE"
                                                    value={String(selectedTransport?.sender.shipperCd ||"COM")}
                                                    onChange={(v) => updateSender({shipperCd: String(v)})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">지역</Label>
                                                <CommonCodeSelect
                                                    type="REGION_TYPE"
                                                    value={String(selectedTransport?.sender.regionCd || "DAEGU")}
                                                    onChange={(v) => updateSender({
                                                        regionCd: String(v),
                                                        regionDtlCd: ""
                                                    })}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">지역구분</Label>
                                                <CommonCodeSelect
                                                    type="REGION_DTL_TYPE"
                                                    value={String(selectedTransport?.sender.regionDtlCd || "BUKGU")}
                                                    onChange={(v) => updateSender({regionDtlCd: String(v)})}
                                                    onBlur={scheduleCommit}
                                                    parent={selectedTransport.sender.regionCd}
                                                    requireParent={true}
                                                    parentKey="parentsCodeVal"
                                                    disabled={!selectedTransport.sender.regionCd}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">주소</Label>
                                                <Input
                                                    placeholder="주소"
                                                    value={selectedTransport?.sender.address || ''}
                                                    onChange={(e) => updateSender({address: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">담당자명</Label>
                                                <Input
                                                    placeholder="담당자명"
                                                    value={selectedTransport?.sender.managerNm || ''}
                                                    onChange={(e) => updateSender({managerNm: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">비고</Label>
                                                <Input
                                                    placeholder="비고"
                                                    value={selectedTransport?.sender.rmk || ''}
                                                    onChange={(e) => updateSender({rmk: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">전화번호</Label>
                                                <Input
                                                    placeholder="전화번호"
                                                    value={selectedTransport?.sender.telNo || ''}
                                                    onChange={(e) => updateSender({telNo: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">휴대폰</Label>
                                                <Input
                                                    placeholder="휴대폰"
                                                    value={selectedTransport?.sender.managerTelNo || ''}
                                                    onChange={(e) => updateSender({managerTelNo: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                                    <div
                                        className="bg-gray-50 border-b border-gray-300 px-4 py-3 flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-gray-800">물품 상세 정보 입력</h4>
                                        {/*<div className="flex space-x-3">*/}
                                        {/*    /!* 선택 삭제 *!/*/}
                                            <Button
                                                variant="outline"
                                                onClick={() => handleDeleteSelected("right")}
                                                disabled={!selectedTransport}
                                                className={cn(
                                                    "transition-colors",
                                                    selectedTransport
                                                        ? "border-red-600 text-red-600 hover:bg-red-50"
                                                        : "text-red-400 border-gray-300 cursor-not-allowed"
                                                )}
                                            >
                                                <Edit className="w-4 h-4 mr-2"/>
                                                선택 삭제
                                            </Button>
                                        {/*    <Button*/}
                                        {/*        onClick={() => handleAddRow("right")}*/}
                                        {/*        className="bg-blue-600 hover:bg-blue-700 text-white"*/}
                                        {/*    >*/}
                                        {/*        <Plus className="w-3 h-3 mr-1"/>*/}
                                        {/*        물품 추가*/}
                                        {/*    </Button>*/}
                                        {/*</div>*/}
                                    </div>

                                    <div className="p-4">
                                        {/* Shipments Detail Table */}
                                        {/* 데이터 영역 */}
                                        {/* ib sheet 사용 */}
                                        <CommonSheet url="/api/transport/transportDtl-list"
                                                     searchParams={rightParams}
                                                     pageLength={8}
                                                     usePaging={false}
                                                     editMode={1}
                                                     columns={rightColumns}
                                                     handleRowClick={handleRightRowClick}
                                                     gridName="shipment"
                                                     height="300px"
                                                     refreshTrigger={rightRefreshTrigger}
                                                     externalSheetRef={rightSheetRef}
                                                     extraOptions={{
                                                         Def: {
                                                             Row: { CanFormula: 1 },
                                                             FormulaRow: {
                                                                 sUnitAlign: "Right",
                                                                 sUnitFormat: "#,##0 건",
                                                                 AClass: "frsum",
                                                                 BClass: "fravg",
                                                                 CClass: "frmax",
                                                                 DClass: "frmin",
                                                                 Color: "#d8e3f2"
                                                             }
                                                         },
                                                         // (선택) 공통 설정
                                                         Cfg: {
                                                             SearchMode: 0,
                                                             PrevColumnMerge: 1,
                                                             DataMerge: 1,
                                                             HeaderMerge: 3,
                                                             SelectionSummary: { Mode: "DelRow", Width: 400 }
                                                         },
                                                         Cols: [
                                                             // 텍스트 칸에 '합계' 라벨
                                                             { Name: "kindCd",    FormulaRow: "합계" },

                                                             // 수량 합계
                                                             { Name: "qty",     FormulaRow: "Sum" },

                                                             // 금액 합계
                                                             { Name: "amount",   FormulaRow: "Sum" },
                                                             { Name: "receiverAmount", FormulaRow: "Sum" },
                                                         ],

                                                         Events: {
                                                             onAfterChange: (evt) => {
                                                                 const sheet = evt.sheet;
                                                                 const row = evt.row || evt.Row;

                                                                 // 변경된 컬럼명
                                                                 const colObj = evt.col ?? evt.Col;
                                                                 const colName =
                                                                     typeof colObj === "string"
                                                                         ? colObj
                                                                         : colObj?.Name ?? sheet.getColName?.(colObj) ?? "";

                                                                 // 금액 즉시 재계산
                                                                 if (["qty", "untpc"].includes(colName)) {
                                                                     const qty = Number(sheet.getValue?.(row, "qty") ?? 0);
                                                                     const unit = Number(sheet.getValue?.(row, "untpc") ?? 0);
                                                                     sheet.setValue?.(row, "amount", qty * unit, 1);
                                                                 }
                                                                 if (["qty", "receiverUntpc"].includes(colName)) {
                                                                     const qty = Number(sheet.getValue?.(row, "qty") ?? 0);
                                                                     const unit = Number(sheet.getValue?.(row, "receiverUntpc") ?? 0);
                                                                     sheet.setValue?.(row, "receiverAmount", qty * unit, 1);
                                                                 }

                                                                 // === 현재 선택 컨텍스트 ===
                                                                 const tId = Number(transportId || 0);                 // 상위 운송건 PK
                                                                 const sdCompanyId =
                                                                     // 1) 왼쪽에서 클릭한 rowData를 그대로 들고 있는 상태(가장 신뢰)
                                                                     Number((selectedSenderTransport as any)?.senderCompanyId) ||
                                                                     // 2) selectedTransport.sender 이미 반영돼 있으면 사용
                                                                     Number(selectedTransport?.sender?.companyId) ||
                                                                     // 3) 그래도 없으면 "현재 포커스된 좌측 시트 행"에서 직접 읽기 (가장 안전한 폴백)
                                                                     Number(left?.getValue?.(leftRow, "senderCompanyId") ??
                                                                         left?.GetValue?.(leftRow, "senderCompanyId") ?? 0);
                                                                 const rcCompanyId = Number(selectedTransport?.receiver?.companyId) || 0;

                                                                 // 1) 좌측 그리드의 _draftKey를 먼저 읽는다 (Single Source of Truth)
                                                                 const left: any = getLeftSheet?.();
                                                                 const leftRow = left?.getFocusedRow?.() || left?.GetFocusedRow?.();
                                                                 let recvDraftKey = (tId > 0) ? "" : ensureRecvDraftKey(left);

                                                                 if (tId === 0) {
                                                                     const keyFromLeft =
                                                                         (left && leftRow)
                                                                             ? (left.getValue?.(leftRow, "_draftKey") ?? left.GetValue?.(leftRow, "_draftKey"))
                                                                             : "";

                                                                     recvDraftKey = String(keyFromLeft || recvDraftKeyRef.current || "");

                                                                     // 2) 신규이면서 아직 draftKey가 없으면 "딱 1번" 생성
                                                                     if (!recvDraftKey) {
                                                                         recvDraftKey = makeDraftKey();
                                                                         recvDraftKeyRef.current = recvDraftKey;

                                                                         if (left && leftRow) {
                                                                             const setV = left.setValue ?? left.SetValue;
                                                                             setV?.call(left, leftRow, "_draftKey", recvDraftKey, 0);
                                                                             left.RefreshCalc?.(1, leftRow);
                                                                         }

                                                                         // 선택 상태에도 반영해 두면 좋음 (비파괴)
                                                                         setSelectedSenderTransport((prev) =>
                                                                             prev ? ({ ...prev, _draftKey: recvDraftKey } as any) : prev
                                                                         );
                                                                     }
                                                                 } else {
                                                                     // 저장된 운송건이면 draftKey는 불필요
                                                                     recvDraftKey = "";
                                                                     recvDraftKeyRef.current = "";
                                                                 }

                                                                 // === 현재 수신처의 행들 수집 ===
                                                                 const rows = sheet.getDataRows?.() ?? sheet.GetDataRows?.() ?? [];
                                                                 let transportDtlForSender = rows
                                                                     .map((r) => {
                                                                         const delYn = sheet.getValue?.(r, "delYn") ?? "N";
                                                                         const transportDtlId  = Number(sheet.getValue?.(r, "transportDtlId") ?? 0);

                                                                         const qty  = Number(sheet.getValue?.(r, "qty") ?? 0);
                                                                         const untpc = Number(sheet.getValue?.(r, "untpc") ?? 0);
                                                                         const rUntpc = Number(sheet.getValue?.(r, "receiverUntpc") ?? 0);

                                                                         const amount = Number(sheet.getValue?.(r, "amount") ?? qty * untpc);
                                                                         const receiverAmount = Number(sheet.getValue?.(r, "receiverAmount") ?? qty * rUntpc);

                                                                         const waybillNo = sheet.getValue?.(r, "waybillNo") ?? "";
                                                                         const kindCd = sheet.getValue?.(r, "kindCd") ?? "";
                                                                         const calculationCd = sheet.getValue?.(r, "calculationCd") ?? "";

                                                                         return {
                                                                             transportDtlId,
                                                                             transportId: tId,                                 // 동일 transportId
                                                                             _recvDraftKey: tId > 0 ? "" : String(recvDraftKey),
                                                                             senderCompanyId: sdCompanyId,
                                                                             receiverCompanyId: rcCompanyId,                   // 수신처 식별
                                                                             kindCd,
                                                                             waybillNo,
                                                                             calculationCd,
                                                                             qty,
                                                                             untpc,
                                                                             amount,
                                                                             receiverUntpc: rUntpc,
                                                                             receiverAmount,
                                                                             delYn,
                                                                         };
                                                                     })
                                                                     // 빈 행 제거
                                                                     .filter((s) => s.delYn !== "Y" && (String(s.waybillNo || "").trim() !== "" || s.qty !== undefined))

                                                                 // === 같은 수신처 버킷 안에서 중복 제거 (waybillNo, kindCd, calculationCd 기준) ===
                                                                 const seenIds = new Set<number>();
                                                                 transportDtlForSender = transportDtlForSender.filter((s) => {
                                                                     if ((s.transportDtlId ?? 0) > 0) {
                                                                         if (seenIds.has(s.transportDtlId)) return false;
                                                                         seenIds.add(s.transportDtlId);
                                                                     }
                                                                     return true;
                                                                 });

                                                                 // === 버킷 키: transportId + (receiverCompanyId | draftKey) ===
                                                                 const bucketKey =
                                                                     tId > 0
                                                                         ? `t:${tId}:c:${rcCompanyId}`
                                                                         : `t:${tId}:dk:${recvDraftKey}`;

                                                                 const isSameLogicalBucket = (x: any) => {
                                                                     const tidPrev = Number(x?.transportId) || 0;
                                                                     const rcPrev = Number(x?.senderCompanyId) || 0;
                                                                     const dkPrev = String(x?._recvDraftKey || "");

                                                                     if (tId > 0 && tidPrev > 0) {
                                                                         // 저장된 건: transportId + senderCompanyId 동일 여부 판단
                                                                         return tidPrev === tId && rcPrev === rcCompanyId;
                                                                     }
                                                                     if (tId === 0 && tidPrev === 0) {
                                                                         // 신규 건: draftKey가 비었거나 현재 draftKey와 같으면 "같은" 버킷으로 간주
                                                                         return dkPrev === "" || dkPrev === recvDraftKey;
                                                                     }
                                                                     return false;
                                                                 };

                                                                 setTransportDtl((prev) => {
                                                                     const rest = (prev ?? []).filter((x) => !isSameLogicalBucket(x));
                                                                     // 현재 스냅샷에 draftKey/receiverCompanyId를 "정규화"해서 넣어주기
                                                                     const normalized = transportDtlForSender.map((s) => ({
                                                                         ...s,
                                                                         transportId: tId,
                                                                         senderCompanyId: rcCompanyId,
                                                                         _recvDraftKey: tId > 0 ? "" : recvDraftKey,
                                                                     }));
                                                                     return [...rest, ...normalized];
                                                                 });

                                                                 // (선택) 좌측 합계(발신 금액) 표시에 반영
                                                                 const totalReceiverAmount = transportDtlForSender.reduce(
                                                                     (t, s) => t + (Number(s.amount) || 0), 0
                                                                 );
                                                                 if (left && leftRow) {
                                                                     const setterL = left.setValue ?? left.SetValue;
                                                                     setterL?.call(left, leftRow, "totalReceiverAmount", totalReceiverAmount);
                                                                     left.RefreshCalc?.(1, leftRow);
                                                                 }

                                                                 markDirty();
                                                             }
                                                         }
                                                     }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center text-gray-400">
                                    <div className="text-8xl mb-6 opacity-50">📦</div>
                                    <h3 className="text-xl font-semibold mb-3 text-gray-600">발신처를 선택하세요</h3>
                                    <p className="text-base mb-4 text-gray-500">왼쪽 목록에서 발신처를 클릭하면 상세 정보를 편집할 수 있습니다.</p>
                                    <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span>발신처 선택 대기 중</span>
                                    </div>
                                </div>
                            </div>
                        )
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}