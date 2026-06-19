// 전화번호를 하이픈 포함 포맷으로 변환
export function formatPhone(value: string | number | null | undefined): string {
    if (!value) return "";

    const raw = String(value).trim();

    // 전화번호 앞부분만 추출(숫자 + 하이픈)
    const match = raw.match(/^([0-9\-]+)/);
    const phonePart = match ? match[1] : raw;

    // tail (전화번호 이후 모든 것)
    const tail = raw.slice(phonePart.length);

    // 전화번호에서 숫자만 추출
    const digits = phonePart.replace(/\D/g, "");

    // 내선번호 또는 단순코드 (4자리 이하)
    if (digits.length <= 4) return digits + tail;

    // 1) 휴대전화
    if (/^01[0-9]/.test(digits)) {
        const head = digits.slice(0, 3);
        const mid = digits.slice(3, 7);
        const rest = digits.slice(7);
        return `${head}-${mid}-${rest}${tail}`;
    }

    // 2) 070
    if (digits.startsWith("070")) {
        const head = "070";
        const mid = digits.slice(3, 7);
        const rest = digits.slice(7);
        return `${head}-${mid}-${rest}${tail}`;
    }

    // 3) 서울 02
    if (digits.startsWith("02")) {
        const head = "02";
        const body = digits.slice(2);
        const mid = body.length === 7 ? body.slice(0, 3) : body.slice(0, 4);
        const rest = body.slice(mid.length);
        return `${head}-${mid}-${rest}${tail}`;
    }

    // 4) 전국 3자리 지역번호 (031, 053...)
    if (/^0[1-9]\d/.test(digits)) {
        const head = digits.slice(0, 3);
        const body = digits.slice(3);
        const mid = body.length === 7 ? body.slice(0, 3) : body.slice(0, 4);
        const rest = body.slice(mid.length);
        return `${head}-${mid}-${rest}${tail}`;
    }

    // 5) 4자리 지역번호 (0411 등)
    if (/^0\d{3}/.test(digits)) {
        const head = digits.slice(0, 4);
        const body = digits.slice(4);
        const mid = body.length === 7 ? body.slice(0, 3) : body.slice(0, 4);
        const rest = body.slice(mid.length);
        return `${head}-${mid}-${rest}${tail}`;
    }

    return digits + tail;
}

// 전화번호 유효성 검사 (숫자 기준)
export function isValidPhone(value: string | number | null | undefined): boolean {
    if (!value) return false;
    const onlyNumbers = String(value).replace(/\D/g, '');

    // 서울(02): 9~10자리 허용
    const seoulPattern = /^02\d{7,8}$/;

    // 전국 지역번호 (031~064): 10자리 고정
    const areaPattern = /^0(3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7}$/;

    // 휴대폰 (010, 011, 016~019): 11자리 고정
    const mobilePattern = /^01[016-9]\d{8}$/;

    // 인터넷 전화 (070): 10자리 고정
    const internetPattern = /^070\d{8}$/;

    return (
        seoulPattern.test(onlyNumbers) ||
        areaPattern.test(onlyNumbers) ||
        mobilePattern.test(onlyNumbers) ||
        internetPattern.test(onlyNumbers)
    );
}
