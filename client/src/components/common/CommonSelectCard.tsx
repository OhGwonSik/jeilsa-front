// components/common/SearchCard.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OptionValue = string | number | boolean;

type Field =
    | { type: "input"; name: string; label: string; placeholder?: string }
    | {
  type: "select";
  name: string;
  label: string;
  options: { label: string; value: OptionValue }[];
  /** 선택값 캐스팅 규칙: 기본 string */
  valueType?: "string" | "number" | "boolean";
  /** 빈값 라벨/값 커스터마이즈 */
  emptyOptionLabel?: string; // default: "전체"
  emptyOptionValue?: string; // default: ""
};

export type SearchCardProps = {
  fields: Field[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  actionsExtra?: React.ReactNode;
};

export default function SearchCard({
                                     fields,
                                     values,
                                     onChange,
                                     onSearch,
                                     onReset,
                                     loading,
                                     actionsExtra,
                                   }: SearchCardProps) {
  return (
      <Card>
        <CardHeader className="pb-2 font-semibold">검색</CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 p-4">
          {fields.map((f) => {
            if (f.type === "input") {
              return (
                  <div key={f.name} className="flex flex-col gap-1">
                    <label className="text-sm">{f.label}</label>
                    <input
                        className="border rounded px-2 py-1"
                        value={values[f.name] ?? ""}
                        onChange={(e) => onChange(f.name, e.target.value)}
                        placeholder={f.placeholder}
                    />
                  </div>
              );
            }

            if (f.type === "select") {
              const emptyLabel = f.emptyOptionLabel ?? "전체";
              const emptyValue = f.emptyOptionValue ?? "";

              // select는 문자열을 주고받으므로, 현재 값도 문자열로 맞춰줍니다.
              const current =
                  values[f.name] === undefined || values[f.name] === null
                      ? emptyValue
                      : String(values[f.name]);

              return (
                  <div key={f.name} className="flex flex-col gap-1">
                    <label className="text-sm">{f.label}</label>
                    <select
                        className="border rounded px-2 py-1"
                        value={current}
                        onChange={(e) => {
                          const raw = e.target.value;
                          let next: any = raw;

                          switch (f.valueType) {
                            case "boolean":
                              // 빈값은 그대로 빈 문자열 전달 (필요 시 undefined로 바꾸세요)
                              next = raw === "" ? "" : raw === "true";
                              break;
                            case "number":
                              next = raw === "" ? "" : Number(raw);
                              break;
                            case "string":
                            default:
                              // string은 raw 그대로
                              next = raw;
                              break;
                          }
                          onChange(f.name, next);
                        }}
                    >
                      <option value={emptyValue}>{emptyLabel}</option>
                      {f.options.map((o) => (
                          <option key={String(o.value)} value={String(o.value)}>
                            {o.label}
                          </option>
                      ))}
                    </select>
                  </div>
              );
            }

            return null;
          })}

          <div className="col-span-3 flex gap-2 justify-end">
            {actionsExtra}
            <Button onClick={onSearch} disabled={loading}>
              조회
            </Button>
            <Button onClick={onReset} variant="secondary" disabled={loading}>
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
