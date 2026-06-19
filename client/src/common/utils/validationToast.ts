// 📁 common/utils/validation.ts
import { toast } from "@/hooks/use-toast";

function addSubjectMarker(word: string): string {
    const lastChar = word[word.length - 1];
    const hasFinalConsonant = (lastChar.charCodeAt(0) - 44032) % 28 !== 0;
    return `${word}${hasFinalConsonant ? '은' : '는'}`;
}

/**
 * 조건이 true이면 오류 토스트를 띄우고 true 반환
 * 조건이 false이면 false 반환
 */
export function validationToast(condition: boolean, // 비교 조건
                                name: string, // 오류 대상
                                formatCheck: boolean = false, // 형식 검사 여부
                                customMessage?: string // 커스텀 메시지
): boolean {
    if (condition) {
        const defaultMessage = name
            ? formatCheck
                ? `올바른 ${name} 형식이 아닙니다.`
                : `${addSubjectMarker(name)} 필수 항목입니다.`
            : "";

        toast({
            title: customMessage ? "오류" : formatCheck ? "형식 오류" : "필수 입력값 미입력",
            description: customMessage ?? defaultMessage,
            variant: "destructive",
        });
        return true;
    }
    return false;
}
