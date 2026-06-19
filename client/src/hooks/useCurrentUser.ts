// hooks/useCurrentUser.ts
import { useSelector } from 'react-redux';

export const useCurrentUser = () => {
    const memberId = useSelector((state: any) => state.auth.memberId);
    return Number(memberId);
};