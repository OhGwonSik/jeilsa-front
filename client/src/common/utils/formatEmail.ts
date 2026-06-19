// 📁 common/utils/formatEmail.ts
export const formatEmail = (email: string): string =>
    email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
};
