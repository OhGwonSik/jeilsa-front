import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {ArrowLeft, CalendarIcon, Edit, Plus, Save, Search} from 'lucide-react';
import {useLocation, useNavigate} from "react-router-dom";
import CommonSheet from "@/pages/ibsheet.tsx";
import {cn} from "@/lib/utils.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import {apiRequest} from "@/lib/queryClient.ts";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import CompanyAutoComplete from "@/components/common/CompanyAutoComplete.tsx";
import {useApiMutation} from "@/hooks/useApiMutation.ts";
import {InsertTransport} from "@shared/schema.ts";
import {CommonCodeSelect} from "@/pages/codeSelectProps.tsx";
import {useDebouncedCommit} from "@/hooks/useDebouncedCommit.ts";
import {useApiQuery} from "@/hooks/useApiQuery.ts";
import {validationToast} from "@/common/utils/validationToast.ts";
import {formatPhone, isValidPhone} from "@/common/utils/formatPhone.ts";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Calendar} from "@/components/ui/calendar.tsx";
import {format} from "date-fns/format";
import {ko} from "date-fns/locale";
import {subDays} from "date-fns";
import {flushSync} from "react-dom";

type ChargeCd = 'CH001' | 'CH002' | 'CH003';
type ShipperCd = 'COM' | 'ETC' | string;

interface Company {
    companyId: number;
    companyNm: string;
    shipperCd?: ShipperCd;
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
    chargeCd: ChargeCd | null;
    _chargeAuto?: boolean;
    sender: Company;
    receiver: Company;
    shipmentOperationDate : Date;
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
    qty:number;
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
    const continueMode = qs.get("continue") ?? ""; // 연속 저장 모드 플래그

    const recvDraftKeyRef = useRef<string>("");

    const navigate = useNavigate();
    const [shipmentOperationDate, setShipmentOperationDate] = useState<Date>(new Date()); // 기본값: 오늘

    const fmt = (d: Date) =>
        format(new Date(d.getFullYear(), d.getMonth(), d.getDate()), "yyyy-MM-dd", { locale: ko });

    // 달력 열림 상태 관리
    const [openStart, setOpenStart] = useState(false);
    const [openEnd, setOpenEnd] = useState(false);    

    const handleOpenStartChange = useCallback((val: boolean) => {
    setOpenStart(val);
    }, []);
    const handleOpenEndChange = useCallback((val: boolean) => {
    setOpenEnd(val);
    }, []);

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
        chargeCd: null,
        _chargeAuto: true,
        sender: emptyCompany(),
        receiver: emptyCompany(),
        shipmentOperationDate : fmt(shipmentOperationDate)
    });

    const [selectedTransport, setSelectedTransport] = useState<Transport>(emptyTransport()); // 선택한 발신,수신 데이터
    const [selectedReceiverTransport, setSelectedReceiverTransport] = useState<Transport>(null);
    const [leftReloadKey, setLeftReloadKey] = useState(0);

    const addOnceRef = useRef(false);

    // 발신처 데이터 조회
    const { data, isLoading } = useApiQuery<Transport>(
        senderCompanyId > 0 ? `/api/transport/listById?senderCompanyId=${senderCompanyId}${continueMode ? `&continueMode=${continueMode}` : ""}` : "",
        undefined,
        { enabled: senderCompanyId > 0 }
    );

    // 조회된 값이 있으면 바로 상태에 넣기
    useEffect(() => {
        if (data) {
            setSelectedTransport(data.transport);
            if(!transportId || transportId <= 0) addOnceRef.current = true;
        }
    }, [data]);


    const selectedtTransportRef = useRef<typeof selectedTransport | null>(null);

    const [deletedReceiverIds, setDeletedReceiverIds] = useState<number[]>([]);
    const [deletedTransportDtlIds, setDeletedTransportDtlIds] = useState<Record<number, number[]>>({});

    useEffect(() => {
        selectedtTransportRef.current = selectedTransport;
    }, [selectedTransport]);

    //사용자가 직접 요금구분을 선택할 때(수동 모드 전환)
    const setChargeCdManual = (cd: ChargeCd) => {
        setSelectedTransport(prev => prev ? { ...prev, chargeCd: cd, _chargeAuto: false } : prev);
    };

    const updateSender = (patch: Partial<Company>) => {
        setSelectedTransport(prev => {
            if (!prev) return prev;

            const nextSender: Company = { ...(prev.sender ?? {}), ...patch };
            const next = { ...prev, sender: nextSender };

            // 자동요금 모드가 아니면 그대로 반환
            const auto = prev._chargeAuto ?? true;
            if (!auto) return next;

            // sender.shipperCd가 바뀐 경우에만 요금 재평가
            const senderShipperTouched = Object.prototype.hasOwnProperty.call(patch, 'shipperCd');
            if (!senderShipperTouched) return next;

            const bothCom =
                (next.sender?.shipperCd === 'COM') &&
                (next.receiver?.shipperCd === 'COM');

            // 두 업체 모두 COM이면 CH003(양방향) 자동 설정
            if (bothCom) return { ...next, chargeCd: 'CH003' as ChargeCd };

            return next;
        });
    };

    const updateReceiver = (patch: Partial<Company>) => {
        setSelectedTransport((prev) => {
            if (!prev) return prev;

            const nextReceiver: Company = {
                ...(prev.receiver ?? {}),
                ...patch,
            };
            const next = { ...prev, receiver: nextReceiver };

            // 자동 모드가 아니면(수동 모드면) 건드리지 말 것
            const auto = prev._chargeAuto ?? true;
            if (!auto) {
                return next;
            }

            // 자동 모드일 때도, shipperCd가 바뀌었을 때만 요금구분 재평가
            const receiverShipperTouched = Object.prototype.hasOwnProperty.call(patch, 'shipperCd');
            if (!receiverShipperTouched) {
                return next; // 비고/주소 등 다른 필드 업데이트면 요금구분 유지
            }

            const bothCom =
                (next.sender?.shipperCd === 'COM') &&
                (next.receiver?.shipperCd === 'COM');

            // 두 업체 모두 'COM'이면 자동으로 CH003, 아니면 기존값 유지(또는 기본값)
            if (bothCom) {
                return { ...next, chargeCd: 'CH003' as ChargeCd };
            }

            return next;
        });

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
        senderCompanyId : transportId > 0 ? senderCompanyId : 0,
        ...(!(transportId > 0) && {
            shipmentOperationDate: fmt(shipmentOperationDate),
        }),
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
        senderReceiverCd: selectedTransport.chargeCd === 'CH002' ? 'RECEIVER' : 'SENDER',
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
            CanEdit: 3,
        },
        {Header: "작성일시", Name: "regDt", Align: "Center", Width: 100 , CanEdit: 3,Type: "Date",Format: "yyyy-MM-dd", Visible: 0},
        {Header: "수신처명", Name: "receiverCompanyNm", Align: "Center", Width: 100, CanEdit: 3},
        {Name: "receiverTransportShipperCd", Type: "Text", Width: 100, Visible: 0},
        {Header: "전화번호", Name: "receiverTelNo", Align: "Center", Width: 150, CanEdit: 3},
        {Name: "receiverManagerNm", Align: "Center", Width: 150, CanEdit: 3,Visible: 0},
        {Header: "휴대폰", Name: "receiverManagerTelNo", Align: "Center", Width: 150, CanEdit: 3},
        {Name: "receiverRegionCd",    Align: "Center", Width: 80, CanEdit: 3, Visible: 0},
        {Name: "receiverRegionDtlCd", Align: "Center", Width: 80 ,CanEdit: 3, Visible: 0},
        {Header: "주소", Name: "receiverAddress", Align: "Center", Width: 200, CanEdit: 3},
        {Header: "합계금액", Name: "totalAmount", Align: "Center", Width: 100,Type: "Int", Format: "#,##0;-#,##0;0;@", CanEdit: 3},
        {Header: "비고", Name: "receiverRmk", Align: "Center", Width: 100, CanEdit: 3},
        {Header: "draftKey", Name: "_draftKey", Type: "Text", Visible: 0},
        {Name: "untpc", Type: "Text", Width: 100, Visible: 0},
        {Name: "weightUntpc", Type: "Text", Width: 100, Visible: 0},
        {Name: "senderCompanyId", Type: "Text", Width: 100, Visible: 0},
        {Name: "senderCompanyNm", Type: "Text", Width: 100, Visible: 0},
        {Name: "senderTransportShipperCd", Type: "Text", Width: 100, Visible: 0},
        {Name: "senderRegionCd",    Align: "Center", Width: 80, CanEdit: 3, Visible: 0},
        {Name: "senderRegionDtlCd", Align: "Center", Width: 80 ,CanEdit: 3, Visible: 0},
        {Name: "senderManagerNm", Align: "Center", Width: 150, CanEdit: 3,Visible: 0},
        {Name: "senderAddress", Align: "Center", Width: 200, CanEdit: 3,Visible: 0},
        {Name: "senderTelNo", Align: "Center", Width: 150, CanEdit: 3,Visible: 0},
        {Name: "senderManagerTelNo", Align: "Center", Width: 150, CanEdit: 3,Visible: 0},
        {Name: "senderRmk", Align: "Center", Width: 100, CanEdit: 3,Visible: 0},
        {Name: "senderUntpc", Align: "Center", Width: 100, CanEdit: 3,Visible: 0},
        {Name: "senderWeightUntpc", Align: "Center", Width: 100, CanEdit: 3,Visible: 0},
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
        {Name: "receiverUntpc", Type: "Text", Width: 100,Visible: 0},
    ]

    // 수신처 선택 변경 시: 이전행은 이미 onAfterChange에서 저장됐으니, 새 행 로드만
    useEffect(() => {
    }, [selectedTransport]);

    const handleCancel = () => {
        const search = location.search ?? "";
        navigate(
            { pathname: "/transport/shipments", search: location.search ?? "" },
            { state: { refetch: true } }
        );
    };

    const N = (v: any, d = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : d;
    };
    const T = (v: any) => (v ?? "").toString().trim();

    function isReceiverMeaningful(r: any) {
        // 회사가 선택되었거나, 표시 필드가 하나라도 채워졌거나, 물품이 있으면 의미 있음
        const hasId = N(r.receiverTransportId) > 0 || N(r.receiverCompanyId) > 0;
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
        const tid = R(selectedReceiverTransport?.transportId ?? 0);
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
        const isNew = !(transportId > 0);

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
                ...(isNew  && {
                    shipmentOperationDate: fmt(shipmentOperationDate)
                }),
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

    const pickSenderTransportId = (res: any) =>
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

        console.log(payload)

        let transport = payload.transport;
        let sender = transport.sender;
        let receiver = transport.receiver;

        if (validationToast(!transport.chargeCd.trim(), "발신처 요금구분")) return;
        // if (validationToast(!sender.address.trim(), "발신처 주소")) return;
        // if (validationToast(!sender.telNo.trim(), "발신처 전화번호")) return;
        //if (validationToast(!isValidPhone(sender.telNo), "발신처 전화번호", true)) return;

        // if (validationToast(!receiver.address.trim(), "수신처 주소")) return;
        // if (validationToast(!receiver.telNo.trim(), "수신처 전화번호")) return;
        // if (validationToast(!isValidPhone(receiver.telNo), "수신처 전화번호", true)) return;
        if (validationToast(transportDtl.some(i => !i.kindCd), "", false, "물품 종류를 선택해주세요.")) return;
        // if (validationToast(transportDtl.some(i => !i.qty), "",false,"물품 수량을 입력해주세요.")) return;

        if (transportId === 0) {
            createTransportMutation.mutate(payload, {
                onSuccess: (res) => {
                    clearDirtyWithSnapshot();
                    purgeDrafts();
                    const newId = pickSenderTransportId(res);
                    if (!newId) return;

                    // 오늘 00:00
                    const today = new Date();
                    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                    // 문자열 포맷
                    const todayStr = format(startOfToday, "yyyy-MM-dd", { locale: ko });

                    // 일주일 전(오늘 포함 7일 전)
                    const aWeekAgo = subDays(startOfToday, 7);
                    const aWeekAgoStr = format(aWeekAgo, "yyyy-MM-dd", { locale: ko });

                    const qs = new URLSearchParams();
                    qs.set("startDate", aWeekAgoStr);
                    qs.set("endDate", todayStr);
                    //qs.set("transportId", String(newId));

                    // 발신처(companyId) — 선택된 상태에서 가져옴
                    const sid =
                        res?.senderCompanyId ??
                        res?.transport?.sender?.companyId ??
                        0;
                    if (sid > 0) qs.set("senderCompanyId", String(sid));
                    qs.set("continue", "true");

                    window.location.assign(`/transport/shipments-editor?${qs.toString()}`);
                },
            });
            return;
        }

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
            sheet.addRow(sheet.getFirstRow?.() ?? sheet.GetFirstRow?.(), 1, 1, null, init, 1);
            return;
        }
        // 대문자 API 객체시그니처
        if (typeof sheet?.AddRow === "function") {
            sheet.AddRow({ Init: init });
            return;
        }
        throw new Error("IBSheet addRow/AddRow API를 찾을 수 없습니다.");
    }

    function getFirstRowCompat(sheet: any) {
        return sheet?.getFirstRow?.() ?? sheet?.GetFirstRow?.() ?? null;
    }

    function getValueCompat(sheet: any, row: any, col: string) {
        return sheet?.getValue?.(row, col) ?? sheet?.GetValue?.(row, col);
    }

    function showMessageCompat(sheet: any, html: string) {
        const show = sheet?.showMessageTime ?? sheet?.ShowMessageTime;
        show?.call?.(sheet, { message: html, buttons: ["확인"] });
    }

    const duplicateRightRow = () => {
        // 0) 시트/선택행 가드
        const sheet = rightSheetRef.current;
        if (!sheet) {
            console.error("❌ 우측(물품) 시트 인스턴스가 없습니다.");
            return;
        }

        // 1) 현재 선택된 row 가져오기
        const row = call(sheet, sheet.getFocusedRow) ?? call(sheet, sheet.GetFocusedRow);

        if (!row) {
            showMessageCompat(
                sheet,
                "<span style='color:black'>복제할 물품을 먼저 선택하세요.</span>"
            );
            return;
        }

        // 1) 마지막 행 필수값 체크 (미완성 행이 있으면 먼저 완료하게 유도)
        const last = getFirstRowCompat(sheet);
        if (last) {
            const required = ["calculationCd", "kindCd","qty"];
            const hasEmpty = required.some((field) => {
                const v = getValueCompat(sheet, last, field);
                return v === null || v === undefined || v === "";
            });
            if (hasEmpty) {
                showMessageCompat(
                    sheet,
                    "<span style='color:black'>마지막행의 물품 정보가 모두 입력되어야 복제할 수 있습니다.</span>"
                );
                return;
            }
        }

        // 2) 수신처 드래프트키 확보
        const rc = selectedtTransportRef.current;
        if (!rc) {
            showMessageCompat(
                sheet,
                "<span style='color:black'>먼저 수신처를 선택(또는 추가)하세요.</span>"
            );
            return;
        }
        const left: any = getLeftSheet?.();
        const recvDraftKey = (transportId > 0) ? "" : ensureRecvDraftKey(left);

        // 3) 복제 소스에서 값 픽
        const chargeCd = selectedTransport?.chargeCd ?? "CH001";
        const srcSenderUnit   = Number(row?.untpc ?? 0);
        const srcReceiverUnit = Number(row?.receiverUntpc ?? 0);
        const senderUnit   = srcSenderUnit;
        const receiverUnit = srcReceiverUnit || srcSenderUnit;

        const qtyNum = Number(row?.qty ?? 0);
        const waybillNo = row.waybillNo;
        // 금액은 재계산(숫자 아님 방지)
        const amount         = Number.isFinite(qtyNum * senderUnit)   ? qtyNum * senderUnit   : 0;
        const receiverAmount = Number.isFinite(qtyNum * receiverUnit) ? qtyNum * receiverUnit : 0;

        // 4) 복제 init
        const initRaw: any = {
            transportDtlId: 0,           // 새 행
            transportId: 0,              // 새 행
            _recvDraftKey: recvDraftKey, // 화면용 수신처 키 (신규편집 모드에서 매칭용)
            delYn: "N",
            // 동일 물류량/속성 복제
            calculationCd: row.calculationCd ?? "QTY",
            kindCd: row.kindCd ?? "",
            qty: qtyNum,
            untpc: senderUnit,
            receiverUntpc: receiverUnit,
            amount,
            receiverAmount,
            waybillNo,
        };

        // 6) 행 추가
        try {
            addRowCompat(sheet, initRaw);
        } catch (e) {
            console.error("💥 복제 addRow 실패:", e, { initRaw });
            showMessageCompat(sheet,"<span style='color:black'>복제 중 오류가 발생했습니다. 콘솔을 확인하세요.</span>");
            return;
        }

        // 7) 포커스 이동 (보통 송장번호로)
        const newRow = getFirstRowCompat(sheet);
        snapshotRightSheetToState(sheet);
        const focus = sheet.focus ?? sheet.Focus ?? sheet.FocusRow ?? sheet.GoToCell;
        focus?.call(sheet, newRow, "waybillNo");
    };

    const handleAddRow = (section: "left" | "right") => {
        const chargeCd = selectedTransport.chargeCd;
        const sender = selectedTransport.sender;
        const receiver = selectedTransport.receiver;
        if (section === "left") {
            const left: any = getLeftSheet?.();
            if (dirtyRef.current) {
                showMessageCompat(
                    left,
                    "<span style='color:black'>현재 수신처 변경사항을 먼저 저장하세요.</span>"
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
        const first = getFirstRowCompat(sheet);
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
                    : (chargeCd === "CH002" ? Number(receiver.weightUntpc ?? 0) : Number(sender.weightUntpc ?? 0));

            const receiverUnit =
                calculationCd === "QTY"
                    ? Number(receiver.untpc ?? 0)
                    : (chargeCd === "CH002" ? Number(receiver.weightUntpc ?? 0) : (chargeCd === "CH001"?Number(sender.weightUntpc ?? 0):Number(receiver.weightUntpc ?? 0)));

            if (!rc) {
                showMessageCompat(sheet, "<span style='color:black'>먼저 수신처를 선택(또는 추가)하세요.</span>");
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
                senderWeightUntpc: selectedTransport.sender.weightUntpc,
                senderUntpc: selectedTransport.sender.untpc,
                _draftKey: makeDraftKey(),
            };
        }

        // 6) 마지막 행 유효성 체크 (필수값 미입력 시 추가 금지)
        if (first) {
            const required =
                section === "left" ? ["receiverCompanyNm"] : ["calculationCd", "kindCd"];

            const hasEmpty = required.some((field) => {
                const v = getValueCompat(sheet, first, field);
                return v === null || v === undefined || v === "";
            });

            if (hasEmpty) {
                const msg =
                    section === "left"
                        ? `<span style='color:black'>이전 수신처의 정보가 모두 입력되어야 새로운 수신처를 추가할 수 있습니다.</span>`
                        : `<span style='color:black'>이전 물품의 정보가 모두 입력되어야 새로운 물품을 추가할 수 있습니다.</span>`;
                showMessageCompat(sheet, msg);
                return;
            }
        }

        // 7) Init에서 "시트에 존재하지 않는 컬럼" 제거 (가장 흔한 addRow 실패 원인)
        const colNames = getColNames(sheet);
        const initRaw = section === "left" ? leftInit : rightInit;

        const removed = Object.keys(initRaw).filter((k) => !colNames.includes(k));

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
        const newRow = getFirstRowCompat(sheet);
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

            const newReceiver = {
                ...emptyCompany(),
                ...picked,
                _draftKey: leftInit._draftKey, // 화면용 키(상태 저장 시 제거)
            } as any;

            // 선택 상태 갱신 (발신 유지, 수신 초기화)
            setSelectedTransport((prev: any) => ({
                transportId: 0,
                chargeCd: prev.chargeCd,
                sender: { ...prev.sender },
                receiver: stripDraft(newReceiver),
            }));

            // 우측 그리드 초기화 & 파라미터 리셋
            clearRightGrid();
            setRightParams({
                transportId: transportId > 0 ? transportId : 0,
                startDate : startDate,
                endDate : endDate,
                senderReceiverCd: selectedTransport.chargeCd === 'CH002' ? 'RECEIVER' : 'SENDER',
            });

            focus?.call(sheet, newRow, "receiverCompanyNm");
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

    const commitReceiverToLeftGrid = useCallback(() => {
        const sheet: any = getLeftSheet();
        const r = selectedTransport.receiver;
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
            receiverTransportId: Number(
                (r as any)?.receiverTransportId ??
                sheet?.getValue?.(row, "receiverTransportId") ??
                sheet?.GetValue?.(row, "receiverTransportId") ?? 0
            ),
            receiverCompanyId: Number(
                (r as any)?.receiverCompanyId ??
                sheet?.getValue?.(row, "receiverCompanyId") ??
                sheet?.GetValue?.(row, "receiverCompanyId") ?? 0
            ),
            receiverCompanyNm: (r.companyNm ?? '').trim(),
            receiverTelNo: (r.telNo ?? '').trim(),
            receiverManagerTelNo: (r.managerTelNo ?? '').trim(),
            receiverManagerNm: (r.managerNm ?? '').trim(),
            receiverAddress: (r.address ?? '').trim(),
            receiverRegionCd: r.regionCd ?? '',
            receiverRegionDtlCd: r.regionDtlCd ?? '',
            totalSenderAmount: Number((r as any).amount ?? 0),
            receiverRmk: (r.rmk ?? '').trim(),
            untpc: Number(r.untpc ?? 0),
            weightUntpc: Number(r.weightUntpc ?? 0),
            _draftKey: String(
                (r as any)?._draftKey ??
                sheet?.getValue?.(row, "_draftKey") ??
                sheet?.GetValue?.(row, "_draftKey") ??
                draftKey // fallback
            ),
        };

        if (!isReceiverMeaningful(payload)) {
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
        commitReceiverToLeftGrid();
    }, 300);

    const sameSender = (a: any, b: any) => {
        if (!a || !b) return false;
        return (
            a.companyId === b.companyId
        );
    };

    const sameReceiver = (a: any, b: any) => {
        if (!a || !b) return false;
        return (
            a.transportId === b.transportId &&
            String(a._draftKey ?? "") === String(b._draftKey ?? "")
        );
    };

    const toSender = (row: any) => ({
        transportId: Number(row.transportId ?? 0),
        chargeCd : String(row.chargeCd ?? ""),
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
        untpc: Number(row.sender_untpc ?? row.senderUntpc ?? ""),
        weightUntpc: Number(row.sender_weight_untpc ?? row.senderWeightUntpc ?? ""),
        _draftKey: String(row._draftKey ?? "")
    });

    const toReceiver = (row: any) => ({
        transportId: Number(row.transportId ?? 0),
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
        untpc: Number(row.untpc ?? row.receiverUntpc ?? 0),
        weightUntpc: Number(row.weightUntpc ?? row.receiverWeightUntpc ?? 0),
    });

    const isSenderMeaningful = (row: any) => {
        const N = (v: any) => Number(v) || 0;
        const T = (v: any) => (v ?? "").toString().trim();
        // 아이디가 있거나 / 표시 필드 중 하나라도 채워져 있으면 의미 있음
        return (
            N(row.senderCompanyId) > 0 ||
            !!(T(row.senderCompanyNm) || T(row.senderTelNo) || T(row.senderAddress) ||
                T(row.senderManagerNm) || T(row.senderManagerTelNo))
        );
    };

    const upsertReceiver = (rowData: any) => {
        const nextSenderRaw = toSender(rowData);
        const nextReceiver  = toReceiver(rowData);

        setSelectedTransport(prev => {
            // sender는 row에 값이 '의미 있게' 있을 때만 교체, 아니면 기존 유지
            const senderToUse = isSenderMeaningful(rowData) ? nextSenderRaw : prev.sender;

            const senderChanged   = !sameSender(prev.sender, senderToUse);
            const receiverChanged = !sameReceiver(prev.receiver, nextReceiver);

            if (!senderChanged && !receiverChanged) return prev;

            const nextCharge =
                (rowData?.chargeCd ? String(rowData.chargeCd) : "") || // row에 값이 있으면 사용
                prev.chargeCd ||                                      // 없으면 기존 값 유지
                "CH001";

            return {
                ...prev,
                // row가 서버 데이터면 transportId가 있을 것이고, 초안이면 0 유지
                transportId: Number(prev.transportId ?? rowData.transportId ?? 0),
                chargeCd: nextCharge,
                sender: senderToUse,
                receiver: nextReceiver,
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
        `${Number(row.transportId ?? 0)}:${Number(row.receiverCompanyId ?? 0)}:${String(row._draftKey ?? "")}`;

// (재사용) 현재 선택된 값 기준 식별 키
    const keyOfSelected = (st: any) =>
        `${Number(st?.transportId ?? 0)}:${Number(st?.receiver?.receiverCompanyId ?? 0)}:${String(st?.receiver?._draftKey ?? "")}`;


    // row 선택 (왼쪽 그리드)
    const handleLeftRowClick = (maybeDataOrRow: any, maybeRow?: any) => {
        // 1) 미저장 변경 방지
        if (dirtyRef.current) {
            const left: any = getLeftSheet?.();
            left?.showMessageTime?.({
                message: "<span style='color:black'>현재 수신처 변경사항을 먼저 저장하세요.</span>",
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
        setSelectedReceiverTransport(rowData);
        upsertReceiver(rowData);

        const nextChargeCd = String(rowData?.chargeCd ?? selectedTransport?.chargeCd ?? "CH001");
        const nextSenderReceiverCd = nextChargeCd === "CH002" ? "RECEIVER" : "SENDER";

        // 5) 편집 키는 유지
        setEditingRowKey(rowHandle);

        // 6) 동일 선택이 아니면 우측 파라미터/새로고침
        if (!isSame) {
            setRightParams({
                transportId: Number(rowData.transportId ?? 0),
                startDate,
                endDate,
                senderReceiverCd: nextSenderReceiverCd,
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

    const getTextCompat = (sheet: any, row: any, col: string) =>
        sheet?.getText?.(row, col) ?? sheet?.GetText?.(row, col) ?? null;

    const kindCodeToLabel = (code?: string) => {
        const map: Record<string, string> = {
            TAC0201: "서류",
            TAC0202: "박스",
            TAC0203: "롤",
            TAC0204: "샘플",
            TAC0205: "갑바",
            TAC0206: "마대",
            TAC0207: "행랑",
        };
        return map[code ?? ""] ?? "";
    };

    // row 삭제
    const handleDeleteSelected = async (section: 'left' | 'right') => {
        const sheet: any = section === 'left' ? leftSheetRef.current : rightSheetRef.current;

        // 수신처(left) 삭제 시, 명확하게 선택된 데이터가 있는지 확인
        if (section === 'left' && !selectedReceiverTransport) {
            sheet?.showMessageTime?.({ 
                message: "<span style='color:black'>삭제할 수신처를 선택해주세요.</span>", 
                buttons: ["확인"] 
            });
            return;
        }

        // 물품(right) 삭제 시, 선택된 물품이 있는지 확인
        if (section === 'right' && !selectedTransportDtl) {
            sheet?.showMessageTime?.({ 
                message: "<span style='color:black'>삭제할 물품을 선택해주세요.</span>", 
                buttons: ["확인"] 
            });
            return;
        }

        const rowHandle =
            section === 'left'
                ? editingRowKey // 현재 편집 중인 행 핸들 사용
                : selectedTransportDtl; 

        const selectedId =
            section === 'left'
                ? Number(selectedReceiverTransport?.transportId || 0)
                : Number(selectedTransportDtl?.transportDtlId || 0);

        // 실제 삭제 로직 (ID 유무와 상관없이 사용자에게 물어보는 것이 안전함)
        const msg =
            section === 'left'
                ? `<span style='color:black'>수신처 '${selectedTransport?.receiver.companyNm || '신규 수신처'}'을(를) 삭제하시겠습니까?</span>`
                : `<span style='color:black'>물품을 삭제하시겠습니까?</span>`;

        sheet.showMessageTime?.({
            message: msg,
            buttons: ["확인", "취소"],
            func: (args: number) => {
                if (args !== 1) return; // '확인'이 아니면 리턴

                // 1. 시트에서 행 제거
                sheet.removeRow?.(rowHandle);

                // 2. 서버 데이터인 경우 삭제 큐 처리 또는 API 호출
                if (section === 'left') {
                    const tId = Number(selectedReceiverTransport?.transportId || 0);
                    setSelectedReceiverTransport(null);
                    setEditingRowKey(null); // 편집 상태 초기화
                    if (tId > 0) {
                        deleteReceiverMutation.mutate({ id: tId });
                    }
                } else {
                    const tId = Number(selectedReceiverTransport?.transportId || 0);
                    const tdId = Number(selectedTransportDtl?.transportDtlId || 0);
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
                
                // 삭제 후 우측 그리드 비우기 (수신처 삭제 시)
                if (section === 'left') clearRightGrid();
            },
        });
    };

    const handleDeleteSelectedForChangeCd = async (section: 'left' | 'right') => {
        const sheet: any =  rightSheetRef.current;
        const rowHandle = selectedTransportDtl; // (right는 지금 row handle을 상태에 들고 있음)

        // 메시지/ID는 '데이터'에서 읽기
        const selectedId =  Number(selectedTransportDtl?.transportDtlId || 0);

        if(selectedId>0){
            sheet.removeRow?.(rowHandle);

            const tId = Number(selectedReceiverTransport?.transportId || 0);
            const tdId = Number(selectedTransportDtl?.transportDtlId || 0);

            setSelectedTransportDtl(null);
            if (tId > 0 && tdId > 0) {
                setDeletedTransportDtlIds((prev) => {
                    const next = { ...prev };
                    const arr = next[tId] ?? [];
                    if (!arr.includes(tdId)) next[tId] = [...arr, tdId];
                    return next;
                });
            }
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
        setSelectedReceiverTransport(null);
        setTransportDtl(prev => prev.filter(s => Number(s.receiverTransportId) > 0));
        // 우측 그리드 초기화(선택 해제 느낌)
        clearRightGrid();
    };

    const createTransportMutation = useApiMutation<InsertTransport>({
        method: "POST",
        url: "/api/transport/shipment-save",
        invalidateQueryKey: "/transport/receiver-list",
        successMessage: "운송정보가 성공적으로 생성되었습니다.",
        errorMessage: "운송정보 생성에 실패했습니다.",
        onExtraSuccess: () => leftForceRefresh,
    });

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
        const qs = new URLSearchParams(location.search);

        // 1) 기간
        setOrDelete(qs, "startDate", searchParams.startDate);
        setOrDelete(qs, "endDate", searchParams.endDate);

        // 2) 선택된 발신/운송 건 정보(있으면 유지)
        setOrDelete(qs, "transportId", transportId > 0 ? transportId : null);
        setOrDelete(qs, "senderCompanyId", selectedTransport?.sender?.companyId || senderCompanyId || null);

        navigate(
            { pathname: location.pathname, search: qs.toString() },
            { replace: Boolean(opts?.replace) } // 히스토리에 남기고 싶으면 false(기본)
        );
    };

    // URL 반영 + 그리드 새로고침까지 한 번에
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
            senderReceiverCd: selectedTransport.chargeCd === 'CH002' ? 'RECEIVER' : 'SENDER',
            _ts: Date.now(),  // 캐시 버스터
        }));
        rightForceRefresh();
    };

    function snapshotRightSheetToState(sheet: any) {
        const tId = Number(transportId || 0);
        const left: any = getLeftSheet?.();
        const leftRow = left?.getFocusedRow?.() || left?.GetFocusedRow?.();

        const sdCompanyId = Number(selectedTransport?.sender?.companyId) || 0;
        const rcCompanyId =
            Number((selectedReceiverTransport as any)?.receiverCompanyId) ||
            Number(selectedTransport?.receiver?.companyId) ||
            Number(left?.getValue?.(leftRow, "receiverCompanyId") ??
                left?.GetValue?.(leftRow, "receiverCompanyId") ?? 0);

        // draftKey 확보
        let recvDraftKey = (tId > 0) ? "" : ensureRecvDraftKey(left);
        if (tId === 0) {
            const keyFromLeft =
                (left && leftRow)
                    ? (left.getValue?.(leftRow, "_draftKey") ?? left.GetValue?.(leftRow, "_draftKey"))
                    : "";
            recvDraftKey = String(keyFromLeft || recvDraftKeyRef.current || "");
            if (!recvDraftKey) {
                recvDraftKey = makeDraftKey();
                recvDraftKeyRef.current = recvDraftKey;
                if (left && leftRow) {
                    const setV = left.setValue ?? left.SetValue;
                    setV?.call(left, leftRow, "_draftKey", recvDraftKey, 0);
                    left.RefreshCalc?.(1, leftRow);
                }
                setSelectedReceiverTransport((prev) =>
                    prev ? ({ ...prev, _draftKey: recvDraftKey } as any) : prev
                );
            }
        } else {
            recvDraftKey = "";
            recvDraftKeyRef.current = "";
        }

        // 시트의 데이터행 → DTO화
        const rows = sheet.getDataRows?.() ?? sheet.GetDataRows?.() ?? [];
        let transportDtlForReceiver = rows
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
                    transportId: tId,
                    _recvDraftKey: tId > 0 ? "" : String(recvDraftKey),
                    senderCompanyId: sdCompanyId,
                    receiverCompanyId: rcCompanyId,
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
            // 빈 행 제거 기준
            .filter((s) => s.delYn !== "Y" && (String(s.waybillNo || "").trim() !== "" || s.qty !== undefined))


        // 동일 transportDtlId 중복 제거
        const seenIds = new Set<number>();
        transportDtlForReceiver = transportDtlForReceiver.filter((s) => {
            if ((s.transportDtlId ?? 0) > 0) {
                if (seenIds.has(s.transportDtlId)) return false;
                seenIds.add(s.transportDtlId);
            }
            return true;
        });

        const isSameLogicalBucket = (x: any) => {
            const tidPrev = Number(x?.transportId) || 0;
            const rcPrev = Number(x?.receiverCompanyId) || 0;
            const dkPrev = String(x?._recvDraftKey || "");

            if (tId > 0 && tidPrev > 0) {
                return tidPrev === tId && rcPrev === rcCompanyId;
            }
            if (tId === 0 && tidPrev === 0) {
                return dkPrev === "" || dkPrev === recvDraftKey;
            }
            return false;
        };

        setTransportDtl((prev) => {
            const rest = (prev ?? []).filter((x) => !isSameLogicalBucket(x));
            const normalized = transportDtlForReceiver.map((s) => ({
                ...s,
                transportId: tId,
                receiverCompanyId: rcCompanyId,
                _recvDraftKey: tId > 0 ? "" : recvDraftKey,
            }));
            return [...rest, ...normalized];
        });

        // 좌측 합계 반영(선택)
        const totalSenderAmount = transportDtlForReceiver.reduce(
            (t, s) => t + (Number(s.amount) || 0), 0
        );
        if (left && leftRow) {
            const setterL = left.setValue ?? left.SetValue;
            setterL?.call(left, leftRow, "totalSenderAmount", totalSenderAmount);
            left.RefreshCalc?.(1, leftRow);
        }

        markDirty();
    }

    const leftParamsWithTs = useMemo(
        () => ({ ...leftParams, _ts: Date.now() }),
        [leftParams, leftReloadKey]
    );

    const receiverUrl = "/api/transport/receiver-list";
    const receiverSheetKey =
        `receiver|${leftParams.startDate}|${leftParams.endDate}|${leftParams.senderCompanyId}|${leftReloadKey}`;

    const companyInputRef = useRef<HTMLInputElement | null>(null);

    const handleDeleteSelectedRef = useRef(handleDeleteSelectedForChangeCd);
    useEffect(() => {
        handleDeleteSelectedRef.current = handleDeleteSelectedForChangeCd;
    }, [handleDeleteSelectedForChangeCd]);


    function afterReloadOnce(evt?: any) {
        if (!addOnceRef.current) return;
        addOnceRef.current = false;

        // 그리드가 그려진 다음 프레임에 실행
        requestAnimationFrame(() => {
            // 1) 새 줄 추가 (기존 함수 그대로 사용)
            handleAddRow("left");

            // 2) 방금 추가된 "마지막 행"을 포커스/선택/클릭 처리
            const s: any = leftSheetRef.current ?? evt?.sheet ?? evt; // 안전하게 시트 인스턴스 확보
            if (!s) return;

            const newRow = s.getFirstRow?.() ?? s.GetFirstRow?.();
            if (!newRow) return;

            // 포커스(커서 이동)
            (s.setFocusedRow ?? s.SetFocusedRow ?? s.Focus)?.call(s, newRow);
            (s.focus ?? s.Focus ?? s.GoToCell)?.call(s, newRow, "receiverCompanyNm");

            // 선택(하이라이트)
            (s.selectRow ?? s.SelectRow)?.call(s, newRow, 1);        // IBSheet8
            (s.setSelect ?? s.SetSelect)?.call(s, { Row: newRow });  // 다른 버전 호환



            // 좌측 클릭 로직까지 강제로 태우기(상태 동기화)
            handleLeftRowClick(newRow);
            markDirty();
        });
    }

    // 숫자 안전 변환
    const toNum = (v: any) => {
        if (v == null) return 0;
        const s = String(v).replace(/,/g, "").trim();
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    };

    function snapshotRightSheet() {
        const sheet: any = rightSheetRef.current;
        if (!sheet) return [];
        sheet.endEdit?.() ?? sheet.EndEdit?.() ?? sheet.FinishEdit?.();

        const getRows = sheet.getDataRows?.bind(sheet) ?? sheet.GetDataRows?.bind(sheet);
        const getVal  = sheet.getValue?.bind(sheet)     ?? sheet.GetValue?.bind(sheet);

        const toNum = (v: any) => {
            const n = Number(String(v ?? '').replace(/,/g,'').trim());
            return Number.isFinite(n) ? n : 0;
        };

        const rows = getRows?.() ?? [];
        return rows.map((r: any) => ({
            transportDtlId: toNum(getVal(r, 'transportDtlId')) || 0,     // 신규는 0
            draftKey:       getVal(r, 'draftKey') ?? getVal(r, '_recvDraftKey') ?? getVal(r, 'id'),
            calculationCd: String(getVal(r, 'calculationCd') ?? 'QTY').toUpperCase(),
            kindCd:         getVal(r, 'kindCd') ?? '',
            waybillNo:      getVal(r, 'waybillNo') ?? '',
            qty:            toNum(getVal(r, 'qty')),
            weight:         toNum(getVal(r, 'weight') ?? getVal(r, 'kg') ?? getVal(r, 'wt')),
            untpc:          toNum(getVal(r, 'untpc')),
            receiverUntpc:  toNum(getVal(r, 'rUntpc') ?? getVal(r, 'receiverUntpc')),
            amount:         toNum(getVal(r, 'amount')),
            receiverAmount: toNum(getVal(r, 'rAmount') ?? getVal(r, 'receiverAmount')),
        }));
    }



// 요금구분 × 정산기준에 따른 단가 선택 (네 add 로직의 규칙과 동일)
    function pickUnits(chargeCd: string, calculationCd: string, sender: any, receiver: any){
        const isW = String(calculationCd).toUpperCase() === 'WEIGHT';
        const sUnit = isW ? toNum(sender?.weightUntpc)   : toNum(sender?.untpc);
        const rUnit = isW ? toNum(receiver?.weightUntpc) : toNum(receiver?.untpc);
        const cd = String(chargeCd ?? '').toUpperCase();

        if (cd === 'CH001') return { unit: sUnit, rUnit };   // 선불
        if (cd === 'CH002') return { unit: rUnit, rUnit };   // 착불
        return { unit: sUnit, rUnit };                       // CH003
    }

    function recreateAsNewRowsByCharge(nextCd: 'CH001'|'CH002'|'CH003') {
        const sheet: any = rightSheetRef.current;
        if (!sheet) return;

        // 편집중 값 커밋
        sheet.endEdit?.() ?? sheet.EndEdit?.() ?? sheet.FinishEdit?.();

        const getRows = sheet.getDataRows?.bind(sheet) ?? sheet.GetDataRows?.bind(sheet);
        const getVal  = sheet.getValue?.bind(sheet)     ?? sheet.GetValue?.bind(sheet);
        const addRow  = sheet.addRow?.bind(sheet)       ?? sheet.AddRow?.bind(sheet);
        const remRow  = sheet.removeRow?.bind(sheet)    ?? sheet.RemoveRow?.bind(sheet);
        const setAttr = sheet.setAttribute?.bind(sheet) ?? sheet.SetAttribute?.bind(sheet);

        const rows = (getRows?.() ?? []).slice();
        if (!rows.length) return;

        // 수신처 드래프트키(신규 수신처인 경우 유지)
        const left: any = getLeftSheet?.();
        const recvDraftKey = (Number(transportId) > 0) ? "" : ensureRecvDraftKey(left);  // 기존 패턴 유지 :contentReference[oaicite:2]{index=2}

        // 서버 삭제 큐용 원본 PK 수집
        const delIds: number[] = [];

        rows.forEach((row: any) => {
            // 1) 원본 데이터에서 반드시 보존할 값들
            const calculationCd = String(getVal(row, 'calculationCd') ?? 'QTY').toUpperCase();
            const qty           = toNum(getVal(row, 'qty'));
            const kindCd        = getVal(row, 'kindCd') ?? '';
            const waybillNo     = getVal(row, 'waybillNo') ?? '';
            const srcId         = Number(getVal(row, 'transportDtlId') ?? 0);

            // 2) 변경된 요금구분에 맞춰 단가 재선정
            const { unit, rUnit } = pickUnits(nextCd, calculationCd, selectedTransport?.sender, selectedTransport?.receiver);

            // 3) 신규 init (네 addRow 기본 init 스키마를 그대로 따름)
            const init = {
                transportDtlId: 0,                 // 신규로 인식되게
                transportId: 0,
                _recvDraftKey: recvDraftKey,       // 기존 방식 유지 :contentReference[oaicite:3]{index=3}
                calculationCd,                     // ★ 정산기준 보존(날아가지 않음)
                kindCd,
                waybillNo,
                qty,
                untpc: unit,
                receiverUntpc: rUnit,
                amount: qty * unit,
                receiverAmount: qty * rUnit,
            };

            // 4) 시트에 신규 추가
            try {
                // 너의 addRowCompat가 있다면 그걸 써도 됨(시트 컬럼 교차검증 포함) :contentReference[oaicite:4]{index=4}
                if (typeof addRowCompat === 'function') addRowCompat(sheet, init);
                else addRow({ Init: init });

                // 신규 플래그(프로젝트에 따라 Added 플래그를 사용)
                const newRow = sheet.getFirstRow?.() ?? sheet.GetFirstRow?.();
                if (newRow) {
                    setAttr?.(newRow, null, 'Added', 1, 1); // 저장 시 INSERT 처리 유도
                    try { newRow.Added = 1; } catch {}
                }
            } catch (e) {
                console.error('addRow 실패', e, init);
            }

            // 5) 원본 삭제 + 삭제 큐 기록
            if (srcId > 0) delIds.push(srcId);
            remRow?.(row);
        });

        // 삭제 PK를 서버 전송 목록에 반영(기존 삭제 로직과 동일) :contentReference[oaicite:5]{index=5}
        const tId = Number(selectedReceiverTransport?.transportId || 0);
        if (tId > 0 && delIds.length) {
            setDeletedTransportDtlIds((prev) => {
                const next = { ...prev };
                const arr = next[tId] ?? [];
                next[tId] = [...arr, ...delIds.filter(id => !arr.includes(id))];
                return next;
            });
        }

        // 재계산/표시 갱신
        sheet.RefreshCalc?.(1);
        sheet.refreshBody?.(1) ?? sheet.RefreshBody?.(1);

        flushSync(() => {
            setTransportDtl(snapshotRightSheet());
        });
    }


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
                            <h1 className="text-lg font-bold text-gray-900">{transportId > 0 ? "운송정보 수정" : "운송정보 신규 추가"}</h1>
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
                        {transportId > 0 ? (
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
                                            <Popover open={openStart} onOpenChange={handleOpenStartChange}>
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
                                                            setOpenStart(false);
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>

                                            <span className="text-gray-400">~</span>

                                            {/* 마감일 */}
                                            <Popover open={openEnd} onOpenChange={handleOpenEndChange}>
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
                                                        selected={endDate}
                                                        locale={ko}
                                                        onSelect={(d) => {
                                                            if (!d) return;
                                                            setSearchParams(prev => ({ ...prev, endDate: fmt(d) }));
                                                            setOpenEnd(false);
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
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
                        ):(
                            <div className="bg-white border border-gray-200 rounded-lg">
                                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-sm font-semibold text-gray-800">접수일시</h3>
                                </div>

                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-2 md:gap-3 lg:gap-4 flex-wrap">
                                        {/* 접수일시 */}
                                        <div className="flex items-center gap-x-2">
                                            <Popover open={openStart} onOpenChange={handleOpenStartChange}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-36 justify-start text-left font-normal"
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {fmt(shipmentOperationDate)}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={shipmentOperationDate}
                                                        locale={ko}
                                                        onSelect={(d) => {
                                                            if (!d) return;
                                                            setShipmentOperationDate(d);
                                                            setOpenStart(false);
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* 1. Sender Information Section */}
                        <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                            <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                                <h3 className="text-sm font-semibold text-gray-800">발신처 정보</h3>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-12 md:col-span-3 relative">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">업체명*</Label>
                                        <CompanyAutoComplete
                                            value={selectedTransport.sender.companyNm || ""}
                                            onSelect={(company) => {
                                                setSelectedTransport((prev) => ({
                                                    ...prev, // transportId, chargeCd는 그대로
                                                    sender: {
                                                        ...prev.sender,
                                                        companyId: Number(company.companyId) || 0,
                                                        companyNm: company.companyNm ?? "",
                                                        shipperCd: company.shipperCd ?? "",
                                                        telNo: formatPhone(company.telNo) ?? "",
                                                        address: company.address ?? "",
                                                        managerNm: company.managerNm ?? "",
                                                        managerTelNo: company.managerTelNo ?? "",
                                                        rmk: company.rmk ?? "",
                                                        regionCd: company.regionCd ?? "",
                                                        regionDtlCd: company.regionDtlCd ?? "",
                                                        untpc: Number(company.untpc) || 0,
                                                        weightUntpc: Number(company.weightUntpc) || 0,
                                                        deliveryRouteNm : company.deliveryRouteNm
                                                    },
                                                }));
                                                const isNew = !selectedTransport?.transportId || selectedTransport.transportId === 0;
                                                addOnceRef.current = isNew;

                                                // 왼쪽 조건 자동 세팅
                                                setLeftParams({
                                                    senderCompanyId: Number(company.companyId) || 0 ,
                                                    ...(!(transportId > 0) && {
                                                        shipmentOperationDate: fmt(shipmentOperationDate),
                                                    }),
                                                    startDate : startDate,
                                                    endDate : endDate,
                                                });
                                            }}
                                            onChange={(e) => {
                                                // 직접 타이핑 케이스: sender에 바로 반영
                                                updateSender({
                                                    companyNm: e.target.value,
                                                    companyId: 0,        // 신규 입력임을 표시
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
                                            value={String(selectedTransport?.sender.shipperCd ||"COM")}
                                            onChange={(v) => updateSender({shipperCd: String(v)})}
                                            onBlur={scheduleCommit}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-1">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">요금구분</Label>
                                        <CommonCodeSelect
                                            type="CHARGE"
                                            value={selectedTransport.chargeCd}
                                            onChange={async (val) => {
                                                const nextCd = typeof val === 'string' ? val : (val?.target?.value ?? val?.value ?? val);
                                                const isSaved = !!selectedTransport.transportId && selectedTransport.transportId > 0;

                                                if (isSaved) {
                                                    const ok = window.confirm(
                                                        "요금구분을 변경하면 기존 상세는 삭제되고,\n변경된 단가 기준의 새 행으로 재작성됩니다. 계속할까요?"
                                                    );
                                                    if (!ok) return;
                                                }

                                                // 1) 먼저 신규로 재작성
                                                recreateAsNewRowsByCharge(String(nextCd).toUpperCase() as any);
                                                const after = snapshotRightSheet();

                                                // 2) 상태상 요금구분 교체
                                                setSelectedTransport(prev => ({ ...prev, chargeCd: nextCd }));
                                            }}

                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">지역</Label>
                                        <CommonCodeSelect
                                            type="REGION_TYPE"
                                            value={selectedTransport.sender.regionCd || "DAEGU"}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    sender: {
                                                        ...prev.sender,
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
                                            value={selectedTransport.sender.regionDtlCd}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    sender :{
                                                        ...prev.sender,
                                                        regionDtlCd: val
                                                    }
                                                }))
                                            }
                                            parent={selectedTransport.sender.regionCd}
                                            requireParent={true}
                                            parentKey="parentsCodeVal"
                                            disabled={!selectedTransport.sender.regionCd}
                                        />
                                    </div>
                                    {/*<div className="col-span-12 md:col-span-3">*/}
                                    {/*    <Label className="text-xs font-medium text-gray-700 mb-1 block">담당자명</Label>*/}
                                    {/*    <Input*/}
                                    {/*        className={`relative z-20 ${!selectedTransport.sender.managerNm ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}*/}
                                    {/*        placeholder="담당자 이름"*/}
                                    {/*        value={selectedTransport.sender.managerNm}*/}
                                    {/*        onChange={(val) =>*/}
                                    {/*            setSelectedTransport((prev) => ({*/}
                                    {/*                ...prev,*/}
                                    {/*                sender :{*/}
                                    {/*                    ...prev.sender,*/}
                                    {/*                    managerNm: val.target.value*/}
                                    {/*                }*/}
                                    {/*            }))*/}
                                    {/*        }*/}
                                    {/*    />*/}
                                    {/*</div>*/}
                                    <div className="col-span-12 md:col-span-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* 배송코스명 */}
                                            <div>
                                            <Label className="text-xs font-medium text-gray-700 mb-1 block">배송코스명</Label>
                                            <Input
                                                readOnly
                                                className={`relative z-20 ${!selectedTransport.sender.deliveryRouteNm ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                                placeholder="배송코스명"
                                                value={selectedTransport.sender.deliveryRouteNm}
                                                onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    sender: {
                                                    ...prev.sender,
                                                    deliveryRouteNm: val.target.value
                                                    }
                                                }))
                                                }
                                            />
                                            </div>

                                            {/* 담당자명 */}
                                            <div>
                                            <Label className="text-xs font-medium text-gray-700 mb-1 block">담당자명</Label>
                                            <Input
                                                className={`relative z-20 ${!selectedTransport.sender.managerNm ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                                placeholder="담당자 이름"
                                                value={selectedTransport.sender.managerNm}
                                                onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    sender: {
                                                    ...prev.sender,
                                                    managerNm: val.target.value
                                                    }
                                                }))
                                                }
                                            />
                                            </div>
                                        </div>
                                    </div>            

                                    {/* 2행 */}
                                    <div className="col-span-12 md:col-span-6">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">주소</Label>
                                        <Input
                                            className={`relative z-20 ${!selectedTransport.sender.address ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            placeholder="주소"
                                            value={selectedTransport.sender.address}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    sender :{
                                                        ...prev.sender,
                                                        address: val.target.value
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">전화번호</Label>
                                        <Input
                                            className={`relative z-20 ${!selectedTransport.sender.telNo ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            placeholder="전화번호"
                                            value={formatPhone(selectedTransport.sender.telNo)}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    sender :{
                                                        ...prev.sender,
                                                        telNo: formatPhone(val.target.value)
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <Label className="text-xs font-medium text-gray-700 mb-1 block">휴대폰</Label>
                                        <Input
                                            className={`relative z-20 ${!selectedTransport.sender.managerTelNo ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            placeholder="담당자 연락처"
                                            value={selectedTransport.sender.managerTelNo}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    sender :{
                                                        ...prev.sender,
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
                                            className={`relative z-20 overflow-hidden text-ellipsis ${!selectedTransport.sender.rmk ? 'text-gray-400 placeholder:text-gray-300' : 'text-black'}`}
                                            placeholder="비고"
                                            value={selectedTransport.sender.rmk}
                                            onChange={(val) =>
                                                setSelectedTransport((prev) => ({
                                                    ...prev,
                                                    sender :{
                                                        ...prev.sender,
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
                                <h3 className="text-sm font-semibold text-gray-800">수신처 목록</h3>
                                <div className="flex space-x-3">
                                    {/* 선택 삭제 */}
                                    <Button
                                        variant="outline"
                                        onClick={() => handleDeleteSelected("left")}
                                        disabled={!selectedTransport}
                                        className={cn(
                                            "transition-colors",
                                            selectedTransport
                                                ? "border-red-600 text-red-600 hover:bg-red-50"
                                                : "text-gray-400 border-gray-300 cursor-not-allowed"
                                        )}
                                    >
                                        <Edit className="w-4 h-4 mr-2"/>
                                        선택 삭제
                                    </Button>
                                    {/* 수신처 추가 (transportId <= 0 일 때만 표시) */}
                                    {(!transportId || transportId <= 0) && (
                                        <Button
                                            onClick={() => handleAddRow("left")}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            수신처 추가
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Table Grid Format - Excel Compatible */}
                            <div className="flex-1 overflow-auto">
                                {/* 데이터 영역 */}
                                {/* ib sheet 사용 */}
                                <CommonSheet  key={receiverSheetKey}
                                              url={receiverUrl}
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
                                              extraOptions={{
                                                  Events: {
                                                      onRenderFinish: (evt: any) => {
                                                          if (evt?.sheet) leftSheetRef.current = evt.sheet;
                                                          evt.sheet.fitColWidth();
                                                          afterReloadOnce();
                                                      },
                                                  }
                                              }}
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
                        {selectedReceiverTransport !== null ? (
                            <div className="space-y-6">
                                <div
                                    className="bg-gradient-to-r from-blue-100 to-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
                                    <h3 className="text-lg font-bold text-blue-900 mb-1 flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                                        수신처 {editingLabel}번 편집 중
                                    </h3>
                                    <p className="text-sm text-blue-800 font-medium">
                                        선택된 수신처의 상세 정보를 수정할 수 있습니다.
                                    </p>
                                </div>

                                {/* Recipient Basic Info */}
                                <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                                    <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                                        <h4 className="text-sm font-semibold text-gray-800">수신처 정보 입력</h4>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-4 gap-3">
                                            <div className="relative">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">업체명*</Label>
                                                <CompanyAutoComplete
                                                    ref={companyInputRef}
                                                    value={selectedTransport?.receiver.companyNm ?? ""}
                                                    onSelect={(company) => {
                                                        updateReceiver({
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
                                                        });
                                                        scheduleCommit();
                                                    }}
                                                    onChange={(e) => updateReceiver({companyNm: e.target.value})}
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
                                                    value={String(selectedTransport?.receiver.shipperCd ||"COM")}
                                                    onChange={(v) => updateReceiver({shipperCd: String(v)})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">지역</Label>
                                                <CommonCodeSelect
                                                    type="REGION_TYPE"
                                                    value={String(selectedTransport?.receiver.regionCd || "DAEGU")}
                                                    onChange={(v) => updateReceiver({
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
                                                    value={String(selectedTransport?.receiver.regionDtlCd || "")}
                                                    onChange={(v) => updateReceiver({regionDtlCd: String(v)})}
                                                    onBlur={scheduleCommit}
                                                    parent={selectedTransport.receiver.regionCd}
                                                    requireParent={true}
                                                    parentKey="parentsCodeVal"
                                                    disabled={!selectedTransport.receiver.regionCd}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">주소</Label>
                                                <Input
                                                    placeholder="주소"
                                                    value={selectedTransport?.receiver.address || ''}
                                                    onChange={(e) => updateReceiver({address: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">담당자명</Label>
                                                <Input
                                                    placeholder="담당자명"
                                                    value={selectedTransport?.receiver.managerNm || ''}
                                                    onChange={(e) => updateReceiver({managerNm: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">비고</Label>
                                                <Input
                                                    placeholder="비고"
                                                    value={selectedTransport?.receiver.rmk || ''}
                                                    onChange={(e) => updateReceiver({rmk: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">전화번호</Label>
                                                <Input
                                                    placeholder="전화번호"
                                                    value={formatPhone(selectedTransport?.receiver.telNo) || ''}
                                                    onChange={(e) => updateReceiver({telNo: formatPhone(e.target.value)})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <Label
                                                    className="text-xs font-medium text-gray-700 mb-1 block">휴대폰</Label>
                                                <Input
                                                    placeholder="휴대폰"
                                                    value={selectedTransport?.receiver.managerTelNo || ''}
                                                    onChange={(e) => updateReceiver({managerTelNo: e.target.value})}
                                                    onBlur={scheduleCommit}
                                                />
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                                    <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-gray-800">물품 상세 정보 입력</h4>
                                            <div className="flex flex-col items-end space-y-1">
                                                {/* 버튼 영역 */}
                                                <div className="flex space-x-3">
                                                    {/* 선택 삭제 */}
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
                                                    <Button
                                                        onClick={() => duplicateRightRow()}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1"/>
                                                        물품 복제
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleAddRow("right")}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1"/>
                                                        물품 추가
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
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
                                                                 const left: any = getLeftSheet?.();
                                                                 const leftRow = left?.getFocusedRow?.() || left?.GetFocusedRow?.();

                                                                 const sdCompanyId = Number(selectedTransport?.sender?.companyId) || 0;
                                                                 const rcCompanyId =
                                                                     // 1) 왼쪽에서 클릭한 rowData를 그대로 들고 있는 상태(가장 신뢰)
                                                                     Number((selectedReceiverTransport as any)?.receiverCompanyId) ||
                                                                     // 2) selectedTransport.receiver에 이미 반영돼 있으면 사용
                                                                     Number(selectedTransport?.receiver?.companyId) ||
                                                                     // 3) 그래도 없으면 "현재 포커스된 좌측 시트 행"에서 직접 읽기 (가장 안전한 폴백)
                                                                     Number(left?.getValue?.(leftRow, "receiverCompanyId") ??
                                                                         left?.GetValue?.(leftRow, "receiverCompanyId") ?? 0);

                                                                 // 1) 좌측 그리드의 _draftKey를 먼저 읽는다 (Single Source of Truth)
                                                                 // const left: any = getLeftSheet?.();
                                                                 // const leftRow = left?.getFocusedRow?.() || left?.GetFocusedRow?.();
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
                                                                         setSelectedReceiverTransport((prev) =>
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
                                                                 let transportDtlForReceiver = rows
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
                                                                 transportDtlForReceiver = transportDtlForReceiver.filter((s) => {
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
                                                                     const rcPrev = Number(x?.receiverCompanyId) || 0;
                                                                     const dkPrev = String(x?._recvDraftKey || "");

                                                                     if (tId > 0 && tidPrev > 0) {
                                                                         // 저장된 건: transportId + receiverCompanyId로 동일 여부 판단
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
                                                                     const normalized = transportDtlForReceiver.map((s) => ({
                                                                         ...s,
                                                                         transportId: tId,
                                                                         receiverCompanyId: rcCompanyId,
                                                                         _recvDraftKey: tId > 0 ? "" : recvDraftKey,
                                                                     }));
                                                                     return [...rest, ...normalized];
                                                                 });

                                                                 // (선택) 좌측 합계(발신 금액) 표시에 반영
                                                                 const totalSenderAmount = transportDtlForReceiver.reduce(
                                                                     (t, s) => t + (Number(s.amount) || 0), 0
                                                                 );
                                                                 if (left && leftRow) {
                                                                     const setterL = left.setValue ?? left.SetValue;
                                                                     setterL?.call(left, leftRow, "totalSenderAmount", totalSenderAmount);
                                                                     left.RefreshCalc?.(1, leftRow);
                                                                 }

                                                                 markDirty();
                                                             }
                                                         }
                                                     }}
                                        />
                                        {/* 안내 문구 */}
                                        <div className="text-sm text-gray-500 text-right space-y-0.5">
                                            <p>
                                                ※ <span className="font-semibold">물품 추가</span> 시 선택된{" "}
                                                <span className="text-blue-600">요금 구분</span>에 따라 단가가 자동 설정됩니다.
                                                추가 전에 반드시 {" "}<span className="text-blue-600">확인</span>하세요. (통신 - 양방향이 기본값 / 택배 - 양방향 청구 불가능)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center text-gray-400">
                                    <div className="text-8xl mb-6 opacity-50">📦</div>
                                    <h3 className="text-xl font-semibold mb-3 text-gray-600">수신처를 선택하세요</h3>
                                    <p className="text-base mb-4 text-gray-500">왼쪽 목록에서 수신처를 클릭하면 상세 정보를 편집할 수 있습니다.</p>
                                    <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span>수신처 선택 대기 중</span>
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