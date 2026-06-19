// components/common/CommonCodeSelect.tsx
import { useEffect, useMemo, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import axiosClient from "@/common/axios/AxiosClient.tsx";

type AnyRow = Record<string, any>;

interface CommonCodeSelectProps {
    label?: string;

    // ① 두 방식 모두 지원
    type?: string;                 // /api/code/list?type=... 로 쓸 때
    url?: string;                  // 외부 API (ex. /api/delivery-route/list)
    params?: Record<string, any>;  // url에 붙일 쿼리스트링

    // ② 응답 키 매핑 (기본: codeVal/codeNm 유지)
    valueKey?: string;             // ex) "deliveryRouteId"
    labelKey?: string;             // ex) "deliveryRouteNm"
    labelOverrides?: Record<string, string>; // ← 코드에서 쓰고 있었는데 타입 누락되어 있던 부분

    value?: string;                // 셀렉트의 현재 선택값(문자열)
    onChange: (val: string, label?: string) => void;

    includeAll?: boolean;
    placeholder?: string;

    // ③ UI 크기 제어
    className?: string;
    triggerClassName?: string;

    // 지역 -> 지역 상세
    parent?: string;          // 상위 code_val
    requireParent?: boolean;  // 부모 선택 전까지 API 호출 X
    parentKey?: string;       // 기본값 "parentsCodeVal"

     disabled?: boolean;
}

export function CommonCodeSelect({
                                     label,
                                     type,
                                     url = "/api/code/list",
                                     params,
                                     valueKey = "codeVal",
                                     labelKey = "codeNm",
                                     labelOverrides,
                                     value,
                                     onChange,
                                     includeAll = false,
                                     placeholder = "선택하세요",
                                     className,
                                     triggerClassName,
                                     parent,
                                     requireParent = false,
                                     parentKey = "parentsCodeVal",
                                     disabled = false
                                 }: CommonCodeSelectProps) {
    const [rows, setRows] = useState<AnyRow[]>([]);

    useEffect(() => {
        if (requireParent && !parent) {
            setRows([]);
            return;
        }

        const controller = new AbortController();

        // 쿼리 파라미터 조립
        const finalParams: Record<string, any> = { ...(params || {}) };
        if (parent) finalParams[parentKey] = parent;
        if (url === "/api/code/list" && type) finalParams.type = type;

        axiosClient
            .get(url, {
                params: finalParams,
                // axios v1+ 에서 abort 지원
                signal: controller.signal,
                // 쿠키 기반도 함께 쓰면 유지(백엔드 CORS 설정 필요)
                withCredentials: true,
            })
            .then((res) => {
                // 서버가 ApiResponse 형태일 수도 있으므로 안전 파싱
                const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
                setRows(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                if (err?.code !== "ERR_CANCELED") {
                    setRows([]);
                }
            });

        return () => controller.abort();
    }, [url, type, JSON.stringify(params), parent, requireParent, parentKey]);

    // 응답을 {value,label}로 맵핑
    const options = useMemo(() => {
        const base = rows.map((r) => ({
            value: String(r?.[valueKey] ?? ""),
            label: String(r?.[labelKey] ?? ""),
        }));
        if (!labelOverrides) return base;
        return base.map((o) => ({
            ...o,
            label: labelOverrides[o.value] ?? o.label,
        }));
    }, [rows, valueKey, labelKey, labelOverrides]);

    const current = value ?? "";

    return (
        <div className={`space-y-1 ${className ?? ""}`}>
            {label && <Label className="text-sm">{label}</Label>}

            <Select
                value={current}
                disabled={disabled}
                onValueChange={(val) => {
                    const found = options.find((o) => o.value === val);
                    onChange(val, found?.label);
                }}
            >
                <SelectTrigger className={triggerClassName}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {includeAll && <SelectItem value="all">전체</SelectItem>}
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
