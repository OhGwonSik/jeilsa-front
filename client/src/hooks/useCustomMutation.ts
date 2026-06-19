import { useMutation, QueryKey } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type InvalidateKey = string | QueryKey | Array<string | QueryKey>;

interface UseCustomMutationProps<T> {
    mutationFn: (data: T) => Promise<any>;
    queryKeyToInvalidate?: InvalidateKey;         // ← 선택으로
    refetchActiveOnly?: boolean;                  // ← 옵션화
    closeModal?: () => void;
    onExtraSuccess?: (data: any) => void;
    successMessage?: string;
    errorMessage?: string;
}

const normalizeKeys = (k?: InvalidateKey): QueryKey[] => {
    if (!k) return [];
    const arr = Array.isArray(k) ? k : [k];
    return arr.map((it) => (Array.isArray(it) ? it : [it]));
};

export function useCustomMutation<T>({
                                         mutationFn,
                                         queryKeyToInvalidate,
                                         refetchActiveOnly = true,
                                         closeModal,
                                         onExtraSuccess,
                                         successMessage,
                                         errorMessage,
                                     }: UseCustomMutationProps<T>) {
    return useMutation({
        mutationFn,
        onSuccess: async (data) => {
            const keys = normalizeKeys(queryKeyToInvalidate);
            if (keys.length) {
                await Promise.all(
                    keys.map((key) =>
                        queryClient.invalidateQueries({
                            queryKey: key,
                            refetchType: refetchActiveOnly ? "active" : "all",
                        })
                    )
                );
                // 굳이 강제 refetch가 필요하면 아래 한 줄 추가(선택)
                // await Promise.all(keys.map((key) => queryClient.refetchQueries({ queryKey: key })));
            }

            onExtraSuccess?.(data);
            closeModal?.();
            if (successMessage) toast({ title: "성공", description: successMessage });
        },
        onError: (err: any) => {
            let msg = errorMessage;
            if (!msg) {
                try {
                    const parsed = typeof err?.message === "string" ? JSON.parse(err.message) : null;
                    msg = parsed?.error?.details || parsed?.error?.message || err?.message || "요청 처리 중 오류가 발생했습니다.";
                } catch {
                    msg = err?.response?.data?.error?.details ||
                        err?.response?.data?.message ||
                        err?.message || "요청 처리 중 오류가 발생했습니다.";
                }
            }
            toast({ title: "오류", description: msg, variant: "destructive" });
        },
    });
}
