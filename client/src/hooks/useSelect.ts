// hooks/useSearchForm.ts
import { useCallback, useState } from "react";

export function useSearchForm<T extends Record<string, any>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const onChange = useCallback((name: string, value: any) => {
    setValues(v => ({ ...v, [name]: value }));
  }, []);
  const reset = useCallback(() => setValues(initial), [initial]);
  return { values, onChange, reset, setValues };
}
