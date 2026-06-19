// hooks/useApiQuery.ts
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "@/common/axios/AxiosClient";
import { formatWaybill } from "@/common/utils/waybillUtils";
import { formatPhone } from "@/common/utils/formatPhone";
import { formatFax } from "@/common/utils/formatFax";
import { formatBizNo } from "@/common/utils/formatBizNo";
import { formatDate } from "@/common/utils/formatDate";

function buildQueryString(params: Record<string, any> = {}) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === "") return;
        if (Array.isArray(v)) v.forEach((item) => sp.append(k, String(item)));
        else sp.append(k, String(v));
    });
    return sp.toString();
}

// 포맷터: 배열/단건 모두 대응 (필요 없는 필드는 그대로 둠)
function withAutoFormat<T extends Record<string, any>>(data: T): T {
    const base = { ...data } as any;
    if ("regDt" in base && base.regDt) base.regDt = formatDate(base.regDt);
    if ("telNo" in base && base.telNo) base.telNo = formatPhone(base.telNo);
    if ("faxNo" in base && base.faxNo) base.faxNo = formatFax(base.faxNo);
    if ("bizNo" in base && base.bizNo) base.bizNo = formatBizNo(base.bizNo);
    if ("senderTelNo" in base && base.senderTelNo) base.senderTelNo = formatPhone(base.senderTelNo);
    if ("receiverTelNo" in base && base.receiverTelNo) base.receiverTelNo = formatPhone(base.receiverTelNo);
    if ("senderManagerTelNo" in base && base.senderManagerTelNo) base.senderManagerTelNo = formatPhone(base.senderManagerTelNo);
    if ("receiverManagerTelNo" in base && base.receiverManagerTelNo) base.receiverManagerTelNo = formatPhone(base.receiverManagerTelNo);
    if ("startNo" in base && base.startNo) base.startNo = formatWaybill(base.startNo);
    if ("endNo" in base && base.endNo) base.endNo = formatWaybill(base.endNo);
    return base as T;
}

export const useApiQuery = <T>(
    endpoint: string,
    searchParams?: Record<string, any>,
    options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) => {
    return useQuery<T>({
        queryKey: [endpoint, searchParams],
        queryFn: async () => {
            const qs = buildQueryString(searchParams);
            const url = qs ? `${endpoint}?${qs}` : endpoint;

            // ✅ axios 사용
            const res = await axios.get<T>(url);
            // (axios는 4xx/5xx에서 throw하므로 별도 ok 체크 불필요)
            const data = res.data as any;

            // ✅ 자동 포맷 적용
            if (Array.isArray(data)) {
                return data.map((item) => withAutoFormat(item)) as T;
            }
            if (data && typeof data === "object") {
                return withAutoFormat(data) as T;
            }
            return data as T;
        },
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        ...options,
    });
};
