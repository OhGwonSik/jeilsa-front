// components/common/IBSheetWrapper.tsx
import { useEffect, useRef } from 'react';
import loader from '@ibsheet/loader';
import { bindCommonEvents } from '@/components/common/SheetEvent';

type IBSheetWrapperProps = {
  id: string;
  el: string;
  options: any;
  data?: any[];
  onLoad?: (sheet: any) => void;
  /** 필요 시 공통 이벤트 바인드 끌 수 있게 옵션 */
  bindCommon?: boolean;
};

export function IBSheetWrapper({
  id,
  el,
  options,
  data,
  onLoad,
  bindCommon = true,
}: IBSheetWrapperProps) {
  const sheetRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const unbindCommonRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    loader
      .createSheet({
        el: container,   // ← DOM 요소 자체 전달
        options,
        data,
      })
      .then((sheet) => {
        if (cancelled) return;
        sheet.id = id;
        sheetRef.current = sheet;

        // ✅ 공통 이벤트 바인드 (한 번만)
        if (bindCommon) {
          unbindCommonRef.current = bindCommonEvents(sheet);
        }

        onLoad?.(sheet);
      });

    return () => {
      cancelled = true;

      // ✅ 공통 이벤트 언바인드
      unbindCommonRef.current?.();
      unbindCommonRef.current = null;

      if (sheetRef.current) {
        loader.removeSheet(sheetRef.current.id);
        sheetRef.current = null;
      }
    };
    // id가 바뀔 때만 재생성 → 이벤트도 다시 바인드됨
  }, [id, bindCommon]);

  // 옵션만 부분 반영
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.setOptions?.(options);
  }, [options]);

  // 데이터만 부분 반영
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.loadSearchData?.({ data: data ?? [] });
  }, [data]);

  return (
    <div id={el} ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
}
