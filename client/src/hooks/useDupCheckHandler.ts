import { useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {apiRequest, queryClient} from "@/lib/queryClient.ts";
import axiosClient from "@/common/axios/AxiosClient.tsx";


interface UseDupCheckOptions {
  url: string;              // 예: "/member/userId/check"
  value: string | number;   // 예: "jake"
  successMessage?: string;
  duplicateMessage?: string;
  onSuccess?: (isDuplicate: boolean) => void;
  onError?: () => void;
  setIsValid?: (valid: boolean) => void; // 저장버튼 활성 제어
  deps?: any[];             // 입력값 변경 시 초기화
}

function onDemandGet<T>(key: any[], url: string): Promise<T> {
  return queryClient.fetchQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await axiosClient.get(url); // ✅ 인터셉터로 토큰 자동 부착
      return res.data as T;
    },
    // v5: staleTime/gcTime, v4: staleTime/cacheTime
    staleTime: 0,
    // cacheTime: 0,  // v4 사용 시 완전 캐시 배제 원하면 주석 해제
  });
}

export function useDupCheckHandler({
                                     url,
                                     value,
                                     successMessage = "사용 가능한 값입니다.",
                                     duplicateMessage = "이미 사용 중인 값입니다.",
                                     onSuccess,
                                     onError,
                                     setIsValid,
                                     deps = [],
                                   }: UseDupCheckOptions) {
  const lastPromiseRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    setIsValid?.(false); // 입력 바뀌면 초기화
  }, [setIsValid, ...deps]);

    const trigger = () => {
        if (!value && value !== 0) {
            toast({ title: "값을 입력해주세요.", variant: "destructive" });
            return Promise.resolve(false);
        }

        const endpoint = `${url}/${encodeURIComponent(String(value))}`;

        const p = queryClient.fetchQuery({
            // 캐시 키는 구분용으로만 사용 (URL 조합엔 안 씀)
            queryKey: ["dup-check", endpoint],
            // ✅ URL/헤더/에러는 공통 apiRequest가 처리
            queryFn: async () => {
                const res = await apiRequest("GET", endpoint);
                const data = await res.json();
                // 서버가 boolean을 바로 주면 data가 boolean,
                // ApiResponse<boolean>이면 data.data가 boolean:
                const isDuplicate = (typeof data === "boolean" ? data : data?.data) as boolean;
                return isDuplicate;
            },
            staleTime: 0,
        })
            .then((isDuplicate) => {
                const valid = isDuplicate === false; // false면 사용 가능
                setIsValid?.(valid);
                toast({ title: valid ? (successMessage) : (duplicateMessage), variant: valid ? undefined : "destructive" });
                return valid;
            })
            .catch((e) => {
                setIsValid?.(false);
                toast({
                    title: "중복 확인 실패",
                    description: e?.message ?? "서버 통신 오류",
                    variant: "destructive",
                });
                return false;
            });

        lastPromiseRef.current = p;
        return p;
    };

  return { trigger };
}
