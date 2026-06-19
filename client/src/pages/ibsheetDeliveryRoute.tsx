import { useEffect, useMemo, useRef } from "react";
import loader from "@ibsheet/loader";
import { applySheetColorRules } from "@/common/utils/applySheetColorRules.ts";

interface CreateSheetProps {
  gridName: string; // 시트 ID
  columns: any[];
  data: Record<string, any>[]; // 부모에서 내려주는 데이터
  height?: string;
  editMode?: number;
  emptyMessage?: string;
  extraOptions?: any;
  externalSheetRef?: React.MutableRefObject<any>;
  onDataLoaded?: (data: Record<string, any>[]) => void;
}

export default function CreateSheet({
  gridName,
  columns,
  data = [],
  height = "600px",
  editMode = 0,
  emptyMessage,
  extraOptions = {},
  externalSheetRef,
  onDataLoaded,
}: CreateSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetInstRef = useRef<any>(null);

  // ✅ 색상 매핑 등 전처리
  const processedData = useMemo(() => {
    if (!extraOptions?.enableColorMapping) return data;
    return applySheetColorRules(data);
  }, [data, extraOptions]);

  /** 1) 최초 1회만 시트 생성 */
  useEffect(() => {
    if (!sheetRef.current) return;
    if (sheetInstRef.current) return; // 이미 생성된 경우 중복 방지

    const baseOptions: any = {
      Cfg: {
        SearchMode: 0,
        CanEdit: editMode,
        Style: "IBSP",
        Alternate: 0,
        CustomScroll: 1,
        CanFormula: 1,
        Paging: 0,
      },
      Cols: columns,
      Def: {},
      Events: {
        onRenderFinish: (evt: any) => {
          sheetInstRef.current = evt.sheet;
          if (externalSheetRef) externalSheetRef.current = evt.sheet;
          evt.sheet.fitColWidth?.();
        },
      },
    };

    const options = {
      ...baseOptions,
      ...extraOptions,
      Cfg: { ...baseOptions.Cfg, ...(extraOptions?.Cfg || {}) },
      Def: { ...baseOptions.Def, ...(extraOptions?.Def || {}) },
      Cols: columns.map((col) => {
        const override = extraOptions?.Cols?.find(
          (c: any) => c.Name === col.Name
        );
        return override ? { ...col, ...override } : col;
      }),
      Events: { ...baseOptions.Events, ...(extraOptions.Events || {}) },
    };

    loader.removeSheet(gridName); // 혹시 남아있으면 제거
    loader.createSheet({
      id: gridName,
      el: sheetRef.current,
      options,
      data: [], // 데이터는 별도 useEffect에서 처리
    });

    return () => {
      loader.removeSheet(gridName);
      sheetInstRef.current = null;
    };
  }, []); // ✅ 최초 1회만 실행

  /** 2) 데이터 변경 시 주입 */
  useEffect(() => {
    if (!sheetInstRef.current) return;
    if (!Array.isArray(processedData)) return;
    try {
      sheetInstRef.current.loadSearchData({ Data: processedData });
      if (onDataLoaded) onDataLoaded(processedData);
    } catch (err) {
      console.error("❌ loadSearchData 에러:", err);
    }
  }, [processedData]);

  return <div ref={sheetRef} style={{ height, width: "100%" }} />;
}
