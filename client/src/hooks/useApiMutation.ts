// useApiMutation.ts
import {useMutation} from "@tanstack/react-query";
import {queryClient} from "@/lib/queryClient";
import axiosClient from "@/common/axios/AxiosClient"; // ✅ 인터셉터로 토큰 자동부착
import {toast} from "@/hooks/use-toast";

export function useApiMutation<T>({
                                      method, url, successMessage, errorMessage, invalidateQueryKey, closeModal, onExtraSuccess,
                                  }: {
    method: "POST"|"PUT"|"DELETE";
    url: string;
    successMessage?: string;
    errorMessage?: string;
    invalidateQueryKey?: string;
    closeModal?: () => void;
    onExtraSuccess?: () => void;
}) {
    return useMutation({
        mutationFn: async (data: T) => {
            const res = await axiosClient.request({ method, url, data });
            return res.data;
        },
        onSuccess: async (data) => {
            if (invalidateQueryKey) {
                await queryClient.invalidateQueries({ queryKey: [invalidateQueryKey] });
                await queryClient.refetchQueries({ queryKey: [invalidateQueryKey] });
            }
            onExtraSuccess?.();
            closeModal?.();
            if (successMessage) toast({ title: "성공", description: successMessage });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || errorMessage || err?.message || "요청 실패";
            toast({ title: "오류", description: msg, variant: "destructive" });
        },
    });
}
